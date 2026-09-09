import React, { useState, useEffect } from 'react';
import { CodeEditor } from '../components/Lab/CodeEditor';
import { 
  ChevronLeft, Play, Save, Check, ChevronDown, 
  Cpu, FileJson, Coffee, Code2, Monitor,
  Clock, Award, Terminal, RefreshCw, Maximize2, Minimize2, 
  Sun, Moon, Settings, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldAlert
} from 'lucide-react';
import { coursesAPI, submissionsAPI } from '../services/apiService';
import { useCourses } from '../services/courseContext';
import { useTranslation } from '../hooks/useTranslation';
import { PerformanceResultsView } from '../components/Quiz/PerformanceResultsView';
import { AnimatedRecommendationBubble, RecommendationData } from '../components/Course/AnimatedRecommendationBubble';

interface PracticeLabProps {
  onNavigate: (path: string) => void;
}

// Language configurations
const LANGUAGES = [
  { 
    id: 'python', 
    name: 'Python 3', 
    pistonId: 'python',
    version: '3.10.0',
    icon: FileJson, 
    color: 'text-yellow-450',
    template: `# Write your code here
# Read standard input using input() if required, and print the output
`
  },
  { 
    id: 'javascript', 
    name: 'JavaScript', 
    pistonId: 'javascript',
    version: '18.15.0',
    icon: Cpu, 
    color: 'text-yellow-400',
    template: `// Write your code here
// Read standard input using readline() if required, and print the output
`
  },
  { 
    id: 'cpp', 
    name: 'C++', 
    pistonId: 'c++',
    version: '10.2.0',
    icon: Code2, 
    color: 'text-blue-500',
    template: `// Write your code here
// Read standard input using cin if required, and print the output using cout
`
  }
] as const;

export const PracticeLabScreen: React.FC<PracticeLabProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { completeActivity } = useCourses();
  const [moduleId, setModuleId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [challenge, setChallenge] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Core UI/View States
  const [selectedLanguage, setSelectedLanguage] = useState<typeof LANGUAGES[number]>(LANGUAGES[0]);
  const [code, setCode] = useState<string>(LANGUAGES[0].template);
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'submissions'>('problem');
  const [terminalTab, setTerminalTab] = useState<'results' | 'custom' | 'raw'>('results');
  
  // Custom Test Inputs State
  const [customNums, setCustomNums] = useState('[2, 7, 11, 15]');
  const [customTarget, setCustomTarget] = useState('9');
  
  // Compiler / Run States
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [rawStderr, setRawStderr] = useState<string | null>(null);
  const [rawStdout, setRawStdout] = useState<string | null>(null);
  const [tleOccurred, setTleOccurred] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  
  // Visual states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFinished, setIsFinished] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);
  
  // Submission Dashboard history
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Sync hash changes and parse search parameters
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(hash.split('?')[1] || '');
      setCourseId(searchParams.get('course_id') || '');
      setModuleId(searchParams.get('module_id') || '');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch coding challenge details from SQLite
  useEffect(() => {
    if (!moduleId) {
      setIsLoading(false);
      setError('No module selected. Please navigate to a coding challenge from your course page.');
      return;
    }
    
    const fetchChallenge = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await coursesAPI.getModuleChallenge(moduleId);
        setChallengeId(data.id);
        
        let parsedTestCases = [];
        if (typeof data.test_cases === 'string') {
          parsedTestCases = JSON.parse(data.test_cases);
        } else if (Array.isArray(data.test_cases)) {
          parsedTestCases = data.test_cases;
        }
        
        const challengeDetails = {
          title: data.title || 'Coding Challenge',
          difficulty: data.programming_language === 'python' ? 'Medium' : 'Easy',
          category: 'Algorithms',
          points: 100,
          timeLimit: '5000ms',
          description: data.instructions || '',
          examples: parsedTestCases.slice(0, 2).map((tc: any, tIdx: number) => {
            const expectedOutput = tc.output !== undefined ? tc.output : (tc.expected_output !== undefined ? tc.expected_output : tc.expectedOutput || '');
            return {
              id: tIdx + 1,
              input: String(tc.input),
              output: String(expectedOutput),
              explanation: tc.description || ''
            };
          }),
          constraints: [
            'Avoid using infinite recursion structures.',
            'Standard CPU execution limit is 5 seconds.'
          ],
          testCases: parsedTestCases
        };
        
        setChallenge(challengeDetails);
        
        const langId = data.programming_language || 'python';
        const langConfig = LANGUAGES.find(l => l.id === langId) || LANGUAGES[0];
        setSelectedLanguage(langConfig);
        setCode(data.starter_code || langConfig.template);
      } catch (err: any) {
        console.error("Failed to load dynamic challenge details:", err);
        setError(err.message || "This module does not have any generated coding challenges configured.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChallenge();
  }, [moduleId]);

  // Sync templates on language switch
  const handleLanguageChange = (lang: typeof LANGUAGES[number]) => {
    setSelectedLanguage(lang);
    if (challenge && challenge.programming_language === lang.id && challenge.starter_code) {
      setCode(challenge.starter_code);
    } else {
      setCode(lang.template);
    }
    setIsLangMenuOpen(false);
    setTestResults(null);
    setRawStderr(null);
    setRawStdout(null);
    setTleOccurred(false);
  };

  const handleResetTemplate = () => {
    setCode(selectedLanguage.template);
    setTestResults(null);
    setRawStderr(null);
    setRawStdout(null);
    setTleOccurred(false);
  };

  // Toggle local Fullscreen state
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

  // Listen to browser fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Compile and run compiler via dynamic FastAPI/SQLite execution sandbox
  const handleExecuteCode = async (isSubmit: boolean, isCustom: boolean) => {
    if (isSubmit) setIsSubmitting(true);
    else setIsRunning(true);
    
    // Reset states
    setTestResults(null);
    setRawStderr(null);
    setRawStdout(null);
    setTleOccurred(false);
    setExecutionTime(null);
    setTerminalTab(isCustom ? 'custom' : 'results');

    const startTime = performance.now();

    try {
      const testCasesToRun = isCustom 
        ? [{ id: 'custom', input: customNums, expected: customTarget, isHidden: false }]
        : challenge.testCases.map((tc: any, tIdx: number) => ({
            id: tc.id || String(tIdx),
            input: tc.input || tc.input_data || '',
            expected: tc.output || tc.expected_output || ''
          }));

      const runResponse = await submissionsAPI.executeCode(
        selectedLanguage.id,
        code,
        testCasesToRun
      );

      const results = Array.isArray(runResponse) ? runResponse : (runResponse?.results || []);

      const endTime = performance.now();
      setExecutionTime(Math.round(endTime - startTime));

      if (isCustom) {
        const firstResult = results[0];
        if (firstResult) {
          setRawStdout(firstResult.output || '');
          if (!firstResult.passed && firstResult.output && firstResult.output.toLowerCase().includes('error')) {
            setRawStderr(firstResult.output);
            setTerminalTab('raw');
          }
        }
      } else {
        const mappedResults = results.map((r: any, idx: number) => {
          const outStr = String(r.output || '').toLowerCase();
          const hasErr = outStr.includes('syntaxerror') || outStr.includes('traceback') || outStr.includes('nameerror');
          return {
            case: idx + 1,
            passed: r.passed === true && !hasErr,
            got: r.output,
            expected: r.expected,
            isHidden: idx >= 3
          };
        });

        if (!isSubmit) {
          setTestResults(mappedResults.filter((r: any) => !r.isHidden));
        } else {
          setTestResults(mappedResults);
          
          const allPassed = mappedResults.every((r: any) => r.passed);
          
          // Submit solutions log to SQLite DB
          try {
            await coursesAPI.submitChallenge(
              challengeId,
              code,
              allPassed,
              allPassed ? "Accepted solution" : "Failed some test cases"
            );
            
            // Update course context progress counters on pass
            if (allPassed && courseId) {
              await completeActivity(courseId, moduleId, 'coding');
            }
          } catch (dbErr) {
            console.error("Failed to commit solution to SQLite:", dbErr);
          }

          if (allPassed) {
            setRecommendation(null);
            setTimeout(() => {
              setIsFinished(true);
              setSubmissions(prev => [
                {
                  id: `sub-${Date.now()}`,
                  status: 'Accepted',
                  language: selectedLanguage.name,
                  runtime: `${Math.round(endTime - startTime)}ms`,
                  passedCount: `${mappedResults.length}/${mappedResults.length}`,
                  time: 'Just now'
                },
                ...prev
              ]);
            }, 600);
          } else {
            const failedAccuracy = Math.round((mappedResults.filter((r: any) => r.passed).length / mappedResults.length) * 100);
            setRecommendation({
              type: 'code_remediation',
              title: 'Concepts Understood · Coding Lagging',
              conceptName: challenge?.title ? `${challenge.title} Logic & Syntax` : 'Loop and indexing boundary logic',
              message: 'You understood the concepts well in the quiz, but your coding challenge implementation did not pass all test cases! Practice this lagging concept in your new Code Remediation track before re-attempting.',
              quizScore: 90,
              challengeScore: failedAccuracy,
              courseId,
              moduleId
            });
            setTimeout(() => {
              setIsFinished(true);
              setSubmissions(prev => [
                {
                  id: `sub-${Date.now()}`,
                  status: 'Wrong Answer',
                  language: selectedLanguage.name,
                  runtime: `${Math.round(endTime - startTime)}ms`,
                  passedCount: `${mappedResults.filter((r: any) => r.passed).length}/${mappedResults.length}`,
                  time: 'Just now'
                },
                ...prev
              ]);
            }, 600);
          }
        }
      }
    } catch (err: any) {
      setRawStderr(err.message || 'Fatal Connection Error to Compiler API.');
      setTerminalTab('raw');
    } finally {
      setIsRunning(false);
      setIsSubmitting(false);
    }
  };

  if (isFinished && testResults) {
    const passedCount = testResults.filter((r: any) => r.passed).length;
    const accuracy = Math.round((passedCount / testResults.length) * 100);
    return (
      <div className="fixed inset-0 w-screen h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans z-[9999] overflow-hidden select-none">
        <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 shrink-0 z-30 shadow-none">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsFinished(false)}
              className="p-2 rounded-xl transition-colors cursor-pointer hover:bg-slate-100 text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="h-4 w-px bg-slate-300/40"></div>
            <span className="text-xs font-black uppercase tracking-widest font-mono text-slate-900">
              Coding Challenge Results
            </span>
          </div>
          <button 
            onClick={() => onNavigate(courseId ? `/course/${courseId}` : '/courses')}
            className="px-4 py-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold rounded-xl text-xs uppercase tracking-wider font-sans transition-colors cursor-pointer"
          >
            Quit Editor
          </button>
        </header>
        <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
          <PerformanceResultsView
            type="challenge"
            title={challenge.title}
            courseTitle="Python Tutorial for Beginners"
            moduleTitle={challenge.title}
            score={accuracy}
            totalQuestions={testResults.length}
            correctAnswers={passedCount}
            timeSpent={executionTime !== null ? `${Math.floor(executionTime / 1000)}s ${executionTime % 1000}ms` : '0s 38ms'}
            completedAt={new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ", " + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            attemptsCount={submissions.length || 1}
            testCases={testResults.map(r => ({
              case: r.case,
              input: challenge.testCases[r.case - 1]?.input || '',
              got: r.got,
              expected: r.expected,
              passed: r.passed,
              isHidden: r.isHidden
            }))}
            onRetry={() => {
              setIsFinished(false);
              setTestResults(null);
            }}
            onContinue={async () => {
              setIsFinished(false);
              if (courseId) {
                try {
                  const resume = await coursesAPI.getCourseResume(courseId);
                  onNavigate(resume.route || `/course/${courseId}`);
                } catch {
                  onNavigate(`/course/${courseId}`);
                }
              } else {
                onNavigate('/courses');
              }
            }}
            onNavigateToNotes={() => onNavigate(courseId ? `/course/${courseId}` : '/courses')}
          />

          {/* Scenario 2: Animated Recommendation Bubble (Quiz Passed, Coding Lagging) */}
          {recommendation && (
            <AnimatedRecommendationBubble
              data={recommendation}
              onGoToRemediation={() => onNavigate('/code-remediation')}
              onReattempt={() => {
                setIsFinished(false);
                setTestResults(null);
                setRecommendation(null);
              }}
              onClose={() => setRecommendation(null)}
            />
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`fixed inset-0 w-screen h-screen flex flex-col items-center justify-center font-sans z-[99999] ${
        isDarkTheme ? 'bg-[#111217] text-white' : 'bg-white text-slate-800'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#06B6D4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-semibold">{t('lab.preparing')}</p>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className={`fixed inset-0 w-screen h-screen flex flex-col items-center justify-center font-sans z-[99999] p-4 text-center ${
        isDarkTheme ? 'bg-[#111217] text-white' : 'bg-white text-slate-800'
      }`}>
        <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black uppercase mb-1">{t('lab.unavailable')}</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {error || t('lab.no_module_challenge')}
        </p>
        <button
          onClick={() => onNavigate(courseId ? `/course/${courseId}` : '/courses')}
          className="px-6 py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider font-mono hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-350"
        >
          {t('lab.return_course')}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-screen h-screen flex flex-col font-sans select-none z-[9999] overflow-hidden ${
      isDarkTheme ? 'bg-[#111217] text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`}>
      
      {/* ── 1. GLOBAL TOP HEADER ROW ── */}
      <header className={`h-16 flex items-center justify-between px-6 shrink-0 z-30 border-b ${
        isDarkTheme ? 'bg-[#15161c] border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('/courses')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDarkTheme ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-4 w-px bg-slate-300/40"></div>
          <span className={`text-xs font-black uppercase tracking-widest font-mono ${
            isDarkTheme ? 'text-[#c3f53c]' : 'text-slate-900'
          }`}>{t('lab.coding_challenge')}</span>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <span className={`text-sm font-extrabold ${isDarkTheme ? 'text-slate-350' : 'text-slate-500'}`}>
            {t('lab.data_structures')}
          </span>
          <button 
            onClick={() => onNavigate('/courses')}
            className={`px-4 py-2 border rounded-xl text-xs font-bold transition-colors cursor-pointer tracking-wide ${
              isDarkTheme ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white' : 'border-slate-250 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t('lab.quit_editor')}
          </button>
        </div>
      </header>

      {/* ── 2. MAIN SPLIT CANVAS ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT COLUMN: Problem specs & submissions history */}
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
              {t('lab.problem')}
            </button>
            <button
              onClick={() => setActiveLeftTab('submissions')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 font-mono transition-colors cursor-pointer ${
                activeLeftTab === 'submissions'
                  ? (isDarkTheme ? 'border-[#c3f53c] text-white' : 'border-slate-900 text-slate-900')
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {t('lab.submissions')}{submissions.length})
            </button>
          </div>

          {/* Left panel scroll area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {activeLeftTab === 'problem' ? (
              /* Problem details pane */
              <div className="flex flex-col gap-6 select-text">
                {/* Title and difficulty header */}
                <div className="flex items-center justify-between gap-4">
                  <h2 className={`text-2xl font-black font-display uppercase tracking-tight ${
                    isDarkTheme ? 'text-white' : 'text-slate-900'
                  }`}>{challenge.title}</h2>
                  <span className="text-[10px] font-black font-mono px-2.5 py-1 bg-emerald-50 border border-emerald-200/40 text-emerald-600 rounded-lg shrink-0 uppercase tracking-widest">
                    {challenge.difficulty}
                  </span>
                </div>

                {/* Problem Statement Body */}
                <div className={`text-sm leading-relaxed font-sans ${
                  isDarkTheme ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <p className="whitespace-pre-wrap">{challenge.description}</p>
                </div>

                {/* Examples */}
                <div className="space-y-5">
                  {challenge.examples.map(ex => (
                    <div key={ex.id} className="space-y-2">
                      <span className={`text-xs font-mono uppercase tracking-wider block font-bold ${
                        isDarkTheme ? 'text-slate-450' : 'text-slate-400'
                      }`}>{t('lab.example')}{ex.id}:</span>
                      <div className={`border rounded-2xl p-4 font-mono text-xs leading-relaxed ${
                        isDarkTheme ? 'bg-[#181a21] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <div className="mb-1"><span className="text-slate-450 select-none">{t('lab.input')}</span>{ex.input}</div>
                        <div className="mb-1"><span className="text-slate-450 select-none">{t('lab.output')}</span>{ex.output}</div>
                        {ex.explanation && (
                          <div><span className="text-slate-450 select-none">{t('lab.explanation')}</span>{ex.explanation}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="space-y-3 pt-2">
                  <span className={`text-xs font-mono uppercase tracking-wider block font-bold ${
                    isDarkTheme ? 'text-slate-450' : 'text-slate-400'
                  }`}>{t('lab.constraints')}</span>
                  <ul className="list-disc pl-5 space-y-2 text-xs font-mono text-slate-400">
                    {challenge.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              /* Submissions History Dashboard pane */
              <div className="space-y-4">
                <h3 className={`text-sm font-black font-mono uppercase tracking-wider ${
                  isDarkTheme ? 'text-slate-400' : 'text-slate-500'
                }`}>{t('lab.past_submissions')}</h3>
                
                <div className="space-y-3">
                  {submissions.map(sub => (
                    <div 
                      key={sub.id} 
                      className={`border rounded-2xl p-4 flex items-center justify-between gap-4 transition-colors ${
                        isDarkTheme ? 'bg-[#16171e] border-slate-850 hover:bg-[#1a1b24]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${
                            sub.status === 'Accepted' ? 'text-emerald-500' : 'text-red-500'
                          }`}>{sub.status}</span>
                          <span className="text-[10px] bg-slate-300/20 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                            {sub.language}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {t('lab.runtime')}{sub.runtime} | {t('lab.passed_label')}{sub.passedCount}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">{sub.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Code Canvas Editor + Outputs */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e24] min-w-[400px]">
          
          {/* Code Editor Header Controls */}
          <div className={`h-[56px] border-b flex items-center justify-between px-4 relative z-35 shrink-0 ${
            isDarkTheme ? 'bg-[#16171d] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Language dropdown */}
            <div className="flex items-center gap-3">
              <div className="relative z-50">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className={`flex items-center gap-2 text-xs font-black uppercase font-mono px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                    isDarkTheme ? 'border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-white' : 'border-slate-250 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <selectedLanguage.icon className={`w-3.5 h-3.5 ${selectedLanguage.color}`} />
                  <span>{selectedLanguage.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isLangMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
                    <div className={`absolute left-0 mt-1.5 w-48 border rounded-2xl shadow-2xl z-50 py-1.5 font-mono animate-fade-in ${
                      isDarkTheme ? 'bg-[#181920] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => handleLanguageChange(lang)}
                          className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center gap-3 cursor-pointer ${
                            lang.id === selectedLanguage.id 
                              ? (isDarkTheme ? 'bg-[#c3f53c]/10 text-[#c3f53c]' : 'bg-slate-100 text-slate-900') 
                              : 'hover:bg-slate-300/10'
                          }`}
                        >
                          <lang.icon className={`w-4 h-4 ${lang.color}`} />
                          <span>{lang.name}</span>
                          {lang.id === selectedLanguage.id && <Check className="w-3 h-3 ml-auto" />}
                        </button>
                      ))}
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
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('lab.font_size')}</span>
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
              language={selectedLanguage.id}
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
                  {t('lab.test_cases_tab')}
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
                  {t('lab.custom_input_tab')}
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
                  {t('lab.raw_output_tab')}
                </button>
              </div>

              {/* Execution time indicator */}
              {executionTime !== null && (
                <span className="text-[10px] font-mono text-slate-450">
                  {t('lab.execution')}<span className="font-bold text-emerald-500">{executionTime}ms</span>
                </span>
              )}
            </div>

            {/* Terminal content container */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              
              {terminalTab === 'results' && (
                /* Standard test results pane */
                <div className="space-y-4">
                  {testResults === null && !rawStderr && !tleOccurred ? (
                    <div className="text-slate-450 italic py-4 flex items-center gap-2 select-none">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      {t('lab.ready_to_compile')}
                    </div>
                  ) : null}

                  {/* TLE Error */}
                  {tleOccurred && (
                    <div className="border border-yellow-300/30 bg-yellow-950/20 text-yellow-600 rounded-xl p-4 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                      <div>
                        <div className="font-black text-sm uppercase">{t('lab.tle')}</div>
                        <div className="text-slate-450 mt-1">{t('lab.tle_desc')}</div>
                      </div>
                    </div>
                  )}

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
                            <div className="font-black">{t('lab.test_case')}{res.case} {res.isHidden && <span className="text-[9px] bg-slate-350/20 text-slate-400 px-1.5 py-0.5 rounded ml-1 font-bold">{t('lab.hidden')}</span>}</div>
                            {!res.passed && res.error && (
                              <div className="text-[11px] font-mono text-red-450 whitespace-pre-wrap">{res.error}</div>
                            )}
                            {res.passed && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                Output: {JSON.stringify(res.got)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {terminalTab === 'custom' && (
                /* Custom inputs developer board */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none">{t('lab.nums_array')}</span>
                      <input
                        type="text"
                        value={customNums}
                        onChange={(e) => setCustomNums(e.target.value)}
                        className={`w-full h-10 px-3 border rounded-xl font-mono text-xs focus:outline-none ${
                          isDarkTheme ? 'bg-[#181a20] border-slate-800 text-white focus:border-[#c3f53c]' : 'bg-white border-slate-250 focus:border-slate-900'
                        }`}
                        placeholder="[2, 7, 11, 15]"
                      />
                    </div>
                    <div className="w-32 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block select-none">{t('lab.target_sum')}</span>
                      <input
                        type="text"
                        value={customTarget}
                        onChange={(e) => setCustomTarget(e.target.value)}
                        className={`w-full h-10 px-3 border rounded-xl font-mono text-xs focus:outline-none ${
                          isDarkTheme ? 'bg-[#181a20] border-slate-800 text-white focus:border-[#c3f53c]' : 'bg-white border-slate-250 focus:border-slate-900'
                        }`}
                        placeholder="9"
                      />
                    </div>
                  </div>
                  <div className="text-slate-450 text-[11px] leading-relaxed">
                    {t('lab.custom_inputs_desc')}
                  </div>
                </div>
              )}

              {terminalTab === 'raw' && (
                /* Raw Traceback debugger pane */
                <div className="h-full">
                  {rawStderr && (
                    <div className="border border-red-500/20 bg-red-950/10 text-red-500 rounded-xl p-4 flex items-start gap-3">
                      <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <div className="font-black text-sm uppercase">{t('lab.traceback')}</div>
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
                    <div className="text-slate-450 italic select-none">{t('lab.no_logs')}</div>
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
                title="Reset template code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('lab.reset_code')}
              </button>

              <div className="flex items-center gap-3">
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
                      {t('lab.running')}
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {t('lab.run_code')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleExecuteCode(true, false)}
                  disabled={isRunning || isSubmitting}
                  className="px-6 py-2.5 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md shadow-[#c3f53c]/15 cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('lab.submitting')}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t('lab.submit_code')}
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── 3. SUCCESS / CELEBRATION MODAL OVERLAY ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border p-6 animate-slide-up flex flex-col text-center items-center ${
            isDarkTheme ? 'bg-[#181a20] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5 shrink-0 shadow-sm animate-bounce">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="font-extrabold text-2xl mb-1 font-display uppercase tracking-tight text-emerald-550">{t('lab.submission_accepted')}</h3>
            <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md shrink-0 uppercase tracking-widest mb-4">{t('lab.cases_passed')}</span>

            <p className={`text-xs font-semibold leading-relaxed mb-6 ${
              isDarkTheme ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {t('lab.submission_accepted_desc')}<span className="font-black text-white">{executionTime !== null ? `${executionTime - 300}ms` : '38ms'}</span>, beating <span className="font-black text-[#c3f53c]">98.4%</span>{t('lab.beating')}
            </p>

            <div className="flex flex-col gap-2 font-mono text-xs w-full">
              <button
                onClick={async () => { 
                  setShowSuccessModal(false);
                  if (courseId) {
                    try {
                      const resume = await coursesAPI.getCourseResume(courseId);
                      onNavigate(resume.route || `/course/${courseId}`);
                    } catch {
                      onNavigate(`/course/${courseId}`);
                    }
                  } else {
                    onNavigate('/courses');
                  }
                }}
                className="w-full bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 transition-all font-black uppercase tracking-widest py-3.5 rounded-xl cursor-pointer shadow-lg shadow-[#c3f53c]/15"
              >
                Continue to Next Module
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className={`w-full border transition-all font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer ${
                  isDarkTheme ? 'bg-transparent border-slate-850 hover:bg-slate-800' : 'bg-transparent border-slate-250 hover:bg-slate-50'
                }`}
              >
                {t('lab.back_to_challenge')}
              </button>
            </div>

          </div>
        </div>
      )}

      {showFailureModal && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border p-6 animate-slide-up flex flex-col text-center items-center ${
            isDarkTheme ? 'bg-[#181a20] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mb-5 shrink-0 shadow-sm animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="font-extrabold text-2xl mb-1 font-display uppercase tracking-tight text-red-500">Submission Failed</h3>
            <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md shrink-0 uppercase tracking-widest mb-4">Wrong Answer</span>

            <p className={`text-xs font-semibold leading-relaxed mb-6 ${
              isDarkTheme ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Your solution did not satisfy all required test cases. Review the console stdout and compiler details to resolve the execution mismatch.
            </p>

            <div className="flex flex-col gap-2 font-mono text-xs w-full">
              <button
                onClick={() => setShowFailureModal(false)}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-colors font-black uppercase tracking-widest py-3.5 rounded-xl cursor-pointer shadow-sm border border-slate-700/60"
              >
                Re-attempt Challenge
              </button>
              <button
                onClick={() => {
                  setShowFailureModal(false);
                  onNavigate(courseId ? `/course/${courseId}` : '/courses');
                }}
                className={`w-full border transition-all font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer ${
                  isDarkTheme ? 'bg-transparent border-slate-850 hover:bg-slate-800 text-slate-400' : 'bg-transparent border-slate-250 hover:bg-slate-50 text-slate-500'
                }`}
              >
                Back to Course
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
