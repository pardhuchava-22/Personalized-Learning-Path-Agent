
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User, Exam } from '../types';
import { examsAPI, questionsAPI } from '../services/apiService';
import { useAuth } from '../services/authContext';
import { 
  Plus, Search, Filter, MoreHorizontal, Calendar, Users, 
  Clock, BarChart, Edit, Copy, Trash2, Eye, PlayCircle, FileText, Loader2,
  Sparkles, ShieldCheck, Activity, ChevronRight, X, CheckCircle, Check, Code, Layers
} from 'lucide-react';

interface FacultyExamsProps {
  onNavigate: (path: string) => void;
}

export const FacultyExamsScreen: React.FC<FacultyExamsProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic Exam Assets State
  const [selectedExamAssets, setSelectedExamAssets] = useState<Exam | any | null>(null);
  const [assetQuestions, setAssetQuestions] = useState<any[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [assetExamDetails, setAssetExamDetails] = useState<any | null>(null);

  const handleOpenAssets = async (examItem: Exam | any) => {
    setSelectedExamAssets(examItem);
    setIsAssetsLoading(true);
    setAssetQuestions([]);
    setAssetExamDetails(null);

    try {
      const [questionsRes, examDetailRes] = await Promise.allSettled([
        questionsAPI.getExamQuestions(examItem.id),
        examsAPI.getExam(examItem.id)
      ]);

      if (questionsRes.status === 'fulfilled') {
        const raw = questionsRes.value;
        const qList = Array.isArray(raw) ? raw : (raw?.results || []);
        setAssetQuestions(qList);
      }

      if (examDetailRes.status === 'fulfilled') {
        setAssetExamDetails(examDetailRes.value);
      }
    } catch (err) {
      console.error('Failed to load exam assets:', err);
    } finally {
      setIsAssetsLoading(false);
    }
  };

  const handleCloseAssets = () => {
    setSelectedExamAssets(null);
    setAssetQuestions([]);
    setAssetExamDetails(null);
    if (window.location.hash.includes('exam-details')) {
      onNavigate('/faculty-exams');
    }
  };

  const user: User = {
    id: String(authUser?.id || '0'),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Professor Smith',
    email: authUser?.email || 'admin@quantumguard.com',
    role: 'faculty'
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await examsAPI.getMyExams();
      
      const transformedExams: Exam[] = data.map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        courseName: item.course_name,
        date: item.start_time,
        status: item.status === 'published' ? 'Scheduled' : 
                item.status === 'active' ? 'Live' : 
                item.status === 'closed' ? 'Completed' : 'Draft',
        totalStudents: item.enrolled_count || 0,
        durationMinutes: item.duration_minutes,
        questionCount: item.question_count,
      }));
      
      setExams(transformedExams);
    } catch (err) {
      console.error('Failed to fetch faculty exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Deep-link support: Auto-open modal if URL contains ?id=... or /exam-details?id=...
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('exam-details') || hash.includes('id=')) {
      const match = hash.match(/[?&]id=([^&]+)/);
      if (match && match[1]) {
        const targetId = match[1];
        const existing = exams.find(e => String(e.id) === String(targetId));
        if (existing) {
          handleOpenAssets(existing);
        } else if (!loading) {
          examsAPI.getExam(targetId).then((examData: any) => {
            if (examData && examData.id) {
              handleOpenAssets({
                id: examData.id.toString(),
                title: examData.title,
                courseName: examData.course_name,
                date: examData.start_time,
                status: examData.status === 'published' ? 'Scheduled' :
                        examData.status === 'active' ? 'Live' :
                        examData.status === 'closed' ? 'Completed' : 'Draft',
                totalStudents: examData.enrolled_count || 0,
                durationMinutes: examData.duration_minutes,
                questionCount: examData.question_count,
              });
            }
          }).catch(console.error);
        }
      }
    }
  }, [exams, loading]);

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/faculty-exams">
      <div className="max-w-[1600px] mx-auto pb-12 animate-slide-up px-4 md:px-0">
        
        {/* Header Section with Glassmorphism */}
        <div className="relative mb-12 p-8 md:p-12 bg-indigo-900 rounded-[2.5rem] overflow-hidden text-white shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-indigo-300" />
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-300">Assessment Intelligent</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">Exam Management</h1>
                    <p className="text-indigo-200/80 max-w-xl font-medium text-lg leading-relaxed">
                        Orchestrate secure, high-integrity evaluations. Design AI-augmented assessments and monitor student performance in real-time.
                    </p>
                </div>
                <button 
                    onClick={() => onNavigate('/faculty-exams/create')}
                    className="group flex items-center gap-3 bg-white text-indigo-900 px-8 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1 active:scale-95"
                >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    Ignite Smart Exam
                </button>
            </div>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
            <div className="relative flex-1 w-full group">
                <Search className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filter records by examination title or course domain..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[1.8rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400"
                />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    Status
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Archive
                </button>
            </div>
        </div>

        {/* Assessment Matrix */}
        {loading ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                    </div>
                </div>
                <p className="mt-6 text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Synchronizing Assessment Data...</p>
            </div>
        ) : filteredExams.length === 0 ? (
            <div className="p-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200 transition-transform group-hover:scale-105 duration-500">
                    <FileText className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Zero Records Found</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto mb-10 leading-relaxed text-lg">No examinations have been identified. Initialize your academic repository by creating your first smart assessment.</p>
                <button 
                    onClick={() => onNavigate('/faculty-exams/create')}
                    className="bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100 hover:-translate-y-1"
                >
                    Initialize First Exam
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-6">
                {filteredExams.map((exam) => (
                    <div key={exam.id} className="group relative bg-white border border-slate-100 rounded-[2.2rem] p-8 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 flex flex-col xl:flex-row xl:items-center justify-between gap-8 cursor-default">
                        
                        {/* Exam Identity */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-3 h-3 rounded-full ${
                                    exam.status === 'Live' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse' :
                                    exam.status === 'Scheduled' ? 'bg-amber-500' :
                                    exam.status === 'Completed' ? 'bg-indigo-500' : 'bg-slate-300'
                                }`}></div>
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border
                                    ${exam.status === 'Live' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                      exam.status === 'Draft' ? 'bg-slate-50 text-slate-600 border-slate-100' : 
                                      exam.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                      'bg-amber-50 text-amber-700 border-amber-100'}
                                `}>
                                    {exam.status}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {exam.id}</span>
                            </div>
                            
                            <h3 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{exam.title}</h3>
                            
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-3 text-slate-500">
                                    <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                        <Activity className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Domain</span>
                                        <span className="text-sm font-bold text-slate-700">{exam.courseName}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 border-l border-slate-100 pl-6">
                                    <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date</span>
                                        <span className="text-sm font-bold text-slate-700">{typeof exam.date === 'string' ? new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(exam.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 border-l border-slate-100 pl-6">
                                    <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assigned</span>
                                        <span className="text-sm font-bold text-slate-700">{exam.totalStudents} Students</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 border-l border-slate-100 pl-6">
                                    <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                        <Clock className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Questions</span>
                                        <span className="text-sm font-bold text-slate-700">{exam.questionCount} Items</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Professional Actions Bridge */}
                        <div className="flex flex-row xl:flex-col items-center gap-4 shrink-0 pt-8 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-10">
                            {exam.status === 'Live' && (
                                <button 
                                    onClick={() => onNavigate('/live-monitoring')}
                                    className="flex-1 xl:w-full flex items-center justify-center gap-4 px-10 py-5 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 active:scale-95"
                                >
                                    <PlayCircle className="w-5 h-5" /> Live Monitor
                                </button>
                            )}
                            
                            {exam.status === 'Draft' && (
                                <button className="flex-1 xl:w-full flex items-center justify-center gap-4 px-10 py-5 rounded-[1.5rem] bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1">
                                    <Edit className="w-5 h-5" /> Continue Setup
                                </button>
                            )}

                            {(exam.status === 'Scheduled' || exam.status === 'Completed') && (
                                <button 
                                    onClick={() => exam.status === 'Completed' ? onNavigate(`/exam-analytics?id=${exam.id}`) : handleOpenAssets(exam)}
                                    className={`flex-1 xl:w-full flex items-center justify-center gap-4 px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1 ${
                                        exam.status === 'Completed' 
                                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100' 
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {exam.status === 'Completed' ? <BarChart className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    {exam.status === 'Completed' ? 'Performance' : 'View Assets'}
                                </button>
                            )}

                            <div className="flex gap-3">
                                <button className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.2rem] transition-all border border-transparent hover:border-indigo-100 shadow-sm md:shadow-none">
                                    <MoreHorizontal className="w-6 h-6" />
                                </button>
                                <button className="p-5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[1.2rem] transition-all border border-transparent hover:border-red-100 shadow-sm md:shadow-none">
                                    <Trash2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Global Security Summary */}
        <div className="mt-16 bg-white border border-slate-100 rounded-[3rem] p-12 shadow-sm flex flex-col md:flex-row items-center gap-10">
            <div className="w-24 h-24 bg-indigo-900 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl shadow-indigo-200">
                <ShieldCheck className="w-12 h-12 text-indigo-300" />
            </div>
            <div className="flex-1 text-center md:text-left">
                <h4 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">Academic Integrity Engine</h4>
                <p className="text-slate-500 font-medium leading-relaxed text-lg max-w-4xl">
                    All assessments are encrypted and monitored by the QuantumGuard Security Protocol. 
                    Monitor student eye-tracking, environment stability, and suspicious behavior patterns via the <span className="text-indigo-600 font-bold hover:underline cursor-pointer">Live Monitoring Command Center</span>.
                </p>
            </div>
            <button className="flex items-center gap-3 font-black text-xs uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors group">
                Review Protocols <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </button>
        </div>

      </div>

      {/* Exam Assets Modal */}
      {selectedExamAssets && (
        <div id="exam-assets-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-start shrink-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">
                    Curriculum Repository • Examination Assets
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  {selectedExamAssets.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200/80 font-medium">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white font-bold uppercase text-[10px] tracking-wider">
                    {selectedExamAssets.courseName || assetExamDetails?.course_name || 'Course Curriculum'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedExamAssets.date ? new Date(selectedExamAssets.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible Scheduling'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {assetExamDetails?.duration_minutes || selectedExamAssets.durationMinutes || 60} Minutes
                  </span>
                </div>
              </div>

              <button 
                onClick={handleCloseAssets}
                className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Overview / Specs Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-100 shrink-0">
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Questions</div>
                <div className="text-xl font-black text-slate-900">
                  {assetQuestions.length || selectedExamAssets.questionCount || 0}
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Marks</div>
                <div className="text-xl font-black text-indigo-600">
                  {assetExamDetails?.total_marks ?? 100} <span className="text-xs text-slate-400 font-bold">/ Pass: {assetExamDetails?.passing_marks ?? 40}%</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Negative Marking</div>
                <div className="text-xl font-black text-slate-900">
                  {assetExamDetails?.negative_marking ? `-${assetExamDetails.negative_marking} Marks` : 'Disabled'}
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Integrity Mode</div>
                <div className="text-xl font-black text-emerald-600 flex items-center gap-1.5 text-sm md:text-base">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  AI Monitored
                </div>
              </div>
            </div>

            {/* Modal Body: Dynamic Questions Asset List */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {isAssetsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className="text-sm font-bold tracking-wide uppercase text-slate-500">
                    Retrieving Dynamic Examination Assets & Questions...
                  </p>
                </div>
              ) : assetQuestions.length === 0 ? (
                <div className="py-16 p-8 bg-slate-50 border border-slate-200/80 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 mb-1">No Question Assets Found</h4>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      There are currently no questions registered for this examination. Use the Smart Exam Builder or question configuration tool to attach questions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-black text-sm uppercase tracking-tight text-slate-900">
                        Assessment Assets & Question Inventory ({assetQuestions.length} Items)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      Answer Keys & Solutions Verified
                    </span>
                  </div>

                  {assetQuestions.map((q: any, idx: number) => {
                    const isMCQ = q.question_type === 'mcq' || (!q.question_type && q.mcq_details);
                    const isCoding = q.question_type === 'coding' || (!q.question_type && q.coding_details);

                    return (
                      <div key={q.id || idx} className="p-6 bg-slate-50/70 hover:bg-slate-50 rounded-3xl border border-slate-200/80 transition-all space-y-4 shadow-sm">
                        {/* Question Top Row */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-indigo-100">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="font-black text-slate-900 text-sm md:text-base">
                              {q.title || `Question ${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Type Badge */}
                            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                              isCoding 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {isCoding ? 'Coding Challenge' : 'Multiple Choice'}
                            </span>

                            {/* Difficulty */}
                            {q.difficulty && (
                              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                                q.difficulty.toLowerCase() === 'easy' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : q.difficulty.toLowerCase() === 'hard'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {q.difficulty}
                              </span>
                            )}

                            {/* Marks */}
                            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-200 text-slate-800">
                              {q.marks || 5} Marks
                            </span>
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <p className="text-slate-700 font-medium text-sm leading-relaxed">
                          {q.description || q.title}
                        </p>

                        {/* MCQ Options */}
                        {isMCQ && q.mcq_details?.options && (
                          <div className="space-y-2.5 pt-2">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                              Options & Verified Answer Key:
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.mcq_details.options.map((opt: any, optIdx: number) => {
                                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                                const letter = letters[optIdx] || String(optIdx + 1);
                                const isCorrect = !!opt.is_correct;

                                return (
                                  <div 
                                    key={opt.id || optIdx}
                                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                      isCorrect 
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                        isCorrect 
                                          ? 'bg-emerald-600 text-white shadow-sm' 
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {letter}
                                      </span>
                                      <span className="text-xs leading-snug">{opt.option_text}</span>
                                    </div>

                                    {isCorrect && (
                                      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full shrink-0">
                                        <Check className="w-3 h-3 stroke-[3]" /> Correct
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Coding Question Details */}
                        {isCoding && q.coding_details && (
                          <div className="space-y-4 pt-2">
                            {/* Starter Code Block */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                  Starter Template ({q.coding_details.programming_language || 'python'})
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Time Limit: {q.coding_details.time_limit_seconds || 30}s • Memory: {q.coding_details.memory_limit_mb || 256}MB
                                </span>
                              </div>
                              <div className="bg-slate-900 rounded-2xl p-4 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                                <pre className="whitespace-pre">{q.coding_details.starter_code || '// Starter code not defined'}</pre>
                              </div>
                            </div>

                            {/* Test Cases */}
                            {q.coding_details.test_cases && q.coding_details.test_cases.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                  Validation Test Cases ({q.coding_details.test_cases.length})
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {q.coding_details.test_cases.map((tc: any, tcIdx: number) => (
                                    <div key={tc.id || tcIdx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono space-y-1.5">
                                      <div className="flex justify-between items-center text-[10px] font-bold font-sans">
                                        <span className="text-slate-500">Test Case #{tcIdx + 1}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                          tc.is_visible ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {tc.is_visible ? 'Visible' : 'Hidden'}
                                        </span>
                                      </div>
                                      <div className="text-slate-700"><span className="text-slate-400">Input:</span> {tc.input_data}</div>
                                      <div className="text-emerald-600 font-bold"><span className="text-slate-400 font-normal">Expected:</span> {tc.expected_output}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4 shrink-0">
              <span className="text-[11px] font-mono text-slate-400">
                Asset Vault ID: #{selectedExamAssets.id} • Protocol: QuantumGuard v2.4 Certified
              </span>

              <div className="flex items-center gap-3">
                {selectedExamAssets.status === 'Completed' && (
                  <button 
                    onClick={() => {
                      const id = selectedExamAssets.id;
                      handleCloseAssets();
                      onNavigate(`/exam-analytics?id=${id}`);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    <BarChart className="w-4 h-4" /> View Analytics
                  </button>
                )}
                {selectedExamAssets.status === 'Live' && (
                  <button 
                    onClick={() => {
                      handleCloseAssets();
                      onNavigate('/live-monitoring');
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                  >
                    <PlayCircle className="w-4 h-4" /> Open Live Monitor
                  </button>
                )}
                <button 
                  onClick={handleCloseAssets}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                >
                  Close Vault
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </DashboardLayout>
  );
};