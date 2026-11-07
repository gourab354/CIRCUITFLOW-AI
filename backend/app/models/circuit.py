from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field

class Pin(BaseModel):
    number: str
    name: str
    type: str = "passive"  # power_in, power_out, input, output, bidirectional, passive, unspecified
    net: Optional[str] = None
    rel_x: float = 0.0  # relative offset from component center in mm
    rel_y: float = 0.0
    pad_shape: str = "rect"  # rect, circle, roundrect, oval
    pad_size_x: float = 1.6  # mm
    pad_size_y: float = 1.6  # mm
    hole_diameter: float = 0.0  # 0 for SMD, > 0 for through-hole

class Component(BaseModel):
    ref: str  # Reference designator e.g. U1, R1, C1
    name: str  # e.g. ESP32-WROOM-32, 10k Resistor
    package: str = "SMD"  # SMD, THT, Module
    footprint: str = ""  # KiCad footprint name or identifier
    value: str = ""  # e.g. 10k, 100nF, ESP32
    datasheet: Optional[str] = None
    description: Optional[str] = None
    category: str = "IC"  # Microcontroller, Sensor, Passive, Power, Connector, Display, Discrete
    x: float = 0.0  # Board center X in mm
    y: float = 0.0  # Board center Y in mm
    rotation: float = 0.0  # degrees 0, 90, 180, 270
    layer: str = "F.Cu"  # F.Cu, B.Cu
    width_mm: float = 10.0
    height_mm: float = 10.0
    pins: List[Pin] = Field(default_factory=list)
    specs: Dict[str, Any] = Field(default_factory=dict)  # voltage_min, voltage_max, current_ma, etc.

class NetNode(BaseModel):
    component_ref: str
    pin_number: str

class Net(BaseModel):
    name: str
    net_class: str = "Default"  # Default, Power, HighCurrent, HighSpeed
    min_width_mm: float = 0.25
    clearance_mm: float = 0.2
    color: Optional[str] = None
    nodes: List[NetNode] = Field(default_factory=list)

class Point2D(BaseModel):
    x: float
    y: float

class Track(BaseModel):
    id: str
    net: str
    layer: str = "F.Cu"  # F.Cu, B.Cu
    width_mm: float = 0.25
    start: Point2D
    end: Point2D

class Via(BaseModel):
    id: str
    net: str
    x: float
    y: float
    drill_mm: float = 0.3
    diameter_mm: float = 0.6
    layers: Tuple[str, str] = ("F.Cu", "B.Cu")

class MountingHole(BaseModel):
    x: float
    y: float
    diameter_mm: float = 3.2
    pad_diameter_mm: float = 6.0

class CopperZone(BaseModel):
    id: str
    net: str = "GND"
    layer: str = "B.Cu"
    clearance_mm: float = 0.3
    polygon: List[Point2D] = Field(default_factory=list)

class BoardDesign(BaseModel):
    width_mm: float = 70.0
    height_mm: float = 50.0
    shape: str = "rectangular"  # rectangular, circular, rounded_rect
    corner_radius_mm: float = 3.0
    layers: int = 2  # 1, 2, 4
    thickness_mm: float = 1.6
    copper_weight_oz: float = 1.0
    solder_mask_color: str = "green"  # green, black, blue, red, white, yellow, purple
    silkscreen_color: str = "white"
    surface_finish: str = "HASL"  # HASL, ENIG, Lead-free HASL
    mounting_holes: List[MountingHole] = Field(default_factory=list)

class DesignRules(BaseModel):
    min_track_width_mm: float = 0.2
    default_track_width_mm: float = 0.25
    power_track_width_mm: float = 0.5
    min_clearance_mm: float = 0.2
    min_via_drill_mm: float = 0.3
    min_via_diameter_mm: float = 0.6
    board_edge_clearance_mm: float = 0.5
    hole_to_hole_clearance_mm: float = 0.5

class DRCViolation(BaseModel):
    id: str
    type: str  # clearance, track_width, unconnected_net, out_of_bounds, short_circuit
    severity: str = "error"  # error, warning, info
    message: str
    net: Optional[str] = None
    component_ref: Optional[str] = None
    location: Optional[Point2D] = None
    suggested_fix: Optional[str] = None

class ERCViolation(BaseModel):
    id: str
    type: str  # unconnected_pin, voltage_mismatch, missing_pullup, missing_power, pin_conflict
    severity: str = "error"  # error, warning, info
    message: str
    pin: Optional[str] = None
    component_ref: Optional[str] = None
    suggested_fix: Optional[str] = None

class CircuitModel(BaseModel):
    board: BoardDesign = Field(default_factory=BoardDesign)
    rules: DesignRules = Field(default_factory=DesignRules)
    components: List[Component] = Field(default_factory=list)
    nets: List[Net] = Field(default_factory=list)
    tracks: List[Track] = Field(default_factory=list)
    vias: List[Via] = Field(default_factory=list)
    zones: List[CopperZone] = Field(default_factory=list)
    drc_violations: List[DRCViolation] = Field(default_factory=list)
    erc_violations: List[ERCViolation] = Field(default_factory=list)

