import uuid
from typing import List, Dict, Tuple, Any
from backend.app.models.circuit import CircuitModel, Component, Net, NetNode, Pin
from backend.app.services.components.catalog import get_component_definition

class AutonomousWiringEngine:
    """Intelligently detects missing pin-to-pin connections and completes the circuit for beginners."""

    def auto_complete_circuit(self, circuit: CircuitModel) -> Dict[str, Any]:
        """Infers and creates all required power, ground, bus, and passive connections automatically."""
        actions_taken: List[str] = []
        comp_map = {c.ref: c for c in circuit.components}

        # 1. Ensure GND Net Exists and Connect All Ground Pins
        gnd_net = next((n for n in circuit.nets if n.name.upper() == "GND"), None)
        if not gnd_net:
            gnd_net = Net(name="GND", net_class="Power", min_width_mm=0.50, color="#3b82f6", nodes=[])
            circuit.nets.append(gnd_net)

        for comp in circuit.components:
            for pin in comp.pins:
                p_name_u = pin.name.upper()
                if p_name_u in ("GND", "VSS", "IN-", "OUT-", "B-", "0V") or (comp.ref.startswith("U") and "GND" in p_name_u):
                    node = NetNode(component_ref=comp.ref, pin_number=pin.number)
                    if node not in gnd_net.nodes:
                        gnd_net.nodes.append(node)
                        pin.net = "GND"
                        actions_taken.append(f"Auto-wired {comp.ref}.{pin.name} (Pin {pin.number}) to GND plane.")

        # 2. Ensure Power Rails (+3V3 and +5V)
        pwr_3v3_net = next((n for n in circuit.nets if n.name.upper() in ("+3V3", "3V3", "VCC_3V3")), None)
        if not pwr_3v3_net:
            pwr_3v3_net = Net(name="+3V3", net_class="Power", min_width_mm=0.50, color="#ef4444", nodes=[])
            circuit.nets.append(pwr_3v3_net)

        # Connect 3.3V power pins
        for comp in circuit.components:
            for pin in comp.pins:
                p_name_u = pin.name.upper()
                # If component is 3.3V logic (ESP32, MPU6050, OLED, 3.3V LDO)
                if p_name_u in ("3V3", "+3V3", "VDD", "VCC_3V3") or (
                    p_name_u in ("VCC", "VIN") and comp.specs.get("voltage_nominal") in (3.3, "3.3", "3.3V")
                ) or (comp.ref.startswith("DISP") and p_name_u == "VCC") or (
                    "MPU" in comp.name and p_name_u == "VCC"
                ):
                    node = NetNode(component_ref=comp.ref, pin_number=pin.number)
                    if node not in pwr_3v3_net.nodes:
                        pwr_3v3_net.nodes.append(node)
                        pin.net = "+3V3"
                        actions_taken.append(f"Auto-wired {comp.ref}.{pin.name} (Pin {pin.number}) to +3V3 power rail.")

        # 3. I2C Bus Detection & Auto-Wiring (SDA & SCL)
        sda_pins: List[Tuple[Component, Pin]] = []
        scl_pins: List[Tuple[Component, Pin]] = []

        for comp in circuit.components:
            for pin in comp.pins:
                p_u = pin.name.upper()
                # ESP32 specific I2C default pins
                if "ESP32" in comp.name.upper() and p_u in ("IO21", "GPIO21"):
                    sda_pins.append((comp, pin))
                elif "ESP32" in comp.name.upper() and p_u in ("IO22", "GPIO22"):
                    scl_pins.append((comp, pin))
                elif "SDA" in p_u and not p_u.startswith("X"):
                    sda_pins.append((comp, pin))
                elif "SCL" in p_u and not p_u.startswith("X"):
                    scl_pins.append((comp, pin))

        if len(sda_pins) >= 2:
            i2c_sda_net = next((n for n in circuit.nets if "SDA" in n.name.upper()), None)
            if not i2c_sda_net:
                i2c_sda_net = Net(name="I2C_SDA", net_class="Default", min_width_mm=0.25, color="#10b981", nodes=[])
                circuit.nets.append(i2c_sda_net)
            for comp, pin in sda_pins:
                node = NetNode(component_ref=comp.ref, pin_number=pin.number)
                if node not in i2c_sda_net.nodes:
                    i2c_sda_net.nodes.append(node)
                    pin.net = i2c_sda_net.name
                    actions_taken.append(f"Connected {comp.ref}.{pin.name} to {i2c_sda_net.name} bus.")

        if len(scl_pins) >= 2:
            i2c_scl_net = next((n for n in circuit.nets if "SCL" in n.name.upper()), None)
            if not i2c_scl_net:
                i2c_scl_net = Net(name="I2C_SCL", net_class="Default", min_width_mm=0.25, color="#06b6d4", nodes=[])
                circuit.nets.append(i2c_scl_net)
            for comp, pin in scl_pins:
                node = NetNode(component_ref=comp.ref, pin_number=pin.number)
                if node not in i2c_scl_net.nodes:
                    i2c_scl_net.nodes.append(node)
                    pin.net = i2c_scl_net.name
                    actions_taken.append(f"Connected {comp.ref}.{pin.name} to {i2c_scl_net.name} bus.")

        # 4. Check If Decoupling Capacitor is Missing (Essential for Real Engineering)
        has_decoupling = any(c.ref.startswith("C") for c in circuit.components)
        if not has_decoupling:
            cap = get_component_definition("CAPACITOR_0805")
            if cap:
                cap.ref = "C1"
                cap.value = "100nF"
                cap.description = "MCU Decoupling Filter Capacitor"
                # Pin 1 to +3V3, Pin 2 to GND
                cap.pins[0].net = "+3V3"
                cap.pins[1].net = "GND"
                circuit.components.append(cap)
                pwr_3v3_net.nodes.append(NetNode(component_ref="C1", pin_number="1"))
                gnd_net.nodes.append(NetNode(component_ref="C1", pin_number="2"))
                actions_taken.append("Added C1 (100nF Decoupling Capacitor) across +3V3 and GND for high-frequency noise suppression.")

        # 5. Check Battery / Charger Interconnect (TP4056 -> Regulator or System)
        tp4056 = next((c for c in circuit.components if "TP4056" in c.name.upper()), None)
        ams = next((c for c in circuit.components if "AMS1117" in c.name.upper()), None)
        if tp4056 and ams:
            # Connect TP4056 OUT+ to AMS1117 VIN
            vbat_net = next((n for n in circuit.nets if n.name.upper() == "VBAT_SYS"), None)
            if not vbat_net:
                vbat_net = Net(name="VBAT_SYS", net_class="Power", min_width_mm=0.5, color="#f59e0b", nodes=[])
                circuit.nets.append(vbat_net)
            tp_out_plus = next((p for p in tp4056.pins if p.name in ("OUT+", "3")), None)
            ams_vin = next((p for p in ams.pins if p.name in ("VIN", "3")), None)
            if tp_out_plus and ams_vin:
                vbat_net.nodes.append(NetNode(component_ref=tp4056.ref, pin_number=tp_out_plus.number))
                vbat_net.nodes.append(NetNode(component_ref=ams.ref, pin_number=ams_vin.number))
                tp_out_plus.net = "VBAT_SYS"
                ams_vin.net = "VBAT_SYS"
                actions_taken.append(f"Wired TP4056 Battery Output ({tp4056.ref}.OUT+) to Voltage Regulator Input ({ams.ref}.VIN).")

        return {
            "status": "completed",
            "actions_count": len(actions_taken),
            "actions": actions_taken,
            "components_count": len(circuit.components),
            "nets_count": len(circuit.nets)
        }

auto_wirer = AutonomousWiringEngine()

