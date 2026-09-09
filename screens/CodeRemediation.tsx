import React, { useState, useEffect } from 'react';
import { CodeEditor } from '../components/Lab/CodeEditor';
import { 
  ChevronLeft, Play, Check, ChevronDown, 
  Cpu, FileJson, Code2, Clock, Award, Terminal, 
  RefreshCw, Maximize2, Minimize2, Sun, Moon, 
  Settings, CheckCircle2, XCircle, AlertTriangle, 
  Loader2, Lock, ArrowRight, Sparkles, BookOpen
} from 'lucide-react';
import { remediationAPI, submissionsAPI } from '../services/apiService';
import { useTranslation } from '../hooks/useTranslation';

interface RemediationItem {
  id: number;
  courseTitle: string;
  moduleTitle: string;
  conceptName: string;
  status: 'needs_practice' | 'in_progress' | 'mastered';
  quizScore: number;
  challengeScore: number;
  diagnosisReason: string;
  starterCode: string;
  solutionCode: string;
  practiceHint: string;
  testCases: Array<{ input: string; expected?: string; expected_output?: string; desc?: string; hidden?: boolean }>;
  createdAt: string;
}

interface CodeRemediationProps {
  onNavigate: (path: string) => void;
}

export const CodeRemediationScreen: React.FC<CodeRemediationProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const [items, setItems] = useState<RemediationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<RemediationItem | null>(null);
  const [code, setCode] = useState<string>('');
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'concepts' | 'submissions'>('problem');
  const [terminalTab, setTerminalTab] = useState<'results' | 'custom' | 'raw'>('results');
  
  // Custom test inputs
  const [customInput, setCustomInput] = useState<string>('');
  
  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [rawStderr, setRawStderr] = useState<string | null>(null);
  const [rawStdout, setRawStdout] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [allPassedState, setAllPassedState] = useState<boolean>(false);
  
  // UI states
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(14);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch remediation items
  useEffect(() => {
    const fetchRemediation = async () => {
      setIsLoading(true);
      try {
        const data = await remediationAPI.getRemediationItems();
        if (Array.isArray(data) && data.length > 0) {
          const normalized: RemediationItem[] = data.map((item: any) => ({
            ...item,
            testCases: (item.testCases || []).map((tc: any) => ({
              ...tc,
              expected: String(tc.expected || tc.expected_output || '').trim(),
              expected_output: String(tc.expected_output || tc.expected || '').trim()
            }))
          }));
          setItems(normalized);
          setSelectedItem(normalized[0]);
          setCode(normalized[0].starterCode);
          if (normalized[0].testCases && normalized[0].testCases.length > 0) {
            setCustomInput(normalized[0].testCases[0].input || '');
          }
          setAllPassedState(normalized[0].status === 'mastered');
        }
      } catch (err) {
        console.error("Failed to load remediation items:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRemediation();
  }, []);

  // Handle switching concept item
  const handleSelectItem = (item: RemediationItem) => {
    const normalizedItem: RemediationItem = {
      ...item,
      testCases: (item.testCases || []).map((tc: any) => ({
        ...tc,
        expected: String(tc.expected || tc.expected_output || '').trim(),
        expected_output: String(tc.expected_output || tc.expected || '').trim()
      }))
    };
    setSelectedItem(normalizedItem);
    setCode(normalizedItem.starterCode);
    setTestResults(null);
    setRawStderr(null);
    setRawStdout(null);
    setExecutionTime(null);
    setAllPassedState(normalizedItem.status === 'mastered');
    if (normalizedItem.testCases && normalizedItem.testCases.length > 0) {
      setCustomInput(normalizedItem.testCases[0].input || '');
    }
    setActiveLeftTab('problem');
  };

  const handleResetTemplate = () => {
    if (selectedItem) {
      setCode(selectedItem.starterCode);
      setTestResults(null);
      setRawStderr(null);
      setRawStdout(null);
      setExecutionTime(null);
      setAllPassedState(selectedItem.status === 'mastered');
    }
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {});
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    } catch (err) {}
  };

  // Execute Code / Submit
  const handleExecuteCode = async (isSubmit: boolean, isCustom: boolean) => {
    if (!selectedItem) return;
    if (isSubmit) setIsSubmitting(true);
    else setIsRunning(true);

    setTestResults(null);
    setRawStderr(null);
    setRawStdout(null);
    setExecutionTime(null);
    setTerminalTab(isCustom ? 'custom' : 'results');

    const startTime = performance.now();

    try {
      const testCasesToRun = isCustom
        ? [{ id: 'custom', input: customInput, expected: '' }]
        : (selectedItem.testCases || []).map((tc, idx) => {
            const exp = String(tc.expected || tc.expected_output || '').trim();
            return {
              id: String(idx + 1),
              input: tc.input || '',
              expected: exp,
              expected_output: exp
            };
          });

      const runResponse = await submissionsAPI.executeCode('python', code, testCasesToRun);
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setExecutionTime(elapsed);

      const serverResults = Array.isArray(runResponse) ? runResponse : (runResponse?.results || []);

      if (isCustom) {
        const first = serverResults[0];
        if (first) {
          setRawStdout(first.output || '');
          if (!first.passed && first.output && first.output.toLowerCase().includes('error')) {
            setRawStderr(first.output);
            setTerminalTab('raw');
          }
        }
      } else {
        let mappedResults: any[] = [];
        let allPassed = false;

        if (serverResults.length > 0) {
          mappedResults = serverResults.map((r: any, idx: number) => {
            const tc = selectedItem.testCases[idx];
            const expectedVal = String(r.expected || tc?.expected || tc?.expected_output || '').trim();
            const outStr = String(r.output !== undefined && r.output !== null ? r.output : '').trim();
            const lowerOut = outStr.toLowerCase();
            const hasError = lowerOut.includes('syntaxerror') ||
                             lowerOut.includes('traceback') ||
                             lowerOut.includes('nameerror') ||
                             lowerOut.includes('typeerror') ||
                             lowerOut.includes('indentationerror') ||
                             lowerOut.includes('zerodivisionerror') ||
                             lowerOut.includes('keyerror') ||
                             lowerOut.includes('indexerror') ||
                             lowerOut.includes('execution timed out') ||
                             lowerOut.startsWith('error:');

            const isPassed = r.passed === true && !hasError && expectedVal.length > 0 && outStr === expectedVal;

            return {
              case: idx + 1,
              input: tc?.input || `Case #${idx + 1}`,
              passed: isPassed,
              got: r.output,
              expected: expectedVal
            };
          });
          allPassed = mappedResults.length > 0 && mappedResults.every(r => r.passed);
        } else {
          // Robust client-side fallback validation if local sandbox returned empty
          mappedResults = (selectedItem.testCases || []).map((tc, idx) => ({
            case: idx + 1,
            input: tc.input,
            passed: false,
            got: 'Compiler returned empty output or execution failure',
            expected: tc.expected || tc.expected_output || ''
          }));
          allPassed = false;
        }

        setTestResults(mappedResults);
        setAllPassedState(allPassed);

        // Record into submissions tab
        setSubmissions(prev => [
          {
            id: `sub-${Date.now()}`,
            concept: selectedItem.conceptName,
            status: allPassed ? 'Accepted' : 'Wrong Answer',
            runtime: `${elapsed}ms`,
            passedCount: `${mappedResults.filter(r => r.passed).length}/${mappedResults.length}`,
            time: 'Just now'
          },
          ...prev
        ]);

        if (allPassed) {
          // Persist concept mastery to backend
          setItems(prev => prev.map(it => it.id === selectedItem.id ? { ...it, status: 'mastered' } : it));
          setSelectedItem(prev => prev ? { ...prev, status: 'mastered' } : null);
          try {
            await remediationAPI.submitPractice(selectedItem.id, code, 'mastered');
          } catch (persistErr) {
            console.error("Failed to persist practice mastery:", persistErr);
          }

          if (isSubmit) {
            setTimeout(() => {
              setShowSuccessModal(true);
            }, 300);
          }
        } else {
          // If code fails test cases, strictly mark as needs_practice and lock re-exam
          setAllPassedState(false);
          setItems(prev => prev.map(it => it.id === selectedItem.id ? { ...it, status: 'needs_practice' } : it));
          setSelectedItem(prev => prev ? { ...prev, status: 'needs_practice' } : null);
          try {
            await remediationAPI.submitPractice(selectedItem.id, code, 'needs_practice');
          } catch (persistErr) {
            console.error("Failed to persist practice state:", persistErr);
          }
        }
      }
    } catch (err: any) {
      console.error("Remediation execution error:", err);
      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));
      setRawStderr(err?.message || "Execution error in python environment.");
      setTerminalTab('raw');
      setAllPassedState(false);
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  const masteredCount = items.filter(i => i.status === 'mastered').length;

  return (
    <div className={`fixed inset-0 w-screen h-screen flex flex-col font-sans select-none z-[9999] overflow-hidden ${
      isDarkTheme ? 'bg-[#111217] text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`}>
      
      {/* ── 1. GLOBAL TOP HEADER ROW (Matching PracticeLab pixel-for-pixel) ── */}
      <header className={`h-16 flex items-center justify-between px-6 shrink-0 z-30 border-b ${
        isDarkTheme ? 'bg-[#15161c] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('/courses')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkTheme ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
            title="Back to Courses"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-4 w-px bg-slate-300/40"></div>
          <span className={`text-xs font-black uppercase tracking-widest font-mono ${
            isDarkTheme ? 'text-[#c3f53c]' : 'text-slate-900'
          }`}>
            CODING REMEDIATION
          </span>
          <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#c3f53c]/10 text-[#c3f53c] border border-[#c3f53c]/30">
            AI DIAGNOSTICS ({masteredCount}/{items.length} Mastered)
          </span>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <span className={`text-sm font-extrabold truncate max-w-[280px] hidden sm:inline ${
            isDarkTheme ? 'text-slate-350' : 'text-slate-500'
          }`}>
            {selectedItem?.courseTitle || 'Python Programming'}
          </span>
          <button 
            onClick={() => onNavigate('/courses')}
            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-colors cursor-pointer tracking-wide ${
              isDarkTheme ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-250 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Quit Editor
          </button>
        </div>
      </header>

      {/* ── 2. MAIN SPLIT CANVAS ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT COLUMN: Problem specs, Lagging Concepts & Submissions history */}
        <div className={`w-[40%] flex flex-col border-r shrink-0 min-w-[320px] ${
          isDarkTheme ? 'bg-[#131419] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Tabs bar */}
          <div className={`flex border-b shrink-0 ${isDarkTheme ? 'border-slate-800' : 'border-slate-100'}`}>
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 font-mono transition-colors cursor-pointer ${
                activeLeftTab === 'problem'
                  ? (isDarkTheme ? 'border-[#c3f53c] text-white' : 'border-slate-900 text-slate-900')
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              PROBLEM
            </button>
            <button
              onClick={() => setActiveLeftTab('concepts')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 font-mono transition-colors cursor-pointer ${
                activeLeftTab === 'concepts'
                  ? (isDarkTheme ? 'border-[#c3f53c] text-white' : 'border-slate-900 text-slate-900')
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              CONCEPTS ({items.length})
            </button>
            <button
              onClick={() => setActiveLeftTab('submissions')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 font-mono transition-colors cursor-pointer ${
                activeLeftTab === 'submissions'
                  ? (isDarkTheme ? 'border-[#c3f53c] text-white' : 'border-slate-900 text-slate-900')
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              SUBMISSIONS ({submissions.length})
            </button>
          </div>

          {/* Left panel scroll area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {activeLeftTab === 'problem' && selectedItem && (
              /* Problem details pane (Matches PracticeLab styling) */
              <div className="flex flex-col gap-6 select-text">
                {/* Title and difficulty header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                      {selectedItem.moduleTitle}
                    </span>
                    <h2 className={`text-xl sm:text-2xl font-black font-display uppercase tracking-tight ${
                      isDarkTheme ? 'text-white' : 'text-slate-900'
                    }`}>
                      {selectedItem.conceptName}: PRACTICE PROBLEM
                    </h2>
                  </div>
                  
                  {selectedItem.status === 'mastered' ? (
                    <span className="text-[10px] font-black font-mono px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg shrink-0 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      MASTERED
                    </span>
                  ) : (
                    <span className="text-[10px] font-black font-mono px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-lg shrink-0 uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      NEEDS PRACTICE
                    </span>
                  )}
                </div>

                {/* AI Diagnosis Card */}
                <div className={`border rounded-2xl p-4 space-y-2 ${
                  isDarkTheme ? 'bg-[#181a21] border-slate-800' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs font-mono text-amber-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>AI DIAGNOSIS & GAP ANALYSIS:</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                      <span className="text-emerald-400 font-bold">Quiz: {selectedItem.quizScore}%</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-rose-400 font-bold">Code: {selectedItem.challengeScore}%</span>
                    </div>
                  </div>
                  <p className={`text-xs leading-relaxed ${
                    isDarkTheme ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {selectedItem.diagnosisReason}
                  </p>
                </div>

                {/* Problem Statement Body */}
                <div className={`text-sm leading-relaxed font-sans ${
                  isDarkTheme ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <p className="whitespace-pre-wrap">
                    Read the input, fix the syntax and boundary logic to resolve the concept flaw, and print the expected output. All test cases must pass to master this concept and unlock the coding challenge re-exam.
                  </p>
                </div>

                {/* Examples */}
                <div className="space-y-5">
                  {(selectedItem.testCases || []).slice(0, 2).map((tc, tIdx) => (
                    <div key={tIdx} className="space-y-2">
                      <span className={`text-xs font-mono uppercase tracking-wider block font-bold ${
                        isDarkTheme ? 'text-slate-450' : 'text-slate-400'
                      }`}>
                        EXAMPLE {tIdx + 1}:
                      </span>
                      <div className={`border rounded-2xl p-4 font-mono text-xs leading-relaxed ${
                        isDarkTheme ? 'bg-[#181a21] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <div className="mb-1">
                          <span className="text-slate-450 select-none">Input: </span>{tc.input}
                        </div>
                        <div className="mb-1">
                          <span className="text-slate-450 select-none">Output: </span>{tc.expected || tc.expected_output || ''}
                        </div>
                        {tc.desc && (
                          <div>
                            <span className="text-slate-450 select-none">Explanation: </span>{tc.desc}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="space-y-3 pt-2">
                  <span className={`text-xs font-mono uppercase tracking-wider block font-bold ${
                    isDarkTheme ? 'text-slate-450' : 'text-slate-400'
                  }`}>
                    CONSTRAINTS:
                  </span>
                  <ul className="list-disc pl-5 space-y-2 text-xs font-mono text-slate-400">
                    <li>Avoid using infinite recursion or runaway loops.</li>
                    <li>Standard CPU execution limit is 5 seconds.</li>
                    <li>Pass all test cases in the practice sandbox before returning to the coding challenge.</li>
                  </ul>
                </div>

                {/* AI Practice Hint */}
                {selectedItem.practiceHint && (
                  <div className={`border rounded-2xl p-4 text-xs font-mono space-y-1.5 ${
                    isDarkTheme ? 'bg-[#151720] border-slate-800 text-slate-300' : 'bg-indigo-50/50 border-indigo-200 text-indigo-900'
                  }`}>
                    <span className="text-[10px] font-bold text-[#c3f53c] uppercase tracking-wider block">
                      AI STUDY HINT:
                    </span>
                    <p className="text-slate-300 leading-relaxed text-xs">
                      {selectedItem.practiceHint}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CONCEPTS TAB: Switch between lagging concepts */}
            {activeLeftTab === 'concepts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-xs font-black font-mono uppercase tracking-wider ${
                    isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    LAGGING CONCEPTS TO MASTER ({items.length})
                  </h3>
                </div>

                {items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isMastered = item.status === 'mastered';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`border rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? (isDarkTheme ? 'bg-[#181a21] border-[#c3f53c]' : 'bg-slate-100 border-slate-900')
                          : (isDarkTheme ? 'bg-[#14151b] border-slate-800 hover:bg-[#181920]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded-md ${
                          isMastered 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {isMastered ? '✓ Mastered' : 'Needs Practice'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono">
                          <span className="text-emerald-400">Quiz: {item.quizScore}%</span>
                          <span className="text-slate-500">|</span>
                          <span className="text-rose-400">Code: {item.challengeScore}%</span>
                        </div>
                      </div>

                      <h4 className={`text-xs font-bold font-mono tracking-tight mb-1 ${
                        isSelected ? (isDarkTheme ? 'text-[#c3f53c]' : 'text-slate-900') : (isDarkTheme ? 'text-white' : 'text-slate-900')
                      }`}>
                        {item.conceptName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {item.moduleTitle}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUBMISSIONS TAB */}
            {activeLeftTab === 'submissions' && (
              <div className="space-y-4">
                <h3 className={`text-sm font-black font-mono uppercase tracking-wider ${
                  isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  PAST PRACTICE RUNS ({submissions.length})
                </h3>
                
                {submissions.length === 0 ? (
                  <div className="text-slate-500 font-mono text-xs italic py-6 text-center">
                    No runs recorded yet. Click 'Run Code' or 'Submit Code' to verify your solution.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map(sub => (
                      <div 
                        key={sub.id} 
                        className={`border rounded-2xl p-4 flex items-center justify-between gap-4 transition-colors ${
                          isDarkTheme ? 'bg-[#16171e] border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${
                              sub.status === 'Accepted' ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {sub.status}
                            </span>
                            <span className="text-[10px] bg-slate-300/20 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                              Python 3
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Runtime: {sub.runtime} | Passed: {sub.passedCount}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Concept: {sub.concept}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium font-mono">{sub.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Code Canvas Editor + Lower Console */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e24] min-w-[400px]">
          
          {/* Code Editor Header Controls */}
          <div className={`h-[56px] border-b flex items-center justify-between px-4 relative z-35 shrink-0 ${
            isDarkTheme ? 'bg-[#16171d] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Language dropdown button */}
            <div className="flex items-center gap-3">
              <div className="relative z-50">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className={`flex items-center gap-2 text-xs font-black uppercase font-mono px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                    isDarkTheme ? 'border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white' : 'border-slate-250 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5 text-yellow-450" />
                  <span>Python 3</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isLangMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
                    <div className={`absolute left-0 mt-1.5 w-48 border rounded-2xl shadow-2xl z-50 py-1.5 font-mono animate-fade-in ${
                      isDarkTheme ? 'bg-[#181920] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      <button
                        onClick={() => setIsLangMenuOpen(false)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-3 cursor-pointer ${
                          isDarkTheme ? 'bg-[#c3f53c]/10 text-[#c3f53c]' : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <FileJson className="w-4 h-4 text-yellow-450" />
                        <span>Python 3</span>
                        <Check className="w-3 h-3 ml-auto" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* General Action toggles */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkTheme ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
                title="Toggle UI theme"
              >
                {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={handleToggleFullscreen}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isDarkTheme ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
                title="Toggle fullscreen editor"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Settings button */}
              <div className="relative z-50">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDarkTheme ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  }`}
                  title="Editor settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {isSettingsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)}></div>
                    <div className={`absolute right-0 mt-1.5 w-48 border rounded-2xl shadow-2xl z-50 p-4 font-mono ${
                      isDarkTheme ? 'bg-[#181920] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Font Size</span>
                      <div className="flex gap-2">
                        {[12, 14, 16].map(sz => (
                          <button
                            key={sz}
                            onClick={() => { setFontSize(sz); setIsSettingsOpen(false); }}
                            className={`flex-1 py-1 text-xs border rounded-lg font-bold cursor-pointer transition-colors ${
                              fontSize === sz
                                ? 'border-[#c3f53c] bg-[#c3f53c]/15 text-[#c3f53c]'
                                : 'border-slate-300/30'
                            }`}
                          >
                            {sz}px
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Code Editor canvas */}
          <div className="flex-1 relative overflow-hidden" style={{ fontSize: `${fontSize}px` }}>
            <CodeEditor
              language="python"
              code={code}
              onChange={setCode}
              onReset={handleResetTemplate}
            />
          </div>

          {/* LOWER debug terminal / results pane */}
          <div className={`h-[240px] border-t flex flex-col shrink-0 overflow-hidden ${
            isDarkTheme ? 'bg-[#14151b] border-slate-800 text-slate-350' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            {/* Terminal menu */}
            <div className={`h-10 border-b flex items-center justify-between px-4 shrink-0 ${
              isDarkTheme ? 'bg-[#17181f] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <div className="flex gap-4 font-mono text-[10px] uppercase font-black tracking-wider">
                <button
                  onClick={() => setTerminalTab('results')}
                  className={`flex items-center gap-1.5 pb-2 pt-2.5 border-b-2 transition-colors cursor-pointer ${
                    terminalTab === 'results'
                      ? 'border-[#c3f53c] text-white'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Test Cases
                </button>
                <button
                  onClick={() => setTerminalTab('custom')}
                  className={`flex items-center gap-1.5 pb-2 pt-2.5 border-b-2 transition-colors cursor-pointer ${
                    terminalTab === 'custom'
                      ? 'border-[#c3f53c] text-white'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Custom Input
                </button>
                <button
                  onClick={() => setTerminalTab('raw')}
                  className={`flex items-center gap-1.5 pb-2 pt-2.5 border-b-2 transition-colors cursor-pointer ${
                    terminalTab === 'raw'
                      ? 'border-[#c3f53c] text-white'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Raw Output
                </button>
              </div>

              {/* Execution time indicator */}
              {executionTime !== null && (
                <span className="text-[10px] font-mono text-slate-450">
                  Execution: <span className="font-bold text-emerald-500">{executionTime}ms</span>
                </span>
              )}
            </div>

            {/* Terminal content container */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              
              {terminalTab === 'results' && (
                <div className="space-y-4">
                  {testResults === null && !rawStderr ? (
                    <div className="text-slate-450 italic py-4 flex items-center gap-2 select-none">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      Ready to compile. Click 'Run Code' or 'Submit Code'
                    </div>
                  ) : null}

                  {/* Granular Test Cases results */}
                  {testResults && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                      {testResults.map(res => (
                        <div 
                          key={res.case} 
                          className={`border rounded-xl p-3 flex items-start gap-3 transition-colors ${
                            res.passed 
                              ? (isDarkTheme ? 'bg-emerald-950/10 border-emerald-900/35 text-emerald-400' : 'bg-emerald-50 border-emerald-250 text-emerald-800')
                              : (isDarkTheme ? 'bg-red-950/10 border-red-900/35 text-red-400' : 'bg-red-50 border-red-250 text-red-800')
                          }`}
                        >
                          {res.passed ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <div className="font-black">
                              Test Case {res.case}: {res.passed ? 'PASSED ✓' : 'FAILED ✕'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Input: {res.input}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Expected: {String(res.expected)}
                            </div>
                            <div className="text-[11px] font-mono">
                              Output: <span className={res.passed ? 'text-emerald-400' : 'text-red-400'}>{String(res.got)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {terminalTab === 'custom' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none">
                      Custom Stdin Input:
                    </span>
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className={`w-full h-10 px-3 border rounded-xl font-mono text-xs focus:outline-none ${
                        isDarkTheme ? 'bg-[#181a20] border-slate-800 text-white focus:border-[#c3f53c]' : 'bg-white border-slate-250 focus:border-slate-900'
                      }`}
                      placeholder="e.g. 10 2"
                    />
                  </div>
                  <div className="text-slate-450 text-[11px] leading-relaxed">
                    Custom input executes your Python code with standard input without grading against expected outputs.
                  </div>
                </div>
              )}

              {terminalTab === 'raw' && (
                <div className="h-full">
                  {rawStderr && (
                    <div className="border border-red-500/20 bg-red-950/10 text-red-500 rounded-xl p-4 flex items-start gap-3">
                      <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="font-black text-sm uppercase">Traceback:</div>
                        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed select-text mt-2 block overflow-x-auto text-red-400 bg-red-950/20 p-4 rounded-xl border border-red-900/30">
                          <code>{rawStderr}</code>
                        </pre>
                      </div>
                    </div>
                  )}

                  {rawStdout && (
                    <pre className="p-4 rounded-xl border font-mono text-xs leading-relaxed select-text block overflow-x-auto bg-[#1b1c23]/60 border-slate-850">
                      <code>{rawStdout}</code>
                    </pre>
                  )}

                  {!rawStderr && !rawStdout && (
                    <div className="text-slate-450 italic select-none">No active debugger logs available.</div>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Actions toolbar */}
            <div className={`h-16 px-6 border-t shrink-0 flex items-center justify-between ${
              isDarkTheme ? 'bg-[#16171d] border-slate-850' : 'bg-white border-slate-150'
            }`}>
              <button
                onClick={handleResetTemplate}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDarkTheme ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-250 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title="Reset starter code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Code
              </button>

              <div className="flex items-center gap-3">
                {/* ── Strict Gating for Coding Challenge Re-Exam ── */}
                {allPassedState ? (
                  <button
                    onClick={() => onNavigate('/courses')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md shadow-[#c3f53c]/20 cursor-pointer animate-pulse"
                    title="Concept Mastered! Click to re-attempt the coding challenge"
                  >
                    <span>Go to Coding Challenge</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    disabled
                    title="Pass all test cases in the practice sandbox above to unlock the coding challenge re-exam"
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-mono font-bold uppercase tracking-wider cursor-not-allowed opacity-75"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Re-Exam Locked</span>
                  </button>
                )}

                {/* Run Code Button */}
                <button
                  onClick={() => handleExecuteCode(false, terminalTab === 'custom')}
                  disabled={isRunning || isSubmitting}
                  className={`px-5 py-2.5 border rounded-xl text-xs font-mono font-bold tracking-wide uppercase transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] ${
                    isDarkTheme 
                      ? 'border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800 hover:border-slate-700' 
                      : 'border-slate-350 text-slate-700 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Code
                    </>
                  )}
                </button>

                {/* Submit Code Button */}
                <button
                  onClick={() => handleExecuteCode(true, false)}
                  disabled={isRunning || isSubmitting}
                  className="px-6 py-2.5 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md shadow-[#c3f53c]/15 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Submit Code
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── 3. SUCCESS / CELEBRATION MODAL OVERLAY (Matches PracticeLab) ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border p-6 animate-slide-up flex flex-col text-center items-center ${
            isDarkTheme ? 'bg-[#181a20] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5 shrink-0 shadow-sm animate-bounce">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="font-extrabold text-2xl mb-1 font-display uppercase tracking-tight text-emerald-550">
              Concept Mastered!
            </h3>
            <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md shrink-0 uppercase tracking-widest mb-4">
              All Test Cases Passed
            </span>

            <p className={`text-xs font-semibold leading-relaxed mb-6 ${
              isDarkTheme ? 'text-slate-400' : 'text-slate-500'
            }`}>
              You have successfully corrected the syntax and logic gap in <span className="font-bold text-white">{selectedItem?.conceptName}</span>! Your coding challenge re-exam is now unlocked.
            </p>

            <div className="flex flex-col gap-2 font-mono text-xs w-full">
              <button
                onClick={() => { 
                  setShowSuccessModal(false);
                  onNavigate('/courses');
                }}
                className="w-full bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 transition-all font-black uppercase tracking-widest py-3.5 rounded-xl cursor-pointer shadow-lg shadow-[#c3f53c]/15 flex items-center justify-center gap-2"
              >
                <span>Go to Coding Challenge</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className={`w-full border transition-all font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer ${
                  isDarkTheme ? 'bg-transparent border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-transparent border-slate-250 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Continue Practice
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
