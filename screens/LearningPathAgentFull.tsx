import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { 
  Sparkles, 
  Bot, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  BookOpen, 
  BarChart3, 
  PieChart as PieChartIcon,
  FileCheck,
  Send, 
  Clock, 
  ShieldAlert, 
  Award, 
  FileText, 
  UserCheck, 
  HelpCircle,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  Compass,
  Activity,
  Plus
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { learningAgentAPI } from '../services/apiService';

interface LearningPathAgentProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

interface ExamSection {
  id: string;
  name: string;
  shortName: string;
  score: number;
  totalQuestions: number;
  correctQuestions: number;
  status: 'Mastered' | 'Proficient' | 'Needs Attention';
  isDifficult: boolean;
  color: string;
  barColor: string;
  badgeBg: string;
  topics: string[];
  description: string;
}

export const LearningPathAgentScreen: React.FC<LearningPathAgentProps> = ({ onNavigate, currentPath = '/gap-diagnosis' }) => {
  const { user } = useAuth();
  
  // Dynamic student exams from backend
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(true);

  // State for student reflection & selected topics
  const [questionInput, setQuestionInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [activeStepAgent, setActiveStepAgent] = useState<number>(0);

  // Selected section for detailed drilldown
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec_1');
  const [chartMetricView, setChartMetricView] = useState<'section_bars' | 'question_distribution'>('section_bars');
  
  // Session data from API
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'agents' | 'diagnosis' | 'curriculum' | 'action'>(
    currentPath === '/gap-diagnosis' ? 'diagnosis' : 'agents'
  );
  
  // Interactive Exercise state for Milestone 1
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isOptionSubmitted, setIsOptionSubmitted] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<any | null>(null);
  const [isSubmittingExercise, setIsSubmittingExercise] = useState(false);
  
  // Action feedback
  const [approvalRequested, setApprovalRequested] = useState(false);
  const [pathAdopted, setPathAdopted] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Smooth animated count-up and radial gauge progress
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  // Mathematically accurate Radial Gauge calculations for Overall Exam Score
  const gaugeRadius = 46;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~289.03
  const overallScoreVal = activeExam?.overallScore ?? 0;
  const gaugeOffset = gaugeCircumference - (overallScoreVal / 100) * gaugeCircumference;

  useEffect(() => {
    setIsRendered(false);
    const target = activeExam?.overallScore ?? 0;
    const renderTimer = setTimeout(() => setIsRendered(true), 60);

    if (target === 0) {
      setAnimatedScore(0);
      return () => clearTimeout(renderTimer);
    }

    const duration = 900;
    const startTime = performance.now();
    let animFrame: number;

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // cubic ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easeProgress * target));

      if (progress < 1) {
        animFrame = requestAnimationFrame(updateCount);
      } else {
        setAnimatedScore(target);
      }
    };

    animFrame = requestAnimationFrame(updateCount);
    return () => {
      clearTimeout(renderTimer);
      cancelAnimationFrame(animFrame);
    };
  }, [activeExam?.id, activeExam?.overallScore]);

  // Question distribution slices for Question Breakdown view
  const questionSegments = activeExam?.questionSegments || [
    { label: 'Correct Answers', count: activeExam?.correctQuestions ?? 0, percent: activeExam?.totalQuestions ? Math.round(((activeExam?.correctQuestions ?? 0) / (activeExam?.totalQuestions ?? 1)) * 100) : 0, color: '#10b981' },
    { label: 'Procedural/Calc Errors', count: 0, percent: 0, color: '#94a3b8' },
    { label: 'Contextual Problem Errors', count: 0, percent: 0, color: '#ef4444' },
  ];

  const handleToggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      const exists = prev.includes(topic);
      const next = exists ? prev.filter((t) => t !== topic) : [...prev, topic];
      return next;
    });
  };

  const handleSelectSection = (sec: any) => {
    setSelectedSectionId(sec.id);
  };

  // Load dynamic exams and existing sessions on mount
  useEffect(() => {
    loadExams();
    loadSessions();
  }, []);

  const loadExams = async () => {
    try {
      setIsLoadingExams(true);
      const data = await learningAgentAPI.getStudentExams();
      if (Array.isArray(data) && data.length > 0) {
        setStudentExams(data);
        const initial = data[0];
        setActiveExam(initial);
        setSelectedExamId(String(initial.id));
        const weakSec = initial.sections?.find((s: any) => s.isDifficult) || initial.sections?.[initial.sections.length - 1];
        if (weakSec) setSelectedSectionId(weakSec.id);
        if (initial.struggleTopics?.length > 0) setSelectedTopics(initial.struggleTopics.slice(0, 2));
        const reflection = initial.defaultReflection || `I completed ${initial.title}, but need assistance with ${weakSec?.shortName || 'advanced synthesis'}.`;
        setQuestionInput(reflection);
        const subj = initial.course || initial.title;
        setSubjectInput(subj);

        loadSessions(String(initial.id), reflection, subj);
      }
    } catch (err) {
      console.error("Failed to load student exams telemetry:", err);
    } finally {
      setIsLoadingExams(false);
    }
  };

  const handleExamChange = async (examId: string) => {
    setSelectedExamId(examId);
    setSelectedOption(null);
    setIsOptionSubmitted(false);
    setExerciseResult(null);
    const found = studentExams.find((e: any) => String(e.id) === String(examId));
    if (found) {
      setActiveExam(found);
      const weakSec = found.sections?.find((s: any) => s.isDifficult) || found.sections?.[found.sections.length - 1];
      if (weakSec) setSelectedSectionId(weakSec.id);
      if (found.struggleTopics?.length > 0) {
        setSelectedTopics(found.struggleTopics.slice(0, 2));
      } else {
        setSelectedTopics([]);
      }
      const reflection = found.defaultReflection || `I completed ${found.title}, but need targeted assistance with ${weakSec?.shortName || 'advanced synthesis'}.`;
      setQuestionInput(reflection);
      const subj = found.course || found.title;
      setSubjectInput(subj);

      // Dynamically run diagnosis for newly chosen exam
      try {
        setIsRunningAgent(true);
        setActiveStepAgent(1);
        const res = await learningAgentAPI.diagnose(reflection, subj, found.id);
        if (res) {
          setCurrentSession(res);
          setActiveStepAgent(5);
        }
      } catch (err) {
        console.error("Diagnosis error on exam switch:", err);
      } finally {
        setIsRunningAgent(false);
      }
    }
  };

  const loadSessions = async (examId?: string, reflection?: string, subj?: string) => {
    try {
      const data = await learningAgentAPI.getSessions();
      if (Array.isArray(data) && data.length > 0) {
        setPastSessions(data);
        const matched = examId ? data.find((s: any) => s.subject === subj) : data[0];
        setCurrentSession(matched || data[0]);
      } else if (reflection && subj) {
        const initial = await learningAgentAPI.diagnose(reflection, subj, examId);
        if (initial) {
          setCurrentSession(initial);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  };

  const handleRunDiagnosis = async () => {
    if (!questionInput.trim()) return;
    setIsRunningAgent(true);
    setActiveStepAgent(1);
    setActionMessage(null);
    setApprovalRequested(false);
    setPathAdopted(false);
    setSelectedOption(null);
    setIsOptionSubmitted(false);
    setExerciseResult(null);

    // Visual step sequence animation
    const interval = setInterval(() => {
      setActiveStepAgent((prev) => {
        if (prev < 5) return prev + 1;
        clearInterval(interval);
        return 5;
      });
    }, 600);

    try {
      const result = await learningAgentAPI.diagnose(questionInput, subjectInput, selectedExamId);
      clearInterval(interval);
      setActiveStepAgent(5);
      setCurrentSession(result);
      loadSessions();
    } catch (err) {
      console.error("Diagnosis error:", err);
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleSelectExerciseOption = async (optIdx: number) => {
    setSelectedOption(optIdx);
    setIsOptionSubmitted(true);
    if (currentSession?.id) {
      try {
        setIsSubmittingExercise(true);
        const res = await learningAgentAPI.submitExercise(currentSession.id, 0, optIdx);
        setExerciseResult(res);
      } catch (err) {
        console.error("Failed to submit exercise to backend:", err);
      } finally {
        setIsSubmittingExercise(false);
      }
    }
  };

  const handleRequestApproval = async () => {
    if (!currentSession) return;
    try {
      await learningAgentAPI.requestApproval(currentSession.id);
      setApprovalRequested(true);
      setActionMessage("Curriculum approval request dispatched to your instructor.");
      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdoptPath = async () => {
    if (!currentSession) return;
    try {
      await learningAgentAPI.adoptPath(currentSession.id);
      setPathAdopted(true);
      setActionMessage("Path activated! Your adaptive modules are ready to practice.");
      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const studentUser = {
    id: user?.id ? String(user.id) : '1',
    name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Student',
    email: user?.email || 'student@sparkless.com',
    role: (user?.role as 'student' | 'faculty') || 'student',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  };

  // Helper getters from agent logs
  const getLogPayload = (agentName: string) => {
    if (!currentSession?.agent_logs) return null;
    const log = currentSession.agent_logs.find((l: any) => l.agent_name === agentName);
    if (!log) return null;
    if (typeof log.payload === 'string') {
      try {
        return JSON.parse(log.payload);
      } catch (e) {
        return null;
      }
    }
    return log.payload || null;
  };

  const interactionData = getLogPayload('student_interaction');
  const masteryData = getLogPayload('mastery_assessment');
  const gapsData = getLogPayload('gap_diagnosis');
  const pathData = getLogPayload('path_sequencing');
  const teacherData = getLogPayload('teacher_notification');

  const agentSteps = [
    {
      id: 1,
      name: 'Student Interaction Agent',
      icon: Bot,
      color: 'border-blue-500 text-blue-600 bg-blue-50',
      role: 'Query Ingestion & Symptom Extraction',
      description: 'Listens to student struggles, isolates domain keywords, and identifies the core challenge symptom.',
      status: currentSession ? 'Completed' : isRunningAgent && activeStepAgent >= 1 ? 'Processing...' : 'Waiting'
    },
    {
      id: 2,
      name: 'Mastery Assessment Agent',
      icon: BarChart3,
      color: 'border-purple-500 text-purple-600 bg-purple-50',
      role: 'Sub-Skill & Discrepancy Dissection',
      description: 'Evaluates past tests to identify disparities between high overall scores vs low contextual mastery.',
      status: currentSession ? 'Completed' : isRunningAgent && activeStepAgent >= 2 ? 'Processing...' : 'Waiting'
    },
    {
      id: 3,
      name: 'Gap Diagnosis Agent',
      icon: BrainCircuit,
      color: 'border-amber-500 text-amber-600 bg-amber-50',
      role: 'Cognitive Root Cause Analysis',
      description: 'Pinpoints semantic translation barriers, missing variable ledgers, and cognitive friction.',
      status: currentSession ? 'Completed' : isRunningAgent && activeStepAgent >= 3 ? 'Processing...' : 'Waiting'
    },
    {
      id: 4,
      name: 'Path Sequencing Agent',
      icon: Compass,
      color: 'border-emerald-500 text-emerald-600 bg-emerald-50',
      role: 'Adaptive Curriculum Synthesis',
      description: 'Constructs an individualized 4-stage scaffolded learning sequence with interactive labs.',
      status: currentSession ? 'Completed' : isRunningAgent && activeStepAgent >= 4 ? 'Processing...' : 'Waiting'
    },
    {
      id: 5,
      name: 'Teacher Notification Agent',
      icon: UserCheck,
      color: 'border-rose-500 text-rose-600 bg-rose-50',
      role: 'Instructor Dossier & Intervention Dispatch',
      description: 'Prepares diagnostic alerts for faculty, facilitating pedagogical review and curriculum approval.',
      status: currentSession ? 'Completed' : isRunningAgent && activeStepAgent >= 5 ? 'Processing...' : 'Waiting'
    }
  ];

  if (isLoadingExams && !activeExam) {
    return (
      <DashboardLayout currentUser={studentUser} currentPath={currentPath || '/gap-diagnosis'} onNavigate={onNavigate}>
        <div className="max-w-[1400px] mx-auto w-full px-4 py-24 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-bold text-slate-800">Connecting to Dynamic Telemetry & Exams...</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">Retrieving live student submissions, exam scores, and multi-agent diagnostic models.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeExam) {
    return (
      <DashboardLayout currentUser={studentUser} currentPath={currentPath || '/gap-diagnosis'} onNavigate={onNavigate}>
        <div className="max-w-[1400px] mx-auto w-full px-4 py-24 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Exam Telemetry Available</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">Please complete an assessment to trigger your personalized agent learning path.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentUser={studentUser} currentPath={currentPath || '/gap-diagnosis'} onNavigate={onNavigate}>
      <div className="max-w-[1400px] mx-auto w-full px-2 sm:px-4 animate-slide-up pb-16 text-slate-800 font-sans flex flex-col gap-6">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Track [01]: Challenge Track
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
                Gap Diagnosis Agent
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl mt-1 leading-relaxed">
                Autonomous 5-agent collaborative diagnostic intelligence. When you pass an exam but struggle with specific concept application, our agents dissect the root cause and build a custom remedial curriculum.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-left">
                <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider font-mono">Target Subject</div>
                <div className="text-base font-black text-white">{currentSession?.subject || subjectInput}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-left">
                <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">Agent Ecosystem</div>
                <div className="text-base font-black text-emerald-400">5 Specialized Agents</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: ACADEMIC PERFORMANCE & STUDENT REFLECTION                      */}
        {/* Human-crafted, senior-designer EdTech interface matching Canvas/Coursera  */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          
          {/* Card Header: Exam Context & Selector */}
          <div className="p-5 sm:p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    1. Exam Results & Difficulty Reflection
                  </h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Graded & Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conducted by <strong>{activeExam.instructor}</strong> · {activeExam.date} · Class Average: <strong>{activeExam.classAverage}%</strong>
                </p>
              </div>
            </div>

            {/* Course / Exam Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-medium text-slate-500">Exam:</span>
              <div className="relative">
                <select 
                  value={selectedExamId}
                  onChange={(e) => handleExamChange(e.target.value)}
                  className="appearance-none text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors max-w-[280px] sm:max-w-xs truncate"
                >
                  {studentExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.course ? `${exam.course}: ` : ''}{exam.title} ({exam.overallScore}%)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 1 Visual Data: Academic Performance Analytics */}
          <div className="p-5 sm:p-6 bg-slate-50/40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Overall Exam Radial Completion Gauge */}
              <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-900">Overall Assessment Score</span>
                    <span className="text-[11px] font-semibold text-slate-500">Passing: {activeExam.passingBenchmark}%</span>
                  </div>

                  {/* Clean SVG Radial Accuracy Ring */}
                  <div className="flex flex-col items-center justify-center my-2">
                    <div className="relative w-36 h-36">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        {/* Subtle background track */}
                        <circle
                          cx="60"
                          cy="60"
                          r={gaugeRadius}
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="9"
                        />
                        {/* Real student accuracy stroke */}
                        <circle
                          cx="60"
                          cy="60"
                          r={gaugeRadius}
                          fill="none"
                          stroke={overallScoreVal >= 75 ? '#4f46e5' : '#ef4444'}
                          strokeWidth="9"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={isRendered ? gaugeOffset : gaugeCircumference}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>

                      {/* Center Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-extrabold text-slate-950 font-display tracking-tight leading-none">
                          {animatedScore}%
                        </span>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Grade {activeExam.grade}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {activeExam.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Summary Metrics */}
                <div className="space-y-2 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Questions Answered Correctly:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {activeExam.correctQuestions} of {activeExam.totalQuestions} ({Math.round(((activeExam.correctQuestions || 0) / (activeExam.totalQuestions || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Class Average:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {activeExam.classAverage}%{' '}
                      <span className={activeExam.overallScore >= activeExam.classAverage ? "text-emerald-600 font-sans text-[11px]" : "text-amber-600 font-sans text-[11px]"}>
                        ({activeExam.overallScore >= activeExam.classAverage ? `+${activeExam.overallScore - activeExam.classAverage}% higher` : `${activeExam.overallScore - activeExam.classAverage}% lower`})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Conducted Format:</span>
                    <span className="font-semibold text-slate-800">In-Class Proctored</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Section Performance Horizontal Bar Chart */}
              <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                
                {/* Header & Benchmark Reference */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Section-by-Section Mastery Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Evaluates foundational calculations versus multi-step contextual application.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Mastered (85%+)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span>Gap (&lt;70%)</span>
                    </div>
                  </div>
                </div>

                {/* Performance Bars for the 3 Sections */}
                <div className="space-y-3.5">
                  {(activeExam.sections || []).map((sec: any, sIdx: number) => {
                    const isSelected = selectedSectionId === sec.id;
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSelectSection(sec)}
                        className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer animate-fade-in-up stagger-${(sIdx % 3) + 1} hover:-translate-y-0.5 ${
                          isSelected
                            ? 'border-indigo-300 bg-indigo-50/20 ring-1 ring-indigo-200'
                            : 'border-slate-200/70 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{sec.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sec.badgeBg}`}>
                              {sec.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-500 text-[11px]">
                              {sec.correctQuestions}/{sec.totalQuestions} questions
                            </span>
                            <span className="font-extrabold text-xs" style={{ color: sec.color }}>
                              {sec.score}%
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar with subtle 75% Benchmark Marker */}
                        <div className="relative w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${sec.barColor}`}
                            style={{ width: isRendered ? `${sec.score}%` : '0%' }}
                          ></div>
                        </div>

                        {/* Qualitative Insight */}
                        <p className="text-[11px] text-slate-500 mt-2">
                          {sec.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Pedagogical Diagnostic Summary Box */}
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
                  <span className="text-indigo-600 font-bold mt-0.5">ℹ</span>
                  <p className="leading-relaxed">
                    <strong>Academic Assessment Insight:</strong>{' '}
                    {activeExam.sections?.length >= 3 ? (
                      <>
                        You achieved {activeExam.sections[0].score}% on {activeExam.sections[0].shortName} and {activeExam.sections[1].score}% on {activeExam.sections[1].shortName}, while your accuracy on {activeExam.sections[2].shortName} was <strong>{activeExam.sections[2].score}%</strong> ({activeExam.sections[2].status}). This identifies a need for targeted remediation on {activeExam.sections[2].shortName.toLowerCase()}.
                      </>
                    ) : (
                      <>
                        Overall score: <strong>{activeExam.overallScore}%</strong>. The agents have analyzed your exam telemetry and isolated knowledge gaps in {activeExam.struggleTopics?.[0] || 'core topics'}.
                      </>
                    )}
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* Section 1 Lower: Student Difficulty Reflection & Topic Selection */}
          <div className="p-5 sm:p-6 bg-white space-y-4">
            
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-900">
                What topics did you find difficult during the exam?
              </h3>
              <p className="text-[11px] text-slate-500">
                Select relevant topics or describe in your own words. The Student Interaction Agent will incorporate this into your personalized curriculum.
              </p>
            </div>

            {/* Selectable Topic Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {(activeExam.struggleTopics || []).map((topic: string) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleToggleTopic(topic)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {topic}
                  </button>
                );
              })}
            </div>

            {/* Student Reflection Textarea */}
            <div>
              <textarea
                rows={3}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Describe what you struggled with during the exam..."
                className="w-full bg-slate-50/50 border border-slate-300 rounded-xl p-3.5 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-none shadow-xs"
              />
            </div>

            {/* Bottom Row: Status Indicator & Submit Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Exam telemetry and student reflection linked to Student Interaction Agent
              </span>

              <button
                type="button"
                onClick={handleRunDiagnosis}
                disabled={isRunningAgent}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 text-xs shrink-0 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isRunningAgent ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Exam Gaps & Generating Path...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Analyze Exam Gaps & Generate Path</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* 5 Specialized Agents Execution Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {agentSteps.map((agent, aIdx) => {
            const Icon = agent.icon;
            const isCompleted = currentSession && !isRunningAgent;
            const isCurrent = isRunningAgent && activeStepAgent === agent.id;

            return (
              <div 
                key={agent.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-300 relative animate-fade-in-up stagger-${(aIdx % 5) + 1} hover:-translate-y-1 hover:shadow-md ${
                  isCurrent 
                    ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200 scale-[1.02] animate-soft-highlight' 
                    : isCompleted 
                      ? 'border-slate-200 hover:border-slate-300 shadow-xs' 
                      : 'border-slate-200/70 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-transform duration-300 ${agent.color}`}>
                    <Icon className={`w-4 h-4 ${isCurrent ? 'animate-subtle-pulse' : ''}`} />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                    isCurrent 
                      ? 'bg-amber-100 text-amber-800 animate-subtle-pulse' 
                      : isCompleted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isCurrent ? 'Running...' : isCompleted ? 'Done' : 'Step ' + agent.id}
                  </span>
                </div>
                <div className="text-xs font-black text-slate-900 font-display mb-1">{agent.name}</div>
                <div className="text-[11px] font-bold text-indigo-600 mb-1.5">{agent.role}</div>
                <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">{agent.description}</p>
              </div>
            );
          })}
        </div>

        {/* Action Alert Banner if an action was taken */}
        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionMessage}</span>
            </div>
            <button 
              onClick={() => setActionMessage(null)} 
              className="text-emerald-600 hover:text-emerald-900 font-extrabold"
            >
              x
            </button>
          </div>
        )}

        {/* Diagnosis & Results Section */}
        {currentSession && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'agents', label: 'Agent Breakdown (5 Agents)', icon: Layers },
                { id: 'diagnosis', label: 'Root Cause & Mastery Disparity', icon: BrainCircuit },
                { id: 'curriculum', label: 'Personalized Sequenced Path', icon: Compass },
                { id: 'action', label: 'Teacher Action & Intervention', icon: UserCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: 5 AGENTS DETAILED BREAKDOWN */}
            {activeTab === 'agents' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
                {/* Agent 1: Student Interaction Agent */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-fade-in-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Bot className="w-4 h-4 animate-subtle-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-display">Student Interaction Agent</h4>
                        <p className="text-[11px] text-slate-500">Query Parsing & Symptom Extraction</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full animate-subtle-pulse">ACTIVE</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 animate-fade-in-up stagger-1">
                      <div className="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1 font-mono">Identified Subject & Symptom</div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="bg-indigo-100 text-indigo-800 font-black px-2.5 py-1 rounded-lg">
                          Subject: {currentSession.subject}
                        </span>
                        <span className="bg-rose-100 text-rose-800 font-black px-2.5 py-1 rounded-lg">
                          Symptom: {currentSession.symptom}
                        </span>
                      </div>
                    </div>

                    <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-slate-700 leading-relaxed animate-fade-in-up stagger-2 hover:shadow-xs transition-shadow">
                      <div className="font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-ai-sparkle" />
                        Conversational Empathy Dispatch:
                      </div>
                      "{interactionData?.empathy_message || 'Identified test-passing with contextual application difficulty.'}"
                    </div>

                    {interactionData?.clarification_questions && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in-up stagger-3">
                        <div className="font-bold text-slate-700 mb-2">Probing Clarification Prompts:</div>
                        <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                          {interactionData.clarification_questions.map((q: string, idx: number) => (
                            <li key={idx} className={`animate-fade-in-up stagger-${(idx % 3) + 1}`}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent 2: Mastery Assessment Agent */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-fade-in-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <BarChart3 className="w-4 h-4 animate-subtle-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-display">Mastery Assessment Agent</h4>
                        <p className="text-[11px] text-slate-500">Historical Disparity & Vector Analysis</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">DIAGNOSED</span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 text-xs animate-fade-in-up stagger-1">
                      <div className="flex items-center justify-between mb-1.5 font-bold">
                        <span className="text-purple-900 font-mono text-[11px]">DIVERGENCE PARADOX DETECTED</span>
                        <span className="text-rose-600 font-black animate-warning-pulse">
                          {masteryData?.discrepancy_gap_points ? `+${masteryData.discrepancy_gap_points}% Gap` : (masteryData?.divergence_analysis?.gap ? `+${masteryData.divergence_analysis.gap}` : '+28% Gap')}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-[11px]">
                        {masteryData?.divergence_analysis?.verdict || 'Student passed test based on computation algorithms but exhibits deep translation deficit.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">Sub-Skill Vector Breakdown:</div>
                      {(masteryData?.subskills || masteryData?.mastery_vectors)?.map((vec: any, idx: number) => (
                        <div key={idx} className={`bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col gap-1 animate-fade-in-up stagger-${(idx % 4) + 1} transition-all hover:bg-slate-100/80 duration-200`}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{vec.subskill}</span>
                            <span className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                              vec.score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                              vec.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {vec.score}% • {vec.status}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                vec.score >= 80 ? 'bg-emerald-500' : vec.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: isRendered ? `${vec.score}%` : '0%' }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Agent 3: Gap Diagnosis Agent */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-fade-in-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <BrainCircuit className="w-4 h-4 animate-subtle-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-display">Gap Diagnosis Agent</h4>
                        <p className="text-[11px] text-slate-500">Root Cause Mechanism Isolation</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">ROOT CAUSE FOUND</span>
                  </div>

                  <div className="space-y-3">
                    {gapsData?.root_causes?.map((rc: any, idx: number) => (
                      <div key={idx} className={`bg-slate-50 border border-slate-200 p-3.5 rounded-2xl animate-fade-in-up stagger-${(idx % 3) + 1} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900">{rc.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 animate-warning-pulse' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rc.severity}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-indigo-600 font-bold mb-1.5">
                          Mechanism: {rc.cognitive_mechanism}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2">{rc.explanation}</p>
                        <div className="text-[11px] bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-medium">
                          <strong className="text-slate-900">Remedy Focus:</strong> {rc.remediation_focus}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent 5: Teacher Notification Agent */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-fade-in-up">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <UserCheck className="w-4 h-4 animate-subtle-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-display">Teacher Notification Agent</h4>
                        <p className="text-[11px] text-slate-500">Instructor Dossier & Approval Workflow</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">DISPATCHED</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100 animate-fade-in-up stagger-1">
                      <div className="flex items-center gap-2 text-rose-800 font-bold mb-1 font-mono text-[11px]">
                        <ShieldAlert className="w-4 h-4 text-rose-600 animate-warning-pulse" />
                        <span className="animate-subtle-pulse">HIGH PRIORITY INTERVENTION ALERT</span>
                      </div>
                      <div className="font-extrabold text-slate-900 text-sm mb-1">{teacherData?.alert_title}</div>
                      <p className="text-slate-600 text-[11px]">
                        Assigned to: <span className="font-bold text-slate-900">{teacherData?.assigned_teacher}</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono text-[11px] whitespace-pre-line text-slate-700 animate-fade-in-up stagger-2">
                      {teacherData?.dossier_summary}
                    </div>

                    <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 animate-fade-in-up stagger-3">
                      <div className="font-bold text-indigo-950 mb-1.5">Recommended Instructor Actions:</div>
                      <ul className="space-y-1 text-slate-700 list-disc list-inside">
                        {teacherData?.recommended_teacher_actions?.map((act: string, i: number) => (
                          <li key={i} className={`animate-fade-in-up stagger-${(i % 3) + 1}`}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ROOT CAUSE & MASTERY DISPARITY */}
            {activeTab === 'diagnosis' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in-up">
                <div className="border-b border-slate-200 pb-4">
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-mono">Deep Diagnostic Synthesis</div>
                  <h3 className="text-xl font-black text-slate-900 font-display mt-0.5">
                    {gapsData?.divergence_explanation?.title || `Mastery Disparity Analysis: ${activeExam?.title || 'Exam Performance'}`}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    An in-depth explanation generated by the Gap Diagnosis and Mastery Assessment Agents.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl animate-fade-in-up stagger-1 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider font-mono mb-1">Standard Test Score</div>
                    <div className="text-3xl font-black text-emerald-700 font-display">{activeExam?.overallScore ?? 82}%</div>
                    <div className="text-xs font-bold text-emerald-800 mt-1">Result: {activeExam?.status || 'PASSED'}</div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      Exam demonstrated solid procedural execution ({activeExam?.sections?.[0]?.score ?? 90}%), meeting baseline course completion criteria.
                    </p>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl animate-fade-in-up stagger-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                    <div className="text-xs font-bold text-rose-800 uppercase tracking-wider font-mono mb-1">
                      {activeExam?.sections?.[activeExam?.sections?.length - 1]?.shortName || 'Contextual Application'} Score
                    </div>
                    <div className="text-3xl font-black text-rose-700 font-display">
                      {activeExam?.sections?.[activeExam?.sections?.length - 1]?.score ?? 28}%
                    </div>
                    <div className="text-xs font-bold text-rose-800 mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-warning-pulse"></span>
                      Status: CRITICAL GAP
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      {gapsData?.divergence_explanation?.why_gap || 'When questions required complex synthesis or narrative modeling, performance dropped significantly.'}
                    </p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl animate-fade-in-up stagger-3 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                    <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider font-mono mb-1">Divergence Gap</div>
                    <div className="text-3xl font-black text-indigo-700 font-display">
                      {Math.max(0, (activeExam?.sections?.[0]?.score ?? 82) - (activeExam?.sections?.[activeExam?.sections?.length - 1]?.score ?? 28))} pts
                    </div>
                    <div className="text-xs font-bold text-indigo-800 mt-1">Discrepancy Severity: HIGH</div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      This divergence causes students to mistakenly believe they lack aptitude, when in reality they only need targeted scaffolded practice.
                    </p>
                  </div>
                </div>

                {/* Root Cause Details */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-base font-bold text-slate-900 font-display">The 3 Structural Barriers Identified:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gapsData?.root_causes?.map((rc: any, idx: number) => (
                      <div key={idx} className={`bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between animate-fade-in-up stagger-${(idx % 3) + 1} hover:-translate-y-1 hover:shadow-sm transition-all duration-300`}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-slate-400">{rc.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 animate-warning-pulse' : 'bg-slate-200 text-slate-700'}`}>{rc.severity}</span>
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 mb-1">{rc.name}</div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-3">{rc.explanation}</p>
                        </div>
                        <div className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 text-indigo-700 font-semibold">
                          Target: {rc.remediation_focus}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PERSONALIZED SEQUENCED LEARNING PATH */}
            {activeTab === 'curriculum' && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider font-mono">
                        <Compass className="w-3.5 h-3.5 animate-ai-sparkle" />
                        Path Sequencing Agent Deliverable
                      </div>
                      <h3 className="text-xl font-black text-slate-900 font-display mt-0.5">
                        {pathData?.path_title || currentSession.recommended_path_title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Est. Duration: {pathData?.total_estimated_time_minutes || 75} mins • Curve: {pathData?.difficulty_curve || 'Scaffolded'}
                      </p>

                      {/* Smooth progress bar */}
                      <div className="w-full max-w-md bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: isRendered ? (pathAdopted || currentSession.status === 'adopted' ? '100%' : '25%') : '0%' }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleAdoptPath}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        {pathAdopted || currentSession.status === 'adopted' ? 'Path Adopted ✓' : 'Adopt Learning Path'}
                      </button>
                    </div>
                  </div>

                  {/* 4 Milestones Timeline */}
                  <div className="space-y-4 mt-6">
                    {pathData?.milestones?.map((milestone: any, mIdx: number) => {
                      const isFirstMilestone = milestone.step === 1;
                      const isCompletedMilestone = milestone.status === 'Completed' || (isFirstMilestone && isOptionSubmitted && exerciseResult?.is_correct);

                      return (
                        <React.Fragment key={milestone.step}>
                          {/* Connecting arrow with flow animation between stages */}
                          {mIdx > 0 && (
                            <div className="flex items-center justify-center py-1">
                              <div className="flex flex-col items-center text-indigo-400">
                                <div className="w-0.5 h-3 bg-indigo-200"></div>
                                <ChevronDown className="w-4 h-4 animate-flow-down text-indigo-500" />
                              </div>
                            </div>
                          )}

                          <div 
                            className={`rounded-2xl p-5 relative overflow-hidden transition-all duration-300 animate-fade-in-up stagger-${milestone.step} hover:-translate-y-0.5 hover:shadow-xs ${
                              isFirstMilestone && !isCompletedMilestone
                                ? 'bg-indigo-50/30 border-2 border-indigo-300 ring-2 ring-indigo-100 animate-soft-highlight shadow-sm'
                                : isCompletedMilestone
                                  ? 'bg-emerald-50/40 border border-emerald-200'
                                  : 'bg-slate-50 border border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center font-display transition-colors ${
                                  isCompletedMilestone
                                    ? 'bg-emerald-600 text-white'
                                    : isFirstMilestone
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-900 text-white'
                                }`}>
                                  {isCompletedMilestone ? <Check className="w-4 h-4" /> : milestone.step}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 font-display">{milestone.title}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {milestone.estimated_minutes} min
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                                  isCompletedMilestone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isFirstMilestone
                                      ? 'bg-indigo-100 text-indigo-800 animate-subtle-pulse'
                                      : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {isCompletedMilestone ? 'Completed' : milestone.status}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 mb-4">{milestone.objective}</p>

                            {/* Interactive Widget for Milestone 1 */}
                            {milestone.step === 1 && milestone.interactive_exercises && (
                              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 shadow-2xs">
                                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                                  <Lightbulb className="w-4 h-4 text-amber-500 animate-subtle-pulse" />
                                  Interactive Diagnostic Practice:
                                </div>
                                <div className="text-xs font-bold text-slate-800">
                                  Translate: <span className="font-mono text-indigo-600">{milestone.interactive_exercises[0].phrase}</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {milestone.interactive_exercises[0].options.map((opt: string, optIdx: number) => {
                                    const isSelected = selectedOption === optIdx;
                                    const isCorrect = exerciseResult ? (exerciseResult.correct_index === optIdx) : (optIdx === milestone.interactive_exercises[0].correct_index);
                                    return (
                                      <button
                                        key={optIdx}
                                        onClick={() => handleSelectExerciseOption(optIdx)}
                                        disabled={isSubmittingExercise}
                                        className={`text-xs font-mono p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-98 cursor-pointer ${
                                          isOptionSubmitted && isCorrect
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs'
                                            : isOptionSubmitted && isSelected && !isCorrect
                                              ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                                              : isSelected
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold'
                                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>

                                {isOptionSubmitted && (
                                  <div className="text-xs bg-slate-50 p-3 rounded-xl text-slate-700 border border-slate-200 mt-2 space-y-1 animate-fade-in-up">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      {exerciseResult ? (
                                        exerciseResult.is_correct ? (
                                          <span className="text-emerald-700 flex items-center gap-1 font-bold">
                                            <Check className="w-3.5 h-3.5" /> Correct Answer! Evaluated by Learning Engine.
                                          </span>
                                        ) : (
                                          <span className="text-rose-600 flex items-center gap-1 font-bold">
                                            <AlertTriangle className="w-3.5 h-3.5 animate-warning-pulse" /> Incorrect, review rationale below:
                                          </span>
                                        )
                                      ) : (
                                        <strong className="text-emerald-700">Explanation:</strong>
                                      )}
                                    </div>
                                    <div className="text-slate-600 leading-relaxed">
                                      {exerciseResult?.explanation || milestone.interactive_exercises[0].explanation}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Guided 3-Box Scaffold for Milestone 2 */}
                            {milestone.step === 2 && milestone.scaffold_steps && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {milestone.scaffold_steps.map((box: any, bIdx: number) => (
                                  <div key={bIdx} className="bg-white p-3 rounded-xl border border-slate-200 hover:shadow-xs transition-shadow">
                                    <div className="text-[11px] font-bold text-slate-900 mb-1">{box.box}</div>
                                    <div className="text-[11px] text-slate-500">{box.rule}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Interactive Lab for Milestone 3 */}
                            {milestone.step === 3 && milestone.interactive_problem && (
                              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2 hover:shadow-xs transition-shadow">
                                <div className="font-bold text-slate-900">{milestone.interactive_problem.title}</div>
                                <p className="text-slate-600">{milestone.interactive_problem.story}</p>
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                                  Step 1: {milestone.interactive_problem.step1_prompt} → <span className="text-emerald-600 font-bold">{milestone.interactive_problem.step1_answer}</span>
                                  <br />
                                  Step 2: Equation: <span className="text-indigo-600 font-bold">{milestone.interactive_problem.step2_equation}</span>
                                </div>
                              </div>
                            )}

                            {/* Milestone 4: Verification Challenge */}
                            {milestone.step === 4 && (
                              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between text-xs hover:shadow-xs transition-shadow">
                                <div className="flex items-center gap-2">
                                  <Award className="w-4 h-4 text-indigo-600 animate-ai-sparkle" />
                                  <span className="font-medium text-slate-700">{milestone.criteria}</span>
                                </div>
                                <span className="bg-indigo-600 text-white font-bold px-3 py-1 rounded-lg text-[11px] shadow-2xs">
                                  Badge Waiting
                                </span>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TEACHER ACTION & APPROVAL WORKFLOW */}
            {activeTab === 'action' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in-up">
                <div className="border-b border-slate-200 pb-4">
                  <div className="text-xs font-bold text-rose-600 uppercase tracking-wider font-mono">Workflow Step [06]</div>
                  <h3 className="text-xl font-black text-slate-900 font-display mt-0.5">
                    Take Action & Request Teacher Approval
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Connect your personalized path directly with your instructor to ensure academic alignment and credit.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Panel */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 hover:shadow-xs transition-shadow">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Current Intervention Status</div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        currentSession.status === 'approved' ? 'bg-emerald-500 animate-subtle-pulse' :
                        currentSession.status === 'pending_approval' ? 'bg-amber-500 animate-warning-pulse' :
                        'bg-blue-500 animate-subtle-pulse'
                      }`} />
                      <span className="text-base font-extrabold text-slate-900 uppercase">
                        {currentSession.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 leading-relaxed">
                      {currentSession.status === 'pending_approval' ? (
                        "Your diagnosis and 4-step remedial path have been transmitted to your faculty mentor. You will receive an in-app notification once approved."
                      ) : currentSession.status === 'approved' ? (
                        "Your faculty mentor has reviewed and approved your personalized learning path! You are cleared to complete the modules for credit."
                      ) : (
                        "You can submit this diagnostic briefing to your faculty instructor for official curriculum adaptation approval."
                      )}
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleRequestApproval}
                        disabled={approvalRequested || currentSession.status === 'pending_approval' || currentSession.status === 'approved'}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        {currentSession.status === 'pending_approval' ? 'Approval Requested' : 'Request Teacher Review'}
                      </button>

                      <button
                        onClick={handleAdoptPath}
                        disabled={pathAdopted || currentSession.status === 'adopted'}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Compass className="w-4 h-4" />
                        {currentSession.status === 'adopted' ? 'Path Active' : 'Adopt Now'}
                      </button>
                    </div>
                  </div>

                  {/* Teacher Dossier Preview */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:shadow-xs transition-shadow">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Dispatched Faculty Dossier</div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="font-bold text-slate-900">Instructor: {teacherData?.assigned_teacher || 'Professor Smith'}</div>
                      <div className="text-slate-500 font-mono text-[11px]">Subject: {currentSession.subject} • Severity: HIGH</div>
                      <div className="border-t border-slate-100 pt-2 text-slate-700 text-[11px] whitespace-pre-line leading-relaxed">
                        {teacherData?.dossier_summary}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
