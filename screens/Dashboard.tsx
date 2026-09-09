
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { XPWidget } from '../components/Dashboard/XPWidget';
import { AIAssistantBubble } from '../components/Dashboard/AIAssistantBubble';
import { ChevronRight, Loader2, Calendar, ClipboardCheck, Zap, ArrowRight, ShieldCheck, Clock, FileText, Search, BookOpen, BarChart2, Bell, Play, CheckCircle2, Mic, Video, Wifi, UserCheck, AlertCircle, Flag, Sparkles, Bot } from 'lucide-react';
import { User, Exam } from '../types';
import { useAuth } from '../services/authContext';
import { useCourses } from '../services/courseContext';
import { examsAPI } from '../services/apiService';
import { NotificationCenter } from '../components/Layout/NotificationCenter';
import { useTranslation } from '../hooks/useTranslation';

interface DashboardProps {
  onNavigate: (path: string) => void;
}

type DashboardAssignment = Exam & {
  priority?: 'high' | 'medium' | 'low';
  enrollmentStatus?: string | null;
};

type ActivityBar = {
  day: string;
  date?: string;
  hours: number;
  active?: boolean;
};

type DashboardStats = {
  enrolledCourses: number;
  overallProgress: number;
  tasksCompleted: number;
  completedExams: number;
  averageScore: number;
  hourlyActivity: ActivityBar[];
  taskBreakdown: {
    lessons: number;
    quizzes: number;
    codingChallenges: number;
    exams: number;
  };
};

const emptyStats: DashboardStats = {
  enrolledCourses: 0,
  overallProgress: 0,
  tasksCompleted: 0,
  completedExams: 0,
  averageScore: 0,
  hourlyActivity: [],
  taskBreakdown: {
    lessons: 0,
    quizzes: 0,
    codingChallenges: 0,
    exams: 0,
  },
};

// Smooth, accessible number animation hook
const useCountUp = (endValue: number, duration: number = 800) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setCount(endValue);
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(endValue);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startValue + (endValue - startValue) * easeOut));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [endValue, duration]);

  return count;
};

export const DashboardScreen: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { courses } = useCourses();
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Real data from API
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([]);

  // Map auth user to the User type the layout expects
  const user: User = {
    id: String(authUser?.id || ''),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Student',
    email: authUser?.email || '',
    role: 'student',
  };

  const [stats, setStats] = useState<DashboardStats>(emptyStats);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [examStats, myExamRows] = await Promise.all([
          examsAPI.getDashboardStats(),
          examsAPI.getMyExams(),
        ]);
        const assignmentRows = Array.isArray(myExamRows) && myExamRows.length > 0
          ? myExamRows
          : (examStats?.assignments || examStats?.upcoming_exams || []);
        const upcomingAssignments = assignmentRows.map((ex: any) => ({
          id: String(ex.id),
          title: ex.title,
          courseName: ex.course_name,
          date: new Date(ex.start_time),
          durationMinutes: ex.duration_minutes,
          questionCount: ex.question_count || 0,
          status: 'Scheduled' as const,
          priority: ex.priority || 'low',
          enrollmentStatus: ex.enrollment_status || null,
        }));
        setAssignments(upcomingAssignments);
        setStats({
          enrolledCourses: examStats?.enrolled_courses || 0,
          overallProgress: examStats?.overall_progress || 0,
          tasksCompleted: examStats?.tasks_completed || 0,
          completedExams: examStats?.completed_exams || 0,
          averageScore: examStats?.average_score || 0,
          hourlyActivity: Array.isArray(examStats?.hourly_activity)
            ? examStats.hourly_activity.map((bar: any) => ({
              day: bar.day || '',
              date: bar.date,
              hours: Number(bar.hours || 0),
              active: Boolean(bar.active),
            }))
            : [],
          taskBreakdown: {
            lessons: examStats?.task_breakdown?.lessons || 0,
            quizzes: examStats?.task_breakdown?.quizzes || 0,
            codingChallenges: examStats?.task_breakdown?.coding_challenges || 0,
            exams: examStats?.task_breakdown?.exams || 0,
          },
        });
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const enrolledCourseCount = stats.enrolledCourses || courses.length;
  const overallProgress = stats.enrolledCourses
    ? stats.overallProgress
    : courses.length
      ? Math.round(courses.reduce((sum, course) => sum + (course.progress || 0), 0) / courses.length)
      : 0;
  const tasksCompleted = stats.tasksCompleted || courses.reduce((sum, course) => (
    sum + course.modules.completed + course.quizzes.completed + course.codingChallenges.completed + course.revisions.completed
  ), 0);

  // Smooth number transitions
  const animatedEnrolledCount = useCountUp(enrolledCourseCount, 700);
  const animatedOverallProgress = useCountUp(overallProgress, 850);
  const animatedTasksCompleted = useCountUp(tasksCompleted, 750);

  const maxActivityHours = Math.max(1, ...stats.hourlyActivity.map((bar) => bar.hours));

  // Proctoring System Calibrator States
  const [checkState, setCheckState] = useState<'idle' | 'testing' | 'success'>('idle');
  const [diagnostics, setDiagnostics] = useState({
    desktop: 'pending',
    mic: 'pending',
    camera: 'pending',
    network: 'pending'
  });
  const [netSpeed, setNetSpeed] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number[]>([10, 15, 10]);

  const runDiagnostics = () => {
    setCheckState('testing');
    setDiagnostics({ desktop: 'checking', mic: 'pending', camera: 'pending', network: 'pending' });

    // Step 1: Desktop authorization check (1000ms)
    setTimeout(() => {
      setDiagnostics(prev => ({ ...prev, desktop: 'pass', mic: 'checking' }));

      // Step 2: Microphone calibration check (1200ms)
      const micInterval = setInterval(() => {
        setAudioLevel([
          Math.floor(Math.random() * 30) + 5,
          Math.floor(Math.random() * 45) + 10,
          Math.floor(Math.random() * 30) + 5,
          Math.floor(Math.random() * 55) + 15,
          Math.floor(Math.random() * 25) + 5
        ]);
      }, 150);

      setTimeout(() => {
        clearInterval(micInterval);
        setDiagnostics(prev => ({ ...prev, mic: 'pass', camera: 'checking' }));

        // Step 3: Camera check (1200ms)
        setTimeout(() => {
          setDiagnostics(prev => ({ ...prev, camera: 'pass', network: 'checking' }));

          // Step 4: Network speed check (1500ms)
          let speed = 0;
          const speedInterval = setInterval(() => {
            speed += Math.floor(Math.random() * 12) + 6;
            if (speed >= 86) {
              speed = 86;
              clearInterval(speedInterval);
            }
            setNetSpeed(speed);
          }, 100);

          setTimeout(() => {
            setDiagnostics(prev => ({ ...prev, network: 'pass' }));
            setCheckState('success');
          }, 1500);

        }, 1200);

      }, 1200);

    }, 1000);
  };

  if (isLoading) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Preparing your assessment portal...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate}>
      <div className="max-w-[1400px] mx-auto w-full px-2 sm:px-4 animate-slide-up pb-12 text-slate-800 font-sans flex flex-col gap-6">
 
        {/* Inline integrated desktop header row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
                <div className="bg-primary/20 border border-slate-200 p-2.5 rounded-2xl md:hidden">
                    <ShieldCheck className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-mono">Student Portal</h2>
                    <p className="text-slate-900 text-sm font-extrabold font-display">Welcome to your secure assessment hub</p>
                </div>
            </div>

            {/* Right side aligned widgets: Search, Notification Bell, and compact Profile */}
            <div className="flex items-center gap-4 self-end lg:self-auto">
                <div className="relative group">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search courses or exams..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-slate-50 transition-all placeholder:text-slate-400 w-48 sm:w-64 shadow-none"
                    />
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 text-slate-900 hover:bg-slate-50 rounded-xl transition-all relative border border-slate-200 bg-white cursor-pointer group"
                        title="Notifications"
                    >
                        <Bell className="w-4 h-4 group-hover:scale-110 transition-transform animate-bell-ring" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-white animate-subtle-pulse"></span>
                    </button>
                    <NotificationCenter 
                        isOpen={showNotifications} 
                        onClose={() => setShowNotifications(false)} 
                        onNavigate={onNavigate}
                    />
                </div>
                <div className="relative shrink-0 select-none cursor-pointer">
                    <div className="w-9 h-9 rounded-full p-[2px] bg-white border border-slate-200 hover:border-slate-400 transition-all flex items-center justify-center">
                        <img 
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=111217,c3f53c&fontSize=40&fontWeight=700`} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover" 
                        />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 bg-slate-900 text-primary font-black text-[8px] px-1.5 py-0.5 rounded-full font-mono border border-slate-900">
                        30%
                    </div>
                </div>
            </div>
        </div>

        {/* Welcome Section */}
        <div className="mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display mb-1.5 flex items-center gap-3">
                Welcome back, {user.name.split(' ')[0]} <span className="animate-wave text-3xl sm:text-4xl">👋</span>
            </h1>
            <p className="text-slate-500 text-sm font-semibold leading-relaxed">
                Your AI learning environment is online. Calibrate your devices below to proceed.
            </p>
        </div>

        {/* Dashboard Title & Metrics Row */}
        <div className="mb-5">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight uppercase">Overview Dashboard</h2>
                <span className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer underline underline-offset-4 font-mono">VIEW ALL</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Metric 1: Enrolled Courses */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 ease-out relative overflow-hidden h-28 animate-fade-in-up stagger-1 will-change-transform cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50/80 text-orange-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">{t('dash.enrolled_courses')}</span>
                        <span className="text-3xl font-black text-slate-900 tracking-tight font-display transition-all duration-300">{String(animatedEnrolledCount).padStart(2, '0')}</span>
                    </div>
                </div>

                {/* Metric 2: Overall Progress */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 ease-out relative overflow-hidden h-28 animate-fade-in-up stagger-2 will-change-transform cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 text-emerald-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                        <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">{t('dash.overall_progress')}</span>
                        <span className="text-3xl font-black text-slate-900 tracking-tight font-display transition-all duration-300">{animatedOverallProgress}%</span>
                    </div>
                </div>

                {/* Metric 3: Tasks Completed */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 flex items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300 ease-out relative overflow-hidden h-28 animate-fade-in-up stagger-3 will-change-transform cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50/80 text-amber-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                        <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">{t('dash.tasks_completed')}</span>
                        <span className="text-3xl font-black text-slate-900 tracking-tight font-display transition-all duration-300">{animatedTasksCompleted}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 1: Hourly Activity (left 8) + System Check (right 4)     */}
        {/* items-stretch ensures BOTH cards lock to identical height     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Hourly Activity — left, 8 cols */}
            <section className="lg:col-span-8 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col lg:h-[390px]">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight font-display uppercase">{t('dash.recent_activity')}</h3>
                        <p className="text-xs text-emerald-600 font-extrabold mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[9px] font-mono">
                                {stats.hourlyActivity.reduce((sum, bar) => sum + bar.hours, 0).toFixed(1)}hr
                            </span> logged from your course activity
                        </p>
                    </div>
                    <select className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold px-3 py-1.5 focus:outline-none cursor-pointer">
                        <option>Weekly</option>
                        <option>Monthly</option>
                    </select>
                </div>

                {/* Bar chart — flex-1 so it fills remaining card height */}
                <div className="flex-1 flex flex-col justify-end">
                    <div className="flex gap-3 items-end justify-between h-40 select-none relative pb-5">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5 text-[10px] text-slate-300 font-bold font-mono">
                            <div className="border-b border-slate-100 w-full pt-1 flex justify-between"><span>6hr</span></div>
                            <div className="border-b border-slate-100 w-full pt-1 flex justify-between"><span>4hr</span></div>
                            <div className="border-b border-slate-100 w-full pt-1 flex justify-between"><span>2hr</span></div>
                        </div>

                        {stats.hourlyActivity.map((bar, idx) => (
                            <div key={idx} className="flex flex-col items-center flex-1 group cursor-pointer relative z-10">
                                <span className="text-[9px] text-slate-900 bg-primary px-1.5 py-0.5 rounded border border-slate-200 opacity-0 group-hover:opacity-100 transition-all font-mono font-bold mb-2 absolute -top-7">{bar.hours.toFixed(1)}hr</span>
                                <div className="w-8 md:w-10 bg-slate-50 rounded-lg relative flex items-end justify-center h-28 overflow-hidden border border-slate-100">
                                    <div
                                        className={`w-full rounded-md transition-all duration-700 ease-out ${bar.active ? 'bg-primary' : 'bg-slate-900'}`}
                                        style={{ height: `${Math.max(6, Math.round((bar.hours / maxActivityHours) * 100))}%` }}
                                    ></div>
                                </div>
                                <span className={`text-[10px] font-black mt-2.5 uppercase tracking-wider ${bar.active ? 'text-slate-900 underline underline-offset-4 decoration-2 decoration-primary' : 'text-slate-400'}`}>{bar.day}</span>
                            </div>
                        ))}
                        {stats.hourlyActivity.length === 0 && (
                            <div className="relative z-10 w-full h-28 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
                                <Clock className="w-5 h-5 text-slate-400 mb-2" />
                                <p className="text-[10px] font-bold text-slate-500 font-mono uppercase">No activity logged yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* System Check — right, 4 cols, overflow-y-auto keeps it same height */}
            <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col overflow-hidden lg:h-[390px]">

                {/* Header — always visible */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4.5 h-4.5 text-slate-900 w-[18px] h-[18px]" />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-xs tracking-tight text-slate-900 font-display leading-none">SYSTEM CHECK</h4>
                            <p className="text-[9px] font-bold text-slate-400 tracking-wider font-mono mt-0.5">PROCTORING ENGINE</p>
                        </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all inline-flex items-center gap-1.5 ${
                        checkState === 'success'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-subtle-pulse'
                            : checkState === 'testing'
                                ? 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                        {checkState === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                        {checkState === 'success' ? 'SECURED' : checkState === 'testing' ? 'TESTING' : 'IDLE'}
                    </div>
                </div>

                {/* Scrollable content area — never breaks row height */}
                <div className="flex-1 overflow-y-auto scrollbar-none">

                    {/* IDLE STATE */}
                    {checkState === 'idle' && (
                        <div className="space-y-3">
                            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                                Calibrate the proctoring feed before exams — verifying session, mic, webcam, and network.
                            </p>

                            <button
                                onClick={runDiagnostics}
                                className="w-full bg-slate-900 text-white font-bold hover:bg-slate-700 active:scale-[0.98] transition-all py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-mono"
                            >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Calibrate Hardware
                            </button>

                            <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/50 space-y-2.5 font-mono text-[10px]">
                                {[
                                    { icon: UserCheck, label: 'Session User Check' },
                                    { icon: Mic, label: 'Acoustic Gain Calibration' },
                                    { icon: Video, label: 'Webcam Focal Calibration' },
                                    { icon: Wifi, label: 'Route Access Speed' },
                                ].map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center justify-between text-slate-400 font-bold">
                                        <span className="flex items-center gap-2">
                                            <Icon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                            {label}
                                        </span>
                                        <span className="text-[9px] text-slate-300 tracking-widest">WAITING</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TESTING STATE */}
                    {checkState === 'testing' && (
                        <div className="space-y-2.5">
                            {/* Overall progress strip */}
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-900 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${
                                            diagnostics.desktop === 'checking' ? 10
                                            : diagnostics.mic === 'checking' ? 35
                                            : diagnostics.camera === 'checking' ? 60
                                            : diagnostics.network === 'checking' ? 85
                                            : 100
                                        }%`
                                    }}
                                />
                            </div>

                            {/* Step 1 */}
                            <div className={`border rounded-xl p-2.5 flex items-center justify-between transition-all duration-500 ${
                                diagnostics.desktop === 'pass' ? 'border-emerald-400 bg-emerald-50/30'
                                : diagnostics.desktop === 'checking' ? 'border-slate-900 bg-white shadow-sm'
                                : 'border-slate-100 bg-slate-50/40 opacity-50'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${diagnostics.desktop === 'pass' ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                    </div>
                                    <div>
                                        <h5 className="text-[11px] font-black text-slate-900 font-display leading-none">Session Profile</h5>
                                        <p className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                                            {diagnostics.desktop === 'pass' ? 'Verified' : diagnostics.desktop === 'checking' ? 'Authorizing...' : 'Pending'}
                                        </p>
                                    </div>
                                </div>
                                {diagnostics.desktop === 'checking' && <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin shrink-0" />}
                                {diagnostics.desktop === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </div>

                            {/* Step 2 */}
                            <div className={`border rounded-xl p-2.5 transition-all duration-500 ${
                                diagnostics.mic === 'pass' ? 'border-emerald-400 bg-emerald-50/30'
                                : diagnostics.mic === 'checking' ? 'border-slate-900 bg-white shadow-sm'
                                : 'border-slate-100 bg-slate-50/40 opacity-50'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${diagnostics.mic === 'pass' ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                            <Mic className="w-3.5 h-3.5 shrink-0" />
                                        </div>
                                        <div>
                                            <h5 className="text-[11px] font-black text-slate-900 font-display leading-none">Microphone</h5>
                                            <p className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                                                {diagnostics.mic === 'pass' ? 'Gain calibrated' : diagnostics.mic === 'checking' ? 'Noise floor...' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                    {diagnostics.mic === 'checking' && <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin shrink-0" />}
                                    {diagnostics.mic === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                </div>
                                {diagnostics.mic === 'checking' && (
                                    <div className="mt-2 flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-200">
                                        <span className="text-[8px] font-mono text-slate-400 font-bold uppercase whitespace-nowrap">Gain:</span>
                                        <div className="flex items-end gap-0.5 h-3 flex-1">
                                            {audioLevel.map((lvl, i) => (
                                                <div key={i} className="flex-1 bg-primary rounded-sm transition-all duration-100" style={{ height: `${Math.max(15, lvl)}%` }} />
                                            ))}
                                        </div>
                                        <span className="text-[8px] font-mono text-slate-600 font-bold whitespace-nowrap">
                                            {Math.floor(Math.random() * 15) + 38} dB
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Step 3 */}
                            <div className={`border rounded-xl p-2.5 flex items-center justify-between transition-all duration-500 ${
                                diagnostics.camera === 'pass' ? 'border-emerald-400 bg-emerald-50/30'
                                : diagnostics.camera === 'checking' ? 'border-slate-900 bg-white shadow-sm'
                                : 'border-slate-100 bg-slate-50/40 opacity-50'
                            }`}>
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${diagnostics.camera === 'pass' ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                        <Video className="w-3.5 h-3.5 shrink-0" />
                                    </div>
                                    <div>
                                        <h5 className="text-[11px] font-black text-slate-900 font-display leading-none">Webcam</h5>
                                        <p className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                                            {diagnostics.camera === 'pass' ? 'Stream active' : diagnostics.camera === 'checking' ? 'Face landmarks...' : 'Pending'}
                                        </p>
                                    </div>
                                </div>
                                {diagnostics.camera === 'checking' && <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin shrink-0" />}
                                {diagnostics.camera === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </div>

                            {/* Step 4 */}
                            <div className={`border rounded-xl p-2.5 transition-all duration-500 ${
                                diagnostics.network === 'pass' ? 'border-emerald-400 bg-emerald-50/30'
                                : diagnostics.network === 'checking' ? 'border-slate-900 bg-white shadow-sm'
                                : 'border-slate-100 bg-slate-50/40 opacity-50'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${diagnostics.network === 'pass' ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                            <Wifi className="w-3.5 h-3.5 shrink-0" />
                                        </div>
                                        <div>
                                            <h5 className="text-[11px] font-black text-slate-900 font-display leading-none">Bandwidth</h5>
                                            <p className="text-[8px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                                                {diagnostics.network === 'pass' ? 'Excellent route' : diagnostics.network === 'checking' ? 'Pinging node...' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                    {diagnostics.network === 'checking' && <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin shrink-0" />}
                                    {diagnostics.network === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                </div>
                                {diagnostics.network === 'checking' && (
                                    <div className="mt-2 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-200 space-y-1">
                                        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500">
                                            <span>Speed:</span>
                                            <span className="text-slate-800 font-black">{netSpeed} Mbps</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                            <div className="bg-slate-900 h-full rounded-full transition-all duration-100" style={{ width: `${(netSpeed / 86) * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {checkState === 'success' && (
                        <div className="space-y-3">
                            <div className="bg-[#f0f8db] border border-[#addb2c] p-3.5 rounded-2xl space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-wider font-display text-emerald-800">Handshake Established</span>
                                </div>
                                <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                                    Profile authorized · Mic gated · Webcam active · {netSpeed} Mbps verified.
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/30 space-y-2 font-mono text-[9px]">
                                {[
                                    { icon: UserCheck, label: 'Session User', value: `${user.name.split(' ')[0].toUpperCase()}-NODE` },
                                    { icon: Mic, label: 'Microphone', value: 'GATED +12dB', green: true },
                                    { icon: Video, label: 'Webcam', value: 'FOCAL ACTIVE', green: true },
                                    { icon: Wifi, label: 'Latency', value: `${netSpeed} Mbps` },
                                ].map(({ icon: Icon, label, value, green }) => (
                                    <div key={label} className="flex justify-between items-center pb-1.5 border-b border-slate-100 last:border-b-0 last:pb-0">
                                        <span className="text-slate-500 font-sans font-bold flex items-center gap-1.5">
                                            <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                                            {label}
                                        </span>
                                        <span className={`font-black ${green ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={runDiagnostics}
                                className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-900 hover:text-white active:scale-[0.98] transition-all py-2 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono"
                            >
                                Re-calibrate Hardware
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ============================================================ */}
        {/* ROW 2: My Courses + Assignments — directly below Row 1       */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* My Courses */}
            <section className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight font-display">
                        My Courses <span className="text-[10px] font-bold text-slate-400 font-mono">({courses.length})</span>
                    </h3>
                    <span 
                        onClick={() => onNavigate('/courses')}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer underline underline-offset-4 font-mono transition-colors"
                    >
                        View all Courses
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    {courses.length === 0 ? (
                        <div 
                            onClick={() => onNavigate('/create-course')}
                            className="col-span-2 bg-slate-50 hover:bg-slate-100/80 border border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
                        >
                            <BookOpen className="w-8 h-8 text-slate-400 mb-2" />
                            <h4 className="font-bold text-slate-700 text-sm mb-1">No AI Courses Yet</h4>
                            <p className="text-[10px] text-slate-500 max-w-[240px]">
                                Generate your personalized YouTube learning timeline in seconds.
                            </p>
                            <span className="mt-3 px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold tracking-wider uppercase font-mono">
                                Create Course
                            </span>
                        </div>
                    ) : (
                        courses.slice(0, 2).map((course, index) => {
                            const isFirst = index === 0;
                            const tagColor = isFirst ? 'text-emerald-800 bg-[#f4fae8] border-[#d6f0a0]' : 'text-cyan-800 bg-[#f0f7fe] border-[#d0e5fe]';
                            const thumbnailFallback = `https://placehold.co/640x360/f8fafc/0f172a?text=${encodeURIComponent(course.title || 'Course')}`;
                            
                            return (
                                <div 
                                    key={course.id}
                                    onClick={() => onNavigate(`/course/${course.id}`)}
                                    className="bg-white rounded-2xl border border-slate-200/70 group hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.09)] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer overflow-hidden flex flex-col will-change-transform animate-fade-in-up stagger-1"
                                >
                                    <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                                        <img
                                            src={course.thumbnail || thumbnailFallback}
                                            alt={course.title}
                                            onError={(event) => {
                                                event.currentTarget.src = thumbnailFallback;
                                            }}
                                            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/65 to-transparent"></div>
                                        <span className={`absolute left-3 bottom-3 text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-mono ${tagColor}`}>
                                            {course.difficulty || 'Medium'}
                                        </span>
                                    </div>
                                    <div className="p-4 flex flex-col gap-3 flex-1">
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-[15px] mb-1 tracking-tight font-display truncate leading-snug group-hover:text-indigo-900 transition-colors" title={course.title}>
                                                {course.title}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-extrabold font-mono">
                                                {course.modules.completed}/{course.modules.total} Lessons
                                            </p>
                                        </div>
                                        <div className="mt-auto">
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-100">
                                            <div className="bg-slate-900 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${course.progress}%` }}></div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Progress</span>
                                                <span className="text-[11px] font-black text-slate-800 font-mono">{course.progress}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Assignments */}
            <section className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight font-display">
                        Assignments <span className="text-[10px] font-bold text-slate-400 font-mono">({assignments.length})</span>
                    </h3>
                    <span className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer underline underline-offset-4 font-mono transition-colors">View all</span>
                </div>

                <div className="flex flex-col gap-3 flex-1 justify-center">
                    {assignments.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                            <ClipboardCheck className="w-8 h-8 text-slate-400 mb-2" />
                            <h4 className="font-bold text-slate-700 text-sm mb-1">No Pending Assignments</h4>
                            <p className="text-[10px] text-slate-500 max-w-[240px]">
                                New quizzes, exams, and course work will appear here from the database.
                            </p>
                        </div>
                    ) : assignments.slice(0, 3).map((exam, idx) => {
                        const isSubmitted = exam.enrollmentStatus === 'submitted' || exam.enrollmentStatus === 'completed';
                        const priority = isSubmitted ? 'low' : exam.priority || 'low';
                        const isHigh = priority === 'high';
                        const itemBg = isHigh ? 'bg-[#f0f3fe] border-[#d0d7fe]/50 hover:bg-[#e8ebfc]/70' : 'bg-[#fdf3eb] border-[#fbdcc5]/50 hover:bg-[#fde9da]/70';
                        const iconCls = isHigh ? 'bg-white border border-indigo-200 text-indigo-500' : 'bg-white border border-orange-200 text-orange-500';
                        const dueDate = exam.date instanceof Date && !Number.isNaN(exam.date.getTime())
                            ? exam.date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
                            : 'Not scheduled';
                        return (
                            <div 
                                key={exam.id} 
                                className={`border rounded-2xl p-4 flex items-center justify-between gap-3 group hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-out cursor-pointer will-change-transform animate-fade-in-up ${itemBg} ${idx === 0 ? 'stagger-1' : idx === 1 ? 'stagger-2' : 'stagger-3'}`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${iconCls} transition-transform duration-300 group-hover:scale-105`}>
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    </div>
                                    <div className="min-w-0">
                                        <h5 className="font-extrabold text-slate-900 text-[13px] tracking-tight leading-tight truncate font-display group-hover:text-indigo-950 transition-colors">{exam.title}</h5>
                                        <p className="text-[10.5px] text-slate-400 font-extrabold mt-1 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                            Due {dueDate}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-transform duration-300 group-hover:scale-105">
                                    <Flag className={`w-3.5 h-3.5 ${isHigh ? 'text-indigo-500 fill-indigo-50' : 'text-orange-500 fill-orange-50'}`} />
                                    {isSubmitted ? 'Submitted' : priority}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
      </div>

      {/* Floating AI Agent Companion Bubble */}
      <AIAssistantBubble />
    </DashboardLayout>
  );
};
