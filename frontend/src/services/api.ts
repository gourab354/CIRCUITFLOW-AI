import { 
  Project, ProjectSummary, CircuitAnalysisResult, ChatMessage, 
  Component, Track, Via, BoardDesign, DRCViolation, ERCViolation 
} from '../types';

const API_BASE = 'http://127.0.0.1:8000';

export const api = {
  // Projects
  async getProjects(): Promise<ProjectSummary[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async createProject(name: string, description: string = '', template?: string, beginnerMode: boolean = true): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, template, beginner_mode: beginnerMode })
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to load project');
    return res.json();
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update project');
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  async duplicateProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate project');
    return res.json();
  },

  // AI Assistant & Questionnaire
  async parseCircuit(projectId: string, prompt: string): Promise<CircuitAnalysisResult> {
    const res = await fetch(`${API_BASE}/ai/${projectId}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('Circuit parsing failed');
    return res.json();
  },

  async getQuestion(projectId: string, index: number) {
    const res = await fetch(`${API_BASE}/ai/${projectId}/question/${index}`);
    if (!res.ok) throw new Error('Failed to load question');
    return res.json();
  },

  async submitAnswer(projectId: string, questionId: string, answer: any) {
    const res = await fetch(`${API_BASE}/ai/${projectId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, answer })
    });
    if (!res.ok) throw new Error('Failed to submit answer');
    return res.json();
  },

  async getChatHistory(projectId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/ai/${projectId}/history`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async sendChatMessage(projectId: string, content: string): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/ai/${projectId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  // Components & KiCad Libraries
  async searchCatalog(query: string = ''): Promise<Component[]> {
    const res = await fetch(`${API_BASE}/components/catalog?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search catalog');
    return res.json();
  },

  async searchFootprints(query: string = ''): Promise<{ count: number; footprints: string[] }> {
    const res = await fetch(`${API_BASE}/components/footprints?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search footprints');
    return res.json();
  },

  async addComponent(projectId: string, compName: string): Promise<Component> {
    const res = await fetch(`${API_BASE}/components/${projectId}/add?comp_name=${encodeURIComponent(compName)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add component');
    return res.json();
  },

  async updateComponent(projectId: string, compRef: string, updates: Record<string, any>): Promise<Component> {
    const res = await fetch(`${API_BASE}/components/${projectId}/${compRef}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update component');
    return res.json();
  },

  async removeComponent(projectId: string, compRef: string) {
    const res = await fetch(`${API_BASE}/components/${projectId}/${compRef}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove component');
    return res.json();
  },

  // Schematic
  async getSchematicLayout(projectId: string) {
    const res = await fetch(`${API_BASE}/schematic/${projectId}/layout`);
    if (!res.ok) throw new Error('Failed to load schematic layout');
    return res.json();
  },

  async getSchematicSvg(projectId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/schematic/${projectId}/svg`);
    if (!res.ok) throw new Error('Failed to fetch schematic SVG');
    return res.text();
  },

  async connectPins(projectId: string, netName: string, compA: string, pinA: string, compB: string, pinB: string) {
    const params = new URLSearchParams({
      net_name: netName,
      comp_a: compA,
      pin_a: pinA,
      comp_b: compB,
      pin_b: pinB
    });
    const res = await fetch(`${API_BASE}/schematic/${projectId}/connect?${params.toString()}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to connect pins');
    return res.json();
  },

  // PCB Placement & Routing
  async runAutoPlace(projectId: string) {
    const res = await fetch(`${API_BASE}/pcb/${projectId}/autoplace`, { method: 'POST' });
    if (!res.ok) throw new Error('Auto placement failed');
    return res.json();
  },

  async runAutoRoute(projectId: string) {
    const res = await fetch(`${API_BASE}/pcb/${projectId}/autoroute`, { method: 'POST' });
    if (!res.ok) throw new Error('Auto routing failed');
    return res.json();
  },

  async moveComponent(projectId: string, compRef: string, x: number, y: number) {
    const res = await fetch(`${API_BASE}/pcb/${projectId}/component/move?comp_ref=${compRef}&x=${x}&y=${y}`, { method: 'POST' });
    if (!res.ok) throw new Error('Move component failed');
    return res.json();
  },

  async rotateComponent(projectId: string, compRef: string, degrees: number = 90) {
    const res = await fetch(`${API_BASE}/pcb/${projectId}/component/rotate?comp_ref=${compRef}&degrees=${degrees}`, { method: 'POST' });
    if (!res.ok) throw new Error('Rotate component failed');
    return res.json();
  },

  async updateBoard(projectId: string, board: BoardDesign): Promise<BoardDesign> {
    const res = await fetch(`${API_BASE}/pcb/${projectId}/board`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board)
    });
    if (!res.ok) throw new Error('Failed to update board');
    return res.json();
  },

  // Validation
  async runValidation(projectId: string): Promise<{
    status: string;
    clean: boolean;
    error_count: number;
    warning_count: number;
    drc_violations: DRCViolation[];
    erc_violations: ERCViolation[];
    summary: string;
  }> {
    const res = await fetch(`${API_BASE}/validation/${projectId}/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Validation failed');
    return res.json();
  },

  // Export
  getZipUrl(projectId: string): string {
    return `${API_BASE}/export/${projectId}/zip`;
  },

  getBomUrl(projectId: string): string {
    return `${API_BASE}/export/${projectId}/bom`;
  },

  getCplUrl(projectId: string): string {
    return `${API_BASE}/export/${projectId}/cpl`;
  },

  async getExportStatus(projectId: string) {
    const res = await fetch(`${API_BASE}/export/${projectId}/status`);
    if (!res.ok) throw new Error('Failed to get export status');
    return res.json();
  }
};
