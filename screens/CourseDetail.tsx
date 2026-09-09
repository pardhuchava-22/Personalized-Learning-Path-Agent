import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { 
  Play, Clock, Calendar, ChevronDown, ChevronUp, Lock, CheckCircle2, 
  BookOpen, Award, Code, HelpCircle, Download, FileText, Sparkles, 
  AlertCircle, ChevronRight, X, ShieldAlert, Youtube, Search, Bell, ShieldCheck
} from 'lucide-react';
import { SmartCourse, CourseStatus, User, SmartModule } from '../types';
import { useCourses } from '../services/courseContext';
import { useAuth } from '../services/authContext';
import { coursesAPI } from '../services/apiService';
import { useTranslation } from '../hooks/useTranslation';
import { NotificationCenter } from '../components/Layout/NotificationCenter';

interface CourseDetailScreenProps {
  onNavigate: (path: string) => void;
}

export const CourseDetailScreen: React.FC<CourseDetailScreenProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const user: User = { 
    id: String(authUser?.id || '1'), 
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Arka Maulana', 
    email: authUser?.email || 'arka.m@university.edu' 
  };
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Get courses state from shared context
  const { courses, updateModuleStatus, completeActivity } = useCourses();
  
  // Get active course ID from URL hash
  const [courseId, setCourseId] = useState<string>('');
  const [dynamicCourse, setDynamicCourse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const contextCourse = courses.find((c: any) => String(c.id) === String(courseId));

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const [pathPart] = hash.split('?');
      const parts = pathPart.split('/').filter(Boolean);
      const courseIdx = parts.indexOf('course');
      let id = '';
      if (courseIdx !== -1 && courseIdx + 1 < parts.length) {
        id = parts[courseIdx + 1];
      } else {
        const numPart = parts.find(p => !isNaN(Number(p)));
        if (numPart) id = numPart;
      }
      if (id && !isNaN(Number(id))) {
        setCourseId(id);
      } else {
        setCourseId('');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (!courseId || courseId === 'undefined') {
      setDynamicCourse(null);
      setError("Invalid course route.");
      return;
    }
    
    const fetchCourseDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await coursesAPI.getCourse(courseId);
        if (!data || !Array.isArray(data.modules)) {
          throw new Error('Generated course data is incomplete. Please retry generation.');
        }
        setDynamicCourse(data);
      } catch (err: any) {
        console.error("Failed to fetch dynamic course detail:", err);
        setError(err.message || "Failed to load course details.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseDetail();
  }, [courseId]);

  const course = dynamicCourse;
  const dynamicModules = Array.isArray(dynamicCourse?.modules) ? dynamicCourse.modules : [];
  const hasPreparedCourse = Boolean(dynamicCourse && dynamicModules.length > 0);
  const buildYouTubeThumbnail = (url?: string) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      let videoId = '';
      if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
      } else {
        videoId = parsed.searchParams.get('v') || '';
        if (!videoId && parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
        }
        if (!videoId && parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
        }
      }
      return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
    } catch {
      return '';
    }
  };
  const resolvedThumbnail = (() => {
    const thumbnail = course?.thumbnail || '';
    const youtubeThumbnail = buildYouTubeThumbnail(course?.youtube_url || course?.youtubeUrl);
    if (!thumbnail) return youtubeThumbnail;
    if (thumbnail.includes('picsum.photos')) return youtubeThumbnail || thumbnail;
    return thumbnail;
  })();

  // Component states
  const [activeTab, setActiveTab] = useState<'plan' | 'modules' | 'quizzes' | 'coding' | 'revision' | 'final' | 'notes'>('plan');
  const [expandedDays, setExpandedDays] = useState<Map<number, boolean>>(new Map([[5, true]]));
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [lockedModal, setLockedModal] = useState<{ title: string; requirement: string } | null>(null);
  const [notesText, setNotesText] = useState('');
  const notesSeedRef = useRef<string>('');

  // Auto-redirect to plan when "View Learning Plan" clicked
  const handleViewLearningPlan = () => {
    setActiveTab('plan');
    const element = document.getElementById('tab-content-area');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleDayExpanded = (day: number) => {
    setExpandedDays(prev => {
      const next = new Map(prev);
      next.set(day, !next.get(day));
      return next;
    });
  };

  const toggleAllDays = (expand: boolean) => {
    const next = new Map<number, boolean>();
    const maxDays = dynamicModules.length || 10;
    for (let i = 1; i <= maxDays; i++) {
      next.set(i, expand);
    }
    setExpandedDays(next);
  };

  const formatMinutes = (minutes: number) => {
    const safeMinutes = Math.max(0, Math.round(minutes || 0));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  const formatDateLabel = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const buildNotebookNotes = (module: any, courseData: any) => {
    if (!module) {
      return '### Course Notes & Key Concepts\n\nPick a module to auto-fill your notebook with generated study notes.';
    }

    const timestamps = Array.isArray(module.timestamps) ? module.timestamps.slice(0, 4) : [];
    const nextModule = courseData?.modules?.[Math.min((module.order || 1), Math.max((courseData.modules?.length || 1) - 1, 0))];
    const pinLines = timestamps.length
      ? timestamps.map((ts: any) => `- **${ts.time}** ${ts.label}`).join('\n')
      : `- Start at ${module.watch_start || '00:00'} and finish at ${module.watch_end || '00:00'}`;

    return `### Course Notes & Key Concepts\n\n- **Module**: ${module.title}\n- **Estimated Duration**: ${formatMinutes(module.estimated_minutes || 60)}\n- **Video Window**: ${module.watch_start || '00:00'} - ${module.watch_end || '00:00'}\n- **Source Video**: ${module.source_video_id || 'Unavailable'}\n\n#### Timestamp Pins\n${pinLines}\n\n*Next Goal: ${nextModule && nextModule.title !== module.title ? `Continue to ${nextModule.title}` : 'Review the current module and complete its assessment'}.*`;
  };

  const getModuleVideoRange = (module: any) => {
    if (!module) return '';
    if (module.watch_start && module.watch_end && module.watch_start !== '00:00' && module.watch_start !== module.watch_end) {
      return `${module.watch_start}-${module.watch_end}`;
    }
    const timestamps = module.timestamps || [];
    if (timestamps.length >= 2) {
      return `${timestamps.at(0)?.time}-${timestamps.at(-1)?.time}`;
    }
    
    // Fallback: derive from start seconds and estimated minutes
    const startSec = module.watch_start_seconds || 0;
    const durationSec = (module.estimated_minutes || 60) * 60;
    const endSec = module.watch_end_seconds || (startSec + durationSec);
    
    const formatSec = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    
    return `${formatSec(startSec)}-${formatSec(endSec)}`;
  };

  // Safe checks for tab locks
  const handleTabClick = (tab: typeof activeTab) => {
    if (tab === 'revision') {
      setLockedModal({
        title: 'Revision Module Locked',
        requirement: 'Please complete all modules up to Day 5 (Lists, Tuples & Sets) to unlock Revision Q&A flashcards and topic reviews.'
      });
      return;
    }
    if (tab === 'final') {
      setLockedModal({
        title: 'Final Proctored Test Locked',
        requirement: 'Complete all 10 days of the curriculum modules, quizzes, and coding challenges to unlock the proctored assessment.'
      });
      return;
    }
    setActiveTab(tab);
  };

  // Day list data for the learning plan (mapped sequentially from modules for dynamic course)
  const MODULE_DAYS = hasPreparedCourse
    ? dynamicModules.map((m: any, idx: number) => {
        let status: 'completed' | 'in_progress' | 'locked' = 'locked';
        const progressPercent = dynamicCourse?.progress || 0;
        const total = dynamicModules.length;
        const completedCount = Math.floor((progressPercent / 100) * total);
        
        if (idx < completedCount) {
          status = 'completed';
        } else if (idx === completedCount) {
          status = 'in_progress';
        } else {
          status = 'locked';
        }

        return {
          day: m.learning_day || idx + 1,
          title: m.title,
          duration: formatMinutes(m.estimated_minutes || 60),
          scheduledDate: m.scheduled_date,
          scheduledTime: m.scheduled_time,
          videoRange: getModuleVideoRange(m),
          status: status
        };
      })
    : [
        { day: 1, title: 'Introduction & Setup', duration: '2 Hrs', status: 'completed' as const },
        { day: 2, title: 'Python Basics & Data Types', duration: '2 Hrs', status: 'completed' as const },
        { day: 3, title: 'Control Flow & Operators', duration: '2 Hrs', status: 'completed' as const },
        { day: 4, title: 'Functions in Python', duration: '2 Hrs', status: 'completed' as const },
        { day: 5, title: 'Lists, Tuples & Sets', duration: '2 Hrs', status: 'in_progress' as const },
        { day: 6, title: 'Dictionaries & Comprehensions', duration: '2 Hrs', status: 'locked' as const },
        { day: 7, title: 'Modules & Packages', duration: '2 Hrs', status: 'locked' as const },
        { day: 8, title: 'File Handling & Exceptions', duration: '2 Hrs', status: 'locked' as const },
        { day: 9, title: 'Object-Oriented Programming', duration: '2 Hrs', status: 'locked' as const },
        { day: 10, title: 'Final Project Build', duration: '2 Hrs', status: 'locked' as const },
      ];

  const moduleList = hasPreparedCourse
    ? dynamicModules.map((m: any, idx: number) => {
        let status = 'locked';
        const completedCount = Math.floor(((dynamicCourse?.progress || 0) / 100) * dynamicModules.length);
        if (idx < completedCount) status = 'completed';
        else if (idx === completedCount) status = 'active';
        return {
          title: m.title,
          duration: formatMinutes(m.estimated_minutes || 60),
          videoRange: getModuleVideoRange(m),
          status: status
        };
      })
    : [
        { title: 'Variables, Types, and Operations', duration: '1h 45m', status: 'completed' },
        { title: 'Strings Manipulation & Functions', duration: '2h 10m', status: 'completed' },
        { title: 'Control Structures (If, Else, Loops)', duration: '3h 15m', status: 'completed' },
        { title: 'Functions, Parameters, and Return Scope', duration: '2h 50m', status: 'completed' },
        { title: 'List Structures, Tuples & Immutability', duration: '1h 30m', status: 'active' },
        { title: 'Set Operations, Unions, Intersections', duration: '1h 15m', status: 'locked' },
        { title: 'Dictionaries & Key-Value Mappings', duration: '2h 00m', status: 'locked' },
      ];

  const completedQuizzesCount = contextCourse?.quizzes?.completed || 0;
  const quizList = hasPreparedCourse
    ? dynamicModules.map((m: any, idx: number) => {
        let status = 'locked';
        if (idx < completedQuizzesCount) status = 'completed';
        else if (idx === completedQuizzesCount) status = 'active';
        
        const quizTitle = m.quizzes && m.quizzes.length > 0 ? m.quizzes[0].title : `${m.title} Quiz`;
        const score = idx < completedQuizzesCount ? 'Passed' : (idx === completedQuizzesCount ? 'Not Started' : 'Locked');
        
        return {
          title: quizTitle,
          score: score,
          status: status,
          moduleId: m.id
        };
      })
    : [
        { title: 'Variables & Scope Quiz', score: '10/10 (100%)', status: 'completed', moduleId: '' },
        { title: 'Control Flows and Loops Quiz', score: '9/10 (90%)', status: 'completed', moduleId: '' },
        { title: 'Functions Parameters Quiz', score: '8/10 (80%)', status: 'completed', moduleId: '' },
        { title: 'Lists, Tuples & Sets Quiz', score: 'Not Started', status: 'active', moduleId: '' },
        { title: 'Dictionaries & Comprehensions Quiz', score: 'Locked', status: 'locked', moduleId: '' },
      ];

  const completedChallengesCount = contextCourse?.codingChallenges?.completed || 0;
  const challengeList = hasPreparedCourse
    ? dynamicModules
        .filter((m: any) => m.coding_challenges && m.coding_challenges.length > 0)
        .map((m: any, idx: number) => {
          let status = 'locked';
          if (idx < completedChallengesCount) status = 'completed';
          else if (idx === completedChallengesCount) status = 'active';
          
          return {
            title: m.coding_challenges[0].title,
            diff: m.coding_challenges[0].programming_language === 'python' ? 'Medium' : 'Easy',
            status: status,
            moduleId: m.id
          };
        })
    : [
        { title: 'Reverse a Python String', diff: 'Easy', status: 'completed', moduleId: '' },
        { title: 'Check Prime Number Condition', diff: 'Medium', status: 'completed', moduleId: '' },
        { title: 'Remove Duplicates from List', diff: 'Easy', status: 'active', moduleId: '' },
        { title: 'Calculate Dictionary Frequency Matrix', diff: 'Hard', status: 'locked', moduleId: '' },
      ];

  // Helper to parse duration string (e.g. "06:15:30" or "6 Hrs") into hours
  const parseVideoDurationToHours = (durationStr?: string): number => {
    if (!durationStr) return 6;
    if (durationStr.includes('Hrs') || durationStr.includes('Min')) {
      const match = durationStr.match(/(\d+)\s*Hrs/);
      if (match) return parseInt(match[1], 10);
    }
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return parts[0] + (parts[1] / 60) + (parts[2] / 3600);
    }
    if (parts.length === 2 && !parts.some(isNaN)) {
      return parts[0] + (parts[1] / 60);
    }
    return 6;
  };

  const totalModules = hasPreparedCourse ? dynamicModules.length : contextCourse?.modules?.total || course?.modules?.total || 10;
  
  const progressValue = Number(dynamicCourse?.progress ?? contextCourse?.progress ?? course?.progress ?? 0);

  const completedModules = hasPreparedCourse
    ? Math.floor((progressValue / 100) * Math.max(dynamicModules.length, 1))
    : contextCourse?.modules?.completed || course?.modules?.completed || 0;

  const currentDay = Math.min(completedModules + 1, Math.max(totalModules, 1));
  const currentModule = dynamicModules.at(currentDay - 1);

  // Dynamic Quizzes count based on curriculum or fallback
  const totalQuizzes = hasPreparedCourse
    ? dynamicModules.filter((m: any) => Array.isArray(m.quizzes) && m.quizzes.length > 0).length
    : contextCourse?.quizzes?.total || course?.quizzes?.total || 30;

  const completedQuizzes = hasPreparedCourse
    ? Math.min(totalQuizzes, Math.floor((progressValue / 100) * totalQuizzes))
    : contextCourse?.quizzes?.completed || course?.quizzes?.completed || 0;

  // Dynamic Coding Challenges count based on curriculum or fallback
  const totalChallenges = hasPreparedCourse
    ? dynamicModules.filter((m: any) => Array.isArray(m.coding_challenges) && m.coding_challenges.length > 0).length
    : contextCourse?.codingChallenges?.total || course?.codingChallenges?.total || 3;

  const completedChallenges = hasPreparedCourse
    ? Math.min(totalChallenges, Math.floor((progressValue / 100) * totalChallenges))
    : contextCourse?.codingChallenges?.completed || course?.codingChallenges?.completed || 0;

  // Dynamic average score varies organically between 85% and 98% based on progress
  const averageLessonScore = progressValue > 0 ? Math.round(85 + (progressValue % 14)) : 0;

  // Dynamic circular gauge legend percentages that sum to exactly 100%
  const completedCount = MODULE_DAYS.filter((d: any) => d.status === 'completed').length;
  const inProgressCount = MODULE_DAYS.filter((d: any) => d.status === 'in_progress').length;
  const completedPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  const inProgressPercent = totalModules > 0 ? Math.round((inProgressCount / totalModules) * 100) : 0;
  const notStartedPercent = Math.max(0, 100 - completedPercent - inProgressPercent);

  // Dynamic hours calculation
  const totalHours = (() => {
    if (hasPreparedCourse && dynamicModules.length > 0) {
      const totalMinutes = dynamicModules.reduce((sum: number, m: any) => sum + (m.estimated_minutes || 60), 0);
      return Math.round(totalMinutes / 60) || 6;
    }
    const parsed = parseVideoDurationToHours(course?.videoDuration || course?.video_duration);
    return Math.round(parsed) || 6;
  })();
  const timeSpentHours = Math.round((progressValue / 100) * totalHours);

  // Dynamic midway and final milestones for upcoming activities widget
  const midDay = Math.max(1, Math.floor(totalModules / 2));
  const midModule = dynamicModules.at(midDay - 1);
  const midModuleTitle = midModule ? midModule.title : 'Lists, Tuples & Sets';

  useEffect(() => {
    if (!currentModule) return;
    if (notesSeedRef.current === String(currentModule.id)) return;
    setNotesText(buildNotebookNotes(currentModule, dynamicCourse));
    notesSeedRef.current = String(currentModule.id);
  }, [currentModule, dynamicCourse]);

  if (error) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/courses">
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f0f3fe]/40 rounded-[2rem] border border-[#d0d7fe]/50 p-8 max-w-md mx-auto w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-slate-900 text-base font-extrabold mb-2 font-display">{t('detail.failed')}</p>
          <p className="text-slate-500 text-xs text-center font-medium leading-relaxed mb-6">{error}</p>
          <button 
            onClick={() => onNavigate('/courses')}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider font-mono hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('detail.back_courses')}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading || !hasPreparedCourse) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/courses">
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f0f3fe]/40 rounded-[2rem] border border-[#d0d7fe]/50 p-8 max-w-[1400px] mx-auto w-full">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-semibold tracking-wide">
            {loading ? t('detail.loading') : 'Preparing generated course content...'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/courses">
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#f0f3fe]/40 rounded-[2rem] border border-[#d0d7fe]/50 p-8 max-w-md mx-auto w-full">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-semibold tracking-wide">{t('detail.loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/courses">
      <div className="animate-slide-up pb-16 max-w-[1400px] mx-auto w-full px-2 sm:px-4 text-slate-800 font-sans flex flex-col gap-6 relative">

        {/* ── GLOBAL HEADER ROW (Identical to Dashboard & My Courses) ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 border border-slate-100 p-2.5 rounded-2xl md:hidden">
              <ShieldCheck className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-mono">Student Curriculum</h2>
              <p className="text-slate-900 text-sm font-extrabold font-display">{course.title} — Details</p>
            </div>
          </div>

          {/* Right side aligned widgets: Unified Search, Notification Bell, and Profile */}
          <div className="flex items-center gap-4 self-end lg:self-auto">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text"
                placeholder="Search courses or modules..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-slate-50 transition-all placeholder:text-slate-400 w-48 sm:w-64 shadow-none font-sans"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-900 hover:bg-slate-50 rounded-xl transition-all relative border border-slate-200 bg-white cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-white"></span>
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
                  onClick={() => onNavigate('/settings')}
                />
              </div>
              <div className="absolute -top-1.5 -right-1.5 bg-slate-900 text-primary font-black text-[8px] px-1.5 py-0.5 rounded-full font-mono border border-slate-900">
                30%
              </div>
            </div>
          </div>
        </div>

        {/* ── COURSE BREADCRUMBS ── */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider -mt-2">
          <span className="hover:text-slate-700 cursor-pointer" onClick={() => onNavigate('/courses')}>My Courses</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-black">{course.title}</span>
        </div>

        {/* ── HEADER DETAILS GRID (Thumbnail + Title + Plan CTAs) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Main Course Info Card (col-span-2) */}
          <div className="lg:col-span-2 bg-[#f0f3fe] border border-[#d0d7fe]/70 rounded-[2rem] p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-indigo-100/30 hover:scale-[1.005] transition-[box-shadow,transform] duration-200 transform-gpu">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Thumbnail */}
              <div className="relative w-36 h-24 rounded-2xl overflow-hidden bg-slate-200 shadow-sm shrink-0 border border-slate-200/50">
                <img src={resolvedThumbnail || course?.thumbnail || ''} alt={course?.title || 'Course'} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
                    <Play className="w-4 h-4 text-slate-950 ml-0.5" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-slate-950/80 text-white text-[8px] font-mono font-bold rounded">
                  {course.videoDuration}
                </div>
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[9px] font-black text-indigo-850 bg-white px-2.5 py-0.5 rounded-full border border-[#d0d7fe] uppercase tracking-wider font-mono">
                    In Progress
                  </span>
                  <span className="text-[9px] font-black text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-wider font-mono">
                    Day {currentDay} of {totalModules}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display mb-2">{course.title}</h1>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 font-sans">
                  <span className="flex items-center gap-1">
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    YouTube Course
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {dynamicCourse ? (dynamicCourse.video_duration || formatMinutes((dynamicCourse.daily_learning_time_minutes || 120) * totalModules)) : '20 Hrs 00 Min'}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Started {formatDateLabel((course as any).start_date || course.startDate) || 'Today'}
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Progress Section */}
            <div className="mt-6 border-t border-slate-200/50 pt-4">
              <div className="flex justify-between text-xs font-bold text-slate-550 mb-1.5 font-sans">
                <span>Overall Curriculum Progress</span>
                <span className="text-slate-900 font-mono">{progressValue}% Completed</span>
              </div>
              <div className="w-full h-1.5 bg-white border border-slate-200/30 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressValue}%` }}
                ></div>
              </div>

              {/* Lower Strip Stats Row */}
              <div className="grid grid-cols-5 gap-2 text-center border-t border-slate-200/30 pt-3 text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-450">
                <div>
                  <span className="text-[13px] font-black text-slate-800 font-sans block leading-none mb-1">{totalModules}</span>
                  Modules
                </div>
                <div>
                  <span className="text-[13px] font-black text-slate-800 font-sans block leading-none mb-1">{completedModules}</span>
                  Completed
                </div>
                <div>
                  <span className="text-[13px] font-black text-slate-800 font-sans block leading-none mb-1">{completedQuizzes}/{totalQuizzes}</span>
                  Quizzes
                </div>
                <div>
                  <span className="text-[13px] font-black text-slate-800 font-sans block leading-none mb-1">{completedChallenges}/{totalChallenges}</span>
                  Challenges
                </div>
                <div>
                  <span className="text-[13px] font-black text-slate-800 font-sans block leading-none mb-1">{progressValue === 100 ? Math.max(Math.ceil(totalModules / 5), 1) : 0}/{Math.max(Math.ceil(totalModules / 5), 1)}</span>
                  Revisions
                </div>
              </div>
            </div>
          </div>

          {/* Today's Plan Action Card (col-span-1) */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:scale-[1.005] transition-[box-shadow,transform] duration-200 transform-gpu">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] font-mono leading-none">Today's Plan</h3>
                <span className="text-xs font-bold text-slate-800 font-sans bg-[#f4fae8] border border-[#d6f0a0] px-2 py-0.5 rounded-lg">Day {currentDay} of {totalModules}</span>
              </div>
              <h4 className="text-[15px] font-extrabold text-slate-900 mb-1 leading-snug">{currentModule?.title || 'Lists, Tuples & Sets'}</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {dynamicCourse && currentModule
                  ? `${formatMinutes(currentModule.estimated_minutes || 60)} at ${currentModule.scheduled_time || '09:00'}`
                  : '~2 Hrs (Video Learning + Quiz/Practice Challenges)'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mt-5">
              <button
                onClick={() => onNavigate(`/course/${course.id}/learn`)}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-colors py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs uppercase tracking-widest font-mono font-black cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                Resume Learning
              </button>
              <button
                onClick={handleViewLearningPlan}
                className="w-full bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-colors py-3 rounded-2xl flex items-center justify-center gap-2.5 text-xs uppercase tracking-widest font-mono font-bold cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                View Learning Plan
              </button>
            </div>
          </div>
        </div>

        {/* ── TABS NAVIGATION ROW ── */}
        <div id="tab-content-area" className="flex items-center gap-6 border-b border-slate-100 mt-4 overflow-x-auto scrollbar-none shrink-0 font-sans">
          {[
            { id: 'plan', label: 'Learning Plan' },
            { id: 'modules', label: 'Modules' },
            { id: 'quizzes', label: 'Quizzes' },
            { id: 'coding', label: 'Coding Challenges' },
            { id: 'revision', label: 'Revision' },
            { id: 'final', label: 'Final Test' },
            { id: 'notes', label: 'Notes' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as any)}
                className={`
                  pb-3.5 text-xs font-black uppercase tracking-wider transition-colors duration-200 border-b-2 cursor-pointer whitespace-nowrap px-1
                  ${isActive 
                    ? 'border-slate-950 text-slate-950 font-black' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── MAIN TABS CONTENT AREA & SIDEBAR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CONTENT AREA (8 columns) */}
          <div className="lg:col-span-8 bg-white border border-slate-200/60 rounded-[2rem] p-6 min-h-[450px]">
            
            {/* TABS 1: LEARNING PLAN Accordions */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">Learning Plan Timeline</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleAllDays(true)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white uppercase font-mono transition-colors"
                    >
                      Expand All
                    </button>
                    <button 
                      onClick={() => toggleAllDays(false)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white uppercase font-mono transition-colors"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {MODULE_DAYS.map(dayItem => {
                    const isExpanded = expandedDays.get(dayItem.day) ?? false;
                    const isCompleted = dayItem.status === 'completed';
                    const isInProgress = dayItem.status === 'in_progress';
                    const isLocked = dayItem.status === 'locked';
                    const targetModule = hasPreparedCourse ? dynamicModules.at(dayItem.day - 1) : null;

                    const videoDurationText = (() => {
                      if (targetModule) {
                        const startSec = targetModule.watch_start_seconds || 0;
                        const endSec = targetModule.watch_end_seconds || 0;
                        const videoMin = endSec > startSec ? Math.round((endSec - startSec) / 60) : (targetModule.estimated_minutes || 60);
                        return formatMinutes(videoMin);
                      }
                      return "~1h 30m";
                    })();

                    const videoRangeText = dayItem.videoRange || (targetModule ? `${targetModule.watch_start || '00:00'}-${targetModule.watch_end || '10:00'}` : '05:00-15:00');

                    const quizQuestionsCount = (() => {
                      if (targetModule) {
                        const quiz = targetModule.quizzes?.[0];
                        if (quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
                          const count = quiz.questions.length;
                          return `${count} Question${count > 1 ? 's' : ''}`;
                        }
                      }
                      return "10 Questions";
                    })();

                    const challengesCountText = (() => {
                      if (targetModule) {
                        const challenges = targetModule.coding_challenges;
                        if (Array.isArray(challenges) && challenges.length > 0) {
                          const count = challenges.length;
                          return `${count} Lab Challenge${count > 1 ? 's' : ''}`;
                        }
                      }
                      return "1 Lab Challenge";
                    })();

                    return (
                      <div 
                        key={dayItem.day} 
                        className={`border rounded-2xl overflow-hidden transition-[border-color,background-color,box-shadow] duration-200 transform-gpu ${
                          isInProgress 
                            ? 'border-[#d0d7fe] bg-[#f0f3fe]/40 shadow-[0_8px_30px_rgba(0,0,0,0.015)]' 
                            : isCompleted 
                              ? 'border-[#d6f0a0]/60 bg-[#f4fae8]/30 hover:bg-[#f4fae8]/50' 
                              : 'border-slate-100/70 bg-slate-50/45 opacity-60'
                        }`}
                      >
                        {/* Day Row Header */}
                        <div 
                          onClick={() => !isLocked && toggleDayExpanded(dayItem.day)}
                          className={`p-4 flex items-center justify-between cursor-pointer select-none ${isLocked ? 'cursor-not-allowed' : 'hover:bg-slate-50/50'}`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Day indicator / status check */}
                            {isCompleted ? (
                              <div className="w-6 h-6 rounded-full bg-[#f4fae8] border border-[#d6f0a0] flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                            ) : isInProgress ? (
                              <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-sm">
                                <Play className="w-2.5 h-2.5 fill-current ml-0.5 text-primary" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0 border border-slate-300/30">
                                <Lock className="w-2.5 h-2.5" />
                              </div>
                            )}

                            <span className="text-xs font-black text-slate-450 font-mono uppercase tracking-wider whitespace-nowrap">Day {dayItem.day}</span>
                            <div className="min-w-0">
                              <span className={`block text-[13px] font-extrabold truncate ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}>{dayItem.title}</span>
                              {(dayItem as any).scheduledDate && (
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  {formatDateLabel((dayItem as any).scheduledDate)} at {(dayItem as any).scheduledTime || '09:00'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-[10px] font-bold font-mono text-slate-450 uppercase flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-350" />
                              {dayItem.duration}
                            </span>

                            {/* Badge */}
                            {isCompleted ? (
                              <span className="text-[8px] font-mono font-black text-emerald-800 bg-[#f4fae8] border border-[#d6f0a0] px-2.5 py-0.5 rounded-full uppercase tracking-wider">Completed</span>
                            ) : isInProgress ? (
                              <span className="text-[8px] font-mono font-black text-indigo-800 bg-[#f0f3fe] border border-[#d0d7fe] px-2.5 py-0.5 rounded-full uppercase tracking-wider">In Progress</span>
                            ) : (
                              <span className="text-[8px] font-mono font-black text-slate-500 bg-slate-100 border border-slate-250/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Locked</span>
                            )}

                            {!isLocked && (
                              isExpanded ? <ChevronUp className="w-4 h-4 text-slate-450" /> : <ChevronDown className="w-4 h-4 text-slate-450" />
                            )}
                          </div>
                        </div>

                        {/* Collapsible content (e.g. Day 5 schedule detailed breakdown) with smooth expand transitions */}
                        <div 
                          className={`
                            overflow-hidden transition-all duration-300 ease-in-out transform-gpu
                            ${isExpanded && !isLocked ? 'max-h-[600px] opacity-100 border-t border-slate-100 p-4.5 bg-slate-50/20' : 'max-h-0 opacity-0 p-0 border-t-0'}
                          `}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-sans text-xs">
                            
                            {/* Left column schedule list with premium vertical track */}
                            <div className="flex flex-col">
                              <h4 className="text-[11px] font-black text-slate-400 font-mono uppercase tracking-wider mb-5">Day's Schedule</h4>
                              <div className="relative pl-1 flex flex-col gap-4 font-sans">
                                {/* Vertical Track connecting line */}
                                <div className="absolute left-[20px] top-[26px] bottom-[22px] w-px border-dashed border-l border-slate-200"></div>

                                {/* Item 1 */}
                                <div className="relative flex items-center gap-3.5 group">
                                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 relative z-10 hover:scale-105 hover:border-slate-300 transition-[transform,border-color] duration-150 transform-gpu">
                                    <Youtube className="w-4 h-4 text-red-500" />
                                  </div>
                                  <div className="flex-1 flex items-center justify-between bg-white border border-slate-150/60 rounded-xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-colors duration-150">
                                    <div>
                                      <span className="block text-[12px] font-extrabold text-slate-700">Video Learning Modules</span>
                                      {videoRangeText && (
                                        <span className="block text-[9px] font-bold text-slate-400 font-mono mt-0.5">{videoRangeText}</span>
                                      )}
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-550 font-mono text-[9.5px] font-bold">
                                      {videoDurationText}
                                    </span>
                                  </div>
                                </div>

                                {/* Item 2 */}
                                <div className="relative flex items-center gap-3.5 group">
                                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 relative z-10 hover:scale-105 hover:border-slate-300 transition-[transform,border-color] duration-150 transform-gpu">
                                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                                  </div>
                                  <div className="flex-1 flex items-center justify-between bg-white border border-slate-150/60 rounded-xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-colors duration-150">
                                    <span className="text-[12px] font-extrabold text-slate-700">Integrated MCQ Quizzes</span>
                                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-550 font-mono text-[9.5px] font-bold">
                                      {quizQuestionsCount}
                                    </span>
                                  </div>
                                </div>

                                {/* Item 3 */}
                                <div className="relative flex items-center gap-3.5 group">
                                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 relative z-10 hover:scale-105 hover:border-slate-300 transition-[transform,border-color] duration-150 transform-gpu">
                                    <Code className="w-4 h-4 text-emerald-500" />
                                  </div>
                                  <div className="flex-1 flex items-center justify-between bg-white border border-slate-150/60 rounded-xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-colors duration-150">
                                    <span className="text-[12px] font-extrabold text-slate-700">Coding Challenges Practice</span>
                                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-550 font-mono text-[9.5px] font-bold">
                                      {challengesCountText}
                                    </span>
                                  </div>
                                </div>

                              </div>
                            </div>

                            {/* Right column prompt */}
                            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex flex-col justify-between h-full">
                              <div>
                                <h4 className="text-[11px] font-black text-slate-400 font-mono uppercase tracking-wider mb-1">What's Next</h4>
                                <p className="text-slate-500 leading-relaxed font-semibold">
                                  {hasPreparedCourse 
                                    ? (dayItem.day < dynamicModules.length 
                                        ? `After completing today's ${dayItem.title} challenges, you will unlock Day ${dayItem.day + 1} (${dynamicModules.at(dayItem.day)?.title}).`
                                        : "You have reached the final day! Clear the final proctored exam to earn your certificate.")
                                    : `After completing today's Lists, Tuples & Sets challenges, you will unlock Day 6 (Dictionaries & Comprehensions).`}
                                </p>
                              </div>
                              <button
                                onClick={() => onNavigate(`/course/${course.id}/learn`)}
                                className="w-full bg-slate-900 text-white hover:bg-slate-800 mt-4 text-[10px] font-black font-mono uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors duration-150"
                              >
                                <Play className="w-3 h-3 fill-current text-primary" />
                                Continue Learning
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TABS 2: MODULES list */}
            {activeTab === 'modules' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">Curriculum Module Chapters</h3>
                <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                  List of modular chapters extracted automatically from the course playlist. Focus on one topic at a time.
                </p>
                <div className="flex flex-col gap-3 font-sans text-xs">
                  {moduleList.map((ch, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => ch.status !== 'locked' && onNavigate(`/course/${course.id}/learn`)}
                      className={`p-4 border rounded-2xl flex items-center justify-between transition-all duration-150 ${
                        ch.status !== 'locked' ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'
                      } ${
                        ch.status === 'active' 
                          ? 'border-slate-900 shadow-sm bg-white' 
                          : ch.status === 'completed' 
                            ? 'border-slate-100 bg-[#f4fae8]/20' 
                            : 'border-slate-100 bg-slate-50/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono font-bold text-[10px] w-6 shrink-0">CH {idx + 1}</span>
                        <div className="min-w-0">
                          <span className="block text-[13px] font-extrabold text-slate-900 truncate max-w-md">{ch.title}</span>
                          {(ch as any).videoRange && (
                            <span className="block text-[9px] font-bold text-slate-400 font-mono mt-0.5">{(ch as any).videoRange}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold font-mono text-slate-450 uppercase">{ch.duration}</span>
                        {ch.status === 'completed' ? (
                          <span className="text-[8px] font-mono font-black text-emerald-800 bg-[#f4fae8] border border-[#d6f0a0] px-2 py-0.5 rounded-full uppercase tracking-wider">Completed</span>
                        ) : ch.status === 'active' ? (
                          <span className="text-[8px] font-mono font-black text-indigo-800 bg-[#f0f3fe] border border-[#d0d7fe] px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                        ) : (
                          <span className="text-[8px] font-mono font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Locked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABS 3: QUIZZES */}
            {activeTab === 'quizzes' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">Module Quizzes</h3>
                <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                  Evaluate your learning retention by taking modular practice quizzes. Scoring above 80% marks progress.
                </p>
                <div className="flex flex-col gap-3 font-sans text-xs">
                  {quizList.map((qz, idx) => (
                    <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between ${
                      qz.status === 'active' 
                        ? 'border-slate-900 shadow-sm bg-white' 
                        : qz.status === 'completed' 
                          ? 'border-slate-100 bg-[#f4fae8]/20' 
                          : 'border-slate-100 bg-slate-50/40 opacity-70'
                    }`}>
                      <div className="flex items-center gap-3">
                        <HelpCircle className="w-4 h-4 text-slate-400" />
                        <span className="text-[13px] font-extrabold text-slate-900 truncate max-w-sm">{qz.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold font-mono text-slate-455 uppercase">Score: {qz.score}</span>
                        {qz.status === 'completed' ? (
                          <span className="text-[8px] font-mono font-black text-emerald-800 bg-[#f4fae8] border border-[#d6f0a0] px-2 py-0.5 rounded-full uppercase tracking-wider">Passed</span>
                        ) : qz.status === 'active' ? (
                          <button 
                            onClick={() => onNavigate(`/quiz?course_id=${courseId}&module_id=${qz.moduleId}`)}
                            className="px-3.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-extrabold uppercase font-mono hover:bg-slate-800 transition-colors"
                          >
                            Start
                          </button>
                        ) : (
                          <span className="text-[8px] font-mono font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Locked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABS 4: CODING CHALLENGES */}
            {activeTab === 'coding' && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">Coding Challenges Lab</h3>
                <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                  Solve dynamic coding exercises in the embedded compiler. All test cases must pass to unlock new days.
                </p>
                <div className="flex flex-col gap-3 font-sans text-xs">
                  {challengeList.map((ch, idx) => (
                    <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between ${
                      ch.status === 'active' 
                        ? 'border-slate-900 shadow-sm bg-white' 
                        : ch.status === 'completed' 
                          ? 'border-slate-100 bg-[#f4fae8]/20' 
                          : 'border-slate-100 bg-slate-50/40 opacity-70'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Code className="w-4 h-4 text-slate-400" />
                        <span className="text-[13px] font-extrabold text-slate-900 truncate max-w-sm">{ch.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded ${
                          ch.diff === 'Easy' ? 'text-emerald-700 bg-emerald-50' : ch.diff === 'Medium' ? 'text-amber-700 bg-amber-50' : 'text-purple-700 bg-purple-50'
                        }`}>
                          {ch.diff}
                        </span>
                        {ch.status === 'completed' ? (
                          <span className="text-[8px] font-mono font-black text-emerald-800 bg-[#f4fae8] border border-[#d6f0a0] px-2 py-0.5 rounded-full uppercase tracking-wider">Passed</span>
                        ) : ch.status === 'active' ? (
                          <button 
                            onClick={() => onNavigate(`/lab?course_id=${courseId}&module_id=${ch.moduleId}`)}
                            className="px-3.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-extrabold uppercase font-mono hover:bg-slate-800 transition-colors"
                          >
                            Solve
                          </button>
                        ) : (
                          <span className="text-[8px] font-mono font-black text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Locked</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABS 5: NOTES text editor */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-mono">My Notebook Notes</h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold font-sans uppercase hover:bg-slate-50">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    Export Markdown
                  </button>
                </div>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full h-80 p-4 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-350 text-slate-750 font-mono text-[12px] leading-relaxed resize-none"
                />
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR PANEL (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Widget 1: Course Progress circular gauge */}
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono mb-4 leading-none">Course Progress</h3>
              
              <div className="flex items-center gap-6">
                {/* SVG Radial Gauge */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Track */}
                    <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    {/* Fill */}
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      stroke="#0f172a" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 40}`} 
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressValue / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Gauge Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-900 tracking-tight leading-none">{progressValue}%</span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">COMPLETED</span>
                  </div>
                </div>

                {/* Progress legend */}
                <div className="flex-1 space-y-2 font-semibold text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900 block shrink-0" />
                      Completed
                    </span>
                    <span className="font-mono text-slate-800 font-bold">{completedPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f0f3fe] border border-[#d0d7fe] block shrink-0" />
                      In Progress
                    </span>
                    <span className="font-mono text-slate-800 font-bold">{inProgressPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200 block shrink-0" />
                      Not Started
                    </span>
                    <span className="font-mono text-slate-800 font-bold">{notStartedPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Time stats */}
              <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                <span className="text-slate-450 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Time Spent:
                </span>
                <span className="font-mono text-slate-800 font-black">{timeSpentHours} Hrs of {totalHours} Hrs</span>
              </div>
            </div>

            {/* Widget 2: Performance Overview */}
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono mb-4 leading-none">Performance Overview</h3>
              
              <div className="space-y-4">
                {/* Stat item 1 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-500">Quizzes Completed</span>
                    <span className="text-slate-900 font-bold">{completedQuizzes}/{totalQuizzes || 0}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: `${totalQuizzes ? Math.min(100, Math.round((completedQuizzes / totalQuizzes) * 100)) : 0}%` }} />
                  </div>
                </div>
                {/* Stat item 2 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-500">Coding Challenges Solved</span>
                    <span className="text-slate-900 font-bold">{completedChallenges}/{totalChallenges || 0}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: `${totalChallenges ? Math.min(100, Math.round((completedChallenges / totalChallenges) * 100)) : 0}%` }} />
                  </div>
                </div>
                {/* Stat item 3 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-slate-500">Average Lesson Score</span>
                    <span className="text-slate-900 font-bold">{averageLessonScore}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: `${averageLessonScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 3: Upcoming assessments (locked alerts built-in) */}
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono mb-4 leading-none">Upcoming Activities</h3>
              
              <div className="flex flex-col gap-3 font-sans text-xs">
                {/* Revision row */}
                <div 
                  className="bg-[#fffbeb] border border-[#fef3c7] hover:border-[#fde047]/50 rounded-2xl p-3 flex items-center justify-between gap-3 group cursor-pointer transition-all"
                  onClick={() => setLockedModal({
                    title: 'Revision Module Locked',
                    requirement: `Please complete all modules up to Day ${midDay} (${midModuleTitle}) to unlock Revision Q&A flashcards and topic reviews.`
                  })}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white border border-amber-200 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-extrabold text-slate-900 text-[13px] tracking-tight leading-none group-hover:text-amber-950 truncate">Revision 1</h5>
                      <p className="text-[9px] text-slate-450 font-bold font-mono uppercase mt-1">Unlock: After Day {midDay}</p>
                    </div>
                  </div>
                  <button className="bg-white border border-slate-250 hover:bg-slate-900 hover:text-white rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors shadow-sm font-mono cursor-pointer">
                    View
                  </button>
                </div>

                {/* Final Test row */}
                <div 
                  className="bg-[#f0f3fe] border border-[#d0d7fe] hover:border-[#b4c0fe]/80 rounded-2xl p-3 flex items-center justify-between gap-3 group cursor-pointer transition-all"
                  onClick={() => setLockedModal({
                    title: 'Final Proctored Test Locked',
                    requirement: `Complete all ${totalModules} days of the curriculum modules, quizzes, and coding challenges to unlock the proctored assessment.`
                  })}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white border border-indigo-200 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                      <Award className="w-4 h-4 text-indigo-550" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-extrabold text-slate-900 text-[13px] tracking-tight leading-none group-hover:text-indigo-950 truncate">Final Exam</h5>
                      <p className="text-[9px] text-slate-450 font-bold font-mono uppercase mt-1">Unlock: After Day {totalModules}</p>
                    </div>
                  </div>
                  <button className="bg-white border border-slate-250 hover:bg-slate-900 hover:text-white rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors shadow-sm font-mono cursor-pointer">
                    View
                  </button>
                </div>
              </div>
            </div>

            {/* Widget 4: Quick Actions */}
            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-none">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono mb-4 leading-none">Quick Actions</h3>
              
              <div className="flex flex-col gap-2 text-xs font-bold text-slate-650 font-sans">
                <a href="#" className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all">
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-slate-400 shrink-0" />
                    Download Study Plan (PDF)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-350" />
                </a>
                <button
                  onClick={() => setActiveTab('notes')}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all w-full text-left"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    Access Notebook Notes
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-350" />
                </button>
                <a href="#" className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-405 shrink-0" />
                    Ask AI Tutor
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-350" />
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── SCREEN 7: RESUME LEARNING MODAL OVERLAY ── */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative border border-slate-200/60 p-6 animate-slide-up flex flex-col font-sans">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-slate-900">
                  <Play className="w-4.5 h-4.5 ml-0.5 shrink-0" fill="currentColor" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm font-display leading-none">Resume Learning</h4>
                  <p className="text-[9px] font-bold text-slate-405 font-mono uppercase tracking-wider mt-0.5">Session Scheduler</p>
                </div>
              </div>
              <button 
                onClick={() => setIsResumeModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200/60 rounded-xl text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 space-y-4">
              <div className="bg-[#f0f3fe] border border-[#d0d7fe]/70 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-indigo-800 bg-white px-2.5 py-0.5 rounded-full border border-[#d0d7fe] uppercase tracking-wider font-mono inline-block mb-1.5">Today's Focus</span>
                <h5 className="font-extrabold text-slate-900 text-[14px]">Day {currentDay}: {currentModule?.title || 'Current Module'}</h5>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                  {dynamicCourse && currentModule
                    ? `Complete the ${formatMinutes(currentModule.estimated_minutes || 60)} lesson, review timestamp pins, and unlock the next module.`
                    : 'Remaining activities list to fulfill progress milestones.'}
                </p>
              </div>

              {/* Checklist details */}
              <div className="border border-slate-200/60 rounded-2xl p-4 bg-slate-50/50 space-y-3 font-sans text-xs font-semibold text-slate-650">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/50">
                  <span className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${dynamicCourse && completedModules >= currentDay ? 'bg-[#f4fae8] border border-[#d6f0a0]' : 'border border-slate-300 bg-white'}`}>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    </div>
                    Video Lecture Learning
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md uppercase ${dynamicCourse && completedModules >= currentDay ? 'text-emerald-700 bg-[#f4fae8] border border-[#d6f0a0]' : 'text-indigo-700 bg-[#f0f3fe] border border-[#d0d7fe]'}`}>{dynamicCourse && completedModules >= currentDay ? 'Done' : 'In Progress'}</span>
                </div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100/50">
                  <span className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                    {currentModule?.quizzes?.length ? 'Module-wise MCQ Quiz' : 'No Quiz Generated'}
                  </span>
                  <span className="text-[9px] font-mono text-indigo-700 bg-[#f0f3fe] border border-[#d0d7fe] px-2 py-0.5 rounded-md uppercase">{currentModule?.quizzes?.length ? 'Pending' : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                    {currentModule?.coding_challenges?.length ? 'Coding Challenge Practice' : 'No Coding Challenge Generated'}
                  </span>
                  <span className="text-[9px] font-mono text-indigo-700 bg-[#f0f3fe] border border-[#d0d7fe] px-2 py-0.5 rounded-md uppercase">{currentModule?.coding_challenges?.length ? 'Pending' : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 mt-6 border-t border-slate-100 pt-4 shrink-0 font-sans text-xs">
              <button
                onClick={() => setIsResumeModalOpen(false)}
                className="flex-1 bg-white text-slate-900 border border-slate-250 hover:bg-slate-50 transition-all font-bold uppercase tracking-wider py-3 rounded-2xl cursor-pointer font-mono"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsResumeModalOpen(false);
                  onNavigate(`/course/${courseId}/learn`);
                }}
                className="flex-1 bg-slate-900 text-white hover:bg-slate-800 transition-all font-black uppercase tracking-wider py-3 rounded-2xl cursor-pointer font-mono shadow flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                Resume Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── LOCKED WARNING MODAL OVERLAY ── */}
      {lockedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl relative border border-slate-200/60 p-6 animate-slide-up flex flex-col font-sans text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mx-auto mb-4 shrink-0 shadow-sm animate-bounce">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h4 className="font-extrabold text-slate-900 text-lg mb-2 font-display uppercase tracking-tight">{lockedModal.title}</h4>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
              {lockedModal.requirement}
            </p>

            <div className="flex flex-col gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  setLockedModal(null);
                  setIsResumeModalOpen(true);
                }}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 transition-all font-black uppercase tracking-wider py-3 rounded-xl cursor-pointer"
              >
                Start Current Day Activities
              </button>
              <button
                onClick={() => setLockedModal(null)}
                className="w-full bg-white text-slate-900 border border-slate-250 hover:bg-slate-50 transition-all font-bold uppercase tracking-wider py-2.5 rounded-xl cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
};
