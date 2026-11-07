import React, { useEffect, useState } from 'react';
import { 
  Download, FileCheck, AlertTriangle, CheckCircle2, 
  Archive, FileSpreadsheet, Layers, Box, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';

export const ExportCenter: React.FC = () => {
  const { currentProject, addLog } = useAppStore();
  const [exportStatus, setExportStatus] = useState<any>(null);

  useEffect(() => {
    if (!currentProject) return;
    api.getExportStatus(currentProject.id).then(setExportStatus).catch(() => {});
  }, [currentProject?.id]);

  if (!currentProject) return null;

  const isReady = exportStatus?.manufacturing_ready;
  const drcErrors = exportStatus?.drc_error_count || 0;

  return (
    <div className="flex-1 bg-[#0b0f19] p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Step Header */}
        <div className="flex items-center justify-between border-b border-pcb-border pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-sm font-bold flex items-center justify-center border border-cyan-500/30">
              10
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Manufacturing Export Center</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate and download fabrication files formatted for industrial PCB houses and SMT assemblers.
              </p>
            </div>
          </div>
        </div>

        {/* Golden Rule Banner: Never label unvalidated design as manufacturing-ready */}
        {isReady ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-300">
                VERIFIED MANUFACTURING-READY
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                All physical DRC clearances, minimum track widths, and electrical rules have been validated. This package is 100% compliant and ready for direct upload to JLCPCB, PCBWay, Seeed Fusion, or OSH Park.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-300">
                DESIGN HAS UNRESOLVED DRC VIOLATIONS ({drcErrors} ERRORS)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                As per CircuitFlow AI quality standards, this package is currently marked as <strong>UNVALIDATED</strong>. You can export files for inspection, but do not send to fabrication until all DRC errors are resolved in Step 9.
              </p>
            </div>
          </div>
        )}

        {/* Primary Download: Complete Production Archive */}
        <div className="bg-gradient-to-r from-slate-900 to-[#131b2e] border border-cyan-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Complete Production ZIP Archive</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              Bundles RS-274X Gerbers, Excellon Drill, JLCPCB BOM CSV, Pick & Place (CPL) Centroid CSV, Vector Schematic SVG, KiCad native project files, and Manufacturing Compliance Report.
            </p>
          </div>

          <a
            href={api.getZipUrl(currentProject.id)}
            download
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 shrink-0"
          >
            <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            Download ZIP Bundle
          </a>
        </div>

        {/* Individual Deliverables Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* 1. Gerber & Drill */}
          <div className="bg-slate-900/80 border border-pcb-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-slate-200">Gerber RS-274X & Drill</h3>
                <p className="text-[10px] text-slate-400">F_Cu, B_Cu, F_Mask, B_Mask, SilkS, Edge_Cuts, .drl</p>
              </div>
            </div>
            <a
              href={api.getZipUrl(currentProject.id)}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Gerber Files
            </a>
          </div>

          {/* 2. BOM Bill of Materials */}
          <div className="bg-slate-900/80 border border-pcb-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-slate-200">Bill of Materials (BOM)</h3>
                <p className="text-[10px] text-slate-400">Formatted for JLCPCB & PCBWay automated quotation</p>
              </div>
            </div>
            <a
              href={api.getBomUrl(currentProject.id)}
              download
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download BOM (.csv)
            </a>
          </div>

          {/* 3. Pick and Place CPL */}
          <div className="bg-slate-900/80 border border-pcb-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-slate-200">Pick and Place (CPL)</h3>
                <p className="text-[10px] text-slate-400">Centroid coordinates (Mid X, Mid Y, Rotation, Layer)</p>
              </div>
            </div>
            <a
              href={api.getCplUrl(currentProject.id)}
              download
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download CPL (.csv)
            </a>
          </div>

          {/* 4. KiCad Project Files */}
          <div className="bg-slate-900/80 border border-pcb-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-slate-200">KiCad 10 Native Files</h3>
                <p className="text-[10px] text-slate-400">.kicad_pro, .kicad_sch, and .kicad_pcb source</p>
              </div>
            </div>
            <a
              href={api.getZipUrl(currentProject.id)}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Included in ZIP Bundle
            </a>
          </div>
        </div>

        {/* Fab House Direct Submission Guide */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
          <span className="font-semibold text-slate-300 block">How to order your PCB:</span>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Download the complete <strong>Fabrication ZIP Bundle</strong> above.</li>
            <li>Go to <span className="text-cyan-400">JLCPCB.com</span> or <span className="text-cyan-400">PCBWay.com</span> and click &quot;Quote Now&quot;.</li>
            <li>Drag and drop the downloaded ZIP file directly into their Gerber file uploader.</li>
            <li>For automated assembly, upload the generated BOM and Pick & Place (CPL) files.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
