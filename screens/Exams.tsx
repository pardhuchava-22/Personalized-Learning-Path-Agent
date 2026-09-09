import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User, Exam } from '../types';
import { 
  Search, Filter, Calendar, Clock, AlertCircle, Loader2, BookOpen, 
  ChevronLeft, ChevronRight, LayoutGrid, List, CheckCircle2, ChevronDown,
  Play, Star, Trophy, Code, FileText, MoreVertical, ExternalLink, RefreshCw, BarChart2
} from 'lucide-react';
import { examsAPI } from '../services/apiService';
import { useAuth } from '../services/authContext';

interface ExamsScreenProps {
  onNavigate: (path: string) => void;
}

// Filter tabs constant definition
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'not_attempted', label: 'Not Attempted' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'submitted', label: 'Submitted' }
];

interface ExtendedExam extends Exam {
  enrollmentStatus: string | null;
  totalMarks: number;
  passingMarks: number;
  questionCount: number;
  endTime: string;
}

export const ExamsScreen: React.FC<ExamsScreenProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'not_attempted' | 'in_progress' | 'submitted'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [exams, setExams] = useState<ExtendedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'module' | 'title' | 'date'>('module');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [fetchingResultId, setFetchingResultId] = useState<string | null>(null);
  
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const user: User = {
    id: String(authUser?.id || '0'),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Student',
    email: authUser?.email || '',
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examsAPI.getMyExams();
      
      const transformedExams: ExtendedExam[] = data.map((item: any) => {
        return {
          id: item.id.toString(),
          title: item.title,
          description: item.description,
          date: item.start_time,
          endTime: item.end_time,
          durationMinutes: item.duration_minutes || 60,
          status: 'Scheduled', // Required by base Exam type
          courseName: item.course_name || 'General Assessment',
          enrollmentId: item.enrollment_id?.toString(),
          enrollmentStatus: item.enrollment_status, // Keep raw backend status
          questionCount: item.question_count || 0,
          totalMarks: Math.round(item.total_marks || 100),
          passingMarks: Math.round(item.passing_marks || 40),
        };
      });
      
      setExams(transformedExams);
    } catch (err: any) {
      console.error('Failed to fetch exams:', err);
      setError(err.message || 'Failed to connect to the examination server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Handle Exam Attempt Enrollment & Navigation
  const handleAttemptExam = async (examId: string, currentEnrollmentId?: string) => {
    try {
      sessionStorage.removeItem('completed_exam_result_guard');
      setEnrollingId(examId);
      let enrollmentId = currentEnrollmentId;
      if (!enrollmentId) {
        // Dynamic enrollment in SQLite DB
        const enrollment = await examsAPI.enrollInExam(examId);
        enrollmentId = enrollment.id?.toString();
      }
      // Redirect to secure proctoring start screen
      onNavigate(`/proctoring?examId=${examId}${enrollmentId ? `&enrollmentId=${enrollmentId}` : ''}`);
    } catch (err: any) {
      console.error('Failed to enroll in exam:', err);
      alert(err.message || 'Failed to initialize exam enrollment.');
    } finally {
      setEnrollingId(null);
    }
  };

  // Fetch Result Detail dynamically from SQLite and redirect to results review screen
  const handleViewResult = async (examId: string) => {
    try {
      setFetchingResultId(examId);
      const data = await examsAPI.getExamResultsDetail(examId);
      const studentRecord = data.students?.[0];
      
      if (!studentRecord) {
        throw new Error('No submission record found for this exam.');
      }
      
      // Map questions with answers/options dynamically from SQLite
      const mappedQuestions = studentRecord.questions ? studentRecord.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type === 'mcq' ? 'Multiple Choice' : 'Coding Challenge',
        userAnswerId: q.userAnswerId,
        correctAnswerId: q.correctAnswerId,
        options: q.options || [],
        explanation: q.explanation || 'Exam question'
      })) : [];

      const correctCount = mappedQuestions.filter((q: any) => q.userAnswerId === q.correctAnswerId).length;

      const serverResult = {
        examTitle: data.exam?.title || 'Exam Result',
        completedAt: studentRecord.submitted_at || new Date().toISOString(),
        score: Math.round(studentRecord.percentage || 0),
        totalQuestions: mappedQuestions.length || data.exam?.question_count || 0,
        correctAnswers: correctCount,
        timeSpent: `${Math.floor((studentRecord.time_taken || 0) / 60)}m ${(studentRecord.time_taken || 0) % 60}s`,
        difficulty: 'Medium',
        status: studentRecord.status,
        questions: mappedQuestions,
        violations: studentRecord.violations || studentRecord.session?.violations || [],
        activities: studentRecord.activities || studentRecord.session?.activities || [],
        integrity_score: studentRecord.integrity_score || 100,
        proctoring: studentRecord.session ? {
          attentionScore: studentRecord.integrity_score || 100,
          checks: studentRecord.session.checks || { faceDetected: true, idVerified: true },
          timelineData: studentRecord.session.timelineData || [],
          incidents: studentRecord.session.incidents || [],
          violations: studentRecord.violations || studentRecord.session.violations || [],
          activities: studentRecord.activities || studentRecord.session.activities || []
        } : {
          attentionScore: studentRecord.integrity_score || 100,
          checks: { faceDetected: true, idVerified: true },
          timelineData: [],
          incidents: [],
          violations: studentRecord.violations || [],
          activities: studentRecord.activities || []
        }
      };

      localStorage.setItem('last_exam_result', JSON.stringify(serverResult));
      (window as any).lastExamResult = serverResult;
      
      onNavigate('/exam-results');
    } catch (err: any) {
      console.error('Failed to fetch exam result detail:', err);
      alert(err.message || 'Failed to retrieve assessment results.');
    } finally {
      setFetchingResultId(null);
    }
  };

  // Counts for pills
  const counts = {
    all: exams.length,
    not_attempted: exams.filter(e => e.enrollmentStatus === null || e.enrollmentStatus === 'enrolled').length,
    in_progress: exams.filter(e => e.enrollmentStatus === 'started').length,
    submitted: exams.filter(e => e.enrollmentStatus === 'submitted' || e.enrollmentStatus === 'completed').length,
  };

  // Filter & Search & Sort
  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.courseName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeFilter === 'not_attempted') {
      return e.enrollmentStatus === null || e.enrollmentStatus === 'enrolled';
    } else if (activeFilter === 'in_progress') {
      return e.enrollmentStatus === 'started';
    } else if (activeFilter === 'submitted') {
      return e.enrollmentStatus === 'submitted' || e.enrollmentStatus === 'completed';
    }
    return true; // all
  });

  // Sort logic
  const sortedExams = [...filteredExams].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'date') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else {
      // module / default sorting
      return a.id.localeCompare(b.id);
    }
  });

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/exams">
      <div className="animate-slide-up pb-16 max-w-[1400px] mx-auto w-full px-2 sm:px-4 text-slate-800 font-sans flex flex-col gap-6">
        
        {/* GLOBAL HEADER ROW (Consistent with Dashboard & MyCourses) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 border border-slate-100 p-2.5 rounded-2xl md:hidden">
              <BookOpen className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-mono">Academic Metrics</h2>
              <p className="text-slate-900 text-sm font-extrabold font-display">Student Assignments & Assessments</p>
            </div>
          </div>

          {/* Unified search & controls in header */}
          <div className="flex items-center gap-4 self-end lg:self-auto">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-slate-50 transition-all placeholder:text-slate-400 w-48 sm:w-64 shadow-none"
              />
            </div>
            <button 
              onClick={fetchExams}
              className="p-2 text-slate-900 hover:bg-slate-50 rounded-xl transition-all relative border border-slate-200 bg-white"
              title="Refresh database records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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

        {/* SUBHEADER TITLE SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">Assignments</h1>
            <p className="text-slate-500 text-sm font-semibold mt-0.5">Complete coding assignments and tests to strengthen your skills.</p>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR (Clean borderless capsule pills) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent border-none p-0 shadow-none">
          
          {/* Status filter pills exactly matching low-fidelity count indicator style */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(filter => {
              const isActive = activeFilter === filter.id;
              const count = counts[filter.id as keyof typeof counts];
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id as any)}
                  className={`
                    px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-2 border
                    ${isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-900 bg-white border-slate-200 hover:bg-slate-50'
                    }
                  `}
                >
                  <span>{filter.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown & Layout Toggles */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Sort Dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer min-w-[170px] justify-between text-xs font-bold uppercase tracking-wider"
              >
                <span className="text-slate-700">
                  Sort by: {sortBy === 'module' ? 'Module Order' : sortBy === 'title' ? 'Title A-Z' : 'Due Date'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-fade-in">
                  <button
                    onClick={() => { setSortBy('module'); setIsSortOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-colors ${sortBy === 'module' ? 'text-slate-900 bg-slate-50' : 'text-slate-550 hover:bg-slate-50'}`}
                  >
                    Module Order
                  </button>
                  <button
                    onClick={() => { setSortBy('title'); setIsSortOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-colors ${sortBy === 'title' ? 'text-slate-900 bg-slate-50' : 'text-slate-550 hover:bg-slate-50'}`}
                  >
                    Title A-Z
                  </button>
                  <button
                    onClick={() => { setSortBy('date'); setIsSortOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold uppercase transition-colors ${sortBy === 'date' ? 'text-slate-900 bg-slate-50' : 'text-slate-550 hover:bg-slate-50'}`}
                  >
                    Due Date
                  </button>
                </div>
              )}
            </div>

            {/* View Mode Toggle buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all rounded-lg cursor-pointer ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                title="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all rounded-lg cursor-pointer ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                title="List table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT PANELS (Lighthouse load states, empty states, grids, and tables) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <Loader2 className="w-10 h-10 text-slate-900 animate-spin mb-4" />
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider font-mono">Fetching Assignments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-red-100 rounded-2xl">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <h3 className="text-xl font-extrabold text-slate-900 mb-1.5 uppercase tracking-tight">Sync Failed</h3>
            <p className="text-sm text-slate-500 font-semibold mb-6 max-w-sm text-center">{error}</p>
            <button
              onClick={fetchExams}
              className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest font-mono rounded-xl border border-slate-900 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        ) : sortedExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-slate-350" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1.5 uppercase tracking-tight">No Assignments found</h3>
            <p className="text-sm text-slate-500 font-semibold max-w-sm">No exam tasks match your current filter selection or search query.</p>
          </div>
        ) : viewMode === 'grid' ? (
          
          /* ── GRID CARD VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedExams.map((exam, index) => {
              const moduleOrder = index + 1;
              const pastel = getPastelStyle(exam.enrollmentStatus);
              const isMCQ = exam.title.toLowerCase().includes('quiz') || exam.title.toLowerCase().includes('mcq');
              const isAttempting = enrollingId === exam.id;
              const isFetchingResult = fetchingResultId === exam.id;

              return (
                <div 
                  key={exam.id}
                  className={`group border rounded-2xl p-5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col h-full bg-white relative hover:-translate-y-1 ${pastel.cardClass}`}
                >
                  {/* Top bar: Module label + More Menu */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-slate-100 text-slate-500 rounded-full font-mono">
                      Module {moduleOrder}
                    </span>
                    
                    {/* Three-dot context menu */}
                    <div className="relative" ref={openMenuId === exam.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === exam.id ? null : exam.id); }}
                        className="p-1 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuId === exam.id && (
                        <div className="absolute right-0 top-7 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-35 animate-fade-in origin-top-right">
                          <button
                            onClick={() => {
                              alert(`Exam: ${exam.title}\nCourse: ${exam.courseName}\nMarks: ${exam.totalMarks}`);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <BookOpen className="w-3.5 h-3.5" /> Details
                          </button>
                          <button
                            onClick={() => {
                              onNavigate('/dashboard');
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Dashboard
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content: Logo/Icon left, Title/Desc right */}
                  <div className="flex gap-4 items-start flex-1 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      {isMCQ ? (
                        <FileText className="w-5 h-5 text-slate-500" />
                      ) : (
                        <Code className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 mb-1 leading-snug line-clamp-2" title={`${moduleOrder}. ${exam.title}`}>
                        {moduleOrder}. {exam.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold line-clamp-2 min-h-[2rem]">
                        {exam.description || `Dynamic assignment covering key topics of ${exam.courseName}.`}
                      </p>
                    </div>
                  </div>

                  {/* Stats Row: Star(Difficulty) + Clock(Duration) + Trophy(Points) */}
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-5 border-b border-slate-100/50 pb-4 font-mono">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-slate-450 fill-slate-100" />
                      {exam.passingMarks <= 40 ? 'Easy' : exam.passingMarks <= 60 ? 'Medium' : 'Hard'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.durationMinutes} Min
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-100" />
                      {exam.totalMarks} Points
                    </span>
                  </div>

                  {/* Status Section (Progress bars or Submission info) */}
                  <div className="mb-5">
                    {exam.enrollmentStatus === 'started' ? (
                      /* In Progress */
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-extrabold uppercase font-sans">
                          <span className={`px-2 py-0.5 rounded-md font-mono ${pastel.badgeClass}`}>In Progress</span>
                          <span className="text-slate-400">Activity logged</span>
                        </div>
                        <div className="w-full h-1.5 bg-white border border-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                    ) : exam.enrollmentStatus === 'submitted' || exam.enrollmentStatus === 'completed' ? (
                      /* Submitted */
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono ${pastel.badgeClass}`}>Submitted</span>
                          <span className="text-xs font-black text-slate-900 bg-[#f4fae8] px-2 py-0.5 rounded-lg border border-[#e2f3c7]">
                            Evaluated
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium font-mono mt-1">
                          Dynamic record saved in SQLite
                        </span>
                      </div>
                    ) : (
                      /* Not Attempted */
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono ${pastel.badgeClass}`}>Not Attempted</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pending ignition</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono mt-1">
                          Due: {new Date(exam.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}, 11:59 PM
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Button */}
                  {exam.enrollmentStatus === 'submitted' || exam.enrollmentStatus === 'completed' ? (
                    <button
                      onClick={() => handleViewResult(exam.id)}
                      disabled={isFetchingResult}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                      {isFetchingResult ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                          Pulling Results...
                        </>
                      ) : (
                        <>
                          <BarChart2 className="w-3.5 h-3.5 text-slate-600" />
                          View Result
                        </>
                      )}
                    </button>
                  ) : exam.enrollmentStatus === 'started' ? (
                    <button
                      onClick={() => handleAttemptExam(exam.id, exam.enrollmentId)}
                      disabled={isAttempting}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                    >
                      {isAttempting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                          Re-entering...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-slate-900 fill-current" />
                          Continue Test
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAttemptExam(exam.id)}
                      disabled={isAttempting}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-slate-200"
                    >
                      {isAttempting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-white fill-current" />
                          Attempt Test
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          
          /* ── LIST TABLE VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm shadow-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Assignment / Exam</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Difficulty</th>
                    <th className="px-6 py-4">Time Limit</th>
                    <th className="px-6 py-4">Points</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4 text-center">Action</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sortedExams.map((exam, index) => {
                    const moduleOrder = index + 1;
                    const pastel = getPastelStyle(exam.enrollmentStatus);
                    const isMCQ = exam.title.toLowerCase().includes('quiz') || exam.title.toLowerCase().includes('mcq');
                    const isAttempting = enrollingId === exam.id;
                    const isFetchingResult = fetchingResultId === exam.id;

                    return (
                      <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5 font-mono text-xs font-bold text-slate-400">{moduleOrder}</td>
                        <td className="px-6 py-5 min-w-[240px]">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 text-sm">{exam.title}</span>
                            <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{exam.description || 'Assignment covering core milestones.'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-extrabold uppercase font-mono">
                            Module {moduleOrder}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                            {isMCQ ? 'MCQ Quiz' : 'Coding Project'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded border ${
                            exam.passingMarks <= 40 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            exam.passingMarks <= 60 ? 'bg-amber-50 border-amber-100 text-amber-700' :
                            'bg-red-50 border-red-100 text-red-700'
                          }`}>
                            {exam.passingMarks <= 40 ? 'Easy' : exam.passingMarks <= 60 ? 'Medium' : 'Hard'}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-slate-600 font-bold whitespace-nowrap">{exam.durationMinutes} min</td>
                        <td className="px-6 py-5 font-mono text-xs text-slate-900 font-extrabold">{exam.totalMarks}</td>
                        <td className="px-6 py-5">
                          {exam.enrollmentStatus === 'started' ? (
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono w-max ${pastel.badgeClass}`}>In Progress</span>
                              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-indigo-500" style={{ width: '45%' }}></div>
                              </div>
                            </div>
                          ) : exam.enrollmentStatus === 'submitted' || exam.enrollmentStatus === 'completed' ? (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${pastel.badgeClass}`}>Submitted</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${pastel.badgeClass}`}>Not Attempted</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-xs font-semibold text-slate-400 font-mono whitespace-nowrap">
                          {new Date(exam.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {exam.enrollmentStatus === 'submitted' || exam.enrollmentStatus === 'completed' ? (
                            <button
                              onClick={() => handleViewResult(exam.id)}
                              disabled={isFetchingResult}
                              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all"
                            >
                              {isFetchingResult ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              Result
                            </button>
                          ) : exam.enrollmentStatus === 'started' ? (
                            <button
                              onClick={() => handleAttemptExam(exam.id, exam.enrollmentId)}
                              disabled={isAttempting}
                              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-900 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all"
                            >
                              {isAttempting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 fill-current text-slate-900" />
                              )}
                              Continue
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAttemptExam(exam.id)}
                              disabled={isAttempting}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all"
                            >
                              {isAttempting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3 fill-current text-white" />
                              )}
                              Attempt
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right relative" ref={openMenuId === exam.id ? menuRef : undefined}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === exam.id ? null : exam.id); }}
                            className="p-1 text-slate-400 hover:text-slate-900 rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === exam.id && (
                            <div className="absolute right-6 top-11 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-35 animate-fade-in origin-top-right">
                              <button
                                onClick={() => {
                                  alert(`Exam: ${exam.title}\nCourse: ${exam.courseName}`);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <BookOpen className="w-3.5 h-3.5" /> Details
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

// Pastel color helper matching dashboard theme precisely
function getPastelStyle(status: string | null): {
  cardClass: string;
  badgeClass: string;
} {
  if (status === 'started') {
    // In Progress
    return {
      cardClass: 'border-[#d0d7fe]/70 hover:border-[#b4c0fe]/80',
      badgeClass: 'text-indigo-800 bg-[#f0f3fe] border border-[#e0e4fe]'
    };
  } else if (status === 'submitted' || status === 'completed') {
    // Completed/Submitted
    return {
      cardClass: 'border-[#d6f0a0]/70 hover:border-[#bede7c]/80',
      badgeClass: 'text-emerald-800 bg-[#f4fae8] border border-[#e2f3c7]'
    };
  } else {
    // Not Attempted
    return {
      cardClass: 'border-slate-200/60 hover:border-slate-350',
      badgeClass: 'text-slate-650 bg-white border border-slate-200'
    };
  }
}
