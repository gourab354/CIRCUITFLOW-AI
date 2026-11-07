import React, { useState, useEffect } from 'react';
import { 
  Send, Sparkles, AlertCircle, CheckCircle2, ArrowRight, 
  HelpCircle, Zap, ShieldAlert, Cpu, Layers, Sliders, ChevronRight 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../services/api';
import { CircuitAnalysisResult, QuestionItem, ChatMessage } from '../../types';

export const AIAssistantView: React.FC = () => {
  const { 
    currentProject, refreshCurrentProject, setActiveTab, 
    addLog, setProcessing, isProcessing, beginnerMode 
  } = useAppStore();

  const [promptInput, setPromptInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<CircuitAnalysisResult | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [questionnaireFinished, setQuestionnaireFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userChatInput, setUserChatInput] = useState('');

  // Sample prompt from User Request
  const samplePrompt = 
`I want to make a PCB using ESP32, MPU6050, OLED display, and TP4056 charging module.

Connections:
ESP32 GPIO21 -> MPU6050 SDA
ESP32 GPIO22 -> MPU6050 SCL
ESP32 GPIO18 -> OLED SCL
ESP32 GPIO19 -> OLED SDA`;

  // Fetch initial question and chat history
  useEffect(() => {
    if (!currentProject) return;
    loadQuestion(0);
    loadHistory();
  }, [currentProject?.id]);

  const loadHistory = async () => {
    if (!currentProject) return;
    try {
      const hist = await api.getChatHistory(currentProject.id);
      setChatMessages(hist);
    } catch (e) {}
  };

  const loadQuestion = async (idx: number) => {
    if (!currentProject) return;
    try {
      const data = await api.getQuestion(currentProject.id, idx);
      if (data.completed) {
        setQuestionnaireFinished(true);
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(data.question);
        setQuestionIndex(data.index);
        setTotalQuestions(data.total);
        setSelectedOption(data.question.default_value);
      }
    } catch (e: any) {
      addLog(`Failed to load interview question: ${e.message}`, 'error');
    }
  };

  const handleParseCircuit = async () => {
    if (!currentProject || !promptInput.trim()) return;
    try {
      setProcessing(true, 'Analyzing circuit description and verifying pin mappings...');
      addLog('Analyzing circuit with AI NLU Engine...', 'info');
      const res = await api.parseCircuit(currentProject.id, promptInput);
      setAnalysisResult(res);
      await refreshCurrentProject();
      addLog(`Detected ${res.detected_components.length} components and ${res.detected_nets.length} nets.`, 'success');
      loadHistory();
    } catch (e: any) {
      addLog(`Parse error: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentProject || !currentQuestion) return;
    try {
      setProcessing(true, 'Applying preferences to board geometry...');
      await api.submitAnswer(currentProject.id, currentQuestion.id, selectedOption);
      await refreshCurrentProject();
      addLog(`Set ${currentQuestion.title}: ${selectedOption}`, 'info');
      // Advance to next question
      loadQuestion(questionIndex + 1);
    } catch (e: any) {
      addLog(`Failed to submit answer: ${e.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSendChat = async () => {
    if (!currentProject || !userChatInput.trim()) return;
    const msg = userChatInput;
    setUserChatInput('');
    try {
      await api.sendChatMessage(currentProject.id, msg);
      loadHistory();
    } catch (e) {}
  };

  return (
    <div className="flex-1 bg-[#0b0f19] flex overflow-hidden">
      {/* Left Column: Natural Language Input & Interactive Questionnaire */}
      <div className="w-1/2 border-r border-pcb-border flex flex-col justify-between overflow-y-auto p-6 space-y-6">
        {/* STEP 2: Circuit Description Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/30">
                2
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">Describe Your Circuit</h2>
            </div>
            <button
              onClick={() => setPromptInput(samplePrompt)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-md transition-colors"
            >
              Insert ESP32 Example
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Tell CircuitFlow AI which ICs, sensors, modules, or pin connections you want.
          </p>

          <div className="relative">
            <textarea
              rows={6}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. I want an ESP32 connected to MPU6050 and an OLED display via I2C..."
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
            <button
              onClick={handleParseCircuit}
              disabled={isProcessing || !promptInput.trim()}
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze Circuit
            </button>
          </div>
        </div>

        {/* STEP 4: Interactive Questioning (One at a time) */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-mono text-xs font-bold flex items-center justify-center border border-blue-500/30">
                4
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">Interactive Design Preferences</h2>
            </div>
            {!questionnaireFinished && (
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Question {questionIndex + 1} of {totalQuestions}
              </span>
            )}
          </div>

          {currentQuestion && !questionnaireFinished && (
            <div className="bg-slate-900/90 border border-pcb-border rounded-xl p-5 space-y-4 shadow-lg animate-in fade-in">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block mb-0.5">
                  {currentQuestion.category}
                </span>
                <h3 className="text-sm font-semibold text-white">{currentQuestion.prompt}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedOption(opt.value)}
                    className={`p-3 rounded-lg border cursor-pointer text-xs transition-all flex items-start gap-3 ${
                      selectedOption === opt.value
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      checked={selectedOption === opt.value}
                      onChange={() => setSelectedOption(opt.value)}
                      className="mt-0.5 text-cyan-500 focus:ring-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{opt.label}</span>
                        {opt.is_default && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Recommended
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{opt.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={handleAnswerSubmit}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  Confirm & Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {questionnaireFinished && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-sm text-emerald-300">Design Preferences Collected!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All physical board parameters, stack-up, and manufacturing constraints have been configured.
              </p>
              <button
                onClick={() => setActiveTab('components')}
                className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
              >
                Proceed to Component Verification &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: STEP 3 AI Circuit Analysis Results & Engineering Chat */}
      <div className="w-1/2 flex flex-col justify-between p-6 space-y-6 overflow-y-auto">
        {/* STEP 3 Analysis Card */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold flex items-center justify-center border border-amber-500/30">
              3
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">AI Circuit Analysis</h2>
          </div>

          {analysisResult ? (
            <div className="bg-slate-900/90 border border-pcb-border rounded-xl p-5 space-y-4 shadow-lg">
              {/* Summary */}
              <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">{analysisResult.summary}</p>
              </div>

              {/* Detected Components Chip Cloud */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Detected Components ({analysisResult.detected_components.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.detected_components.map((c) => (
                    <span
                      key={c.ref}
                      className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-cyan-300 font-mono"
                    >
                      {c.ref}: {c.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Protocols & Voltage Compatibility */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Communication Protocols</span>
                  {analysisResult.communication_protocols.map((p, i) => (
                    <p key={i} className="text-slate-300 text-[11px]">&bull; {p}</p>
                  ))}
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Voltage Specifications</span>
                  {analysisResult.voltage_compatibility_notes.map((v, i) => (
                    <p key={i} className="text-slate-300 text-[11px]">&bull; {v}</p>
                  ))}
                </div>
              </div>

              {/* Missing Information / Non-hallucination Clarifications */}
              {analysisResult.missing_information.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Incomplete Connections Detected (No Hallucination)</span>
                  </div>
                  {analysisResult.missing_information.map((m, i) => (
                    <p key={i} className="text-[11px] text-slate-300 leading-relaxed">&bull; {m}</p>
                  ))}
                </div>
              )}

              {/* Potential Electrical Conflicts */}
              {analysisResult.potential_conflicts.length > 0 && (
                <div className="bg-red-950/30 border border-red-500/30 p-3 rounded-lg space-y-1 text-xs">
                  <span className="text-red-400 font-bold">Electrical Conflicts:</span>
                  {analysisResult.potential_conflicts.map((c, i) => (
                    <p key={i} className="text-[11px] text-slate-300">&bull; {c}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
              <Zap className="w-6 h-6 text-slate-600 mx-auto" />
              <p>Type your circuit description on the left and click &quot;Analyze Circuit&quot; to inspect components, pins, and electrical rules.</p>
            </div>
          )}
        </div>

        {/* Engineering Conversation Feed */}
        <div className="flex-1 flex flex-col justify-between bg-slate-900/70 border border-pcb-border rounded-xl p-3 min-h-[220px]">
          <div className="text-[11px] font-semibold text-slate-400 border-b border-slate-800 pb-2">
            Engineering Assistant Chat
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 max-h-52">
            {chatMessages.length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-6">
                Ask questions about component selection, power budgets, or trace routing.
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg text-xs leading-relaxed max-w-[85%] ${
                    msg.role === 'user'
                      ? 'ml-auto bg-cyan-600 text-white'
                      : 'mr-auto bg-slate-800 text-slate-200 border border-slate-700'
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={userChatInput}
              onChange={(e) => setUserChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Ask an electrical or layout question..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSendChat}
              className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
