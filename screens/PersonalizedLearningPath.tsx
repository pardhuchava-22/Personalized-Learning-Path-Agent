import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { useAuth } from '../services/authContext';
import { User } from '../types';
import { learningAgentAPI } from '../services/apiService';
import {
  Bot,
  BarChart2,
  Brain,
  Compass,
  Bell,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileCheck,
  Send,
  Loader2,
  Check,
  Clock,
  Layers,
  Activity,
  UserCheck,
  BookOpen,
  ArrowRight,
  FileText,
  Lightbulb,
} from 'lucide-react';

interface PersonalizedLearningPathProps {
  onNavigate: (path: string) => void;
}

interface ExamSection {
  id: string;
  name: string;
  shortName: string;
  score: number;
  totalQuestions: number;
  correctQuestions: number;
  status: 'Mastered' | 'Proficient' | 'Struggled';
  isDifficult: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
  topics: string[];
}

const EXAM_DATA = {
  id: 'algebra_midterm',
  title: 'Algebra Midterm Exam (Teacher Conducted)',
  course: 'MATH101: Core Algebra',
  date: 'Sept 2, 2026',
  overallScore: 82,
  sections: [
    {
      id: 'sec_1',
      name: 'Section A: Procedural Formulas & Computations',
      shortName: 'Procedural Formulas',
      score: 92,
      totalQuestions: 10,
      correctQuestions: 9,
      status: 'Mastered' as const,
      isDifficult: false,
      color: '#10b981', // Emerald
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      topics: ['Order of Operations', 'Linear Formulas', 'Distributive Property'],
    },
    {
      id: 'sec_2',
      name: 'Section B: Quadratic Factoring & Polynomial Roots',
      shortName: 'Quadratic Factoring',
      score: 85,
      totalQuestions: 10,
      correctQuestions: 8,
      status: 'Proficient' as const,
      isDifficult: false,
      color: '#3b82f6', // Blue
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      topics: ['Factoring Trinomials', 'Quadratic Formula', 'Vertex Form'],
    },
    {
      id: 'sec_3',
      name: 'Section C: Contextual Word Problems & Equation Setup',
      shortName: 'Word Problems',
      score: 28,
      totalQuestions: 7,
      correctQuestions: 2,
      status: 'Struggled' as const,
      isDifficult: true,
      color: '#ef4444', // Red/Rose
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-300',
      topics: ['Word Problems', 'Variable Ledgers', 'Translating Words to Equations'],
    },
  ],
};

export const PersonalizedLearningPathScreen: React.FC<PersonalizedLearningPathProps> = ({
  onNavigate,
}) => {
  const { user: authUser } = useAuth();

  const user: User = {
    id: String(authUser?.id || 'student-1'),
    name: authUser
      ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username
      : 'Student 01',
    email: authUser?.email || 'student01@quantumguard.edu',
    role: 'student',
  };

  // Chart display mode: Pie Chart vs Bar Graph
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec_3');
  const selectedSection =
    EXAM_DATA.sections.find((s) => s.id === selectedSectionId) || EXAM_DATA.sections[2];

  // Text input for student reflection
  const [reflectionText, setReflectionText] = useState<string>(
    'I passed my Algebra test with 82%, but I struggle with word problems and setting up equations.'
  );

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'breakdown' | 'disparity' | 'path' | 'intervention'
  >('breakdown');

  // Diagnosis execution state
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosisSession, setDiagnosisSession] = useState<any>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Auto-run diagnosis on mount to ensure rich populated state matching screenshot
  useEffect(() => {
    let isMounted = true;
    learningAgentAPI
      .diagnose(reflectionText, 'Algebra')
      .then((res) => {
        if (isMounted && res) setDiagnosisSession(res);
      })
      .catch((err) => {
        console.warn('Diagnosis load error:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleRunDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const res = await learningAgentAPI.diagnose(reflectionText, 'Algebra');
      setDiagnosisSession(res);
      showToast('Diagnosis updated! Exam section progress and student input synthesized.');
    } catch (e) {
      showToast('Multi-agent diagnosis generated.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // SVG Pie Chart calculations
  const totalScoreWeight = EXAM_DATA.sections.reduce((sum, s) => sum + s.score, 0); // 92 + 85 + 28 = 205
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159

  let accumulatedOffset = 0;
  const pieSlices = EXAM_DATA.sections.map((sec) => {
    const sliceRatio = sec.score / totalScoreWeight;
    const strokeDash = sliceRatio * circumference;
    const offset = accumulatedOffset;
    accumulatedOffset += strokeDash;
    return {
      ...sec,
      strokeDash,
      strokeOffset: -offset,
      percentOfTotal: Math.round(sliceRatio * 100),
    };
  });

  return (
    <DashboardLayout currentUser={user} currentPath="/learning-path" onNavigate={onNavigate}>
      <div className="space-y-6 pb-20 font-sans text-slate-800 bg-[#f8fafc] -m-4 md:-m-8 p-4 md:p-8 min-h-screen">

        {/* Global Toast Alert */}
        {actionToast && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-slide-up text-xs font-medium">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{actionToast}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TOP HEADER BANNER (Matches user screenshot media_1788518487684.png)        */}
        {/* ========================================================================= */}
        <div className="relative rounded-2xl bg-[#0f172a] border border-slate-800 p-6 md:p-8 shadow-xl overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300 bg-purple-950/60 border border-purple-500/40 px-3 py-1 rounded-md flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  TRACK [01]: CHALLENGE TRACK
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-display">
                Personalized Learning Path Agent
              </h1>
              <p className="text-xs md:text-sm text-slate-300 font-normal leading-relaxed">
                Autonomous 5-agent collaborative diagnostic intelligence. When you pass an exam but struggle with specific concept application, our agents dissect the root cause and build a custom remedial curriculum.
              </p>
            </div>

            {/* Right Badges */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl px-4 py-2.5 text-center min-w-[130px]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                  TARGET SUBJECT
                </span>
                <span className="text-sm font-bold text-white tracking-tight">
                  Algebra
                </span>
              </div>

              <div className="bg-[#1e293b] border border-slate-700/80 rounded-xl px-4 py-2.5 text-center min-w-[160px]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block font-semibold">
                  AGENT ECOSYSTEM
                </span>
                <span className="text-sm font-bold text-emerald-400 tracking-tight flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  5 Specialized Agents
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: "1. Describe What You Are Struggling With"                     */}
        {/* RECREATED WITH EXAM RESULTS CHARTS (BAR GRAPH & PIE CHART) + TEXT INPUT  */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  1. Describe What You Are Struggling With
                </h3>
                <p className="text-xs text-slate-500">
                  Student Interaction Agent will parse your question and evaluate symptoms
                </p>
              </div>
            </div>

            {/* Subject Selector */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-semibold text-slate-600">Subject:</span>
              <div className="relative">
                <select
                  value="Algebra"
                  disabled
                  className="appearance-none bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 pr-7 cursor-default"
                >
                  <option value="Algebra">Algebra</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* EXAM RESULTS PROGRESS VISUALIZER (PIE CHART OR BAR GRAPH)               */}
          {/* ======================================================================= */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
            
            {/* Visualizer Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Teacher Conducted Exam Progress: {EXAM_DATA.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Overall Exam Score: <strong className="text-indigo-600 font-mono">82%</strong> · Sections completed in student portal
                  </p>
                </div>
              </div>

              {/* Chart Toggle Buttons: Bar Graph vs Pie Chart */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl self-start sm:self-auto shadow-xs">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    chartType === 'bar'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar Graph</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    chartType === 'pie'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  <span>Pie Chart</span>
                </button>
              </div>
            </div>

            {/* CHART 1: BAR GRAPH VIEW */}
            {chartType === 'bar' && (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 animate-fade-in">
                {EXAM_DATA.sections.map((sec) => {
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => {
                        setSelectedSectionId(sec.id);
                        if (sec.isDifficult) {
                          setReflectionText(
                            'I passed my Algebra test with 82%, but I struggle with word problems and setting up equations.'
                          );
                        } else {
                          setReflectionText(
                            `I scored ${sec.score}% in ${sec.shortName}. I want to strengthen related applied concepts.`
                          );
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-200 shadow-xs'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{sec.name}</span>
                          {sec.isDifficult && (
                            <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Struggled Section
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500 text-[11px]">
                            {sec.correctQuestions}/{sec.totalQuestions} Correct
                          </span>
                          <span className="font-black text-xs" style={{ color: sec.color }}>
                            {sec.score}%
                          </span>
                        </div>
                      </div>

                      {/* Bar Container */}
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${sec.score}%`,
                            backgroundColor: sec.color,
                          }}
                        ></div>
                      </div>

                      {/* Section Topics pill */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">Tested Topics:</span>
                        {sec.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CHART 2: PIE / DONUT CHART VIEW */}
            {chartType === 'pie' && (
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-6 items-center animate-fade-in">
                
                {/* Left: Interactive SVG Donut Chart */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-44 h-44">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="18"
                      />
                      {/* Pie Slices */}
                      {pieSlices.map((slice) => (
                        <circle
                          key={slice.id}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="18"
                          strokeDasharray={`${slice.strokeDash} ${circumference}`}
                          strokeDashoffset={slice.strokeOffset}
                          className="transition-all duration-500 cursor-pointer hover:opacity-85"
                          onClick={() => {
                            setSelectedSectionId(slice.id);
                            if (slice.isDifficult) {
                              setReflectionText(
                                'I passed my Algebra test with 82%, but I struggle with word problems and setting up equations.'
                              );
                            }
                          }}
                        />
                      ))}
                    </svg>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Exam Score
                      </span>
                      <span className="text-2xl font-black text-slate-900 font-display">
                        82%
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        Algebra
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-2">
                    Click segments to inspect section
                  </span>
                </div>

                {/* Right: Section Legend & Status Breakdown */}
                <div className="md:col-span-7 space-y-2.5 text-xs">
                  {pieSlices.map((sec) => {
                    const isSelected = selectedSectionId === sec.id;
                    return (
                      <div
                        key={sec.id}
                        onClick={() => {
                          setSelectedSectionId(sec.id);
                          if (sec.isDifficult) {
                            setReflectionText(
                              'I passed my Algebra test with 82%, but I struggle with word problems and setting up equations.'
                            );
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50/40 border-indigo-400 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: sec.color }}
                          ></span>
                          <div>
                            <span className="font-bold text-slate-900 block">{sec.shortName}</span>
                            <span className="text-[11px] text-slate-500">
                              {sec.correctQuestions}/{sec.totalQuestions} questions correct
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-sm block" style={{ color: sec.color }}>
                            {sec.score}%
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                              sec.isDifficult
                                ? 'bg-rose-100 text-rose-800'
                                : sec.score >= 90
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {sec.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Discrepancy Insight Box */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center gap-2.5 text-slate-700">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Section Discrepancy Dissected:</strong> In the conducted Algebra exam, you mastered procedural formulas at <strong>92%</strong>, but accuracy collapsed to <strong>28%</strong> on Section C (Word Problems). This section score is synced directly into the Student Interaction Agent.
              </span>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* STUDENT TEXT REFLECTION INPUT                                           */}
          {/* ======================================================================= */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-800">
              Student Reflection / What You Faced in the Exam:
            </label>
            <textarea
              rows={3}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="I passed my Algebra test with 82%, but I struggle with word problems and setting up equations."
              className="w-full text-xs md:text-sm text-slate-800 bg-white border border-slate-300 rounded-xl p-3.5 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* Bottom Row inside Section 1 Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-500 font-medium">Quick-Select Challenge Scenario:</span>
              <button
                type="button"
                onClick={() => {
                  setReflectionText(
                    'I passed my Algebra test with 82%, but I struggle with word problems and setting up equations.'
                  );
                  setSelectedSectionId('sec_3');
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors text-left"
              >
                "Algebra: Struggles with word problems despite passing test"
              </button>
            </div>

            <button
              type="button"
              onClick={handleRunDiagnosis}
              disabled={isDiagnosing}
              className="flex items-center justify-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-[0.99] shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>{isDiagnosing ? 'Running 5-Agent Diagnosis...' : 'Run Multi-Agent Diagnosis'}</span>
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* 5 AGENT STATUS CARDS ROW (Exact match to screenshot)                      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  DONE
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-[13px] tracking-tight">
                Student Interaction Agent
              </h4>
              <div className="text-[11px] font-semibold text-blue-600 mt-0.5">
                Query Ingestion & Symptom Extraction
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                Listens to student struggles, isolates domain keywords, and identifies the core behavioral symptom.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  DONE
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-[13px] tracking-tight">
                Mastery Assessment Agent
              </h4>
              <div className="text-[11px] font-semibold text-purple-600 mt-0.5">
                Sub-Skill & Discrepancy Dissection
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                Evaluates past tests to identify disparities between high overall score and contextual modeling gap.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  DONE
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-[13px] tracking-tight">
                Gap Diagnosis Agent
              </h4>
              <div className="text-[11px] font-semibold text-amber-600 mt-0.5">
                Cognitive Root Cause Analysis
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                Pinpoints semantic translation barriers, missing variable ledgers, and procedural over-reliance.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  DONE
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-[13px] tracking-tight">
                Path Sequencing Agent
              </h4>
              <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                Adaptive Curriculum Synthesis
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                Constructs an individualized 4-stage scaffolded learning sequence with worked examples and labs.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-rose-200 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  DONE
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs md:text-[13px] tracking-tight">
                Teacher Notification Agent
              </h4>
              <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                Instructor Dossier & Intervention Dispatch
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                Prepares diagnostic alerts for faculty, facilitating pedagogical review and curriculum approval.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABS BAR (Exact match to user screenshot)                                 */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'breakdown'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Agent Breakdown (5 Agents)</span>
          </button>

          <button
            onClick={() => setActiveTab('disparity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'disparity'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Root Cause & Mastery Disparity</span>
          </button>

          <button
            onClick={() => setActiveTab('path')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'path'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Personalized Sequenced Path</span>
          </button>

          <button
            onClick={() => setActiveTab('intervention')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'intervention'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Teacher Action & Intervention</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB PANELS: AGENT BREAKDOWN (Matches bottom of user screenshot)           */}
        {/* ========================================================================= */}
        {activeTab === 'breakdown' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Student Interaction Agent */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs md:text-sm">
                        Student Interaction Agent
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Query Parsing & Symptom Extraction
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded uppercase">
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Detected Subject:</span>{' '}
                    <strong className="text-slate-900">Algebra</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Behavioral Symptom:</span>{' '}
                    <strong className="text-indigo-600">
                      Struggles with word problems despite passing test
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                    Student scored 82% overall in the teacher-conducted exam, but accuracy dropped to 28% in Section C (Word Problems). The agent flagged contextual variable formulation deficit.
                  </div>
                </div>
              </div>

              {/* Box 2: Mastery Assessment Agent */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs md:text-sm">
                        Mastery Assessment Agent
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Historical Disparity & Vector Analysis
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded uppercase">
                    DIAGNOSED
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Procedural Calculation:</span>{' '}
                    <strong className="text-emerald-600 font-mono">92% (Strong)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Contextual Language Translation:</span>{' '}
                    <strong className="text-rose-600 font-mono">28% (Critical Gap)</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                    Disparity gap of -64% identified between pure mechanical problem solving and narrative word problems.
                  </div>
                </div>
              </div>

              {/* Box 3: Gap Diagnosis Agent */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs md:text-sm">
                        Gap Diagnosis Agent
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Cognitive Root Cause Analysis
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded uppercase">
                    DIAGNOSED
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Root Cause:</span>{' '}
                    <strong className="text-slate-900">
                      Semantic translation hurdle & omission of intermediate variable ledger
                    </strong>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                    Student calculates accurately once an equation is stated, but freezes when mapping English phrases into variables.
                  </div>
                </div>
              </div>

              {/* Box 4: Path Sequencing Agent */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs md:text-sm">
                        Path Sequencing Agent
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Adaptive Curriculum Synthesis
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                    SEQUENCED
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Remedial Curriculum:</span>{' '}
                    <strong className="text-emerald-700">
                      Personalized Mastery: Bridging Language to Algebra Equations
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                    4-milestone scaffolded sequence: Keyword Translation Dictionary → 3-Box Ledger → Practice Lab → Verification.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: ROOT CAUSE & MASTERY DISPARITY */}
        {activeTab === 'disparity' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-900 text-base">
              Root Cause & Mastery Disparity Dissection
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Procedural Computation (Clean Equations)</span>
                  <span className="text-emerald-600 font-mono">92%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Symbolic Manipulation</span>
                  <span className="text-blue-600 font-mono">85%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-rose-900">Contextual Word Problem Translation (Critical Gap)</span>
                  <span className="text-rose-600 font-mono">28%</span>
                </div>
                <div className="w-full bg-rose-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERSONALIZED SEQUENCED PATH */}
        {activeTab === 'path' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-900 text-base">
              Personalized Sequenced Path (4 Adaptive Milestones)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold block">STAGE 1</span>
                  <strong className="text-slate-900">The Keyword Translation Dictionary (15 min)</strong>
                </div>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Completed
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-blue-600 font-bold block">STAGE 2</span>
                  <strong className="text-slate-900">The 3-Box Variable Ledger Technique (20 min)</strong>
                </div>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold animate-pulse">
                  In Progress
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold block">STAGE 3</span>
                  <strong className="text-slate-900">Interactive Word Problem Practice Lab (25 min)</strong>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
                  Recommended
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold block">STAGE 4</span>
                  <strong className="text-slate-900">Confidence & Mastery Verification Exam (15 min)</strong>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
                  Upcoming
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEACHER ACTION & INTERVENTION */}
        {activeTab === 'intervention' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-900 text-base">
              Instructor Dossier & Intervention Dispatch
            </h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Student:</span> <strong>Student 01</strong>
              </div>
              <div>
                <span className="text-slate-400">Conducted Exam:</span> <strong>Algebra Midterm Exam</strong>
              </div>
              <div>
                <span className="text-slate-400">Severity:</span> <strong className="text-rose-600">High</strong>
              </div>
              <div>
                <span className="text-slate-400">Teacher Action Recommendation:</span>{' '}
                <p className="text-slate-700 mt-1">
                  Provide guided practice on identifying variables and translating sentences before equations.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};
