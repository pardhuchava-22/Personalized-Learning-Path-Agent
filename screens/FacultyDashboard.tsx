
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { useAuth } from '../services/authContext';
import { examsAPI } from '../services/apiService';
import {
  Users, FileText, Clock, TrendingUp, AlertCircle, CheckCircle, 
  Eye, MoreHorizontal, ChevronRight, Plus, Search, Filter, 
  Loader2, Sparkles, Activity, ShieldCheck, ArrowUpRight, ArrowDownRight,
  MonitorPlay, LayoutDashboard, X, ExternalLink, ShieldAlert
} from 'lucide-react';

interface FacultyDashboardProps {
  onNavigate: (path: string) => void;
}

export const FacultyDashboardScreen: React.FC<FacultyDashboardProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Real data state
  const [stats, setStats] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<number[]>([]);
  const [submissionDensity, setSubmissionDensity] = useState<number[]>([]);
  const [chartMode, setChartMode] = useState<'average' | 'density'>('average');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected submission for review modal
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<any | null>(null);
  const [reviewExamDetail, setReviewExamDetail] = useState<any | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const facultyUser: User = {
    id: String(authUser?.id || ''),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty',
    email: authUser?.email || '',
    role: 'faculty',
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await examsAPI.getDashboardStats();

        // Calculate a pseudo-delta for aesthetics (would be real if we had historical cache)
        const trendSymbol = data.class_average > 75 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />;
        const trendColor = data.class_average > 75 ? 'text-emerald-500' : 'text-amber-500';

        setStats([
          { label: 'Active Matrix', value: data.active_exams || 0, sub: 'Live Now', icon: MonitorPlay, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
          { label: 'Enrolled Talent', value: data.total_students || 0, sub: 'Total Students', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100' },
          { label: 'Pending Reviews', value: data.pending_reviews || 0, sub: 'Urgent Action', icon: AlertCircle, color: data.pending_reviews > 0 ? 'text-red-600' : 'text-slate-400', bg: data.pending_reviews > 0 ? 'bg-red-50/50' : 'bg-slate-50/50', border: data.pending_reviews > 0 ? 'border-red-100' : 'border-slate-100' },
          { label: 'Academic Index', value: `${data.class_average || 0}%`, sub: trendSymbol, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', trendColor },
        ]);

        setPerformanceTrend(data.performance_trend || []);
        setSubmissionDensity(data.submission_density || []);

        setUpcomingExams(
          (data.upcoming_exams || []).map((ex: any) => ({
            id: ex.id,
            title: ex.title,
            time: `${new Date(ex.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            status: new Date(ex.start_time) > new Date() ? 'Scheduled' : 'In Progress',
            students: ex.enrolled_count || 0,
            date: new Date(ex.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            questionCount: ex.question_count || 0,
          }))
        );

        setSubmissions(
          (data.recent_submissions || []).map((sub: any) => ({
            id: sub.id,
            examId: sub.exam,
            studentId: sub.student,
            name: sub.student_name || 'Student',
            email: sub.student_email || 'student@quantumguard.edu',
            exam: sub.exam_title || 'Exam',
            score: sub.percentage != null ? `${sub.percentage}%` : (sub.score != null ? `${sub.score}` : '--'),
            rawScore: sub.score,
            percentage: sub.percentage,
            violations: sub.total_violations || 0,
            status: sub.status === 'submitted' ? 'Pending' : sub.status === 'completed' ? 'Finalized' : sub.status,
            date: sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—',
            timeTaken: sub.time_taken_seconds ? `${Math.floor(sub.time_taken_seconds / 60)}m ${sub.time_taken_seconds % 60}s` : 'N/A',
            isBlocked: sub.is_blocked || false,
            isAutoSubmitted: sub.is_auto_submitted || false,
          }))
        );
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReviewClick = async (sub: any) => {
    setActiveReviewSubmission(sub);
    setIsReviewLoading(true);
    setReviewExamDetail(null);
    try {
      if (sub.examId) {
        const detail = await examsAPI.getExamResultsDetail(sub.examId);
        setReviewExamDetail(detail);
      }
    } catch (err) {
      console.error('Failed to load full submission audit detail:', err);
    } finally {
      setIsReviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative">
                <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                </div>
            </div>
            <p className="mt-6 text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Accessing Command Center...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-dashboard">
      <div className="max-w-[1600px] mx-auto pb-24 animate-slide-up px-4 md:px-0">

        {/* Premium Header Container */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
            <div className="space-y-1">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-900 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <LayoutDashboard className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">System Overview</span>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mission Control</h1>
                    </div>
                </div>
                <h2 className="text-xl font-bold text-slate-500">Welcome back, <span className="text-slate-900">{facultyUser.name}</span></h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
                <button 
                    onClick={() => onNavigate('/faculty-exams/create')}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-slate-800 hover:-translate-y-1 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Ignite Assessment
                </button>
            </div>
        </div>

        {/* KPI Grid - Pro Max Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {stats.map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-50 transition-colors"></div>
                    
                    <div className="relative z-10">
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} ${stat.border} border w-fit mb-6 shadow-sm`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex items-baseline gap-3 mb-2">
                            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                                {stat.value}
                            </h3>
                            {stat.trendColor && (
                                <div className={`flex items-center gap-0.5 font-black text-xs ${stat.trendColor}`}>
                                    {stat.sub}
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                        {!stat.trendColor && <div className="text-[10px] font-bold text-slate-400 mt-1">{stat.sub}</div>}
                    </div>
                </div>
            ))}
        </div>

        {/* Dynamic Analytics & Live Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

            {/* Performance Continuum (8 column) */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* Real Performance Chart */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <Activity className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Academic Momentum</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {chartMode === 'average' 
                                        ? 'Aggregate Performance (% Average) over 15 Standard Days' 
                                        : 'Student Submissions (Completed Exams) over 15 Standard Days'}
                                </p>
                            </div>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                             <button 
                                 type="button"
                                 onClick={() => setChartMode('average')}
                                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                     chartMode === 'average' 
                                         ? 'bg-white text-slate-900 shadow-sm' 
                                         : 'text-slate-400 hover:text-slate-700'
                                 }`}
                             >
                                 Average
                             </button>
                             <button 
                                 type="button"
                                 onClick={() => setChartMode('density')}
                                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                     chartMode === 'density' 
                                         ? 'bg-white text-slate-900 shadow-sm' 
                                         : 'text-slate-400 hover:text-slate-700'
                                 }`}
                             >
                                 Submissions
                             </button>
                        </div>
                    </div>

                    <div className="h-[360px] w-full">
                        <DynamicPerformanceChart 
                            data={chartMode === 'average' ? performanceTrend : submissionDensity} 
                            mode={chartMode}
                        />
                    </div>
                </div>

                {/* Submissions Matrix */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div className="flex items-center gap-3">
                             <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                 <Users className="w-5 h-5 text-indigo-600" />
                             </div>
                             <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Submissions</h2>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1">
                                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Filter by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-[1.2rem] text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                                />
                            </div>
                            <button className="p-3 bg-slate-50 border border-slate-100 rounded-[1.2rem] text-slate-400 hover:text-indigo-600 transition-all">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {submissions.filter((sub: any) => sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.exam.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                      <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                      <th className="px-8 py-5">Academic Record</th>
                                      <th className="px-8 py-5">Assessment</th>
                                      <th className="px-8 py-5">Metric</th>
                                      <th className="px-8 py-5">Status</th>
                                      <th className="px-8 py-5 text-right">Verification</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                  {submissions
                                    .filter((sub: any) => sub.name.toLowerCase().includes(searchTerm.toLowerCase()) || sub.exam.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((sub: any) => (
                                      <tr key={sub.id} className="hover:bg-indigo-50/30 transition-all cursor-default group">
                                          <td className="px-8 py-6">
                                               <div className="flex items-center gap-3">
                                                   <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px]">
                                                       {sub.name.charAt(0)}
                                                   </div>
                                                   <span className="text-sm font-black text-slate-900">{sub.name}</span>
                                               </div>
                                          </td>
                                          <td className="px-8 py-6 text-sm font-bold text-slate-500 italic max-w-[200px] truncate">{sub.exam}</td>
                                          <td className="px-8 py-6">
                                               <span className="text-sm font-black text-indigo-600">{sub.score}</span>
                                          </td>
                                          <td className="px-8 py-6">
                                              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest
                                                  ${sub.status === 'Finalized' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                    sub.status === 'Flagged' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                    'bg-amber-50 text-amber-700 border border-amber-100'}
                                              `}>
                                                  {sub.status === 'Finalized' && <CheckCircle className="w-3 h-3" />}
                                                  {sub.status === 'Flagged' && <AlertCircle className="w-3 h-3" />}
                                                  {sub.status}
                                              </span>
                                          </td>
                                          <td className="px-8 py-6 text-right">
                                              <button 
                                                  onClick={() => handleReviewClick(sub)}
                                                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                              >
                                                  Review
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                    ) : (
                      <div className="p-20 text-center text-slate-400">
                        <p className="text-xs font-black uppercase tracking-widest">{submissions.length === 0 ? 'Awaiting Initial Data Ingress...' : 'No Submissions Match Filter'}</p>
                      </div>
                    )}
                </div>
            </div>

            {/* Live Feed (4 column) */}
            <div className="lg:col-span-4 space-y-8">
                
                {/* Upcoming Assessments */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                <MonitorPlay className="w-5 h-5 text-amber-600" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Matrix</h2>
                        </div>
                        <button onClick={() => onNavigate('/faculty-exams')} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">
                            Global List
                        </button>
                    </div>

                    <div className="space-y-4">
                        {upcomingExams.length > 0 ? (
                            upcomingExams.map((exam: any) => (
                                <div key={exam.id} className="p-5 rounded-[2rem] border border-slate-50 bg-slate-50/30 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border
                                            ${exam.status === 'In Progress' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse' : 'bg-slate-900 text-white border-slate-900'}
                                        `}>
                                            {exam.status}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.date}</span>
                                    </div>

                                    <h3 className="font-black text-slate-900 mb-2 truncate uppercase tracking-tight">{exam.title}</h3>
                                    
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Clock className="w-3.5 h-3.5 text-indigo-600" /> {exam.time}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Users className="w-3.5 h-3.5 text-indigo-600" /> {exam.students}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onNavigate('/live-monitoring')}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                    >
                                        Access Module <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Empty Workspace</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Dynamic Submission Review Modal */}
      {activeReviewSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-8 text-white relative flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Assessment Verification Record
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{activeReviewSubmission.name}</h3>
                <p className="text-xs text-indigo-200/70 font-medium">
                  {activeReviewSubmission.email} • {activeReviewSubmission.exam}
                </p>
              </div>
              
              <button 
                onClick={() => setActiveReviewSubmission(null)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              {/* 4 Metric Pill Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score</span>
                  <p className="text-2xl font-black text-indigo-600 mt-1">{activeReviewSubmission.score}</p>
                  <span className="text-[10px] font-bold text-slate-400">Recorded Metric</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</span>
                  <p className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      activeReviewSubmission.status === 'Finalized' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {activeReviewSubmission.status === 'Finalized' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {activeReviewSubmission.status}
                    </span>
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">Review State</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Integrity</span>
                  <p className={`text-2xl font-black mt-1 ${
                    ((reviewExamDetail?.students?.find((s: any) => String(s.student_id) === String(activeReviewSubmission.studentId) || String(s.id) === String(activeReviewSubmission.id))?.integrity_score ?? 100) >= 80) ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {reviewExamDetail?.students?.find((s: any) => String(s.student_id) === String(activeReviewSubmission.studentId) || String(s.id) === String(activeReviewSubmission.id))?.integrity_score ?? (activeReviewSubmission.violations > 0 ? 75 : 100)}%
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">Fidelity Index</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Flags</span>
                  <p className={`text-2xl font-black mt-1 ${activeReviewSubmission.violations > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {activeReviewSubmission.violations}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">Detected Anomalies</span>
                </div>
              </div>

              {isReviewLoading ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Retrieving Full Assessment Telemetry...</p>
                </div>
              ) : (() => {
                const studentRecord = reviewExamDetail?.students?.find((s: any) => 
                  String(s.student_id) === String(activeReviewSubmission.studentId) || 
                  String(s.id) === String(activeReviewSubmission.id)
                ) || reviewExamDetail?.students?.[0];

                const studentViolations = studentRecord?.violations || [];
                const studentQuestions = studentRecord?.questions || [];

                return (
                  <>
                    {/* Proctoring & Violation Evidence */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-black text-sm uppercase tracking-tight text-slate-900">Proctoring Telemetry & Violations</h4>
                      </div>

                      {studentViolations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {studentViolations.map((v: any, vi: number) => {
                            const imgUrl = v.evidence_screenshot
                              ? (v.evidence_screenshot.startsWith('http') ? v.evidence_screenshot : `http://localhost:8000${v.evidence_screenshot.startsWith('/') ? '' : '/'}${v.evidence_screenshot}`)
                              : null;
                            return (
                              <div key={vi} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                {imgUrl && (
                                  <div className="h-36 rounded-xl overflow-hidden bg-slate-200 border border-slate-200">
                                    <img src={imgUrl} alt="Violation Evidence" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">{v.violation_type?.replace(/_/g, ' ') || 'Anomaly'}</span>
                                  <span className="text-slate-400">{v.detected_at ? new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}</span>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">{v.description || 'Proctoring flag recorded during examination session.'}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <p className="text-xs font-bold text-emerald-800">
                            Zero proctoring infractions detected during this assessment session. Integrity certified.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Questions & Submitted Responses */}
                    {studentQuestions.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-black text-sm uppercase tracking-tight text-slate-900">Submitted Responses & Evaluation</h4>
                        </div>

                        <div className="space-y-3">
                          {studentQuestions.map((q: any, qi: number) => {
                            const isCorrect = q.isCorrect ?? (q.userAnswerId && String(q.userAnswerId) === String(q.correctAnswerId));
                            return (
                              <div key={qi} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <div className="flex justify-between items-start gap-4">
                                  <span className="text-xs font-black text-slate-900">Q{qi + 1}. {q.text}</span>
                                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded border ${
                                    isCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {isCorrect ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                {q.explanation && (
                                  <p className="text-[11px] text-slate-500 font-medium italic">{q.explanation}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4">
              <span className="text-[10px] font-mono text-slate-400">
                Record ID: #{activeReviewSubmission.id} • Attempt Date: {activeReviewSubmission.date}
              </span>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const examId = activeReviewSubmission.examId;
                    const studentId = activeReviewSubmission.studentId;
                    setActiveReviewSubmission(null);
                    if (examId) {
                      onNavigate(`/exam-analytics?id=${examId}${studentId ? `&studentId=${studentId}` : ''}`);
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Exam Audit
                </button>
                <button 
                  onClick={() => setActiveReviewSubmission(null)}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// Advanced Performance Chart implementation
const DynamicPerformanceChart = ({ 
    data = [], 
    mode = 'average' 
}: { 
    data: number[]; 
    mode?: 'average' | 'density'; 
}) => {
    // Fill with zeroes if we don't have exactly 15 points
    const safeData = Array.isArray(data) ? data : [];
    const fullData = [...(new Array(max(0, 15 - safeData.length)).fill(0)), ...safeData].slice(-15);
    const width = 1000;
    const height = 360;
    const paddingLeft = 75;
    const paddingRight = 45;
    const paddingTop = 55;
    const paddingBottom = 55;

    const maxX = fullData.length - 1;
    const minY = 0;
    const isDensity = mode === 'density';
    
    // In average mode, maxY is 100%. In density mode, maxY is dynamically scaled based on max submissions
    const rawMax = Math.max(0, ...fullData);
    const maxY = isDensity ? Math.max(4, Math.ceil((rawMax || 1) / 4) * 4) : 100;
    const rangeY = maxY - minY;

    const points = fullData.map((d, i) => {
        const x = paddingLeft + (i / maxX) * (width - paddingLeft - paddingRight);
        const y = (height - paddingBottom) - ((d - minY) / rangeY) * (height - paddingTop - paddingBottom);
        return { x, y, val: d, dayIndex: i };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`;

    const gridSteps = [0, 0.25, 0.5, 0.75, 1]; // 100%, 75%, 50%, 25%, 0% or Density steps

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id="chartGlow" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                </linearGradient>
            </defs>
            
            {/* Grid Lines and Large Y-Axis Numbers */}
            {gridSteps.map((p, i) => {
                const lineY = paddingTop + (p * (height - paddingTop - paddingBottom));
                const labelVal = isDensity 
                    ? String(Math.round((1 - p) * maxY))
                    : `${Math.round((1 - p) * 100)}%`;

                return (
                    <g key={i}>
                        <line 
                            x1={paddingLeft} 
                            y1={lineY} 
                            x2={width - paddingRight} 
                            y2={lineY} 
                            stroke="#E2E8F0" 
                            strokeWidth="1.5" 
                            strokeDasharray={p === 1 ? undefined : "4 4"}
                        />
                        <text 
                            x={paddingLeft - 14} 
                            y={lineY + 5} 
                            textAnchor="end" 
                            fill="#64748B" 
                            fontSize="16" 
                            fontWeight="900"
                            className="font-mono select-none"
                        >
                            {labelVal}
                        </text>
                    </g>
                );
            })}

            {/* X-Axis Timeline Day Labels */}
            {points.map((p, i) => {
                let label = '';
                if (i === 0) label = '14d ago';
                else if (i === 3) label = '11d ago';
                else if (i === 7) label = '7d ago';
                else if (i === 11) label = '3d ago';
                else if (i === 14) label = 'Today';

                if (!label) return null;
                return (
                    <text
                        key={`x-${i}`}
                        x={p.x}
                        y={height - 15}
                        textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                        fill="#64748B"
                        fontSize="14"
                        fontWeight="900"
                        className="font-mono uppercase tracking-wider select-none"
                    >
                        {label}
                    </text>
                );
            })}

            {/* Path and Area */}
            <path d={areaD} fill="url(#chartGlow)" />
            <path d={pathD} fill="none" stroke="#4F46E5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_10px_20px_rgba(79,70,229,0.35)]" />
            
            {/* Prominent Callout Badges on Non-Zero Scores / Peaks */}
            {points.map((p, i) => {
                if (p.val === 0) return null;
                const badgeText = isDensity 
                    ? `${p.val} ${p.val === 1 ? 'Exam' : 'Exams'}`
                    : `${p.val}%`;
                const badgeWidth = isDensity ? 88 : 68;

                return (
                    <g key={`score-callout-${i}`}>
                        <circle cx={p.x} cy={p.y} r="7" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="3.5" className="drop-shadow-md" />
                        <g transform={`translate(${p.x}, ${p.y - 28})`}>
                            <rect 
                                x={-badgeWidth / 2} 
                                y="-22" 
                                width={badgeWidth} 
                                height="28" 
                                rx="10" 
                                fill="#0F172A" 
                                className="drop-shadow-xl"
                            />
                            <text 
                                x="0" 
                                y="-3" 
                                textAnchor="middle" 
                                fill="#FFFFFF" 
                                fontSize="15" 
                                fontWeight="900"
                                className="font-mono select-none tracking-tight"
                            >
                                {badgeText}
                            </text>
                        </g>
                    </g>
                );
            })}

            {/* Critical Interaction Layer (Hover Tooltips) */}
            {points.map((p, i) => {
                const tooltipText = isDensity 
                    ? `${p.val} ${p.val === 1 ? 'Submission' : 'Submissions'}`
                    : `${p.val}% Index`;
                return (
                    <g key={i} className="group cursor-pointer">
                        <circle cx={p.x} cy={p.y} r="9" fill="white" stroke="#4F46E5" strokeWidth="4" className="opacity-0 group-hover:opacity-100 transition-all duration-300" />
                        <foreignObject x={p.x - 55} y={p.y - 65} width="110" height="48" className="opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-0 group-hover:scale-100 origin-bottom">
                            <div className="bg-slate-900 text-white text-xs font-black py-2.5 rounded-xl text-center shadow-xl border border-white/10 uppercase tracking-tighter">
                                {tooltipText}
                            </div>
                        </foreignObject>
                    </g>
                );
            })}
        </svg>
    );
};

const max = (a: number, b: number) => a > b ? a : b;
