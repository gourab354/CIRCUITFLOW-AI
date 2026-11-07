export type LayerType = 'F.Cu' | 'B.Cu' | 'Edge.Cuts' | 'F.SilkS' | 'B.SilkS' | 'F.Mask' | 'B.Mask';

export interface Pin {
  number: string;
  name: string;
  type: string;
  net?: string | null;
  rel_x: number;
  rel_y: number;
  pad_shape: string;
  pad_size_x: number;
  pad_size_y: number;
  hole_diameter: number;
}

export interface Component {
  ref: string;
  name: string;
  package: string;
  footprint: string;
  value: string;
  datasheet?: string | null;
  description?: string | null;
  category: string;
  x: number;
  y: number;
  rotation: number;
  layer: string;
  width_mm: number;
  height_mm: number;
  pins: Pin[];
  specs: Record<string, any>;
}

export interface NetNode {
  component_ref: string;
  pin_number: string;
}

export interface Net {
  name: string;
  net_class: string;
  min_width_mm: number;
  clearance_mm: number;
  color?: string | null;
  nodes: NetNode[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Track {
  id: string;
  net: string;
  layer: string;
  width_mm: number;
  start: Point2D;
  end: Point2D;
}

export interface Via {
  id: string;
  net: string;
  x: number;
  y: number;
  drill_mm: number;
  diameter_mm: number;
  layers: [string, string];
}

export interface MountingHole {
  x: number;
  y: number;
  diameter_mm: number;
  pad_diameter_mm: number;
}

export interface CopperZone {
  id: string;
  net: string;
  layer: string;
  clearance_mm: number;
  polygon: Point2D[];
}

export interface BoardDesign {
  width_mm: number;
  height_mm: number;
  shape: string;
  corner_radius_mm: number;
  layers: number;
  thickness_mm: number;
  copper_weight_oz: number;
  solder_mask_color: string;
  silkscreen_color: string;
  surface_finish: string;
  mounting_holes: MountingHole[];
}

export interface DesignRules {
  min_track_width_mm: number;
  default_track_width_mm: number;
  power_track_width_mm: number;
  min_clearance_mm: number;
  min_via_drill_mm: number;
  min_via_diameter_mm: number;
  board_edge_clearance_mm: number;
  hole_to_hole_clearance_mm: number;
}

export interface DRCViolation {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  net?: string | null;
  component_ref?: string | null;
  location?: Point2D | null;
  suggested_fix?: string | null;
}

export interface ERCViolation {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  pin?: string | null;
  component_ref?: string | null;
  suggested_fix?: string | null;
}

export interface CircuitModel {
  board: BoardDesign;
  rules: DesignRules;
  components: Component[];
  nets: Net[];
  tracks: Track[];
  vias: Via[];
  zones: CopperZone[];
  drc_violations: DRCViolation[];
  erc_violations: ERCViolation[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  step: number; // 1 to 10
  beginner_mode: boolean;
  created_at: string;
  updated_at: string;
  circuit: CircuitModel;
  raw_input_prompt: string;
  questionnaire_answers: Record<string, any>;
  history: any[];
  history_index: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  step: number;
  beginner_mode: boolean;
  created_at: string;
  updated_at: string;
  component_count: number;
  net_count: number;
  drc_clean: boolean;
}

export interface QuestionOption {
  label: string;
  value: any;
  description?: string;
  is_default?: boolean;
}

export interface QuestionItem {
  id: string;
  title: string;
  prompt: string;
  explanation: string;
  category: string;
  options: QuestionOption[];
  default_value: any;
  allow_custom: boolean;
  input_type: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  question?: QuestionItem | null;
  action_type?: string | null;
  metadata?: Record<string, any>;
}

export interface CircuitAnalysisResult {
  detected_components: Component[];
  detected_nets: Net[];
  missing_information: string[];
  power_requirements: Record<string, any>;
  voltage_compatibility_notes: string[];
  communication_protocols: string[];
  potential_conflicts: string[];
  confidence: number;
  summary: string;
}
