import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User, SmartCourse } from '../types';
import { useAuth } from '../services/authContext';
import { useCourses } from '../services/courseContext';
import { examsAPI } from '../services/apiService';
import {
  Activity,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  FileText,
  Flame,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Trophy,
} from 'lucide-react';

interface AnalyticsScreenProps {
  onNavigate: (path: string) => void;
}

type ExamRecord = {
  id: string;
  title: string;
  courseName: string;
  status: string | null;
  score: number | null;
  date: Date | null;
  durationMinutes: number;
  questionCount: number;
};

type ActivitySlice = {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const safeRatio = (completed: number, total: number) => (total > 0 ? Math.round((completed / total) * 100) : 0);

const formatDuration = (minutes: number) => {
  const normalized = Math.max(0, Math.round(minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const mapExam = (item: any): ExamRecord => {
  const rawDate = item?.submitted_at || item?.completed_at || item?.start_time || item?.date;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const scoreCandidate = item?.percentage ?? item?.score ?? item?.avg_score ?? item?.result?.score;

  return {
    id: String(item?.id ?? item?.exam_id ?? crypto.randomUUID()),
    title: item?.title || item?.exam_title || 'Assignment',
    courseName: item?.course_name || item?.courseName || 'General Assessment',
    status: item?.enrollment_status || item?.status || null,
    score: Number.isFinite(Number(scoreCandidate)) ? Math.round(Number(scoreCandidate)) : null,
    date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    durationMinutes: Number(item?.duration_minutes || item?.durationMinutes || 0),
    questionCount: Number(item?.question_count || item?.questionCount || 0),
  };
};

const isSubmitted = (status: string | null) => ['submitted', 'completed', 'evaluated'].includes(String(status || '').toLowerCase());

const formatTrendLabel = (date: Date): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

const buildTrend = (
  courses: SmartCourse[],
  exams: ExamRecord[],
  range: 'Weekly' | 'Monthly',
  serverAnalytics?: any
) => {
  const isWeekly = range === 'Weekly';
  const offsets = isWeekly ? [6, 5, 4, 3, 2, 1, 0] : [28, 21, 14, 7, 0];
  const now = new Date();

  // Compute actual overall current progress
  const enrolled = courses.length;
  const courseAvg = enrolled > 0
    ? courses.reduce((sum, c) => sum + clamp(c.progress || 0), 0) / enrolled
    : 0;

  const submittedExams = exams.filter((exam) => isSubmitted(exam.status));
  const examScores = submittedExams.map((e) => e.score).filter((s): s is number => s !== null && Number.isFinite(s));
  const serverScores: number[] = Array.isArray(serverAnalytics?.history?.data)
    ? serverAnalytics.history.data
    : [];
  const allScores = examScores.length > 0 ? examScores : serverScores;
  const examAvg = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : (Number(serverAnalytics?.kpi?.avg_score) || 0);

  // Target progress at current moment (today)
  let targetProgress = 0;
  if (courseAvg > 0 && examAvg > 0) {
    targetProgress = Math.round(courseAvg * 0.65 + examAvg * 0.35);
  } else if (courseAvg > 0) {
    targetProgress = Math.round(courseAvg);
  } else if (examAvg > 0) {
    targetProgress = Math.round(examAvg);
  }

  // Generate dynamic date intervals
  const intervals = offsets.map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 23, 59, 59, 999);
    return {
      date: d,
      dateKey: d.toISOString().slice(0, 10),
      label: formatTrendLabel(d),
    };
  });

  if (targetProgress === 0 && courses.length === 0 && exams.length === 0) {
    return intervals.map((item) => ({ label: item.label, value: 0 }));
  }

  // Aggregate timestamped activity from exams and heatmap
  const heatmap: Record<string, number> = serverAnalytics?.heatmap || {};
  let totalActivityCount = Object.values(heatmap).reduce((a, b) => a + Number(b || 0), 0);
  submittedExams.forEach(() => { totalActivityCount += 1; });

  let previousValue = 0;
  return intervals.map((item, index) => {
    const isLast = index === intervals.length - 1;
    if (isLast && targetProgress > 0) {
      return { label: item.label, value: clamp(targetProgress) };
    }

    const itemDateKey = item.dateKey;
    const itemTime = item.date.getTime();

    // Activities up to this date
    let cumulativeActs = 0;
    Object.entries(heatmap).forEach(([dateStr, count]) => {
      if (dateStr <= itemDateKey) {
        cumulativeActs += Number(count || 0);
      }
    });

    submittedExams.forEach((exam) => {
      if (exam.date && exam.date.getTime() <= itemTime) {
        cumulativeActs += 1;
      }
    });

    let value: number;
    if (totalActivityCount > 0) {
      const actRatio = Math.min(1, cumulativeActs / totalActivityCount);
      const startRatio = isWeekly ? 0.45 : 0.15;
      value = Math.round(targetProgress * (startRatio + (1 - startRatio) * actRatio));
    } else {
      const step = (index + 1) / intervals.length;
      const startRatio = isWeekly ? 0.55 : 0.2;
      value = Math.round(targetProgress * (startRatio + (1 - startRatio) * step));
    }

    // Ensure non-decreasing cumulative progress and clamp between 0 and 100
    value = clamp(Math.max(previousValue, Math.min(targetProgress, value)));
    previousValue = value;

    return {
      label: item.label,
      value,
    };
  });
};

const getCourseResumeLabel = (course: SmartCourse) => {
  if (course.progress >= 100) return 'Course completed';
  if (course.modules.completed < course.modules.total) return `Module ${course.modules.completed + 1}`;
  if (course.quizzes.completed < course.quizzes.total) return `Quiz ${course.quizzes.completed + 1}`;
  if (course.codingChallenges.completed < course.codingChallenges.total) return `Challenge ${course.codingChallenges.completed + 1}`;
  if (course.revisions.completed < course.revisions.total) return `Revision ${course.revisions.completed + 1}`;
  return 'Continue learning';
};

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const { courses, isLoading: coursesLoading, refreshCourses } = useCourses();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [serverAnalytics, setServerAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<'Weekly' | 'Monthly'>('Weekly');

  const user: User = {
    id: String(authUser?.id || '1'),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Student',
    email: authUser?.email || '',
    role: 'student',
  };

  const loadProgressData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examResult, analyticsResult] = await Promise.allSettled([
        examsAPI.getMyExams(),
        examsAPI.getDetailedAnalytics(),
      ]);

      if (examResult.status === 'fulfilled' && Array.isArray(examResult.value)) {
        setExams(examResult.value.map(mapExam));
      } else {
        setExams([]);
      }

      if (analyticsResult.status === 'fulfilled') {
        setServerAnalytics(analyticsResult.value);
      }

      if (examResult.status === 'rejected' && analyticsResult.status === 'rejected') {
        throw examResult.reason;
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load progress analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgressData();
  }, []);

  const metrics = useMemo(() => {
    const enrolled = courses.length;
    const totalModules = courses.reduce((sum, course) => sum + course.modules.total, 0);
    const completedModules = courses.reduce((sum, course) => sum + course.modules.completed, 0);
    const totalQuizzes = courses.reduce((sum, course) => sum + course.quizzes.total, 0);
    const completedQuizzes = courses.reduce((sum, course) => sum + course.quizzes.completed, 0);
    const totalChallenges = courses.reduce((sum, course) => sum + course.codingChallenges.total, 0);
    const completedChallenges = courses.reduce((sum, course) => sum + course.codingChallenges.completed, 0);
    const overall = enrolled > 0 ? Math.round(courses.reduce((sum, course) => sum + clamp(course.progress || 0), 0) / enrolled) : 0;
    const submittedExams = exams.filter((exam) => isSubmitted(exam.status));
    const averageScore = submittedExams.length > 0
      ? Math.round(submittedExams.reduce((sum, exam) => sum + (exam.score || 0), 0) / submittedExams.length)
      : Math.round(serverAnalytics?.kpi?.avg_score || 0);
    const minutesFromCourses = courses.reduce((sum, course) => {
      const dailyMinutes = Number(String(course.dailyTime || '').match(/\d+/)?.[0] || 0);
      return sum + Math.round((dailyMinutes || 30) * clamp(course.progress || 0) / 100);
    }, 0);
    const minutesFromExams = submittedExams.reduce((sum, exam) => sum + exam.durationMinutes, 0);

    return {
      enrolled,
      overall,
      totalModules,
      completedModules,
      totalQuizzes,
      completedQuizzes,
      totalChallenges,
      completedChallenges,
      submittedAssignments: submittedExams.length,
      totalAssignments: exams.length,
      averageScore,
      learningMinutes: minutesFromCourses + minutesFromExams,
      activeDays: Math.min(7, new Set([...submittedExams.map((exam) => exam.date && dateKey(exam.date)).filter(Boolean), ...courses.filter((course) => course.progress > 0).map((course) => course.id)]).size),
    };
  }, [courses, exams, serverAnalytics]);

  const trend = useMemo(
    () => buildTrend(courses, exams, range, serverAnalytics),
    [courses, exams, range, serverAnalytics]
  );

  const activitySlices: ActivitySlice[] = useMemo(() => {
    const video = courses.reduce((sum, course) => sum + course.modules.completed, 0);
    const quiz = courses.reduce((sum, course) => sum + course.quizzes.completed, 0);
    const coding = courses.reduce((sum, course) => sum + course.codingChallenges.completed, 0);
    const revision = courses.reduce((sum, course) => sum + course.revisions.completed, 0);
    const assignment = exams.filter((exam) => isSubmitted(exam.status)).length;

    return [
      { label: 'Video Learning', value: video, color: '#111827', icon: BookOpen },
      { label: 'Quizzes', value: quiz, color: '#64748b', icon: Trophy },
      { label: 'Coding Challenges', value: coding, color: '#94a3b8', icon: Code2 },
      { label: 'Revision', value: revision, color: '#cbd5e1', icon: RefreshCw },
      { label: 'Assignments', value: assignment, color: '#d9f99d', icon: FileText },
    ];
  }, [courses, exams]);

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((course) => course.title.toLowerCase().includes(needle));
  }, [courses, query]);

  const performance = [
    { label: 'Quiz Average', value: safeRatio(metrics.completedQuizzes, metrics.totalQuizzes) },
    { label: 'Challenge Success', value: safeRatio(metrics.completedChallenges, metrics.totalChallenges) },
    { label: 'Assignment Average', value: metrics.totalAssignments > 0 ? safeRatio(metrics.submittedAssignments, metrics.totalAssignments) : 0 },
    { label: 'Final Test Average', value: metrics.averageScore },
  ];

  const handleRefresh = async () => {
    await Promise.all([refreshCourses(), loadProgressData()]);
  };

  if (loading || coursesLoading) {
    return (
      <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/analytics">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-slate-900 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-semibold">Building your progress analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/analytics">
      <div className="max-w-[1480px] mx-auto w-full px-2 sm:px-4 pb-16 text-slate-900 animate-slide-up">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight font-display">Progress Analytics</h1>
            <p className="text-sm text-slate-500 font-semibold mt-1">Track your learning journey across courses, modules, quizzes, challenges, and assignments.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search courses..."
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-slate-50 placeholder:text-slate-400 w-48 sm:w-64"
              />
            </div>
            <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" title="Refresh progress data">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
          <SummaryCard icon={Activity} label="Overall Progress" value={`${metrics.overall}%`} detail={`${metrics.activeDays}/7 active days`} ringValue={metrics.overall} />
          <SummaryCard icon={Clock} label="Learning Time" value={formatDuration(metrics.learningMinutes)} detail="Courses + assignments" />
          <SummaryCard icon={BookOpen} label="Courses Enrolled" value={metrics.enrolled} detail={`${courses.filter((course) => course.status === 'in_progress').length} in progress`} />
          <SummaryCard icon={FileText} label="Modules Completed" value={`${metrics.completedModules}/${metrics.totalModules}`} detail={`${safeRatio(metrics.completedModules, metrics.totalModules)}% completed`} />
          <SummaryCard icon={Trophy} label="Quizzes Completed" value={`${metrics.completedQuizzes}/${metrics.totalQuizzes}`} detail={`${metrics.averageScore}% exam average`} />
          <SummaryCard icon={Code2} label="Challenges Solved" value={`${metrics.completedChallenges}/${metrics.totalChallenges}`} detail={`${safeRatio(metrics.completedChallenges, metrics.totalChallenges)}% success rate`} />
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-12 gap-6">
          <div className="2xl:col-span-8 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <section className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-black uppercase tracking-tight font-display">Learning Progress Over Time</h2>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
                    {(['Weekly', 'Monthly'] as const).map((item) => (
                      <button
                        key={item}
                        onClick={() => setRange(item)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${range === item ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <LineChart data={trend} />
              </section>

              <section className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] overflow-hidden">
                <h2 className="text-sm font-black uppercase tracking-tight font-display mb-6">Time Spent by Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-center">
                  <DonutChart slices={activitySlices} center={formatDuration(metrics.learningMinutes)} />
                  <div className="space-y-3 w-full min-w-0 max-w-xl">
                    {activitySlices.map((slice) => (
                      <ActivityRow key={slice.label} slice={slice} total={activitySlices.reduce((sum, item) => sum + item.value, 0)} />
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <section className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black uppercase tracking-tight font-display">Performance Overview</h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metrics.totalAssignments} assignments</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {performance.map((item) => (
                  <RingMetric key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <h2 className="text-sm font-black uppercase tracking-tight font-display">Activity Heatmap</h2>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <Heatmap courses={courses} exams={exams} />
                </div>
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-slate-900" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Study Consistency</p>
                      <p className="text-2xl font-black">{metrics.activeDays} / 7 Days</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                      <div key={`${day}-${index}`} className="flex flex-col items-center gap-2">
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${index < metrics.activeDays ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-black text-slate-500">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="2xl:col-span-4 bg-white border border-slate-200/70 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] h-max">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black uppercase tracking-tight font-display">Course Progress</h2>
              <button onClick={() => onNavigate('/courses')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900">View all</button>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="text-center py-14 border border-dashed border-slate-200 rounded-2xl">
                <GraduationCap className="w-9 h-9 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">No matching courses</p>
                <button onClick={() => onNavigate('/create-course')} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider">Create Course</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-4">
                {filteredCourses.slice(0, 6).map((course) => (
                  <CourseProgressItem key={course.id} course={course} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

const SummaryCard = ({ icon: Icon, label, value, detail, ringValue }: { icon: React.ElementType; label: string; value: string | number; detail: string; ringValue?: number }) => (
  <section className="bg-white border border-slate-200/70 rounded-2xl p-5 min-h-[126px] shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
    <div className="flex items-center gap-4">
      {typeof ringValue === 'number' ? (
        <MiniRing value={ringValue} />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-slate-800" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-black tracking-tight mt-1">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 mt-2">{detail}</p>
      </div>
    </div>
  </section>
);

const MiniRing = ({ value }: { value: number }) => {
  const circumference = 94.2;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="18" cy="18" r="15" fill="none" stroke="#111827" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={circumference - (clamp(value) / 100) * circumference} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{value}%</span>
    </div>
  );
};

const LineChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const width = 640;
  const height = 260;
  const points = data.map((item, index) => ({
    x: data.length > 1 ? 40 + (index / (data.length - 1)) * (width - 80) : width / 2,
    y: height - 35 - (clamp(item.value) / 100) * (height - 70),
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="h-[300px]">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[250px] overflow-visible">
        {[0, 25, 50, 75, 100].map((mark) => {
          const y = height - 35 - (mark / 100) * (height - 70);
          return (
            <g key={mark}>
              <line x1="40" y1={y} x2={width - 30} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x="0" y={y + 4} className="fill-slate-400 text-[11px] font-bold">{mark}%</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${data[index].label}-${index}`}>
            <title>{`${data[index].label}: ${data[index].value}%`}</title>
            <circle cx={point.x} cy={point.y} r="5" fill="#111827" />
            <circle cx={point.x} cy={point.y} r="12" fill="#111827" opacity="0.08" />
          </g>
        ))}
      </svg>
      <div
        className="pl-10 pr-5 text-[10px] font-black uppercase text-slate-400"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
        }}
      >
        {data.map((item, idx) => (
          <span key={`${item.label}-${idx}`} className="text-center truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const DonutChart = ({ slices, center }: { slices: ActivitySlice[]; center: string }) => {
  const total = Math.max(1, slices.reduce((sum, slice) => sum + slice.value, 0));
  let offset = 25;

  return (
    <div className="relative w-[210px] h-[210px] mx-auto">
      <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
        <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="7" />
        {slices.map((slice) => {
          const dash = (slice.value / total) * 100;
          const element = (
            <circle
              key={slice.label}
              cx="21"
              cy="21"
              r="15.9"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="7"
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return element;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black">{center}</span>
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</span>
      </div>
    </div>
  );
};

const ActivityRow = ({ slice, total }: { slice: ActivitySlice; total: number }) => {
  const percentage = total > 0 ? Math.round((slice.value / total) * 100) : 0;
  const Icon = slice.icon;
  return (
    <div className="flex items-center justify-between gap-4 py-0.5 min-w-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center shrink-0" style={{ backgroundColor: `${slice.color}18` }}>
          <Icon className="w-4 h-4" style={{ color: slice.color }} />
        </span>
        <span className="text-xs font-extrabold text-slate-700 truncate" title={slice.label}>{slice.label}</span>
      </div>
      <span className="text-xs font-black font-mono text-slate-900 shrink-0">{slice.value} ({percentage}%)</span>
    </div>
  );
};

const RingMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center justify-center gap-3 border-r border-slate-100 last:border-r-0 min-h-[150px]">
    <MiniRing value={clamp(value)} />
    <span className="text-[11px] font-black uppercase tracking-tight text-slate-600 text-center max-w-[120px]">{label}</span>
  </div>
);

const Heatmap = ({ courses, exams }: { courses: SmartCourse[]; exams: ExamRecord[] }) => {
  const activity = new Map<string, number>();
  const today = new Date();

  exams.forEach((exam) => {
    if (!exam.date) return;
    const key = dateKey(exam.date);
    activity.set(key, (activity.get(key) || 0) + (isSubmitted(exam.status) ? 3 : 1));
  });

  courses.forEach((course, index) => {
    if (course.progress <= 0) return;
    const date = new Date(today);
    date.setDate(today.getDate() - (index % 7));
    const key = dateKey(date);
    activity.set(key, (activity.get(key) || 0) + Math.ceil(course.progress / 35));
  });

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (41 - index));
    const value = activity.get(dateKey(date)) || 0;
    return { value, key: dateKey(date) };
  });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => (
        <div
          key={day.key}
          title={`${day.key}: ${day.value} activities`}
          className={`h-6 rounded-md border ${day.value === 0 ? 'bg-slate-50 border-slate-100' : day.value < 2 ? 'bg-slate-200 border-slate-200' : day.value < 4 ? 'bg-slate-500 border-slate-500' : 'bg-slate-900 border-slate-900'}`}
        />
      ))}
    </div>
  );
};

const CourseProgressItem = ({ course, onNavigate }: { course: SmartCourse; onNavigate: (path: string) => void }) => (
  <div className="border border-slate-200 rounded-2xl p-4 hover:bg-slate-50/70 transition-colors">
    <div className="flex gap-4">
      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-slate-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-black leading-snug truncate" title={course.title}>{course.title}</h3>
          <span className="text-xs font-black font-mono">{clamp(course.progress || 0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${clamp(course.progress || 0)}%` }} />
        </div>
        <button
          onClick={() => onNavigate(`/course/${course.id}`)}
          className="mt-3 w-full border border-slate-200 bg-white rounded-xl px-3 py-2 flex items-center justify-between text-left hover:border-slate-900 transition-colors"
        >
          <span>
            <span className="block text-[10px] font-bold text-slate-400">Continue learning</span>
            <span className="block text-xs font-extrabold text-slate-700">{getCourseResumeLabel(course)}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  </div>
);
