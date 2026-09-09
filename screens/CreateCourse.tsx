import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { useCourses } from '../services/courseContext';
import { SmartCourse, User } from '../types';
import { coursesAPI } from '../services/apiService';
import { 
  Youtube, 
  Clock, 
  Calendar, 
  ChevronDown, 
  Plus, 
  Search, 
  Bell, 
  ShieldCheck, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  X, 
  Link, 
  Brain, 
  ClipboardList, 
  Settings, 
  AlertTriangle, 
  Camera, 
  Check, 
  Lock, 
  BookOpen, 
  Award, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  ChevronUp,
  Sliders,
  Sparkle
} from 'lucide-react';

interface CreateCourseScreenProps {
  onNavigate: (path: string) => void;
}

export const CreateCourseScreen: React.FC<CreateCourseScreenProps> = ({ onNavigate }) => {
  const { addCourse } = useCourses();
  const user: User = { id: '1', name: 'Arka Maulana', email: 'arka.m@university.edu' };

  // Helper to format today's date in YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Form states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [dailyTime, setDailyTime] = useState('2 Hours');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [learningGoal, setLearningGoal] = useState('');
  const [urlError, setUrlError] = useState('');
  const [dailyTimeError, setDailyTimeError] = useState('');
  const [dateError, setDateError] = useState('');

  // Modal open states
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isLoadingOpen, setIsLoadingOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  // Loading animation states
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentStepText, setCurrentStepText] = useState<string>('Initializing...');
  
  // Advanced Options preferences
  const [focusAreas, setFocusAreas] = useState<string[]>(['Basics & Fundamentals']);
  const [customFocus, setCustomFocus] = useState('');
  const [includes, setIncludes] = useState<string[]>(['quizzes', 'coding', 'revision', 'final_test']);
  const [difficulty, setDifficulty] = useState('Auto (Recommended)');
  const [language, setLanguage] = useState('English');
  const [questionComplexity, setQuestionComplexity] = useState('Balanced');
  const [codingDifficulty, setCodingDifficulty] = useState('Medium');
  const [preferWeekend, setPreferWeekend] = useState(false);
  const [preferredPracticeTime, setPreferredPracticeTime] = useState('30-40 mins/day');
  const [preferredStartTime, setPreferredStartTime] = useState('09:00');

  // Full Plan Modal View Tab
  const [planTab, setPlanTab] = useState<'daily' | 'module'>('daily');
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [generatedCourseId, setGeneratedCourseId] = useState<string>('');

  const [openDropdown, setOpenDropdown] = useState<'difficulty' | 'language' | 'complexity' | 'coding' | 'practice' | null>(null);

  // Close open dropdown on click outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenDropdown(null);
    };
    if (isAdvancedOpen) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [isAdvancedOpen]);

  // Scroll lock effect for Modals
  useEffect(() => {
    const isAnyModalOpen = isAdvancedOpen || isLoadingOpen || isPlanOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAdvancedOpen, isLoadingOpen, isPlanOpen]);

  // Handle URL Validation
  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setUrlError('Please enter YouTube URL');
      return false;
    }
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.replace(/^www\./, '');
      const isYouTubeHost = host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
      const hasVideoId =
        parsed.searchParams.has('v') ||
        host === 'youtu.be' ||
        parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/shorts/');
      const hasPlaylistId = parsed.searchParams.has('list');
      if (!isYouTubeHost || (!hasVideoId && !hasPlaylistId)) {
        setUrlError('Please enter a valid YouTube video or playlist link');
        return false;
      }
    } catch {
      setUrlError('Please enter a valid YouTube video or playlist link');
      return false;
    }
    setUrlError('');
    return true;
  };

  const validateCreateCourseForm = () => {
    const isUrlValid = validateUrl(youtubeUrl);
    let isValid = isUrlValid;

    if (!dailyTime.trim()) {
      setDailyTimeError('Please select learning duration');
      isValid = false;
    } else {
      setDailyTimeError('');
    }

    const parsedDate = new Date(`${startDate}T00:00:00`);
    if (!startDate || Number.isNaN(parsedDate.getTime())) {
      setDateError('Invalid start date');
      isValid = false;
    } else {
      setDateError('');
    }

    return isValid;
  };

  // Trigger real asynchronous course generation queue pipeline
  const handleAnalyzeAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateCourseForm()) return;

    setGenerationError(null);
    setCurrentStepText('Queueing course generation task...');
    setProgress(0);
    setIsLoadingOpen(true);

    try {
      const resolvedFocusAreas = focusAreas.map(area => (
        area === 'Other' && customFocus.trim() ? customFocus.trim() : area
      ));

      const response = await coursesAPI.generateCourse({
        youtube_url: youtubeUrl.trim(),
        daily_learning_time: dailyTime,
        start_date: startDate,
        goals: learningGoal,
        advanced_options: {
          focus_areas: resolvedFocusAreas,
          include: includes,
          difficulty: difficulty,
          language: language,
          question_complexity: questionComplexity,
          coding_difficulty: codingDifficulty,
          weekend_learning: preferWeekend,
          practice_time: preferredPracticeTime,
          preferred_start_time: preferredStartTime
        }
      });

      if (response.course_id && !response.task_id) {
        if (response.duplicate) {
          setCurrentStepText(response.message || 'Course already exists. Resume existing?');
          setProgress(100);
        }
        // Direct duplicate matched: verify before redirecting into the course.
        const verification = await coursesAPI.verifyCourse(response.course_id);
        if (!verification || !verification.verified) {
          throw new Error(verification?.reason || 'Existing generated course is incomplete. Please retry generation.');
        }
        const isToday = startDate === getTodayDateString();
        addCourse({ id: String(response.course_id) } as any).then(() => {
          setIsLoadingOpen(false);
          if (isToday) {
            onNavigate(`/course/${response.course_id}`);
          } else {
            setGeneratedCourseId(String(response.course_id));
            setIsPlanOpen(true);
          }
        });
      } else if (response.task_id) {
        setActiveTaskId(response.task_id);
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to trigger course generation');
    }
  };

  // Step-level retry initiator
  const handleRetryStep = async () => {
    if (!activeTaskId) return;
    setGenerationError(null);
    setCurrentStepText('Retrying failed generation step...');
    try {
      await coursesAPI.retryGeneration(activeTaskId);
    } catch (err: any) {
      setGenerationError(err.message || 'Retry initiation failed');
    }
  };

  // Mount-time recovery checks for running generation tasks
  useEffect(() => {
    const recoverPending = async () => {
      try {
        const response = await coursesAPI.getPendingTasks();
        if (response && response.task_id) {
          setActiveTaskId(response.task_id);
          setProgress(response.progress || 0);
          setCurrentStepText(response.current_step || 'Processing course...');
          setIsLoadingOpen(true);
        }
      } catch (e) {
        console.warn("Pending tasks check failed:", e);
      }
    };
    recoverPending();
  }, []);

  // Task generation real-time polling interval loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoadingOpen && activeTaskId) {
      interval = setInterval(async () => {
        try {
          const data = await coursesAPI.checkGenerationStatus(activeTaskId);
          if (data) {
            setProgress(data.progress || 0);
            setCurrentStepText(data.current_step || 'Processing...');
            
            // Adjust quote step index dynamically based on percentage
            if (data.progress < 25) setLoadingStep(0);
            else if (data.progress < 55) setLoadingStep(1);
            else if (data.progress < 85) setLoadingStep(2);
            else setLoadingStep(3);

            if (data.status === 'completed') {
              clearInterval(interval);
              setCurrentStepText('Verifying course structural integrity...');
              
              // Verify structural integrity prior to enabling redirection
              const verification = await coursesAPI.verifyCourse(data.course_id);
              if (verification && verification.verified) {
                setIsLoadingOpen(false);
                const isToday = startDate === getTodayDateString();
                addCourse({ id: String(data.course_id) } as any).then(() => {
                  if (isToday) {
                    onNavigate(`/course/${data.course_id}`);
                  } else {
                    setGeneratedCourseId(String(data.course_id));
                    setIsPlanOpen(true);
                  }
                });
              } else {
                setGenerationError(verification.reason || 'Course integrity verification failed.');
              }
            } else if (data.status === 'failed') {
              clearInterval(interval);
              setGenerationError(data.current_step || 'AI processing pipeline failed.');
            }
          }
        } catch (err: any) {
          console.error("Polling check failed:", err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoadingOpen, activeTaskId, startDate]);

  // Complete course generation inside modal
  const handleStartLearning = () => {
    setIsPlanOpen(false);
    onNavigate('/courses');
  };

  // Mock Quotes & Slogans matching current steps
  const simulatedQuotes = [
    {
      title: 'Extracting Course Timestamps',
      quote: 'Rome wasn\'t built in a day. Take it one step at a time!',
      type: 'Motivation'
    },
    {
      title: 'Generating Quizzes & Exercises',
      quote: 'Consistent daily practice improves concept retention by 60%!',
      type: 'Learning Tip'
    },
    {
      title: 'Structuring Personalized Curriculum',
      quote: 'Small steps daily lead to massive professional achievements!',
      type: 'Consistency'
    },
    {
      title: 'Almost Done...',
      quote: 'Preparing your integrated interactive sandboxed coding lab!',
      type: 'Progress'
    }
  ];

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/courses">
      <div className="animate-slide-up pb-16 max-w-[1400px] mx-auto w-full px-2 sm:px-4 text-slate-800 font-sans flex flex-col gap-6">
        
        {/* ── HEADER ROW ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 border border-slate-200 p-2.5 rounded-2xl md:hidden text-slate-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-mono">Curriculum Creator</h2>
              <p className="text-slate-900 text-sm font-extrabold font-display">AI Video-To-Course Generator Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end lg:self-auto">
            <button className="p-2 text-slate-800 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-all relative border border-slate-200 bg-white">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-white"></span>
            </button>
            <div className="relative shrink-0 select-none cursor-pointer">
              <div className="w-9 h-9 rounded-full p-[2px] bg-white border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=111217,c3f53c&fontSize=40&fontWeight=700`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover" 
                  onClick={() => onNavigate('/settings')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── TITLE BLOCK ── */}
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Create a New Course</h1>
          <p className="text-slate-500 text-sm font-semibold leading-relaxed">Transform any YouTube programming course or playlist into a personalized, structured learning curriculum with interactive labs, coding challenges, quizzes, and proctored certification exams.</p>
        </div>

        {/* ── TOP TWO GRID COLUMNS (Side-by-side stretch with no empty spacing) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* COLUMN 1: CREATE FORM */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 flex flex-col justify-between min-h-[460px] shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Sparkles className="w-5 h-5 text-slate-900" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 font-mono">New Course Details</h3>
              </div>
              <form onSubmit={handleAnalyzeAndCreate} className="space-y-4">
                {/* YouTube Link */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">YouTube Course URL</label>
                  <div className="relative">
                    <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="https://www.youtube.com/watch?v=xxxxxxxxx"
                      value={youtubeUrl}
                      onChange={(e) => { setYoutubeUrl(e.target.value); setUrlError(''); }}
                      className={`w-full pl-10 pr-4 h-12 bg-white border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        urlError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 focus:bg-slate-50/50'
                      }`}
                    />
                  </div>
                  {urlError && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {urlError}</p>}
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Daily Learning Time</label>
                    <div className="relative">
                      <select 
                        value={dailyTime}
                        onChange={(e) => { setDailyTime(e.target.value); setDailyTimeError(''); }}
                        className={`w-full pl-3.5 pr-8 h-12 bg-white border rounded-xl text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900/5 focus:bg-slate-50/50 transition-all text-slate-900 ${
                          dailyTimeError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'
                        }`}
                      >
                        <option>1 Hour</option>
                        <option>2 Hours</option>
                        <option>3 Hours</option>
                        <option>4 Hours</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {dailyTimeError && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {dailyTimeError}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Start Date</label>
                    <div className="relative">
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setDateError(''); }}
                        className={`w-full px-3.5 h-12 bg-white border rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-900/5 focus:bg-slate-50/50 cursor-pointer text-slate-900 transition-all ${
                          dateError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'
                        }`}
                      />
                    </div>
                    {dateError && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {dateError}</p>}
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Learning Goals (Optional)</label>
                  <textarea 
                    rows={3}
                    placeholder="e.g., Learn Python from basics to advanced, including object-oriented patterns and real projects..."
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    className="w-full px-3.5 py-3 h-28 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 focus:bg-slate-50/50 placeholder:text-slate-400 resize-none transition-all"
                  />
                </div>
              </form>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-slate-100 mt-5">
              <button 
                type="button"
                onClick={() => setIsAdvancedOpen(true)}
                className="flex items-center justify-center gap-2 px-5 h-12 bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 hover:border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none active:scale-[0.98]"
              >
                <Settings className="w-4 h-4" />
                Advanced Options
              </button>
              <button 
                type="submit"
                onClick={handleAnalyzeAndCreate}
                className="flex-1 flex items-center justify-center gap-2 px-5 h-12 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none active:scale-[0.98] shadow-md shadow-slate-900/10"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                Analyze & Create
              </button>
            </div>
          </div>

          {/* COLUMN 2: HOW IT WORKS */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 flex flex-col justify-between min-h-[460px] shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Info className="w-5 h-5 text-slate-900" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 font-mono">How It Works</h3>
              </div>

              {/* Vertical steps with absolute progress connectors */}
              <div className="space-y-6 relative pl-12 before:absolute before:left-4.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-100">
                {/* Step 1 */}
                <div className="relative group">
                  <div className="absolute left-[-48px] top-0.5 w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-mono font-black text-xs transition-all duration-300 group-hover:bg-slate-950 group-hover:border-slate-950 group-hover:text-white shadow-sm">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono group-hover:text-slate-950">
                      <Link className="w-3.5 h-3.5 text-slate-500" />
                      Upload YouTube Course URL
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Paste any technical tutorial series or full playlist URL link.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative group">
                  <div className="absolute left-[-48px] top-0.5 w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-mono font-black text-xs transition-all duration-300 group-hover:bg-slate-950 group-hover:border-slate-950 group-hover:text-white shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono group-hover:text-slate-950">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Set Daily Time & Start Date
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Choose your schedule. We build a personalized daily calendar plan.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative group">
                  <div className="absolute left-[-48px] top-0.5 w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-mono font-black text-xs transition-all duration-300 group-hover:bg-slate-950 group-hover:border-slate-950 group-hover:text-white shadow-sm">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono group-hover:text-slate-950">
                      <Brain className="w-3.5 h-3.5 text-slate-500" />
                      AI Analyzes the Course
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Syllabus division, timestamp marker extraction, quizzes, and coding challenges setup.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative group">
                  <div className="absolute left-[-48px] top-0.5 w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-mono font-black text-xs transition-all duration-300 group-hover:bg-slate-950 group-hover:border-slate-950 group-hover:text-white shadow-sm">
                    4
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono group-hover:text-slate-950">
                      <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                      Learn & Practice
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Code side-by-side using the compiler and attempt quizzes daily.</p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="relative group">
                  <div className="absolute left-[-48px] top-0.5 w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-center justify-center font-mono font-black text-xs transition-all duration-300 group-hover:bg-slate-950 group-hover:border-slate-950 group-hover:text-white shadow-sm">
                    5
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono group-hover:text-slate-950">
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      Revision & Final Test
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Revise key weak areas, clear proctored final exams, and earn certifications.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-4 shrink-0"></div>
          </div>

        </div>

        {/* ── BOTTOM TWO GRID COLUMNS (Symmetric visual stretch blocks) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* COLUMN 4: SAMPLE DAILY PLAN TIMELINE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between min-h-[460px] shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <ClipboardList className="w-5 h-5 text-slate-900" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 font-mono">Sample Daily Plan <span className="text-[9px] text-slate-655 font-mono font-bold capitalize bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 ml-1.5">Preview</span></h3>
              </div>

              {/* Grid content inside card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Timeline Tree list of rows */}
                <div className="md:col-span-7 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-1">
                    <span className="text-[10px] font-black uppercase text-slate-700 font-mono tracking-wider">Day 1 Activities</span>
                    <span className="text-[10px] font-black font-mono text-slate-500">Total: ~2 Hours</span>
                  </div>

                  <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200/80">
                    {/* Item 1 */}
                    <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                      <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white transition-all duration-300 group-hover:scale-110"></div>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                          <Youtube className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-slate-900 text-[12px] tracking-tight leading-tight font-display">Video Learning</h5>
                          <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">Introduction & Setup</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                        1h 30m
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                      <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white transition-all duration-300 group-hover:bg-slate-950 group-hover:scale-110"></div>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                          <Brain className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-slate-900 text-[12px] tracking-tight leading-tight font-display">Quiz & Practice</h5>
                          <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">10 Generated MCQs</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                        ~20m
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                      <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white transition-all duration-300 group-hover:bg-slate-950 group-hover:scale-110"></div>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                          <Sparkle className="w-4 h-4 text-slate-700 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-slate-900 text-[12px] tracking-tight leading-tight font-display">Coding Challenge</h5>
                          <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">Basic Syntax Lab</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                        ~10m
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                      <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white transition-all duration-300 group-hover:bg-slate-950 group-hover:scale-110"></div>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                          <ClipboardList className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-slate-900 text-[12px] tracking-tight leading-tight font-display">Summary & Notes</h5>
                          <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">Key take-aways list</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                        ~10m
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side panels */}
                <div className="md:col-span-5 flex flex-col justify-between gap-4">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 hover:border-slate-300 transition-all">
                    <h5 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono">
                      <Sliders className="w-4 h-4 text-slate-650" />
                      Smart Time Allocation
                    </h5>
                    <p className="text-[10px] font-semibold text-slate-500 leading-relaxed">
                      AI adjusts learning & practice time daily based on:
                    </p>
                    <ul className="text-[10px] font-bold text-slate-750 space-y-2 pl-0.5 mt-1">
                      <li className="flex items-center gap-2 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        Concept complexity
                      </li>
                      <li className="flex items-center gap-2 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        Question density
                      </li>
                      <li className="flex items-center gap-2 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        Coding challenges
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-[10px] font-semibold text-slate-500 leading-relaxed relative overflow-hidden flex items-start gap-2.5 hover:border-slate-300 transition-all">
                    <Info className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-slate-900 block mb-1">Dynamic Allocation:</span>
                      If video is 20 hrs and daily time is 2 hrs: ~1h 30m Learning + ~30m Practice (varies daily).
                    </div>
                  </div>
                </div>

              </div>
            </div>
            <div className="h-4 shrink-0"></div>
          </div>

          {/* COLUMN 5: ASSESSMENT FLOW */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between min-h-[460px] shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-all duration-300">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                <Award className="w-5 h-5 text-slate-900" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 font-mono">Assessment Flow</h3>
              </div>

              {/* Progress Flow Sequence */}
              <div className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200/70 p-4 rounded-2xl mb-4 text-[10px] font-black uppercase tracking-wider font-mono">
                <div className="text-slate-650 flex flex-col items-center gap-1.5 font-extrabold hover:text-slate-950 transition-colors cursor-pointer">
                  <BookOpen className="w-4 h-4 text-slate-600" />
                  <span>Modules</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                <div className="text-slate-650 flex flex-col items-center gap-1.5 font-extrabold hover:text-slate-950 transition-colors cursor-pointer">
                  <Brain className="w-4 h-4 text-slate-600" />
                  <span>Quizzes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                <div className="text-slate-650 flex flex-col items-center gap-1.5 font-extrabold hover:text-slate-950 transition-colors cursor-pointer">
                  <Sparkle className="w-4 h-4 text-slate-600 animate-pulse" />
                  <span>Coding Labs</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
                <div className="text-slate-650 flex flex-col items-center gap-1.5 font-extrabold hover:text-slate-950 transition-colors cursor-pointer">
                  <RotateCcw className="w-4 h-4 text-slate-600" />
                  <span>Revision</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-355 shrink-0" />
                <div className="text-slate-900 flex flex-col items-center gap-1.5 font-black">
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Final Test</span>
                </div>
              </div>

              {/* Dynamic Assessment Highlight Box */}
              <div className="bg-slate-50 border-l-4 border-slate-950 border border-y-slate-200/80 border-r-slate-200/80 rounded-r-2xl p-5 flex items-center justify-between mb-4 hover:border-slate-300 transition-all">
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono">
                    Final Test (Proctored)
                  </h4>
                  <p className="text-[10.5px] font-semibold text-slate-500 mt-1 leading-relaxed">Strict AI proctoring active. Camera tracking, audio checks, and tab locks block malpractice.</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 ml-4 shadow-sm hover:border-slate-900 hover:text-slate-900 transition-all duration-300 cursor-pointer">
                  <Camera className="w-5 h-5 text-slate-600" />
                </div>
              </div>

              {/* Sub Columns inside Flow Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Penalty Lock Card */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[10px] font-black text-slate-900 uppercase font-mono">If You Fail or Violate</h5>
                      <p className="text-[9.5px] font-semibold text-slate-500 mt-1 leading-relaxed">
                        Test locks immediately. Re-activation requires a 24-hour lockout buffer block to study.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Motivational quotes block */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div>
                    <h5 className="text-[10px] font-black text-slate-900 uppercase font-mono">Motivation</h5>
                    <p className="text-[9.5px] font-bold text-slate-650 italic mt-1 leading-relaxed">
                      "Success is not about never failing, it's about never giving up. Stay focused, you've got this!"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Locked Penalty CTA */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button 
                disabled 
                className="w-full h-12 bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-xl flex items-center justify-center gap-2 select-none shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
              >
                <Clock className="w-4 h-4" />
                Reattempt After 24 Hours
              </button>
            </div>
          </div>
        </div>

        {/* ── FEATURE HIGHLIGHTS PANEL ── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
            <Sparkle className="w-5 h-5 text-slate-900 animate-pulse" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 font-mono">AI-Powered Premium Features</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-5 flex flex-col items-start gap-4 transition-all duration-300 hover:border-slate-350 hover:bg-slate-50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-slate-200/85 text-slate-800 transition-all duration-300 group-hover:bg-[#c3f53c] group-hover:border-[#c3f53c] group-hover:text-slate-950 shrink-0 shadow-sm">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 tracking-tight font-display mt-1">Smart Module Division</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">AI sections videos into cohesive core concept-based steps.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-5 flex flex-col items-start gap-4 transition-all duration-300 hover:border-slate-350 hover:bg-slate-50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-slate-200/85 text-slate-800 transition-all duration-300 group-hover:bg-[#c3f53c] group-hover:border-[#c3f53c] group-hover:text-slate-950 shrink-0 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 tracking-tight font-display mt-1">Adaptive Scheduling</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Time weight shifts dynamically based on logic complexity.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-5 flex flex-col items-start gap-4 transition-all duration-300 hover:border-slate-350 hover:bg-slate-50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-slate-200/85 text-slate-800 transition-all duration-300 group-hover:bg-[#c3f53c] group-hover:border-[#c3f53c] group-hover:text-slate-950 shrink-0 shadow-sm">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 tracking-tight font-display mt-1">Practice Generation</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Custom sandboxed mock coding problems generated in real time.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-5 flex flex-col items-start gap-4 transition-all duration-300 hover:border-slate-350 hover:bg-slate-50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-slate-200/85 text-slate-800 transition-all duration-300 group-hover:bg-[#c3f53c] group-hover:border-[#c3f53c] group-hover:text-slate-950 shrink-0 shadow-sm">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 tracking-tight font-display mt-1">Revision & Final Test</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Weak-point quizzes and formal proctored certifications.</p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-5 flex flex-col items-start gap-4 transition-all duration-300 hover:border-slate-350 hover:bg-slate-50 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-slate-200/85 text-slate-800 transition-all duration-300 group-hover:bg-[#c3f53c] group-hover:border-[#c3f53c] group-hover:text-slate-950 shrink-0 shadow-sm">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-900 tracking-tight font-display mt-1">Cheating Detection</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">Immersive eye, tab, and visual tracking monitors exams.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {isAdvancedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 transition-all duration-300">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in text-slate-900 flex flex-col justify-between max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 font-display">
                <Sliders className="w-4 h-4 text-slate-900 animate-pulse" />
                Advanced Options
              </h3>
              <button 
                onClick={() => setIsAdvancedOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Scroll area */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar scroll-opt pb-32 text-slate-800" style={{ overscrollBehaviorY: 'contain' }}>
              
              {/* Preferences */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 font-mono border-b border-slate-100 pb-2">Content Preferences</h4>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Focus Areas */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Focus Areas (Max 3)</span>
                    <div className="space-y-2.5 text-xs font-bold text-slate-700">
                      {['Basics & Fundamentals', 'Advanced Concepts', 'Best Practices', 'Real-world Projects', 'Interview Preparation'].map(area => {
                        const isChecked = focusAreas.includes(area);
                        return (
                          <label key={area} className="flex items-center gap-2 cursor-pointer select-none group">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setFocusAreas(prev => prev.filter(x => x !== area));
                                } else if (focusAreas.length < 3) {
                                  setFocusAreas(prev => [...prev, area]);
                                }
                              }}
                              className="rounded-md border-slate-300 text-slate-950 focus:ring-0 focus:ring-offset-0 bg-slate-50 w-4 h-4 cursor-pointer transition-colors"
                            />
                            <span className="group-hover:text-slate-950">{area}</span>
                          </label>
                        );
                      })}
                      
                      {/* Custom input option */}
                      <label className="flex flex-col gap-1.5 mt-2">
                        <span className="flex items-center gap-2 cursor-pointer select-none group">
                          <input 
                            type="checkbox"
                            checked={focusAreas.includes('Other')}
                            onChange={() => {
                              if (focusAreas.includes('Other')) {
                                  setFocusAreas(prev => prev.filter(x => x !== 'Other'));
                              } else if (focusAreas.length < 3) {
                                  setFocusAreas(prev => [...prev, 'Other']);
                              }
                            }}
                            className="rounded-md border-slate-300 text-slate-950 focus:ring-0 focus:ring-offset-0 bg-slate-50 w-4 h-4 cursor-pointer transition-colors"
                          />
                          <span className="group-hover:text-slate-950">Other (Custom)</span>
                        </span>
                        {focusAreas.includes('Other') && (
                          <input 
                            type="text"
                            placeholder="Enter custom focus area"
                            value={customFocus}
                            onChange={(e) => setCustomFocus(e.target.value)}
                            className="w-full px-3.5 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 focus:bg-white transition-all"
                          />
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Include list */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Include in Course</span>
                    <div className="space-y-2.5 text-xs font-bold text-slate-700">
                      {[
                        { id: 'quizzes', label: 'Quizzes (MCQs)' },
                        { id: 'coding', label: 'Coding Challenges' },
                        { id: 'revision', label: 'Revision Sessions' },
                        { id: 'final_test', label: 'Final Test (Proctored)' },
                      ].map(item => {
                        const isIncluded = includes.includes(item.id);
                        return (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer select-none group">
                            <input 
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => {
                                if (isIncluded) {
                                  setIncludes(prev => prev.filter(x => x !== item.id));
                                } else {
                                  setIncludes(prev => [...prev, item.id]);
                                }
                              }}
                              className="rounded-md border-slate-300 text-slate-950 focus:ring-0 focus:ring-offset-0 bg-slate-50 w-4 h-4 cursor-pointer transition-colors"
                            />
                            <span className="group-hover:text-slate-950">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Customization */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 font-mono border-b border-slate-100 pb-2">Course Customization</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Difficulty Level Dropdown */}
                  <div className="space-y-2 relative">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Difficulty Level</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'difficulty' ? null : 'difficulty'); }}
                        className="w-full px-3.5 h-12 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 transition-all text-slate-900 text-left"
                      >
                        <span>{difficulty}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-900 transition-transform duration-200 ${openDropdown === 'difficulty' ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {openDropdown === 'difficulty' && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1.5 max-h-48 overflow-y-auto scroll-gpu custom-scrollbar animate-fade-in">
                          {['Auto (Recommended)', 'Easy', 'Medium', 'Hard'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => { setDifficulty(opt); setOpenDropdown(null); }}
                              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer block ${
                                difficulty === opt 
                                  ? 'text-slate-950 bg-slate-50 font-black' 
                                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-950'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Language Dropdown */}
                  <div className="space-y-2 relative">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Language</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'language' ? null : 'language'); }}
                        className="w-full px-3.5 h-12 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 transition-all text-slate-900 text-left"
                      >
                        <span>{language}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-900 transition-transform duration-200 ${openDropdown === 'language' ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {openDropdown === 'language' && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1.5 max-h-48 overflow-y-auto scroll-gpu custom-scrollbar animate-fade-in">
                          {['English', 'Spanish', 'French', 'Indonesian'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => { setLanguage(opt); setOpenDropdown(null); }}
                              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer block ${
                                language === opt 
                                  ? 'text-slate-950 bg-slate-50 font-black' 
                                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-950'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Complexity Dropdown */}
                  <div className="space-y-2 relative">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Question Complexity</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'complexity' ? null : 'complexity'); }}
                        className="w-full px-3.5 h-12 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 transition-all text-slate-900 text-left"
                      >
                        <span>{questionComplexity}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-900 transition-transform duration-200 ${openDropdown === 'complexity' ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {openDropdown === 'complexity' && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1.5 max-h-48 overflow-y-auto scroll-gpu custom-scrollbar animate-fade-in">
                          {['Balanced', 'Conceptual', 'Applied Practice'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => { setQuestionComplexity(opt); setOpenDropdown(null); }}
                              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer block ${
                                questionComplexity === opt 
                                  ? 'text-slate-950 bg-slate-50 font-black' 
                                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-950'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coding Challenge Difficulty Dropdown */}
                  <div className="space-y-2 relative">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Coding Challenge Difficulty</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'coding' ? null : 'coding'); }}
                        className="w-full px-3.5 h-12 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 transition-all text-slate-900 text-left"
                      >
                        <span>{codingDifficulty}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-900 transition-transform duration-200 ${openDropdown === 'coding' ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {openDropdown === 'coding' && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1.5 max-h-48 overflow-y-auto scroll-gpu custom-scrollbar animate-fade-in">
                          {['Easy', 'Medium', 'Hard'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => { setCodingDifficulty(opt); setOpenDropdown(null); }}
                              className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer block ${
                                codingDifficulty === opt 
                                  ? 'text-slate-950 bg-slate-50 font-black' 
                                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-950'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Scheduling Preferences */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900 font-mono border-b border-slate-100 pb-2">Scheduling Preferences</h4>
                
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl p-4 hover:border-slate-350 transition-all">
                  <div>
                    <span className="block text-xs font-extrabold text-slate-800">Prefer weekend learning?</span>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase font-mono mt-0.5">Increases weekend session weight</span>
                  </div>
                  <button 
                    onClick={() => setPreferWeekend(!preferWeekend)}
                    className={`w-11 h-6 rounded-full transition-all duration-200 relative cursor-pointer border ${
                      preferWeekend ? 'bg-slate-950 border-slate-950' : 'bg-slate-200 border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-[3px] transition-all duration-200 shadow-sm ${
                      preferWeekend ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Daily Watch Time</label>
                  <input
                    type="time"
                    value={preferredStartTime}
                    onChange={(e) => setPreferredStartTime(e.target.value)}
                    className="w-full px-3.5 h-12 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 focus:bg-slate-50/50 cursor-pointer text-slate-900 transition-all"
                  />
                </div>

                {/* Preferred Practice Time Dropdown */}
                <div className="space-y-2 relative">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Preferred Practice Time</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'practice' ? null : 'practice'); }}
                      className="w-full px-3.5 h-12 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/5 transition-all text-slate-900 text-left"
                    >
                      <span>{preferredPracticeTime}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-900 transition-transform duration-200 ${openDropdown === 'practice' ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {openDropdown === 'practice' && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1.5 max-h-48 overflow-y-auto scroll-gpu custom-scrollbar animate-fade-in">
                        {['20-30 mins/day', '30-40 mins/day', '40-50 mins/day', '60+ mins/day'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setPreferredPracticeTime(opt); setOpenDropdown(null); }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer block ${
                              preferredPracticeTime === opt 
                                ? 'text-slate-950 bg-slate-50 font-black' 
                                : 'text-slate-650 hover:bg-slate-50 hover:text-slate-950'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-5 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsAdvancedOpen(false)}
                className="flex-1 px-5 h-12 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => setIsAdvancedOpen(false)}
                className="flex-1 px-5 h-12 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all shadow-md shadow-slate-900/10"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: AI SIMULATOR PROGRESS LOADER OVERLAY ── */}
      {isLoadingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="max-w-md w-full text-center space-y-6 text-slate-900 p-8 bg-white border border-slate-200/80 rounded-3xl shadow-2xl animate-fade-in">
            
            {/* Loader animation or Error Icon */}
            {generationError ? (
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500 animate-bounce shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>
            ) : (
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-slate-950 animate-spin"></div>
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
                  <Brain className="w-7 h-7 text-slate-800 animate-pulse" />
                </div>
              </div>
            )}

            {/* Status Phase details */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono animate-pulse">
                {generationError ? 'Generation Error' : currentStepText}
              </h3>
              <p className="text-slate-950 text-base font-black font-display tracking-tight">{progress}% Complete</p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 border border-slate-200/60 rounded-full h-3 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <div 
                className={`h-full transition-all duration-150 relative overflow-hidden ${generationError ? 'bg-red-500' : 'bg-slate-950'}`}
                style={{ width: `${progress}%` }}
              >
                <span className="absolute inset-0 bg-white/25 animate-pulse"></span>
              </div>
            </div>

            {/* Error Message & Retry CTAs */}
            {generationError ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200/60 rounded-2xl p-4 text-left shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200 font-mono">
                    Pipeline Fail
                  </span>
                  <p className="text-[11px] font-bold text-red-700 mt-2 leading-relaxed italic">
                    "{generationError}"
                  </p>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsLoadingOpen(false)}
                    className="flex-1 px-4 h-11 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleRetryStep}
                    className="flex-1 px-4 h-11 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all shadow-md"
                  >
                    Retry Step
                  </button>
                </div>
              </div>
            ) : (
              /* Motivational Slogan Cards */
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 space-y-2.5 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)] animate-fade-in">
                <span className="inline-block px-3 py-0.5 rounded-full bg-slate-200/70 text-slate-800 font-mono text-[9px] font-black uppercase tracking-wider border border-slate-300">
                  {simulatedQuotes[loadingStep].type}
                </span>
                <p className="text-xs font-bold text-slate-700 italic leading-relaxed">
                  "{simulatedQuotes[loadingStep].quote}"
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── MODAL 3: FULL LEARNING PLAN OVERVIEW ── */}
      {isPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl animate-fade-in text-slate-900 flex flex-col justify-between max-h-[92vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-slate-900" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display">Full Learning Plan</h3>
              </div>
              <button 
                onClick={() => setIsPlanOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-950 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Strip */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4.5 grid grid-cols-4 sm:grid-cols-8 gap-4 shrink-0 text-center text-slate-650">
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Duration</span>
                <span className="block text-xs font-black text-slate-900 font-mono">20:00 Hrs</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Est Days</span>
                <span className="block text-xs font-black text-slate-900 font-mono">10 Days</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Learning time</span>
                <span className="block text-xs font-black text-slate-900 font-mono">2 Hrs/Day</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Modules</span>
                <span className="block text-xs font-black text-slate-900 font-mono">10</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Quizzes</span>
                <span className="block text-xs font-black text-slate-900 font-mono">120 Qs</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 tracking-wider font-mono">Challenges</span>
                <span className="block text-xs font-black text-slate-900 font-mono">15</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Revisions</span>
                <span className="block text-xs font-black text-slate-900 font-mono">2</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Final Test</span>
                <span className="block text-xs font-black text-slate-900 font-mono">1 (Proctored)</span>
              </div>
            </div>

            {/* Scroll body with Tabs */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[55vh] custom-scrollbar scroll-gpu space-y-4">
              
              {/* Tab Selector buttons */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200/70 p-1.5 rounded-2xl shrink-0">
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setPlanTab('daily')}
                    className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                      planTab === 'daily' 
                        ? 'bg-white text-slate-900 border border-slate-200 font-black shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    Daily Plan View
                  </button>
                  <button 
                    onClick={() => setPlanTab('module')}
                    className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                      planTab === 'module' 
                        ? 'bg-white text-slate-900 border border-slate-200 font-black shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    Module View
                  </button>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-200/50 px-3 py-1.5 rounded-lg border border-slate-200">
                  Allocation: ~1h 30m Video + ~30m Practice (varies)
                </span>
              </div>

              {/* Accordions */}
              <div className="space-y-3">
                {/* Day 1 Accordion */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors">
                  <button 
                    onClick={() => setExpandedDay(expandedDay === 1 ? null : 1)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-100/70 transition-colors font-mono uppercase text-xs text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-slate-200 border border-slate-350 text-slate-800 flex items-center justify-center font-bold text-[10px] shadow-sm">
                        1
                      </div>
                      <span className="font-extrabold text-slate-900">Day 1: Introduction & Setup</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-500">~2 Hours</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedDay === 1 ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expandedDay === 1 && (
                    <div className="px-5 pb-5 border-t border-slate-200/80 pt-4 grid grid-cols-1 md:grid-cols-12 gap-5 animate-slide-up">
                      {/* Left: Tasks timeline */}
                      <div className="md:col-span-7 space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200/80">
                        
                        {/* Item 1 */}
                        <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                          <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-white transition-all duration-300 group-hover:scale-110"></div>
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                              <Youtube className="w-4 h-4 text-slate-700" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-slate-900 text-[12.5px] tracking-tight leading-tight font-display">Video Learning</h5>
                              <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">Introduction & Setup</p>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                            1h 30m
                          </div>
                        </div>

                        {/* Item 2 */}
                        <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                          <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white transition-all duration-300 group-hover:bg-slate-950 group-hover:scale-110"></div>
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                              <Brain className="w-4 h-4 text-slate-700" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-slate-900 text-[12.5px] tracking-tight leading-tight font-display">Quiz & Practice</h5>
                              <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">10 Generated MCQs</p>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                            ~20m
                          </div>
                        </div>

                        {/* Item 3 */}
                        <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                          <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white transition-all duration-300 group-hover:bg-slate-950 group-hover:scale-110"></div>
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                              <Sparkle className="w-4 h-4 text-slate-700 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-slate-900 text-[12.5px] tracking-tight leading-tight font-display">Coding Challenge</h5>
                              <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">Basic Syntax Lab</p>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                            ~10m
                          </div>
                        </div>

                        {/* Item 4 */}
                        <div className="relative bg-white border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between gap-4 transition-all duration-200 hover:border-slate-350 hover:bg-slate-50 cursor-pointer group">
                          <div className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white transition-all duration-300 group-hover:bg-slate-950 group-hover:scale-110"></div>
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200/85 text-slate-600 shadow-sm transition-all duration-200 group-hover:border-slate-900">
                              <ClipboardList className="w-4 h-4 text-slate-700" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-slate-900 text-[12.5px] tracking-tight leading-tight font-display">Summary & Notes</h5>
                              <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 truncate">Key take-aways list</p>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 text-slate-700 font-mono shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                            ~10m
                          </div>
                        </div>

                      </div>

                      {/* Right: Allocation details */}
                      <div className="md:col-span-5 space-y-3">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2.5 hover:border-slate-300 transition-all">
                          <h5 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 uppercase font-mono">
                            <Sliders className="w-3.5 h-3.5" />
                            Smart Time Allocation
                          </h5>
                          <p className="text-[10px] font-semibold text-slate-500 leading-relaxed">
                            AI adjusts learning & practice time daily based on:
                          </p>
                          <ul className="text-[10px] font-bold text-slate-750 space-y-2 pl-0.5 mt-1">
                            <li className="flex items-center gap-2 text-slate-700">
                              <Check className="w-3 h-3 text-slate-955 shrink-0" />
                              Concept complexity
                            </li>
                            <li className="flex items-center gap-2 text-slate-700">
                              <Check className="w-3 h-3 text-slate-955 shrink-0" />
                              Question density
                            </li>
                            <li className="flex items-center gap-2 text-slate-700">
                              <Check className="w-3 h-3 text-slate-955 shrink-0" />
                              Coding challenges
                            </li>
                          </ul>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-[10px] font-semibold text-slate-500 leading-relaxed flex items-start gap-2.5 hover:border-slate-300 transition-all">
                          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-slate-900 block mb-1">Note:</span>
                            If video is 20 hrs and daily time is 2 hrs: ~1h 30m Learning + ~30m Practice (varies daily).
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Day 2 Accordion */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors">
                  <button 
                    onClick={() => setExpandedDay(expandedDay === 2 ? null : 2)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-100/70 transition-colors font-mono uppercase text-xs text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-slate-200 border border-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] shadow-sm">
                        2
                      </div>
                      <span className="font-extrabold text-slate-600">Day 2: Python Basics & Data Types</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">~2 Hours</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedDay === 2 ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expandedDay === 2 && (
                    <div className="px-5 pb-5 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500 animate-slide-up leading-relaxed">
                      Module contents locked until curriculum is generated. Detailed syllabus breakdown will follow variables, primitive types (integers, strings), and basic formatting rules.
                    </div>
                  )}
                </div>

                {/* Day 3 Accordion */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors">
                  <button 
                    onClick={() => setExpandedDay(expandedDay === 3 ? null : 3)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-100/70 transition-colors font-mono uppercase text-xs text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-slate-200 border border-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] shadow-sm">
                        3
                      </div>
                      <span className="font-extrabold text-slate-600">Day 3: Control Flow & Operators</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">~2 Hours</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedDay === 3 ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expandedDay === 3 && (
                    <div className="px-5 pb-5 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500 animate-slide-up leading-relaxed">
                      Module contents locked until curriculum is generated. Contains logical comparisons, conditional logic (if-elif-else statements), and loops setup.
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-5 flex gap-3 shrink-0">
              <button 
                onClick={() => setIsPlanOpen(false)}
                className="flex-1 px-5 h-12 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all"
              >
                Close
              </button>
              <button 
                onClick={handleStartLearning}
                className="flex-1 px-5 h-12 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-[0.98] transition-all shadow-md shadow-slate-900/10"
              >
                Start Learning
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
};
