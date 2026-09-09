import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ChevronDown, Clock, Bookmark, ChevronLeft, ChevronRight, 
  PanelRightClose, PanelRightOpen, LogOut, Play, CheckSquare, Square, 
  RotateCcw, Award, ShieldAlert, Code2, Loader2
} from 'lucide-react';
import { coursesAPI } from '../services/apiService';
import { useCourses } from '../services/courseContext';
import { useTranslation } from '../hooks/useTranslation';
import { PerformanceResultsView } from '../components/Quiz/PerformanceResultsView';
import { AnimatedRecommendationBubble, RecommendationData } from '../components/Course/AnimatedRecommendationBubble';

interface QuizScreenProps {
  onNavigate: (path: string) => void;
}

interface QuestionOption {
  id: string;
  letter: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  number: number;
  text: string;
  code?: string;
  marks: string;
  options: QuestionOption[];
  correctOptionId: string;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { completeActivity } = useCourses();
  const [moduleId, setModuleId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizId, setQuizId] = useState<string>('');
  const [quizTitle, setQuizTitle] = useState<string>('Control Flow & Loops');
  const [passingScore, setPassingScore] = useState<number>(80);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChallenge, setHasChallenge] = useState<boolean>(false);

  // Core States
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [reviews, setReviews] = useState<{ [key: string]: boolean }>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(true);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null);

  const cleanKey = (key: string): string => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('Invalid key');
    }
    return key;
  };

  // Sync hash changes and parse search parameters
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const [pathPart, queryPart] = hash.split('?');
      const parts = pathPart.split('/').filter(Boolean);
      const searchParams = new URLSearchParams(queryPart || '');
      
      const qCourseId = searchParams.get('course_id') || '';
      const qModuleId = searchParams.get('module_id') || (parts[1] && !isNaN(Number(parts[1])) ? parts[1] : '');
      
      if (qCourseId) setCourseId(qCourseId);
      if (qModuleId) setModuleId(qModuleId);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch quiz questions dynamically from database
  useEffect(() => {
    if (!moduleId) {
      setIsLoading(false);
      setError('No module selected. Please navigate to a quiz from your course page.');
      return;
    }
    
    const fetchQuiz = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await coursesAPI.getModuleQuiz(moduleId);
        setQuizId(data.id);
        setQuizTitle(data.title || 'Module Quiz');
        setPassingScore(data.passing_score || 80);
        if (data.course_id) {
          setCourseId(String(data.course_id));
        } else {
          try {
            const mod = await coursesAPI.getModule(moduleId);
            if (mod && mod.course_id) {
              setCourseId(String(mod.course_id));
            }
          } catch {
            // fallback
          }
        }
        
        const mapped = (data.questions || []).map((q: any, idx: number) => {
          const letterOptions = ['A', 'B', 'C', 'D', 'E', 'F'];
          return {
            id: String(q.id),
            number: idx + 1,
            text: q.question_text || '',
            marks: '10 Marks',
            correctOptionId: String(q.correct_option_index),
            options: (q.options || []).map((optText: string, oIdx: number) => ({
              id: String(oIdx),
              letter: letterOptions.at(oIdx) || 'A',
              text: optText
            }))
          };
        });
        
        setQuizQuestions(mapped);
        setCurrentIdx(0);
        setAnswers({});
        setReviews({});
        setTimeLeft(120 * mapped.length || 600); // 2 minutes per question
        setScore(0);
        setIsFinished(false);
        
        // Check if this module also has a coding challenge
        try {
          await coursesAPI.getModuleChallenge(moduleId);
          setHasChallenge(true);
        } catch {
          setHasChallenge(false);
        }
      } catch (err: any) {
        console.error("Failed to load dynamic quiz details:", err);
        setError(err.message || "Unable to fetch quiz questions from the SQLite server.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuiz();
  }, [moduleId]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = async () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Failed to request fullscreen:", err);
    }
  };

  // Countdown timer logic
  useEffect(() => {
    if (isFinished || showQuitConfirm || !isFullscreen || isLoading || quizQuestions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished, showQuitConfirm, isFullscreen, isLoading, quizQuestions]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionId: string) => {
    const qId = quizQuestions[currentIdx].id;
    setAnswers(prev => ({
      ...prev,
      [cleanKey(qId)]: optionId
    }));
  };

  const handleClearAnswer = () => {
    const qId = quizQuestions[currentIdx].id;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[cleanKey(qId)];
      return next;
    });
  };

  const handleToggleReview = () => {
    const qId = quizQuestions[currentIdx].id;
    setReviews(prev => ({
      ...prev,
      [cleanKey(qId)]: !prev[cleanKey(qId)]
    }));
  };

  const handleFinishQuiz = async () => {
    if (quizQuestions.length === 0) return;
    
    let correctCount = 0;
    quizQuestions.forEach(q => {
      if (answers[cleanKey(q.id)] === q.correctOptionId) {
        correctCount++;
      }
    });
    
    const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
    setScore(finalScore);
    setIsFinished(true);

    // Scenario 1: Score < 35% triggers animated recommendation bubble
    if (finalScore < 35) {
      setRecommendation({
        type: 'relisten_lecture',
        title: 'Foundational Review Recommended',
        message: `You scored ${finalScore}% (<35%) in your quiz. Repeated guessing without reviewing the theory can hinder your progress. We strongly recommend re-listening to your chosen course lecture video before re-attempting.`,
        score: finalScore,
        courseId,
        moduleId
      });
    } else {
      setRecommendation(null);
    }
    
    try {
      const passed = finalScore >= passingScore;
      await coursesAPI.submitQuiz(quizId, finalScore, passed);
      
      // Update course context progress counters on pass
      if (passed && courseId) {
        await completeActivity(courseId, moduleId, 'quiz');
      }
    } catch (err) {
      console.error("Failed to record graded dynamic quiz details to server:", err);
    }
  };

  const handleRetryQuiz = () => {
    setCurrentIdx(0);
    setAnswers({});
    setReviews({});
    setTimeLeft(120 * quizQuestions.length || 600);
    setScore(0);
    setIsFinished(false);
    setRecommendation(null);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-sans z-[99999]">
        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 max-w-sm w-full text-center shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-none mb-1.5">{t('quiz.loading')}</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Initializing Assessment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || quizQuestions.length === 0) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-sans z-[99999] p-4 text-center">
        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-500 flex items-center justify-center mb-4 shadow-sm animate-pulse">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2 font-display">{t('quiz.unavailable')}</h3>
          <p className="text-xs text-slate-505 text-slate-500 font-semibold leading-relaxed mb-6">
            {error || "This module does not have any generated quiz questions configured."}
          </p>
          <button
            onClick={() => onNavigate(courseId ? `/course/${courseId}` : '/courses')}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest font-mono transition-colors shadow-sm cursor-pointer"
          >
            {t('quiz.return_course')}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quizQuestions[currentIdx];
  const selectedOptionId = answers[cleanKey(currentQuestion.id)] || null;
  const isMarkedForReview = !!reviews[cleanKey(currentQuestion.id)];

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none z-[9999]">
      
      {/* ── 1. GLOBAL TOP NAVIGATION ROW ── */}
      <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 shrink-0 z-30 shadow-none">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold text-slate-900 font-sans tracking-tight">{quizTitle}</span>
        </div>

        <button 
          onClick={() => setShowQuitConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-red-650 hover:bg-red-50 hover:border-red-200 transition-colors duration-150 cursor-pointer uppercase tracking-wider font-sans shrink-0"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          Quit Quiz
        </button>
      </header>

      {/* ── 2. SECONDARY HEADER METRIC ROW (Dashboard Style Widgets) ── */}
      {!isFinished && (
        <section className="bg-white border-b border-slate-200/60 px-6 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Widget 1: Quiz Title */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Module Quiz</span>
              <span className="text-sm font-black text-slate-900 leading-none">{quizTitle}</span>
            </div>
            
            <div className="hidden sm:block h-8 w-px bg-slate-200/65"></div>

            {/* Widget 2: Question Count */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Question</span>
              <span className="text-sm font-black text-slate-900 leading-none">{currentQuestion.number} / {quizQuestions.length}</span>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200/65"></div>

            {/* Widget 3: Time Left */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Time Left</span>
              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5 leading-none">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                {formatTimer(timeLeft)}
              </span>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200/65"></div>

            {/* Widget 4: Passing Criteria */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Passing Grade</span>
              <span className="text-sm font-black text-slate-900 leading-none">{passingScore}%</span>
            </div>
          </div>

          <button 
            onClick={handleFinishQuiz}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest font-mono border border-slate-900 shadow-sm transition-colors duration-150 cursor-pointer self-start sm:self-auto shrink-0"
          >
            Finish Quiz
          </button>
        </section>
      )}

      {/* ── 3. MAIN CONTENT SCROLLABLE CANVAS ── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Main scroll wrapper */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between custom-scrollbar bg-[#f8fafc]">
          
          {isFinished ? (
            /* ── REDESIGNED PERFORMANCE RESULTS DASHBOARD VIEW ── */
            <div className="w-full max-w-7xl mx-auto py-2 animate-slide-up">
              <PerformanceResultsView
                type="quiz"
                title={quizTitle}
                courseTitle="Python Tutorial for Beginners"
                moduleTitle={quizTitle}
                score={score}
                totalQuestions={quizQuestions.length}
                correctAnswers={quizQuestions.filter(q => answers[cleanKey(q.id)] === q.correctOptionId).length}
                timeSpent={(() => {
                  const totalTime = 120 * quizQuestions.length || 600;
                  const elapsed = Math.max(0, totalTime - timeLeft);
                  const minutes = Math.floor(elapsed / 60);
                  const seconds = elapsed % 60;
                  return `${minutes}m ${seconds}s`;
                })()}
                completedAt={new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ", " + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                attemptsCount={1}
                questions={quizQuestions.map(q => {
                  const userAnswerId = answers[cleanKey(q.id)];
                  const userAnswerText = q.options.find(o => o.id === userAnswerId)?.text || 'None';
                  const correctAnswerText = q.options.find(o => o.id === q.correctOptionId)?.text || '';
                  const isCorrect = userAnswerId === q.correctOptionId;
                  return {
                    id: q.id,
                    text: q.text,
                    type: 'Multiple Choice',
                    userAnswerText,
                    correctAnswerText,
                    isCorrect,
                    explanation: `Understanding ${q.text.toLowerCase()} is key for modular milestones. Correct option is ${q.options.find(o => o.id === q.correctOptionId)?.letter}: "${correctAnswerText}".`
                  };
                })}
                onRetry={handleRetryQuiz}
                onContinue={() => onNavigate(courseId ? `/course/${courseId}` : '/courses')}
                onNavigateToNotes={() => onNavigate(courseId ? `/course/${courseId}` : '/courses')}
                onNavigateToChallenge={hasChallenge ? (() => onNavigate(`/lab?course_id=${courseId}&module_id=${moduleId}`)) : undefined}
              />
            </div>
          ) : (
            /* ── DYNAMIC QUIZ LAYOUT ── */
            <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-6 animate-slide-up">
              
              {/* Question + Sidebar grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left side: Question Area (Takes full 12 cols when right sidebar is collapsed!) */}
                <div className={`transition-all duration-300 ${isQuestionsOpen ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6`}>
                  
                  {/* The Main Question Card */}
                  <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-none flex flex-col justify-between min-h-[420px]">
                    <div>
                      {/* Statement and Marks Badge */}
                      <div className="flex justify-between items-start gap-4 mb-5 font-sans">
                        <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                          {currentQuestion.text}
                        </h2>
                        <span className="text-[10px] font-black uppercase font-mono px-2.5 py-1 bg-slate-100 border border-slate-200/30 text-slate-800 rounded-lg shrink-0 shadow-sm tracking-wider">
                          {currentQuestion.marks}
                        </span>
                      </div>

                      {/* Code Block Snippet (Render if question has code block) */}
                      {currentQuestion.code && (
                        <div className="mb-6 rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-950 shadow-lg relative">
                          <div className="h-9 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between font-mono text-[10px] uppercase font-black text-slate-400 tracking-wider">
                            <span>Python Environment</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-[#c3f53c] border border-[#c3f53c]/40 block shrink-0 animate-pulse" />
                          </div>
                          <pre className="p-4 overflow-x-auto text-xs text-slate-250 font-mono leading-relaxed select-text">
                            <code>{currentQuestion.code}</code>
                          </pre>
                        </div>
                      )}

                      {/* Option List Cards */}
                      <div className="grid grid-cols-1 gap-3 font-sans text-xs">
                        {currentQuestion.options.map(opt => {
                          const isOptionSelected = selectedOptionId !== null && selectedOptionId === opt.id;
                          return (
                            <div
                              key={opt.id}
                              onClick={() => handleSelectOption(opt.id)}
                              className={`
                                p-4 border rounded-2xl flex items-center gap-3.5 cursor-pointer transition-[transform,border-color,background-color] duration-150 transform-gpu
                                ${isOptionSelected
                                  ? 'bg-[#f4fae8] border-[#c3f53c] text-slate-900 font-black shadow-[0_4px_12px_rgba(195,245,60,0.1)] hover:scale-[1.002]'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:scale-[1.002]'
                                }
                              `}
                            >
                              {/* Custom Selection circular bullet */}
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                isOptionSelected 
                                  ? 'border-slate-900 bg-slate-900 shadow-sm animate-fade-in' 
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isOptionSelected ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#c3f53c] animate-fade-in" />
                                ) : null}
                              </div>
                              <span className="font-extrabold text-slate-450 font-mono w-4 shrink-0 uppercase tracking-wider">{opt.letter}.</span>
                              <span className="font-extrabold text-[13px]">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom options row inside the card */}
                    <div className="mt-8 border-t border-slate-100 pt-5 flex items-center justify-between shrink-0 font-sans text-xs font-bold text-slate-600">
                      <button
                        onClick={handleToggleReview}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-xs font-bold ${
                          isMarkedForReview 
                            ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' 
                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-905 border-transparent hover:border-slate-100'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                          isMarkedForReview ? 'fill-amber-505 text-amber-500 animate-pulse' : 'text-slate-400'
                        }`} />
                        {isMarkedForReview ? 'Flagged for Review' : 'Mark for Review'}
                      </button>

                      <button
                        onClick={handleClearAnswer}
                        disabled={!selectedOptionId}
                        className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-655 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer font-mono tracking-wide uppercase text-[10px]"
                      >
                        Clear Answer
                      </button>
                    </div>

                  </div>

                  {/* Navigation footer layout (outside card) */}
                  <div className="flex items-center justify-between font-mono text-xs mt-2 shrink-0">
                    <button
                      disabled={currentIdx === 0}
                      onClick={() => setCurrentIdx(currentIdx - 1)}
                      className="px-5 py-3 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                      Previous
                    </button>
                    {currentIdx === quizQuestions.length - 1 ? (
                      <button
                        onClick={handleFinishQuiz}
                        className="px-6 py-3 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer font-black shadow-sm"
                      >
                        Submit Quiz
                        <ChevronRight className="w-4 h-4 text-slate-950" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentIdx(currentIdx + 1)}
                        className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer font-black shadow-sm"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>

                </div>

                {/* Right side: Collapsible Question Status Panel (Hidden when collapsed!) */}
                {isQuestionsOpen && (
                  <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-none flex flex-col gap-5 animate-fade-in font-sans">
                    
                    {/* Panel Header with matching collapse icon (PanelRightClose) */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                      <span className="font-extrabold text-xs tracking-tight text-slate-900 font-display uppercase tracking-wider block font-mono">Questions</span>
                      <button 
                        onClick={() => setIsQuestionsOpen(false)}
                        className="p-1.5 hover:bg-slate-50 text-slate-450 hover:text-slate-855 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Collapse index panel"
                      >
                        <PanelRightClose className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* Question Button Grid */}
                    <div className="grid grid-cols-5 gap-2.5 shrink-0 font-sans">
                      {quizQuestions.map((q, idx) => {
                        const isCurrent = currentIdx === idx;
                        const isAnswered = !!answers[cleanKey(q.id)];
                        const isFlagged = !!reviews[cleanKey(q.id)];

                        let btnCls = "";
                        if (isCurrent) {
                          btnCls = isFlagged 
                            ? "bg-slate-900 text-white border-slate-900 shadow-md font-black ring-2 ring-amber-500 ring-offset-1" 
                            : "bg-slate-900 text-white border-slate-900 shadow-sm font-black";
                        } else if (isFlagged) {
                          btnCls = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
                        } else if (isAnswered) {
                          btnCls = "bg-[#f4fae8] text-slate-900 border-[#d6f0a0] font-bold";
                        } else {
                          btnCls = "bg-white text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-50 font-bold";
                        }

                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentIdx(idx)}
                            className={`w-10 h-10 border rounded-xl flex items-center justify-center text-xs transition-all duration-150 cursor-pointer relative ${btnCls}`}
                          >
                            {idx + 1}
                            {isFlagged && (
                              <Bookmark className="w-2.5 h-2.5 text-amber-550 fill-current absolute top-1 right-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Status Legends */}
                    <div className="border-t border-slate-100 pt-4 space-y-3 font-bold text-[11px] text-slate-500 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border border-slate-200 bg-white shrink-0 shadow-sm" />
                        <span className="text-slate-600">Not Answered</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border border-[#d6f0a0] bg-[#f4fae8] shrink-0 shadow-sm" />
                        <span className="text-slate-700">Answered</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border border-slate-900 bg-slate-900 shrink-0 shadow-sm" />
                        <span className="text-slate-900 font-bold">Current</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-lg border border-amber-200 bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                          <Bookmark className="w-3 h-3 fill-current text-amber-500" />
                        </div>
                        <span className="text-amber-800 font-bold">Marked for Review</span>
                      </div>
                    </div>

                  </div>
                )}

                {/* Vertical collapse boundary tab when sidebar is collapsed (PanelRightOpen) */}
                {!isQuestionsOpen && (
                  <button
                    onClick={() => setIsQuestionsOpen(true)}
                    className="fixed right-6 bottom-6 w-11 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer z-50 animate-fade-in shrink-0"
                    title="Expand question index"
                  >
                    <PanelRightOpen className="w-5 h-5 text-primary" />
                  </button>
                )}

              </div>

            </div>
          )}
          
        </main>
      </div>

      {/* ── 4. QUIT CONFIRMATION MODAL OVERLAY ── */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative border border-slate-200/60 p-6 animate-slide-up flex flex-col font-sans text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mx-auto mb-4 shrink-0 shadow-sm animate-bounce">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h4 className="font-extrabold text-slate-900 text-lg mb-2 font-display uppercase tracking-tight">Quit Current Quiz?</h4>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
              You are about to exit this quiz session. Any unsaved option inputs will be lost, and this session will be flagged as incomplete.
            </p>

            <div className="flex flex-col gap-2 font-mono text-xs">
              <button
                onClick={() => onNavigate('/courses')}
                className="w-full bg-red-650 hover:bg-red-750 text-white transition-all font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer"
              >
                Quit Session
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="w-full bg-white text-slate-900 border border-slate-250 hover:bg-slate-50 transition-all font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer"
              >
                Cancel and Resume
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 5. FULLSCREEN ENTRY / RE-ENTRY PORTAL OVERLAY ── */}
      {!isFullscreen && !isFinished && (
        <div className="fixed inset-0 bg-[#0f172a] text-white z-[99999] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="w-full max-w-md bg-[#1e293b]/50 border border-slate-700/60 rounded-[2.5rem] p-8 md:p-10 shadow-2xl backdrop-blur-md flex flex-col items-center gap-6 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-[#c3f53c]/10 border border-[#c3f53c]/30 text-[#c3f53c] flex items-center justify-center shadow-lg animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-2xl font-black font-display uppercase tracking-tight text-white mb-2">Fullscreen Mode Required</h2>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed px-2">
                This quiz must be completed in Fullscreen Mode. This prevents interruptions and ensures a distraction-free, focused learning environment.
              </p>
            </div>

            <button
              onClick={enterFullscreen}
              className="w-full py-4 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-[#c3f53c]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-sans"
            >
              Start Quiz in Fullscreen
            </button>

            <button
              onClick={() => onNavigate('/courses')}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors duration-150 cursor-pointer uppercase tracking-wider font-sans"
            >
              Back to Curriculum
            </button>
          </div>
        </div>
      )}

      {/* ── 6. SCENARIO 1: ANIMATED RECOMMENDATION BUBBLE (<35% RE-LISTEN LECTURE) ── */}
      {recommendation && isFinished && (
        <AnimatedRecommendationBubble
          data={recommendation}
          onRelistenLecture={() => {
            const cid = courseId || recommendation?.courseId;
            const mid = moduleId || recommendation?.moduleId;
            if (cid) {
              onNavigate(`/course/${cid}/learn?module_id=${mid}`);
            } else {
              onNavigate('/courses');
            }
          }}
          onReattempt={handleRetryQuiz}
          onClose={() => setRecommendation(null)}
        />
      )}

    </div>
  );
};
