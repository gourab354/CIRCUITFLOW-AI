import re
from typing import List, Dict, Tuple, Optional, Any
from backend.app.models.circuit import Component, Net, NetNode, Pin
from backend.app.models.ai import CircuitAnalysisResult
from backend.app.services.components.catalog import get_component_definition, STANDARD_COMPONENTS

class CircuitParserEngine:
    """Robust Natural Language & Netlist Circuit Parser."""

    def parse(self, text: str, pin_table: Optional[str] = None, json_def: Optional[str] = None) -> CircuitAnalysisResult:
        result = CircuitAnalysisResult()
        
        detected_comps: Dict[str, Component] = {}
        detected_nets: Dict[str, List[NetNode]] = {}
        missing_info: List[str] = []
        protocols: List[str] = []
        conflicts: List[str] = []
        voltage_notes: List[str] = []
        power_reqs: Dict[str, Any] = {}

        # 1. Identify Components from Text using Word Boundaries
        text_upper = text.upper()
        comp_keywords = [
            (r'\bESP32\b', "ESP32-WROOM-32", "U1"),
            (r'\bMPU6050\b|\bMPU-6050\b|\b6050\b', "MPU6050", "U2"),
            (r'\bOLED\b|\bSSD1306\b', "OLED_SSD1306", "DISP1"),
            (r'\bTP4056\b', "TP4056", "U3"),
            (r'\bAMS1117\b', "AMS1117-3.3", "U4"),
            (r'\bRESISTOR\b|\bRES\b', "RESISTOR_0805", "R1"),
            (r'\bCAPACITOR\b|\bCAP\b', "CAPACITOR_0805", "C1"),
            (r'\bLED\b', "LED_0805", "D1"),
            (r'\bBUTTON\b|\bSWITCH\b', "PUSHBUTTON", "SW1"),
            (r'\bHEADER\b', "HEADER_4PIN", "J1"),
            (r'\bTERMINAL\b|\bSCREW\b', "TERMINAL_BLOCK_2PIN", "TB1")
        ]

        for pattern, cat_id, default_ref in comp_keywords:
            if re.search(pattern, text, re.IGNORECASE):
                comp_proto = get_component_definition(cat_id)
                if comp_proto:
                    ref = comp_proto.ref
                    if ref in detected_comps:
                        prefix = re.sub(r'\d+', '', ref)
                        count = sum(1 for c in detected_comps.values() if c.ref.startswith(prefix)) + 1
                        ref = f"{prefix}{count}"
                    comp_proto.ref = ref
                    detected_comps[ref] = comp_proto

        # 2. Parse Connections (e.g., "ESP32 GPIO21 -> MPU6050 SDA", "connect X to Y")
        lines = [l.strip() for l in re.split(r'[\r\n;]+', text) if l.strip()]
        for line in lines:
            line_str = line.strip().rstrip('.')
            if not line_str:
                continue

            node_a: Optional[NetNode] = None
            node_b: Optional[NetNode] = None

            # Pattern A: Arrow syntax (left -> right)
            arrow_match = re.search(r'^(.*?)\s*(?:->|-->|—>|=>)\s*(.*?)$', line_str)
            if arrow_match:
                endpoint_a_str = arrow_match.group(1).strip()
                endpoint_b_str = arrow_match.group(2).strip()
                node_a = self._resolve_node(endpoint_a_str, detected_comps)
                node_b = self._resolve_node(endpoint_b_str, detected_comps)

            # Pattern B: English "connect X and/to Y"
            if not (node_a and node_b):
                conn_match = re.search(r'^\s*connect\s+(.*?)\s+(?:to|with|and)\s+(.*?)$', line_str, re.IGNORECASE)
                if conn_match:
                    endpoint_a_str = conn_match.group(1).strip()
                    endpoint_b_str = conn_match.group(2).strip()
                    node_a = self._resolve_node(endpoint_a_str, detected_comps)
                    node_b = self._resolve_node(endpoint_b_str, detected_comps)

            # Pattern C: Pin table "PinA : PinB"
            if not (node_a and node_b):
                colon_match = re.search(r'^([A-Za-z0-9_\-\.\s]+)\s*:\s*([A-Za-z0-9_\-\.\s]+)$', line_str)
                if colon_match:
                    endpoint_a_str = colon_match.group(1).strip()
                    endpoint_b_str = colon_match.group(2).strip()
                    node_a = self._resolve_node(endpoint_a_str, detected_comps)
                    node_b = self._resolve_node(endpoint_b_str, detected_comps)

            if node_a and node_b:
                net_name = self._determine_net_name(node_a, node_b, detected_comps)
                if net_name not in detected_nets:
                    detected_nets[net_name] = []
                
                if node_a not in detected_nets[net_name]:
                    detected_nets[net_name].append(node_a)
                if node_b not in detected_nets[net_name]:
                    detected_nets[net_name].append(node_b)

        # 3. Check for Protocols (I2C, SPI, UART)
        i2c_detected = False
        for net_name, nodes in detected_nets.items():
            if "SDA" in net_name.upper() or "SCL" in net_name.upper():
                i2c_detected = True
        if i2c_detected or "I2C" in text_upper:
            protocols.append("I2C Bus (Standard 100kHz / Fast 400kHz)")
            # Check pullups
            has_pullup = any("R" in n.component_ref for net in detected_nets.values() for n in net)
            if not has_pullup:
                missing_info.append("I2C bus typically requires 4.7k pull-up resistors on SDA and SCL if not present on breakout boards.")

        # 4. Check Power & Ground Coverage
        for ref, comp in detected_comps.items():
            comp_nets = {node.pin_number for net in detected_nets.values() for node in net if node.component_ref == ref}
            unconnected_power = []
            for p in comp.pins:
                if p.type in ("power_in", "power_out") and p.number not in comp_nets:
                    unconnected_power.append(f"{p.name} (Pin {p.number})")
            if unconnected_power:
                missing_info.append(f"{comp.name} ({ref}): Power pins {', '.join(unconnected_power)} are not connected to power rails.")

        # 5. Voltage Compatibility & Power Requirements
        if any("ESP32" in c.name for c in detected_comps.values()):
            power_reqs["ESP32"] = "Requires regulated 3.3V DC (minimum 500mA peak during Wi-Fi transmission)"
            voltage_notes.append("ESP32 GPIO pins operate strictly at 3.3V logic level (5V signals will damage the chip without level shifting).")

        if any("TP4056" in c.name for c in detected_comps.values()):
            power_reqs["TP4056"] = "Li-Ion charger input 5V USB (micro/Type-C), output 4.2V max to single-cell LiPo/18650."

        # 6. Check Potential Pin Conflicts
        for net_name, nodes in detected_nets.items():
            pins_in_net = []
            for node in nodes:
                comp = detected_comps.get(node.component_ref)
                if comp:
                    pin = next((p for p in comp.pins if p.number == node.pin_number), None)
                    if pin:
                        pins_in_net.append(pin)
            outputs = [p for p in pins_in_net if p.type == "output"]
            if len(outputs) > 1:
                conflicts.append(f"Electrical Conflict: Net '{net_name}' connects multiple output drivers simultaneously, causing potential short circuit.")

        # Convert detected_nets to Net objects
        nets_list: List[Net] = []
        for name, nodes in detected_nets.items():
            net_class = "Power" if name.upper() in ("GND", "VCC", "3V3", "+3V3", "5V", "+5V", "BAT+") else "Default"
            min_w = 0.5 if net_class == "Power" else 0.25
            nets_list.append(Net(name=name, net_class=net_class, min_width_mm=min_w, nodes=nodes))

        # Assign net names to component pins
        for net in nets_list:
            for node in net.nodes:
                comp = detected_comps.get(node.component_ref)
                if comp:
                    for p in comp.pins:
                        if p.number == node.pin_number:
                            p.net = net.name

        result.detected_components = list(detected_comps.values())
        result.detected_nets = nets_list
        result.missing_information = missing_info
        result.power_requirements = power_reqs
        result.voltage_compatibility_notes = voltage_notes
        result.communication_protocols = protocols
        result.potential_conflicts = conflicts
        result.confidence = 0.95 if detected_comps and nets_list else 0.70
        result.summary = (
            f"Successfully parsed {len(detected_comps)} components and {len(nets_list)} nets. "
            f"Identified {len(protocols)} communication protocols and {len(missing_info)} clarification points."
        )

        return result

    def _resolve_node(self, endpoint_str: str, detected_comps: Dict[str, Component]) -> Optional[NetNode]:
        """Resolves strings like 'ESP32 GPIO21', 'MPU6050 SDA', 'U1.33' into a NetNode."""
        clean = endpoint_str.strip()
        
        # Check for explicit ref.pin format, e.g. U1.21 or U1:21
        dot_match = re.match(r'^([A-Za-z0-9]+)[\.:]([A-Za-z0-9_]+)$', clean)
        if dot_match:
            ref, pin_id = dot_match.groups()
            comp = detected_comps.get(ref.upper())
            if comp:
                pin = self._find_pin_in_comp(comp, pin_id)
                if pin:
                    return NetNode(component_ref=comp.ref, pin_number=pin.number)

        # Check for component name / alias tokens
        tokens = re.findall(r'[A-Za-z0-9]+', clean)
        matched_comp: Optional[Component] = None
        for tok in tokens:
            tok_u = tok.upper()
            for ref, comp in detected_comps.items():
                if tok_u == ref.upper():
                    matched_comp = comp
                    break
                if tok_u in comp.name.upper().split():
                    matched_comp = comp
                    break
                if tok_u in ("ESP32", "ESP") and "ESP32" in comp.name.upper():
                    matched_comp = comp
                    break
                if tok_u in ("MPU6050", "MPU") and "MPU6050" in comp.name.upper():
                    matched_comp = comp
                    break
                if tok_u in ("OLED", "SSD1306", "DISPLAY") and "OLED" in comp.name.upper():
                    matched_comp = comp
                    break
                if tok_u in ("TP4056", "CHARGER", "BATTERY") and "TP4056" in comp.name.upper():
                    matched_comp = comp
                    break
            if matched_comp:
                break

        if matched_comp:
            # Extract pin part from clean by removing the component token
            pin_candidate = clean
            for tok in [matched_comp.ref, "ESP32", "MPU6050", "MPU", "OLED", "SSD1306", "TP4056", "DISPLAY"]:
                pin_candidate = re.sub(rf'\b{tok}\b', '', pin_candidate, flags=re.IGNORECASE)
            pin_candidate = pin_candidate.strip()
            pin = self._find_pin_in_comp(matched_comp, pin_candidate)
            if pin:
                return NetNode(component_ref=matched_comp.ref, pin_number=pin.number)

        # If component was not resolved by token, search all components for unique pin name match
        for ref, comp in detected_comps.items():
            pin = self._find_pin_in_comp(comp, clean)
            if pin:
                return NetNode(component_ref=comp.ref, pin_number=pin.number)

        return None

    def _find_pin_in_comp(self, comp: Component, pin_identifier: str) -> Optional[Pin]:
        pid = pin_identifier.upper().replace("_", "").replace("-", "").replace("GPIO", "IO").strip()
        # Direct number match
        for p in comp.pins:
            if p.number == pin_identifier.strip():
                return p
        # Direct name match
        for p in comp.pins:
            p_name_clean = p.name.upper().replace("_", "").replace("-", "")
            if p_name_clean == pid or (pid.startswith("IO") and p_name_clean == pid):
                return p
            if pid in p_name_clean or p_name_clean in pid:
                return p
        return None

    def _determine_net_name(self, node_a: NetNode, node_b: NetNode, comps: Dict[str, Component]) -> str:
        comp_a = comps.get(node_a.component_ref)
        comp_b = comps.get(node_b.component_ref)
        pin_a = next((p for p in comp_a.pins if p.number == node_a.pin_number), None) if comp_a else None
        pin_b = next((p for p in comp_b.pins if p.number == node_b.pin_number), None) if comp_b else None
        
        # Check power names first (shared rails)
        for p in (pin_a, pin_b):
            if p and p.name.upper() in ("GND", "VCC", "3V3", "+3V3", "5V", "+5V", "BAT+", "BAT-", "IN+", "IN-", "OUT+", "OUT-"):
                return p.name.upper()
                
        # Signal nets should reflect the connection pair specifically
        pname_a = pin_a.name if pin_a else node_a.pin_number
        pname_b = pin_b.name if pin_b else node_b.pin_number
        return f"NET_{node_a.component_ref}_{pname_a}__{node_b.component_ref}_{pname_b}"

circuit_parser = CircuitParserEngine()
