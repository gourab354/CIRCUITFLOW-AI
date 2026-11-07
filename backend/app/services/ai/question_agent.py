from typing import List, Dict, Any, Optional
from backend.app.models.ai import QuestionItem, QuestionOption, ChatMessage
from backend.app.models.circuit import CircuitModel, MountingHole

QUESTIONS_LIST: List[QuestionItem] = [
    QuestionItem(
        id="pcb_dimensions",
        title="PCB Dimensions",
        prompt="What board size (length × width) would you like for your PCB?",
        explanation="Standard compact dimensions like 60mm × 40mm fit most portable projects. Smaller boards cost less to fabricate.",
        category="Mechanical",
        input_type="select",
        default_value="60x40",
        options=[
            QuestionOption(label="Compact (50 × 35 mm)", value="50x35", description="Great for tiny wearables or sensor pods"),
            QuestionOption(label="Standard (60 × 40 mm)", value="60x40", description="Recommended: Balanced spacing for easy routing", is_default=True),
            QuestionOption(label="Spacious (80 × 50 mm)", value="80x50", description="Plenty of space for headers and labels"),
            QuestionOption(label="Custom dimensions", value="custom", description="Specify your own width and height in mm")
        ]
    ),
    QuestionItem(
        id="pcb_shape",
        title="PCB Shape",
        prompt="What board shape would you prefer?",
        explanation="Rectangular boards are standard and supported by all PCB manufacturers with no extra routing fee. Rounded corners prevent sharp edges.",
        category="Mechanical",
        input_type="select",
        default_value="rounded_rect",
        options=[
            QuestionOption(label="Rounded Rectangle (Recommended)", value="rounded_rect", description="Professional 3mm corner radius", is_default=True),
            QuestionOption(label="Standard Rectangle", value="rectangular", description="Sharp 90-degree corners"),
            QuestionOption(label="Circular", value="circular", description="Ideal for cylindrical enclosures or gauges")
        ]
    ),
    QuestionItem(
        id="solder_mask_color",
        title="PCB Solder Mask Color",
        prompt="Which solder mask color would you like for your PCB exterior?",
        explanation="Green is the industry standard with fastest turnaround. Matte black and blue give a sleek modern aesthetic.",
        category="Aesthetics",
        input_type="select",
        default_value="green",
        options=[
            QuestionOption(label="Classic Green (Fastest fabrication)", value="green", description="Highest contrast for inspecting copper traces", is_default=True),
            QuestionOption(label="Matte Black (Sleek Stealth)", value="black", description="Popular for commercial consumer devices"),
            QuestionOption(label="Deep Blue (Modern Tech)", value="blue", description="Clean professional laboratory look"),
            QuestionOption(label="Ruby Red (Striking)", value="red", description="High visibility for robotics and development boards"),
            QuestionOption(label="Ghost White", value="white", description="Excellent for LED lighting applications")
        ]
    ),
    QuestionItem(
        id="pcb_layers",
        title="Number of Copper Layers",
        prompt="How many copper layers should the PCB have?",
        explanation="2-Layer boards (Top and Bottom) are standard and economical. Top layer holds components and signal traces, while Bottom layer serves as a solid Ground Plane for noise immunity.",
        category="Electrical",
        input_type="select",
        default_value=2,
        options=[
            QuestionOption(label="2 Layers (Recommended)", value=2, description="Top + Bottom copper. Ideal for 98% of microcontroller projects", is_default=True),
            QuestionOption(label="4 Layers (High-Density)", value=4, description="Top signal, Inner GND, Inner Power, Bottom signal. Superior EMI shielding")
        ]
    ),
    QuestionItem(
        id="mounting_holes",
        title="Mounting Holes",
        prompt="Do you need M3 mounting holes in the board corners?",
        explanation="M3 holes (3.2mm diameter) allow you to securely screw the PCB into 3D-printed enclosures or robot chassis.",
        category="Mechanical",
        input_type="select",
        default_value="4_corners",
        options=[
            QuestionOption(label="4 Corner M3 Holes (Recommended)", value="4_corners", description="3.2mm holes placed 3.5mm from each board edge", is_default=True),
            QuestionOption(label="2 Opposite Holes", value="2_opposite", description="Diagonal mounting for ultra-compact enclosures"),
            QuestionOption(label="No Mounting Holes", value="none", description="Board will be friction-fit or slide-in")
        ]
    ),
    QuestionItem(
        id="component_style",
        title="Component Package Style",
        prompt="Do you prefer Surface Mount (SMD) or Through-Hole (THT) components?",
        explanation="SMD components are compact and modern. Through-Hole components have long pins that go through holes, making them easier to hand-solder for beginners.",
        category="Assembly",
        input_type="select",
        default_value="mixed",
        options=[
            QuestionOption(label="Mixed / Standard (Recommended)", value="mixed", description="SMD passives + IC modules with standard pin headers", is_default=True),
            QuestionOption(label="Through-Hole Only (Beginner Hand Solder)", value="tht", description="Large pins with holes for standard soldering irons"),
            QuestionOption(label="Pure SMD (High Density)", value="smd", description="0805 passives and surface mount ICs")
        ]
    ),
    QuestionItem(
        id="track_width",
        title="Track Width & Current Preference",
        prompt="What trace width profile would you like for signals and power rails?",
        explanation="Signal traces use 0.25mm (10 mil) for tight routing. Power traces use 0.5mm (20 mil) to carry high current without heating up.",
        category="Manufacturing",
        input_type="select",
        default_value="standard",
        options=[
            QuestionOption(label="Standard Engineering (Recommended)", value="standard", description="0.25mm signals, 0.50mm power rails", is_default=True),
            QuestionOption(label="Robust / Heavy Copper", value="robust", description="0.35mm signals, 0.80mm power rails for high vibration / current"),
            QuestionOption(label="Ultra Fine (High Density)", value="fine", description="0.15mm signals for tightly spaced BGA/QFP pins")
        ]
    ),
    QuestionItem(
        id="connector_preference",
        title="Connector Preferences",
        prompt="How will external power and signals connect to your board?",
        explanation="Standard 2.54mm pin headers fit breadboards and Dupont jumper wires. Screw terminals provide heavy-duty wiring.",
        category="Interconnect",
        input_type="select",
        default_value="pin_headers",
        options=[
            QuestionOption(label="2.54mm Dupont Pin Headers (Recommended)", value="pin_headers", description="Standard male/female jumper header strips", is_default=True),
            QuestionOption(label="Screw Terminal Blocks", value="terminals", description="5.08mm screw clamps for bare wire connections"),
            QuestionOption(label="USB Type-C + Pin Headers", value="usb_c_headers", description="Modern USB-C 5V input + header break-outs")
        ]
    )
]

class QuestioningAgent:
    """Manages conversational requirements gathering."""

    def get_question_by_index(self, index: int) -> Optional[QuestionItem]:
        if 0 <= index < len(QUESTIONS_LIST):
            return QUESTIONS_LIST[index]
        return None

    def get_question_by_id(self, qid: str) -> Optional[QuestionItem]:
        for q in QUESTIONS_LIST:
            if q.id == qid:
                return q
        return None

    def apply_answer_to_circuit(self, circuit: CircuitModel, qid: str, answer_value: Any):
        """Updates the internal circuit and board model according to user's answer."""
        if qid == "pcb_dimensions":
            if answer_value == "50x35":
                circuit.board.width_mm = 50.0
                circuit.board.height_mm = 35.0
            elif answer_value == "60x40":
                circuit.board.width_mm = 60.0
                circuit.board.height_mm = 40.0
            elif answer_value == "80x50":
                circuit.board.width_mm = 80.0
                circuit.board.height_mm = 50.0
            elif isinstance(answer_value, str) and "x" in answer_value:
                parts = answer_value.split("x")
                try:
                    circuit.board.width_mm = float(parts[0])
                    circuit.board.height_mm = float(parts[1])
                except ValueError:
                    pass

        elif qid == "pcb_shape":
            circuit.board.shape = str(answer_value)
            if answer_value == "rounded_rect":
                circuit.board.corner_radius_mm = 3.0
            elif answer_value == "rectangular":
                circuit.board.corner_radius_mm = 0.0

        elif qid == "solder_mask_color":
            circuit.board.solder_mask_color = str(answer_value)

        elif qid == "pcb_layers":
            circuit.board.layers = int(answer_value)

        elif qid == "mounting_holes":
            circuit.board.mounting_holes.clear()
            w = circuit.board.width_mm
            h = circuit.board.height_mm
            margin = 3.5
            if answer_value == "4_corners":
                circuit.board.mounting_holes = [
                    MountingHole(x=margin, y=margin, diameter_mm=3.2),
                    MountingHole(x=w - margin, y=margin, diameter_mm=3.2),
                    MountingHole(x=margin, y=h - margin, diameter_mm=3.2),
                    MountingHole(x=w - margin, y=h - margin, diameter_mm=3.2),
                ]
            elif answer_value == "2_opposite":
                circuit.board.mounting_holes = [
                    MountingHole(x=margin, y=margin, diameter_mm=3.2),
                    MountingHole(x=w - margin, y=h - margin, diameter_mm=3.2),
                ]

        elif qid == "track_width":
            if answer_value == "robust":
                circuit.rules.default_track_width_mm = 0.35
                circuit.rules.power_track_width_mm = 0.80
            elif answer_value == "fine":
                circuit.rules.default_track_width_mm = 0.15
                circuit.rules.power_track_width_mm = 0.35
            else:
                circuit.rules.default_track_width_mm = 0.25
                circuit.rules.power_track_width_mm = 0.50

    def total_questions(self) -> int:
        return len(QUESTIONS_LIST)

questioning_agent = QuestioningAgent()

