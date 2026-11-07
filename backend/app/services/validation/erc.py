from typing import List
from backend.app.models.circuit import CircuitModel, ERCViolation

class ERCEngine:
    """Electrical Rules Check (ERC) Engine."""

    def run(self, circuit: CircuitModel) -> List[ERCViolation]:
        violations: List[ERCViolation] = []
        
        # Map components and pins
        comp_map = {c.ref: c for c in circuit.components}
        pin_to_net = {}
        for net in circuit.nets:
            for node in net.nodes:
                pin_to_net[(node.component_ref, node.pin_number)] = net.name

        # 1. Unconnected Power Pins Check
        for c in circuit.components:
            for p in c.pins:
                key = (c.ref, p.number)
                net_name = pin_to_net.get(key)
                
                if p.type in ("power_in", "power_out") and not net_name:
                    violations.append(ERCViolation(
                        id=f"erc_pwr_{c.ref}_{p.number}",
                        type="missing_power",
                        severity="error",
                        component_ref=c.ref,
                        pin=f"{p.name} (Pin {p.number})",
                        message=f"Component '{c.name}' ({c.ref}) power pin '{p.name}' is unconnected.",
                        suggested_fix=f"Connect {p.name} to the appropriate power rail (e.g. GND or +3V3/+5V)."
                    ))

        # 2. Output Driver Contention / Short Circuit
        for net in circuit.nets:
            outputs = []
            power_sources = []
            for node in net.nodes:
                comp = comp_map.get(node.component_ref)
                if comp:
                    pin = next((p for p in comp.pins if p.number == node.pin_number), None)
                    if pin:
                        if pin.type == "output":
                            outputs.append((comp.ref, pin.name))
                        elif pin.type == "power_out":
                            power_sources.append((comp.ref, pin.name))

            if len(outputs) > 1:
                drivers = ", ".join([f"{r}.{p}" for r, p in outputs])
                violations.append(ERCViolation(
                    id=f"erc_contention_{net.name}",
                    type="pin_conflict",
                    severity="error",
                    message=f"Net '{net.name}' is driven by multiple output pins ({drivers}).",
                    suggested_fix="Ensure only one active driver is attached, or use tri-state/open-drain buffers."
                ))

            if len(power_sources) > 1:
                srcs = ", ".join([f"{r}.{p}" for r, p in power_sources])
                violations.append(ERCViolation(
                    id=f"erc_pwr_conflict_{net.name}",
                    type="pin_conflict",
                    severity="error",
                    message=f"Net '{net.name}' connects multiple power outputs ({srcs}) together.",
                    suggested_fix="Do not connect two distinct voltage regulator outputs in parallel without diode OR-ing."
                ))

        # 3. Floating Inputs
        for c in circuit.components:
            for p in c.pins:
                if p.type == "input":
                    key = (c.ref, p.number)
                    if key not in pin_to_net:
                        violations.append(ERCViolation(
                            id=f"erc_floating_{c.ref}_{p.number}",
                            type="unconnected_pin",
                            severity="warning",
                            component_ref=c.ref,
                            pin=f"{p.name} (Pin {p.number})",
                            message=f"Input pin '{p.name}' on {c.ref} is floating (unconnected).",
                            suggested_fix=f"Connect {p.name} to a driving signal or pull it high/low with a resistor."
                        ))

        # 4. I2C Bus Pull-up Check
        i2c_nets = [net for net in circuit.nets if "SDA" in net.name.upper() or "SCL" in net.name.upper()]
        for inet in i2c_nets:
            has_resistor = any(node.component_ref.startswith("R") for node in inet.nodes)
            if not has_resistor:
                violations.append(ERCViolation(
                    id=f"erc_i2c_pullup_{inet.name}",
                    type="missing_pullup",
                    severity="warning",
                    message=f"I2C bus line '{inet.name}' has no pull-up resistor detected.",
                    suggested_fix="Add a 4.7kΩ pull-up resistor from this line to the 3.3V power rail (unless breakout module has internal pullups)."
                ))

        # 5. Voltage Compatibility
        esp_comps = [c for c in circuit.components if "ESP32" in c.name.upper()]
        if esp_comps:
            for net in circuit.nets:
                has_esp = any(node.component_ref in [ec.ref for ec in esp_comps] for node in net.nodes)
                if has_esp:
                    # Check if 5V pins are in same net
                    for node in net.nodes:
                        comp = comp_map.get(node.component_ref)
                        v_nom = str(comp.specs.get("voltage_nominal", ""))
                        if comp and ("5V" in v_nom or "5.0" in v_nom):
                            violations.append(ERCViolation(
                                id=f"erc_volt_{net.name}_{node.component_ref}",
                                type="voltage_mismatch",
                                severity="error",
                                component_ref=node.component_ref,
                                message=f"5V component '{comp.name}' is directly connected to 3.3V ESP32 pin on net '{net.name}'.",
                                suggested_fix="Use a bidirectional logic level shifter (e.g. BSS138 or TXS0108E) to prevent damaging the ESP32."
                            ))

        return violations

erc_engine = ERCEngine()
