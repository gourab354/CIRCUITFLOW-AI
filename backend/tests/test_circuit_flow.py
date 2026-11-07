import sys
import unittest
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.models.circuit import CircuitModel, Component, Pin
from backend.app.services.ai.circuit_parser import circuit_parser
from backend.app.services.pcb.placement import pcb_placement_service
from backend.app.services.pcb.router import pcb_router_service
from backend.app.services.pcb.zones import copper_zone_service
from backend.app.services.validation.drc import drc_engine
from backend.app.services.validation.erc import erc_engine
from backend.app.services.exporter.package_export import package_export_service

class TestCircuitFlowCore(unittest.TestCase):

    def test_natural_language_circuit_parser(self):
        sample_prompt = (
            "I want to make a PCB using ESP32, MPU6050, OLED display, and TP4056 charging module.\n"
            "Connections:\n"
            "ESP32 GPIO21 -> MPU6050 SDA\n"
            "ESP32 GPIO22 -> MPU6050 SCL\n"
            "ESP32 GPIO18 -> OLED SCL\n"
            "ESP32 GPIO19 -> OLED SDA."
        )

        analysis = circuit_parser.parse(sample_prompt)

        # 1. Component identification
        comp_names = [c.name for c in analysis.detected_components]
        self.assertTrue(any("ESP32" in n for n in comp_names))
        self.assertTrue(any("MPU6050" in n for n in comp_names))
        self.assertTrue(any("OLED" in n or "SSD1306" in n for n in comp_names))
        self.assertTrue(any("TP4056" in n for n in comp_names))

        # 2. Pin and Net identification
        self.assertGreaterEqual(len(analysis.detected_nets), 4)

        # 3. Protocol detection
        self.assertTrue(any("I2C" in p for p in analysis.communication_protocols))

        # 4. Voltage notes
        self.assertTrue(any("3.3V" in v for v in analysis.voltage_compatibility_notes))

        # 5. Missing info detection (power pins not connected in prompt)
        self.assertTrue(any("Power pins" in m or "unconnected" in m for m in analysis.missing_information))

    def test_placement_routing_and_validation(self):
        # Create a circuit
        sample_prompt = (
            "ESP32, MPU6050, OLED\n"
            "ESP32 GPIO21 -> MPU6050 SDA\n"
            "ESP32 GPIO22 -> MPU6050 SCL\n"
            "ESP32 GPIO18 -> OLED SCL\n"
            "ESP32 GPIO19 -> OLED SDA"
        )
        analysis = circuit_parser.parse(sample_prompt)
        circuit = CircuitModel(
            components=analysis.detected_components,
            nets=analysis.detected_nets
        )

        # Test Placement
        pcb_placement_service.auto_place(circuit)
        for c in circuit.components:
            self.assertGreater(c.x, 0.0)
            self.assertLess(c.x, circuit.board.width_mm)
            self.assertGreater(c.y, 0.0)
            self.assertLess(c.y, circuit.board.height_mm)

        # Test Routing
        pcb_router_service.route_circuit(circuit)
        self.assertGreater(len(circuit.tracks), 0)

        # Test Copper Zones
        copper_zone_service.generate_ground_plane(circuit)
        self.assertGreater(len(circuit.zones), 0)

        # Test DRC
        drc_violations = drc_engine.run(circuit)
        self.assertIsInstance(drc_violations, list)

        # Test ERC
        erc_violations = erc_engine.run(circuit)
        self.assertIsInstance(erc_violations, list)

    def test_manufacturing_export_package(self):
        sample_prompt = (
            "ESP32, MPU6050\n"
            "ESP32 GPIO21 -> MPU6050 SDA\n"
            "ESP32 GPIO22 -> MPU6050 SCL"
        )
        analysis = circuit_parser.parse(sample_prompt)
        circuit = CircuitModel(
            components=analysis.detected_components,
            nets=analysis.detected_nets
        )
        pcb_placement_service.auto_place(circuit)
        pcb_router_service.route_circuit(circuit)
        copper_zone_service.generate_ground_plane(circuit)

        zip_bytes, meta = package_export_service.create_production_zip(circuit, "Test_ESP32_Board")
        self.assertGreater(len(zip_bytes), 1000)
        self.assertEqual(meta["project_name"], "Test_ESP32_Board")

if __name__ == "__main__":
    unittest.main()

