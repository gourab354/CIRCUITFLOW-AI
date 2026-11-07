from typing import Dict, List, Optional
from backend.app.models.circuit import Component, Pin

# Master Catalog of Verified Electronic Components
STANDARD_COMPONENTS: Dict[str, Component] = {
    "ESP32-WROOM-32": Component(
        ref="U1",
        name="ESP32-WROOM-32",
        package="Module",
        footprint="RF_Module:ESP32-WROOM-32",
        value="ESP32-WROOM-32",
        category="Microcontroller",
        description="Wi-Fi & Bluetooth MCU Module with integrated antenna",
        datasheet="https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf",
        width_mm=18.0,
        height_mm=25.5,
        specs={"voltage_min": 3.0, "voltage_max": 3.6, "voltage_nominal": 3.3, "current_ma": 500},
        pins=[
            Pin(number="1", name="GND", type="power_in", rel_x=-8.5, rel_y=-10.5, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="2", name="3V3", type="power_in", rel_x=-8.5, rel_y=-9.23, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="3", name="EN", type="input", rel_x=-8.5, rel_y=-7.96, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="4", name="SENSOR_VP", type="input", rel_x=-8.5, rel_y=-6.69, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="5", name="SENSOR_VN", type="input", rel_x=-8.5, rel_y=-5.42, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="6", name="IO34", type="input", rel_x=-8.5, rel_y=-4.15, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="7", name="IO35", type="input", rel_x=-8.5, rel_y=-2.88, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="8", name="IO32", type="bidirectional", rel_x=-8.5, rel_y=-1.61, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="9", name="IO33", type="bidirectional", rel_x=-8.5, rel_y=-0.34, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="10", name="IO25", type="bidirectional", rel_x=-8.5, rel_y=0.93, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="11", name="IO26", type="bidirectional", rel_x=-8.5, rel_y=2.2, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="12", name="IO27", type="bidirectional", rel_x=-8.5, rel_y=3.47, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="13", name="IO14", type="bidirectional", rel_x=-8.5, rel_y=4.74, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="14", name="IO12", type="bidirectional", rel_x=-8.5, rel_y=6.01, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="15", name="GND", type="power_in", rel_x=-8.5, rel_y=7.28, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="16", name="IO13", type="bidirectional", rel_x=-8.5, rel_y=8.55, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="17", name="SHD/SD2", type="bidirectional", rel_x=-8.5, rel_y=9.82, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="18", name="SWP/SD3", type="bidirectional", rel_x=-8.5, rel_y=11.09, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="19", name="SCS/CMD", type="bidirectional", rel_x=-8.5, rel_y=12.36, pad_size_x=1.5, pad_size_y=0.9),
            # Right side pins
            Pin(number="38", name="GND", type="power_in", rel_x=8.5, rel_y=-10.5, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="37", name="IO23", type="bidirectional", rel_x=8.5, rel_y=-9.23, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="36", name="IO22", type="bidirectional", rel_x=8.5, rel_y=-7.96, pad_size_x=1.5, pad_size_y=0.9),  # SCL
            Pin(number="35", name="TXD0", type="output", rel_x=8.5, rel_y=-6.69, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="34", name="RXD0", type="input", rel_x=8.5, rel_y=-5.42, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="33", name="IO21", type="bidirectional", rel_x=8.5, rel_y=-4.15, pad_size_x=1.5, pad_size_y=0.9),  # SDA
            Pin(number="32", name="NC", type="passive", rel_x=8.5, rel_y=-2.88, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="31", name="IO19", type="bidirectional", rel_x=8.5, rel_y=-1.61, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="30", name="IO18", type="bidirectional", rel_x=8.5, rel_y=-0.34, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="29", name="IO5", type="bidirectional", rel_x=8.5, rel_y=0.93, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="28", name="IO17", type="bidirectional", rel_x=8.5, rel_y=2.2, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="27", name="IO16", type="bidirectional", rel_x=8.5, rel_y=3.47, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="26", name="IO4", type="bidirectional", rel_x=8.5, rel_y=4.74, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="25", name="IO0", type="bidirectional", rel_x=8.5, rel_y=6.01, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="24", name="IO2", type="bidirectional", rel_x=8.5, rel_y=7.28, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="23", name="IO15", type="bidirectional", rel_x=8.5, rel_y=8.55, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="22", name="SD1", type="bidirectional", rel_x=8.5, rel_y=9.82, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="21", name="SD0", type="bidirectional", rel_x=8.5, rel_y=11.09, pad_size_x=1.5, pad_size_y=0.9),
            Pin(number="20", name="CLK", type="bidirectional", rel_x=8.5, rel_y=12.36, pad_size_x=1.5, pad_size_y=0.9),
        ]
    ),

    "MPU6050": Component(
        ref="U2",
        name="MPU6050",
        package="Module",
        footprint="Sensor_Motion:InvenSense_QFN-24_4x4mm_P0.5mm",
        value="MPU6050",
        category="Sensor",
        description="6-axis MotionTracking device (3-axis Gyroscope + 3-axis Accelerometer)",
        datasheet="https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf",
        width_mm=15.0,
        height_mm=20.0,
        specs={"voltage_min": 2.375, "voltage_max": 3.46, "voltage_nominal": 3.3, "interface": "I2C"},
        pins=[
            Pin(number="1", name="VCC", type="power_in", rel_x=-6.0, rel_y=-8.89, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="2", name="GND", type="power_in", rel_x=-6.0, rel_y=-6.35, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="3", name="SCL", type="input", rel_x=-6.0, rel_y=-3.81, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="4", name="SDA", type="bidirectional", rel_x=-6.0, rel_y=-1.27, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="5", name="XDA", type="bidirectional", rel_x=-6.0, rel_y=1.27, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="6", name="XCL", type="output", rel_x=-6.0, rel_y=3.81, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="7", name="AD0", type="input", rel_x=-6.0, rel_y=6.35, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
            Pin(number="8", name="INT", type="output", rel_x=-6.0, rel_y=8.89, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=0.9),
        ]
    ),

    "OLED_SSD1306": Component(
        ref="DISP1",
        name="OLED 0.96 inch SSD1306",
        package="Module",
        footprint="Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical",
        value="SSD1306 128x64",
        category="Display",
        description="0.96 inch 128x64 Blue/Yellow OLED Display I2C module",
        datasheet="https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf",
        width_mm=27.0,
        height_mm=27.0,
        specs={"voltage_min": 3.3, "voltage_max": 5.0, "voltage_nominal": 3.3, "interface": "I2C"},
        pins=[
            Pin(number="1", name="GND", type="power_in", rel_x=-3.81, rel_y=-12.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="2", name="VCC", type="power_in", rel_x=-1.27, rel_y=-12.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="3", name="SCL", type="input", rel_x=1.27, rel_y=-12.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="4", name="SDA", type="bidirectional", rel_x=3.81, rel_y=-12.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
        ]
    ),

    "TP4056": Component(
        ref="U3",
        name="TP4056 Module",
        package="Module",
        footprint="Battery:BatteryHolder_Keystone_1042_1x18650",
        value="TP4056+Protection",
        category="Power",
        description="1A Li-Ion Battery Charging Board with Over-current & Over-discharge Protection",
        datasheet="https://dlnmh9ip6v2uc.cloudfront.net/datasheets/Prototyping/TP4056.pdf",
        width_mm=17.0,
        height_mm=28.0,
        specs={"voltage_in_min": 4.5, "voltage_in_max": 5.5, "charge_current_ma": 1000, "battery_type": "3.7V Li-Ion/LiPo"},
        pins=[
            Pin(number="1", name="IN+", type="power_in", rel_x=-7.0, rel_y=-12.5, pad_size_x=2.0, pad_size_y=2.0, hole_diameter=1.0),
            Pin(number="2", name="IN-", type="power_in", rel_x=7.0, rel_y=-12.5, pad_size_x=2.0, pad_size_y=2.0, hole_diameter=1.0),
            Pin(number="3", name="OUT+", type="power_out", rel_x=-7.0, rel_y=12.5, pad_size_x=2.0, pad_size_y=2.0, hole_diameter=1.0),
            Pin(number="4", name="B+", type="power_out", rel_x=-3.5, rel_y=12.5, pad_size_x=2.0, pad_size_y=2.0, hole_diameter=1.0),
            Pin(number="5", name="B-", type="power_in", rel_x=3.5, rel_y=12.5, pad_size_x=2.0, pad_size_y=2.0, hole_diameter=1.0),
            Pin(number="6", name="OUT-", type="power_in", rel_x=7.0, rel_y=12.5, pad_size_x=2.0, pad_size_y=2.0, hole_diameter=1.0),
        ]
    ),

    "AMS1117-3.3": Component(
        ref="U4",
        name="AMS1117-3.3",
        package="SOT-223",
        footprint="Package_TO_SOT_SMD:SOT-223-3_TabPin2",
        value="3.3V LDO",
        category="Power",
        description="1A Low Dropout Positive Voltage Regulator 3.3V Output",
        datasheet="http://www.advanced-monolithic.com/pdf/ds1117.pdf",
        width_mm=6.5,
        height_mm=7.0,
        specs={"voltage_in_max": 15.0, "voltage_out": 3.3, "max_current_ma": 1000},
        pins=[
            Pin(number="1", name="GND/ADJ", type="power_in", rel_x=-2.3, rel_y=-3.1, pad_size_x=1.2, pad_size_y=2.0),
            Pin(number="2", name="VOUT", type="power_out", rel_x=0.0, rel_y=-3.1, pad_size_x=1.2, pad_size_y=2.0),
            Pin(number="3", name="VIN", type="power_in", rel_x=2.3, rel_y=-3.1, pad_size_x=1.2, pad_size_y=2.0),
            Pin(number="4", name="VOUT_TAB", type="power_out", rel_x=0.0, rel_y=3.1, pad_size_x=3.3, pad_size_y=2.0),
        ]
    ),

    "RESISTOR_0805": Component(
        ref="R1",
        name="Resistor 0805",
        package="SMD",
        footprint="Resistor_SMD:R_0805_2012Metric",
        value="10k",
        category="Passive",
        description="Surface mount thick film chip resistor 0805 (2012 metric)",
        width_mm=2.0,
        height_mm=1.25,
        specs={"power_w": 0.125, "tolerance": "5%"},
        pins=[
            Pin(number="1", name="1", type="passive", rel_x=-0.95, rel_y=0.0, pad_size_x=1.0, pad_size_y=1.4),
            Pin(number="2", name="2", type="passive", rel_x=0.95, rel_y=0.0, pad_size_x=1.0, pad_size_y=1.4),
        ]
    ),

    "CAPACITOR_0805": Component(
        ref="C1",
        name="Capacitor 0805",
        package="SMD",
        footprint="Capacitor_SMD:C_0805_2012Metric",
        value="100nF",
        category="Passive",
        description="Multilayer Ceramic Capacitor 0805 (2012 metric)",
        width_mm=2.0,
        height_mm=1.25,
        specs={"voltage_max": 50, "dielectric": "X7R"},
        pins=[
            Pin(number="1", name="1", type="passive", rel_x=-0.95, rel_y=0.0, pad_size_x=1.0, pad_size_y=1.4),
            Pin(number="2", name="2", type="passive", rel_x=0.95, rel_y=0.0, pad_size_x=1.0, pad_size_y=1.4),
        ]
    ),

    "LED_0805": Component(
        ref="D1",
        name="LED 0805",
        package="SMD",
        footprint="LED_SMD:LED_0805_2012Metric",
        value="Green",
        category="Discrete",
        description="Surface mount light emitting diode 0805 (2012 metric)",
        width_mm=2.0,
        height_mm=1.25,
        specs={"forward_voltage": 2.2, "forward_current_ma": 20},
        pins=[
            Pin(number="1", name="K", type="passive", rel_x=-0.95, rel_y=0.0, pad_size_x=1.0, pad_size_y=1.4),  # Cathode
            Pin(number="2", name="A", type="passive", rel_x=0.95, rel_y=0.0, pad_size_x=1.0, pad_size_y=1.4),   # Anode
        ]
    ),

    "PUSHBUTTON": Component(
        ref="SW1",
        name="Tactile Switch 6x6mm",
        package="THT",
        footprint="Button_Switch_THT:SW_PUSH_6mm",
        value="Tact_Switch",
        category="Electromechanical",
        description="6x6mm through-hole tactile momentary pushbutton",
        width_mm=6.0,
        height_mm=6.0,
        pins=[
            Pin(number="1", name="1", type="passive", rel_x=-3.25, rel_y=-2.25, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=1.0),
            Pin(number="2", name="2", type="passive", rel_x=3.25, rel_y=-2.25, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=1.0),
            Pin(number="3", name="3", type="passive", rel_x=-3.25, rel_y=2.25, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=1.0),
            Pin(number="4", name="4", type="passive", rel_x=3.25, rel_y=2.25, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=1.0),
        ]
    ),

    "HEADER_4PIN": Component(
        ref="J1",
        name="Pin Header 1x04 2.54mm",
        package="THT",
        footprint="Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical",
        value="Header_4Pin",
        category="Connector",
        description="1x04 standard 0.1 inch (2.54mm) pitch pin header connector",
        width_mm=2.54,
        height_mm=10.16,
        pins=[
            Pin(number="1", name="Pin_1", type="passive", rel_x=0.0, rel_y=-3.81, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="2", name="Pin_2", type="passive", rel_x=0.0, rel_y=-1.27, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="3", name="Pin_3", type="passive", rel_x=0.0, rel_y=1.27, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="4", name="Pin_4", type="passive", rel_x=0.0, rel_y=3.81, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
        ]
    ),

    "TERMINAL_BLOCK_2PIN": Component(
        ref="TB1",
        name="Screw Terminal 2-Pin 5.08mm",
        package="THT",
        footprint="TerminalBlock:TerminalBlock_bornier-2_P5.08mm",
        value="Screw_Term_2P",
        category="Connector",
        description="5.08mm pitch PCB mount screw terminal block connector",
        width_mm=10.16,
        height_mm=8.5,
        specs={"current_rating_a": 16, "voltage_rating_v": 300},
        pins=[
            Pin(number="1", name="1", type="passive", rel_x=-2.54, rel_y=0.0, pad_size_x=2.5, pad_size_y=2.5, hole_diameter=1.3),
            Pin(number="2", name="2", type="passive", rel_x=2.54, rel_y=0.0, pad_size_x=2.5, pad_size_y=2.5, hole_diameter=1.3),
        ]
    ),

    "ARDUINO_NANO": Component(
        ref="U_MCU1",
        name="Arduino Nano V3.0",
        package="Module",
        footprint="Module:Arduino_Nano",
        value="ATmega328P",
        category="Microcontroller",
        description="ATmega328P 8-bit AVR Microcontroller Board with USB Mini/Type-C",
        datasheet="https://docs.arduino.cc/resources/datasheets/A000005-datasheet.pdf",
        width_mm=17.78,
        height_mm=43.18,
        specs={"voltage_nominal": 5.0, "logic_level": 5.0, "clock_mhz": 16},
        pins=[
            Pin(number="1", name="TX", type="output", rel_x=-7.62, rel_y=-17.78, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="2", name="RX", type="input", rel_x=-7.62, rel_y=-15.24, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="3", name="RST", type="input", rel_x=-7.62, rel_y=-12.7, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="4", name="GND", type="power_in", rel_x=-7.62, rel_y=-10.16, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="5", name="D2", type="bidirectional", rel_x=-7.62, rel_y=-7.62, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="6", name="D3", type="bidirectional", rel_x=-7.62, rel_y=-5.08, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="7", name="D4", type="bidirectional", rel_x=-7.62, rel_y=-2.54, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="8", name="D5", type="bidirectional", rel_x=-7.62, rel_y=0.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="9", name="D6", type="bidirectional", rel_x=-7.62, rel_y=2.54, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="10", name="D7", type="bidirectional", rel_x=-7.62, rel_y=5.08, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="11", name="D8", type="bidirectional", rel_x=-7.62, rel_y=7.62, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="12", name="D9", type="bidirectional", rel_x=-7.62, rel_y=10.16, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="13", name="D10", type="bidirectional", rel_x=-7.62, rel_y=12.7, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="14", name="D11", type="bidirectional", rel_x=-7.62, rel_y=15.24, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="15", name="D12", type="bidirectional", rel_x=-7.62, rel_y=17.78, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="16", name="D13", type="bidirectional", rel_x=7.62, rel_y=17.78, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="17", name="3V3", type="power_out", rel_x=7.62, rel_y=15.24, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="18", name="AREF", type="input", rel_x=7.62, rel_y=12.7, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="19", name="A0", type="input", rel_x=7.62, rel_y=10.16, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="20", name="A1", type="input", rel_x=7.62, rel_y=7.62, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="21", name="A2", type="input", rel_x=7.62, rel_y=5.08, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="22", name="A3", type="input", rel_x=7.62, rel_y=2.54, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="23", name="A4/SDA", type="bidirectional", rel_x=7.62, rel_y=0.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="24", name="A5/SCL", type="bidirectional", rel_x=7.62, rel_y=-2.54, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="25", name="A6", type="input", rel_x=7.62, rel_y=-5.08, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="26", name="A7", type="input", rel_x=7.62, rel_y=-7.62, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="27", name="5V", type="power_out", rel_x=7.62, rel_y=-10.16, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="28", name="RST", type="input", rel_x=7.62, rel_y=-12.7, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="29", name="GND", type="power_in", rel_x=7.62, rel_y=-15.24, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="30", name="VIN", type="power_in", rel_x=7.62, rel_y=-17.78, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
        ]
    ),

    "BME280": Component(
        ref="U_ENV1",
        name="BME280 Environmental Sensor",
        package="Module",
        footprint="Package_LGA:Bosch_LGA-8_2.5x2.5mm_P0.65mm_ClockwisePinNumbering",
        value="BME280",
        category="Sensor",
        description="Combined humidity, pressure and temperature sensor with digital I2C/SPI",
        datasheet="https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf",
        width_mm=11.5,
        height_mm=15.0,
        specs={"voltage_min": 1.71, "voltage_max": 3.6, "voltage_nominal": 3.3, "interface": "I2C"},
        pins=[
            Pin(number="1", name="VCC", type="power_in", rel_x=-3.81, rel_y=-6.0, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=0.9),
            Pin(number="2", name="GND", type="power_in", rel_x=-1.27, rel_y=-6.0, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=0.9),
            Pin(number="3", name="SCL", type="input", rel_x=1.27, rel_y=-6.0, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=0.9),
            Pin(number="4", name="SDA", type="bidirectional", rel_x=3.81, rel_y=-6.0, pad_size_x=1.6, pad_size_y=1.6, hole_diameter=0.9),
        ]
    ),

    "HC_SR04": Component(
        ref="U_SONAR1",
        name="HC-SR04 Ultrasonic Distance Sensor",
        package="Module",
        footprint="Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical",
        value="HC-SR04",
        category="Sensor",
        description="Ultrasonic ranging module with 2cm-400cm non-contact measurement",
        width_mm=45.0,
        height_mm=20.0,
        specs={"voltage_nominal": 5.0, "working_current_ma": 15},
        pins=[
            Pin(number="1", name="VCC", type="power_in", rel_x=-3.81, rel_y=-8.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="2", name="TRIG", type="input", rel_x=-1.27, rel_y=-8.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="3", name="ECHO", type="output", rel_x=1.27, rel_y=-8.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
            Pin(number="4", name="GND", type="power_in", rel_x=3.81, rel_y=-8.0, pad_size_x=1.7, pad_size_y=1.7, hole_diameter=1.0),
        ]
    ),

    "MOSFET_2N7002": Component(
        ref="Q1",
        name="2N7002 N-Channel MOSFET",
        package="SOT-23",
        footprint="Package_TO_SOT_SMD:SOT-23",
        value="60V 115mA",
        category="Discrete",
        description="Small Signal N-Channel Field-Effect Transistor",
        width_mm=2.9,
        height_mm=2.4,
        specs={"vds_max": 60, "id_max": 0.115},
        pins=[
            Pin(number="1", name="G", type="input", rel_x=-0.95, rel_y=-1.0, pad_size_x=0.8, pad_size_y=1.0),
            Pin(number="2", name="S", type="passive", rel_x=0.95, rel_y=-1.0, pad_size_x=0.8, pad_size_y=1.0),
            Pin(number="3", name="D", type="passive", rel_x=0.0, rel_y=1.0, pad_size_x=0.8, pad_size_y=1.0),
        ]
    ),

    "DIODE_1N4007": Component(
        ref="D_REC1",
        name="1N4007 Rectifier Diode",
        package="DO-41",
        footprint="Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal",
        value="1A 1000V",
        category="Discrete",
        description="Standard 1A 1000V Silicon Rectifier Diode",
        width_mm=10.16,
        height_mm=3.0,
        pins=[
            Pin(number="1", name="K", type="passive", rel_x=-5.08, rel_y=0.0, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=1.0),
            Pin(number="2", name="A", type="passive", rel_x=5.08, rel_y=0.0, pad_size_x=1.8, pad_size_y=1.8, hole_diameter=1.0),
        ]
    )
}

def get_component_definition(name_or_alias: str) -> Optional[Component]:
    key = name_or_alias.upper().strip()
    # Direct match
    for k, comp in STANDARD_COMPONENTS.items():
        if k.upper() == key:
            return comp.model_copy(deep=True)
            
    # Fuzzy / alias matching
    if "ARDUINO" in key or "NANO" in key or "ATMEGA" in key:
        return STANDARD_COMPONENTS["ARDUINO_NANO"].model_copy(deep=True)
    if "BME280" in key or "BMP280" in key or "PRESSURE" in key or "HUMIDITY" in key:
        return STANDARD_COMPONENTS["BME280"].model_copy(deep=True)
    if "HC-SR04" in key or "HCSR04" in key or "ULTRASONIC" in key or "SONAR" in key:
        return STANDARD_COMPONENTS["HC_SR04"].model_copy(deep=True)
    if "MOSFET" in key or "2N7002" in key or "TRANSISTOR" in key:
        return STANDARD_COMPONENTS["MOSFET_2N7002"].model_copy(deep=True)
    if "1N4007" in key or "RECTIFIER" in key or "DIODE" in key:
        return STANDARD_COMPONENTS["DIODE_1N4007"].model_copy(deep=True)
    if "ESP32" in key:
        return STANDARD_COMPONENTS["ESP32-WROOM-32"].model_copy(deep=True)
    if "MPU" in key or "6050" in key or "GYRO" in key or "ACCEL" in key:
        return STANDARD_COMPONENTS["MPU6050"].model_copy(deep=True)
    if "OLED" in key or "SSD1306" in key or "DISPLAY" in key:
        return STANDARD_COMPONENTS["OLED_SSD1306"].model_copy(deep=True)
    if "TP4056" in key or "CHARGER" in key or "BATTERY" in key:
        return STANDARD_COMPONENTS["TP4056"].model_copy(deep=True)
    if "AMS1117" in key or "REGULATOR" in key or "LDO" in key or "3.3V" in key:
        return STANDARD_COMPONENTS["AMS1117-3.3"].model_copy(deep=True)
    if key.startswith("R") or "RESISTOR" in key:
        comp = STANDARD_COMPONENTS["RESISTOR_0805"].model_copy(deep=True)
        return comp
    if key.startswith("C") or "CAPACITOR" in key:
        comp = STANDARD_COMPONENTS["CAPACITOR_0805"].model_copy(deep=True)
        return comp
    if "LED" in key:
        return STANDARD_COMPONENTS["LED_0805"].model_copy(deep=True)
    if "BUTTON" in key or "SWITCH" in key:
        return STANDARD_COMPONENTS["PUSHBUTTON"].model_copy(deep=True)
    if "HEADER" in key:
        return STANDARD_COMPONENTS["HEADER_4PIN"].model_copy(deep=True)
    if "TERMINAL" in key or "SCREW" in key:
        return STANDARD_COMPONENTS["TERMINAL_BLOCK_2PIN"].model_copy(deep=True)
        
    return None

def search_components(query: str) -> List[Component]:
    q = query.lower().strip()
    if not q:
        return [c.model_copy(deep=True) for c in STANDARD_COMPONENTS.values()]
    results = []
    for comp in STANDARD_COMPONENTS.values():
        if (q in comp.name.lower() or 
            q in comp.ref.lower() or 
            q in comp.category.lower() or 
            q in (comp.description or "").lower() or 
            q in comp.footprint.lower()):
            results.append(comp.model_copy(deep=True))
    return results

