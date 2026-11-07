import sys
import unittest
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.models.circuit import CircuitModel
from backend.app.services.components.catalog import get_component_definition
from backend.app.services.ai.auto_wirer import auto_wirer
from backend.app.services.pcb.router import pcb_router_service
from backend.app.services.validation.drc import drc_engine

class TestAutonomousAutoWiring(unittest.TestCase):

    def test_auto_wire_esp32_sensor_node(self):
        # User is a beginner ("noob"), only placed ESP32, MPU6050, OLED, TP4056 with ZERO manual connections
        esp = get_component_definition("ESP32-WROOM-32")
        mpu = get_component_definition("MPU6050")
        oled = get_component_definition("OLED_SSD1306")
        tp = get_component_definition("TP4056")
        
        circuit = CircuitModel(components=[esp, mpu, oled, tp])

        # Execute autonomous auto-wire
        res = auto_wirer.auto_complete_circuit(circuit)

        self.assertEqual(res["status"], "completed")
        self.assertGreater(res["actions_count"], 0)

        # 1. GND net must exist and contain ground pins
        gnd_net = next((n for n in circuit.nets if n.name == "GND"), None)
        self.assertIsNotNone(gnd_net)
        self.assertGreaterEqual(len(gnd_net.nodes), 4)

        # 2. +3V3 power rail must exist
        pwr_net = next((n for n in circuit.nets if n.name == "+3V3"), None)
        self.assertIsNotNone(pwr_net)
        self.assertGreaterEqual(len(pwr_net.nodes), 3)

        # 3. I2C Bus lines must be connected
        sda_net = next((n for n in circuit.nets if "SDA" in n.name), None)
        scl_net = next((n for n in circuit.nets if "SCL" in n.name), None)
        self.assertIsNotNone(sda_net)
        self.assertIsNotNone(scl_net)

        # 4. Decoupling capacitor automatically added for safety
        has_cap = any(c.ref == "C1" for c in circuit.components)
        self.assertTrue(has_cap)

        # 5. Route pin-to-pin
        tracks = pcb_router_service.route_pin_to_pin(circuit, "U1", "33", "U2", "4")
        self.assertGreater(len(tracks), 0)

        # All tracks must have realistic 45-degree or orthogonal angles
        for trk in tracks:
            dx = abs(trk.end.x - trk.start.x)
            dy = abs(trk.end.y - trk.start.y)
            # Either horizontal (dy < 0.1), vertical (dx < 0.1), or 45-degree (|dx - dy| < 0.1)
            is_valid_angle = (dy < 0.1) or (dx < 0.1) or (abs(dx - dy) < 0.1)
            self.assertTrue(is_valid_angle, f"Track {trk.id} angle not 45° or orthogonal: dx={dx}, dy={dy}")

if __name__ == "__main__":
    unittest.main()
