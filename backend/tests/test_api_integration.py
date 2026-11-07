import sys
import unittest
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db

class TestAPIIntegration(unittest.TestCase):
    def setUp(self):
        init_db()
        self.client = TestClient(app)

    def test_frontend_serving_or_status(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)

    def test_complete_engineering_workflow(self):
        # 1. Create Project
        res = self.client.post("/projects", json={
            "name": "Integration Test ESP32 Board",
            "description": "Automated CI/CD Validation",
            "beginner_mode": True
        })
        self.assertEqual(res.status_code, 200)
        proj_data = res.json()
        proj_id = proj_data["id"]
        self.assertEqual(proj_data["name"], "Integration Test ESP32 Board")

        # 2. Parse Circuit Description
        prompt = (
            "I want to make a PCB using ESP32, MPU6050, OLED display, and TP4056 charging module.\n"
            "Connections:\n"
            "ESP32 GPIO21 -> MPU6050 SDA\n"
            "ESP32 GPIO22 -> MPU6050 SCL\n"
            "ESP32 GPIO18 -> OLED SCL\n"
            "ESP32 GPIO19 -> OLED SDA"
        )
        res = self.client.post(f"/ai/{proj_id}/parse", json={"prompt": prompt})
        self.assertEqual(res.status_code, 200)
        analysis = res.json()
        self.assertGreaterEqual(len(analysis["detected_components"]), 4)
        self.assertGreaterEqual(len(analysis["detected_nets"]), 4)

        # 3. Interactive Question Answer
        res = self.client.post(f"/ai/{proj_id}/answer", json={
            "question_id": "pcb_dimensions",
            "answer": "60x40"
        })
        self.assertEqual(res.status_code, 200)

        # 4. Auto-Place Components
        res = self.client.post(f"/pcb/{proj_id}/autoplace")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "placed")

        # 5. Auto-Route Traces & Pour Ground Plane
        res = self.client.post(f"/pcb/{proj_id}/autoroute")
        self.assertEqual(res.status_code, 200)
        route_data = res.json()
        self.assertGreater(route_data["track_count"], 0)
        self.assertGreater(len(route_data["zones"]), 0)

        # 6. Run Design Rule Check & Electrical Rule Check
        res = self.client.post(f"/validation/{proj_id}/run")
        self.assertEqual(res.status_code, 200)
        val_data = res.json()
        self.assertIn("drc_violations", val_data)
        self.assertIn("erc_violations", val_data)

        # 7. Export Manufacturing Package (ZIP)
        res = self.client.get(f"/export/{proj_id}/zip")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/zip")
        self.assertGreater(len(res.content), 1000)

        # 8. Export BOM CSV
        res = self.client.get(f"/export/{proj_id}/bom")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Designator", res.text)
        self.assertIn("ESP32", res.text)

        # 9. Export Pick & Place (CPL) CSV
        res = self.client.get(f"/export/{proj_id}/cpl")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Designator,Val,Package,Mid X,Mid Y,Rotation,Layer", res.text)

if __name__ == "__main__":
    unittest.main()
