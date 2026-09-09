import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, RotateCcw, ArrowRight, Clock, Award, 
  BookOpen, Code2, ChevronDown, ChevronUp, Calendar, ArrowUpRight, HelpCircle,
  Download
} from 'lucide-react';

export interface PerformanceResultsViewProps {
  type: 'quiz' | 'challenge' | 'exam';
  title: string;
  courseTitle?: string;
  moduleTitle?: string;
  score: number; // percentage e.g., 76
  totalQuestions: number; // e.g., 25 or total test cases
  correctAnswers: number; // e.g., 19 or passed test cases
  timeSpent: string; // e.g., "18m 42s"
  grade?: string; // e.g., "A"
  completedAt: string; // Date string
  attemptsCount?: number;
  questions?: Array<{
    id: string;
    text: string;
    type?: string; // e.g. 'Multiple Choice'
    userAnswerText?: string;
    correctAnswerText?: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  testCases?: Array<{
    case: number;
    input: string;
    got: string;
    expected: string;
    passed: boolean;
    isHidden?: boolean;
  }>;
  proctoringReport?: React.ReactNode;
  strongTopics?: string[];
  weakTopics?: string[];
  onRetry: () => void;
  onContinue: () => void;
  onNavigateToNotes?: () => void;
  onNavigateToChallenge?: () => void;
  onDownloadCertificate?: () => void;
}

export const PerformanceResultsView: React.FC<PerformanceResultsViewProps> = ({
  type,
  title,
  courseTitle = 'Python Tutorial for Beginners',
  moduleTitle = 'Variables & Data Types',
  score,
  totalQuestions,
  correctAnswers,
  timeSpent,
  grade,
  completedAt,
  attemptsCount = 1,
  questions = [],
  testCases = [],
  proctoringReport,
  strongTopics,
  weakTopics,
  onRetry,
  onContinue,
  onNavigateToNotes,
  onNavigateToChallenge,
  onDownloadCertificate
}) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Dynamic Grade assignment if not provided
  const resolvedGrade = grade || (() => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  })();

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Circular calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Filtered List
  const filteredQuestions = questions.filter(q => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return !q.isCorrect;
    return true;
  });

  const filteredTestCases = testCases.filter(tc => {
    if (filter === 'correct') return tc.passed;
    if (filter === 'incorrect') return !tc.passed;
    return true;
  });

  // Calculate Average Item Time
  const timeSeconds = (() => {
    const parts = timeSpent.match(/\d+/g);
    if (!parts) return 40;
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(parts[0]) || 40;
  })();
  const avgTimePerItem = Math.round(timeSeconds / (totalQuestions || 1));

  // Determine dynamic strong & improvement topics
  const resolvedStrongTopics = strongTopics ?? (type === 'challenge' 
    ? ['Input Normalization', 'Algorithmic Efficiency', 'Syntax Structure'] 
    : questions.filter(q => q.isCorrect).slice(0, 3).map((q, i) => `Question ${i + 1}: ${q.text.slice(0, 42)}`));
  const resolvedWeakTopics = weakTopics ?? (type === 'challenge'
    ? ['Edge Cases Handling', 'Hidden Constraints']
    : questions.filter(q => !q.isCorrect).slice(0, 3).map(q => `Review: ${q.text.slice(0, 48)}`));

  const typeLabel = type === 'challenge' ? 'Challenge' : type === 'exam' ? 'Final Test' : 'Quiz';

  return (
    <div className="w-full max-w-[1500px] mx-auto px-4 py-5 md:px-6 md:py-6 font-sans text-slate-800 animate-slide-up bg-[#f8fafc] overflow-y-auto">
      
      {/* ── 1. BREADCRUMB HEADER ── */}
      <div className="mb-6 font-sans">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          <span>{courseTitle}</span>
          <span>&gt;</span>
          <span>{moduleTitle}</span>
          <span>&gt;</span>
          <span className="text-slate-900 font-extrabold">{typeLabel} Results</span>
        </div>
        <h1 className="text-3xl font-black text-slate-950 font-display mt-1">{typeLabel} Results</h1>
      </div>

      {/* ── 2. TWO-COLUMN INTERACTIVE VIEW ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        
        {/* LEFT COLUMN: Main Score and Review Details */}
        <div className="flex flex-col gap-5 w-full min-w-0">
          
          {/* Main Grade Card */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col justify-between">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center border-b border-slate-100 pb-5">
              
              {/* Radial Accuracy Graph */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="10"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke={score >= 70 ? '#10b981' : '#ef4444'}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black font-display text-slate-950 leading-none">{score}%</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mt-1">Accuracy</span>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-black text-slate-900 leading-none mb-1">
                    {score >= 70 ? 'Good Job!' : 'Keep Practicing!'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold leading-tight">
                    {score >= 70 ? `You passed this ${typeLabel.toLowerCase()}.` : 'Re-attempt to get a better grade.'}
                  </p>
                </div>
              </div>

              {/* Stats Widgets */}
              <div className="md:col-span-7 grid grid-cols-2 gap-3 w-full h-full">
                
                {/* Stat 1: Correct answers */}
                <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/80 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>{type === 'challenge' ? 'Passed Cases' : 'Correct'}</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 leading-none font-display">
                    {correctAnswers} <span className="text-xs font-semibold text-slate-400">/ {totalQuestions}</span>
                  </span>
                </div>

                {/* Stat 2: Time Taken */}
                <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/80 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span>Time Taken</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 leading-none font-display">{timeSpent}</span>
                </div>

                {/* Stat 3: Score Percent */}
                <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/80 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    <Award className="w-3 h-3 text-amber-500" />
                    <span>Score</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 leading-none font-display">{score}%</span>
                </div>

                {/* Stat 4: Letter Grade */}
                <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/80 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                    <HelpCircle className="w-3 h-3 text-indigo-500" />
                    <span>Grade</span>
                  </div>
                  <span className="text-2xl font-black text-slate-900 leading-none font-display">{resolvedGrade}</span>
                </div>

              </div>

            </div>

            {/* Footer completion date, attempts count, retry action */}
            <div className="pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Completed on: {completedAt}</span>
                </div>
                <span>Attempts: {attemptsCount}</span>
              </div>

              <button
                onClick={onRetry}
                className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-800 hover:text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider font-mono transition-colors shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake {typeLabel}
              </button>
            </div>

          </div>

          {/* AI Proctoring Details Block for final proctored exam */}
          {type === 'exam' && proctoringReport && (
            <div className="w-full">
              {proctoringReport}
            </div>
          )}

          {/* ── QUESTION REVIEW SECTION ── */}
          <div className="w-full">
            
            {/* Heading and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-black text-slate-900 font-display uppercase tracking-wide">
                {type === 'challenge' ? 'Test Cases Breakdown' : 'Question Review'}
              </h2>
              
              <div className="flex items-center border border-slate-200/80 rounded-xl p-1 bg-slate-50/50 shrink-0 font-mono text-[10px] font-black uppercase tracking-wider">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-450 hover:text-slate-900'
                  }`}
                >
                  All ({totalQuestions})
                </button>
                <button
                  onClick={() => setFilter('correct')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filter === 'correct' ? 'bg-[#eefcf3] text-emerald-700 shadow-sm border border-emerald-100/50' : 'text-slate-450 hover:text-emerald-600'
                  }`}
                >
                  {type === 'challenge' ? 'Passed' : 'Correct'} ({correctAnswers})
                </button>
                <button
                  onClick={() => setFilter('incorrect')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    filter === 'incorrect' ? 'bg-[#fdf2f2] text-red-600 shadow-sm border border-red-100/50' : 'text-slate-450 hover:text-red-500'
                  }`}
                >
                  {type === 'challenge' ? 'Failed' : 'Incorrect'} ({totalQuestions - correctAnswers})
                </button>
              </div>
            </div>

            {/* Questions review cards */}
            {type !== 'challenge' ? (
              <div className="space-y-3 font-sans text-xs">
                {filteredQuestions.map((q, idx) => {
                  const isItemExpanded = !!expandedItems[q.id];
                  return (
                    <div
                      key={q.id}
                      className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-200"
                    >
                      {/* Accordion header row */}
                      <div
                        onClick={() => toggleExpand(q.id)}
                        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                            q.isCorrect 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                              : 'bg-red-50 border-red-200 text-red-500'
                          }`}>
                            {q.isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Question {idx + 1}</span>
                              <span className={`text-[9px] font-bold uppercase tracking-wider font-mono px-2 py-0.5 rounded-md ${
                                q.type === 'Multiple Choice' ? 'bg-slate-100 border border-slate-200/30 text-slate-800' : 'bg-blue-50 text-blue-800 border border-blue-100'
                              }`}>
                                {q.type || 'Multiple Choice'}
                              </span>
                            </div>
                            <h4 className="text-[13px] font-black text-slate-900 leading-snug">{q.text}</h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border font-mono ${
                            q.isCorrect 
                              ? 'bg-[#eefcf3] border-emerald-100 text-emerald-700' 
                              : 'bg-[#fdf2f2] border-red-100 text-red-600'
                          }`}>
                            {q.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                          {isItemExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>

                      </div>

                      {/* Expandable description body */}
                      {isItemExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/20 grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed font-sans text-xs">
                          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Your Answer</span>
                            <span className={`font-extrabold text-[13px] ${q.isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                              {q.userAnswerText || 'None'}
                            </span>
                          </div>

                          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Correct Answer</span>
                            <span className="font-extrabold text-slate-900 text-[13px]">
                              {q.correctAnswerText || 'None'}
                            </span>
                          </div>

                          {q.explanation && (
                            <div className="md:col-span-2 p-4 rounded-xl border border-slate-100 bg-slate-50/50 mt-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-1">Explanation</span>
                              <p className="text-slate-500 font-semibold text-xs leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              /* Coding Challenge Test Cases Breakdown cards */
              <div className="space-y-3 font-sans text-xs">
                {filteredTestCases.map((tc, idx) => {
                  const isItemExpanded = !!expandedItems[`tc-${tc.case}`];
                  return (
                    <div
                      key={tc.case}
                      className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-200"
                    >
                      {/* Accordion header row */}
                      <div
                        onClick={() => toggleExpand(`tc-${tc.case}`)}
                        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5 ${
                            tc.passed 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                              : 'bg-red-50 border-red-200 text-red-500'
                          }`}>
                            {tc.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-400 font-mono">Test Case {tc.case}</span>
                              {tc.isHidden && (
                                <span className="text-[8px] font-black uppercase tracking-widest font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-md">Hidden</span>
                              )}
                            </div>
                            <h4 className="text-[13px] font-black text-slate-900 leading-snug">
                              Input: <code className="bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700">{tc.input || 'None'}</code>
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border font-mono ${
                            tc.passed 
                              ? 'bg-[#eefcf3] border-emerald-100 text-emerald-700' 
                              : 'bg-[#fdf2f2] border-red-100 text-red-600'
                          }`}>
                            {tc.passed ? 'Passed' : 'Failed'}
                          </span>
                          {isItemExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>

                      </div>

                      {/* Expandable description body */}
                      {isItemExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/20 grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed font-sans text-xs">
                          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Got (Stdout)</span>
                            <pre className={`p-2 rounded border font-mono text-[11px] font-bold whitespace-pre-wrap ${tc.passed ? 'bg-emerald-50/20 border-emerald-100 text-emerald-750' : 'bg-red-50/20 border-red-100 text-red-650'}`}>
                              <code>{tc.got || '(empty output)'}</code>
                            </pre>
                          </div>

                          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Expected (Correct)</span>
                            <pre className="p-2 rounded border font-mono text-[11px] font-bold whitespace-pre-wrap bg-slate-50/50 border-slate-100 text-slate-700">
                              <code>{tc.expected || '(empty output)'}</code>
                            </pre>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: Sidebar stats, Strong/Weak Areas, Next Steps */}
        <div className="flex flex-col gap-5 w-full shrink-0 font-sans xl:sticky xl:top-5">
          
          {/* Certificate download widget */}
          {type === 'exam' && score >= 40 && (
            <div className="bg-indigo-950 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group flex flex-col justify-between min-h-[260px] border border-indigo-900 font-sans">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Award className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <span className="text-[9px] font-black uppercase tracking-widest font-mono text-indigo-300 block mb-1">Graduation</span>
                <h4 className="text-xl font-black mb-3">Certificate of Integrity</h4>
                <p className="text-xs text-indigo-200 leading-relaxed font-semibold font-sans">
                  This proctored assessment was completed under secure, verified conditions. Your secure digital credential is ready.
                </p>
              </div>
              <button 
                onClick={onDownloadCertificate || (() => alert('Downloading certificate...'))}
                className="w-full bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest mt-6 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg shadow-[#c3f53c]/10 flex items-center justify-center gap-2 relative z-10 cursor-pointer font-sans duration-200"
              >
                <Download className="w-4 h-4" /> Download Certificate
              </button>
            </div>
          )}

          {/* Performance Summary Card */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col gap-5">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 leading-none">Performance Summary</h3>
            
            {/* Accuracy progress bar */}
            <div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">
                <span>Accuracy</span>
                <span>{score}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${score >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Time per question */}
            <div className="flex justify-between items-center py-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Time Per {type === 'challenge' ? 'Case' : 'Question'}</span>
              <span className="text-sm font-black text-slate-900 font-mono">{avgTimePerItem} sec</span>
            </div>

            {/* Strong Topics */}
            {resolvedStrongTopics.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono mb-2.5">Strong Topics</span>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  {resolvedStrongTopics.slice(0, 3).map((topic, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weak Topics */}
            {resolvedWeakTopics.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono mb-2.5">Topics to Improve</span>
                <ul className="space-y-2 text-xs font-bold text-slate-700">
                  {resolvedWeakTopics.slice(0, 3).map((topic, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>

          {/* Next Steps Widget */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col gap-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider font-mono mb-1 block">Next Steps</h3>
            
            {/* Primary Action Button: Continue */}
            <button
              onClick={onContinue}
              className="w-full py-4 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest font-sans flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-[#c3f53c]/15 hover:scale-[1.01] active:scale-[0.99]"
            >
              Continue Learning
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            {/* Secondary Action Button: Review Incorrect answers */}
            {totalQuestions - correctAnswers > 0 && (
              <button
                onClick={() => {
                  setFilter('incorrect');
                  const reviewHeader = document.querySelector('h2');
                  if (reviewHeader) {
                    reviewHeader.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest font-sans flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                Review Incorrect Answers
              </button>
            )}
          </div>

          {/* Related Section Links widget */}
          {(onNavigateToNotes || onNavigateToChallenge) && (
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex flex-col gap-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider font-mono mb-1 block">Related</h3>
            
            {onNavigateToNotes && (
              <button
                onClick={onNavigateToNotes}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold transition-all text-xs text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <BookOpen className="w-4.5 h-4.5 text-slate-450 shrink-0" />
                  <span className="truncate">Notes: {moduleTitle}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            )}

            {onNavigateToChallenge && (
              <button
                onClick={onNavigateToChallenge}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold transition-all text-xs text-left cursor-pointer animate-pulse-slow"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Code2 className="w-4.5 h-4.5 text-slate-450 shrink-0" />
                  <span className="truncate">Coding Challenge: {moduleTitle}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            )}

          </div>
          )}

        </div>

      </div>

    </div>
  );
};

const ChevronRight = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth="2.5" 
    stroke="currentColor" 
    className={className}
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
