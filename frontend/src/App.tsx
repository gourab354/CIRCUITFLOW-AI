import React from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/layout/Header';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightSidebar } from './components/layout/RightSidebar';
import { BottomPanel } from './components/layout/BottomPanel';
import { ProjectModal } from './components/dashboard/ProjectModal';
import { AIAssistantView } from './components/ai/AIAssistantView';
import { ComponentListView } from './components/components/ComponentListView';
import { SchematicEditor } from './components/schematic/SchematicEditor';
import { PCBEditor } from './components/pcb/PCBEditor';
import { PCBViewer3D } from './components/three/PCBViewer3D';
import { ValidationView } from './components/validation/ValidationView';
import { ExportCenter } from './components/export/ExportCenter';

export const App: React.FC = () => {
  const { currentProject, activeTab } = useAppStore();

  const showRightSidebar = currentProject && ['pcb', 'schematic', 'three', 'components'].includes(activeTab);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100">
      {/* 1. Global Header */}
      <Header />

      {/* 2. Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Workflow Sidebar */}
        <LeftSidebar />

        {/* Central Display Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {(!currentProject || activeTab === 'dashboard') && <ProjectModal />}
          {currentProject && activeTab === 'ai' && <AIAssistantView />}
          {currentProject && activeTab === 'components' && <ComponentListView />}
          {currentProject && activeTab === 'schematic' && <SchematicEditor />}
          {currentProject && activeTab === 'pcb' && <PCBEditor />}
          {currentProject && activeTab === 'three' && <PCBViewer3D />}
          {currentProject && activeTab === 'validation' && <ValidationView />}
          {currentProject && activeTab === 'export' && <ExportCenter />}
        </main>

        {/* Right Inspector & Layer Sidebar */}
        {showRightSidebar && <RightSidebar />}
      </div>

      {/* 3. Bottom Docked Console & DRC Panel */}
      {currentProject && <BottomPanel />}
    </div>
  );
};

export default App;
