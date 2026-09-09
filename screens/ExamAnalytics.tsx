
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { useAuth } from '../services/authContext';
import { toAppRole } from '../services/roles';
import { examsAPI } from '../services/apiService';
import { 
  Download, Calendar, ChevronDown, Users, Clock, Award, 
  CheckCircle, AlertTriangle, Search, Filter, MoreHorizontal,
  TrendingUp, TrendingDown, FileText, Mail, ShieldAlert,
  X, ExternalLink, Eye, Activity, ShieldCheck, Info, Maximize2, Video
} from 'lucide-react';

interface ExamAnalyticsProps {
  onNavigate: (path: string) => void;
}

export const ExamAnalyticsScreen: React.FC<ExamAnalyticsProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('Last 30 days');

  const facultyUser: User = { 
    id: String(authUser?.id || ''), 
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty', 
    email: authUser?.email || '', 
    role: toAppRole(authUser?.role) 
  };

  useEffect(() => {
    const fetchExamAnalytics = async () => {
      try {
        setLoading(true);
        // Extract ID from hash: #/exam-analytics?id=4
        const hash = window.location.hash;
        const idMatch = hash.match(/[?&]id=([^&]+)/);
        const examId = idMatch ? idMatch[1] : null;

        if (!examId) {
          // If no ID, maybe fetch latest exam or show error
          setLoading(false);
          return;
        }

        const data = await examsAPI.getExamResultsDetail(examId);
        setExamData(data);

        const studentIdMatch = hash.match(/[?&]studentId=([^&]+)/);
        const targetStudentId = studentIdMatch ? studentIdMatch[1] : null;
        if (targetStudentId && data.students) {
          const found = data.students.find((s: any) => 
            String(s.student_id) === String(targetStudentId) || 
            String(s.id) === String(targetStudentId)
          );
          if (found) {
            setSelectedStudent(found);
            setShowModal(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exam analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExamAnalytics();
  }, []);

  const handleBlockStudent = async (studentId: string | number) => {
    try {
      const hash = window.location.hash;
      const idMatch = hash.match(/[?&]id=([^&]+)/);
      const examId = idMatch ? idMatch[1] : null;
      if (!examId) return;

      await examsAPI.blockStudent(examId, studentId);
      // Refresh data
      const data = await examsAPI.getExamResultsDetail(examId);
      setExamData(data);
    } catch (err) {
      console.error('Failed to block student:', err);
      alert('Failed to block student');
    }
  };

  const handleUnblockStudent = async (studentId: string | number) => {
    try {
      const hash = window.location.hash;
      const idMatch = hash.match(/[?&]id=([^&]+)/);
      const examId = idMatch ? idMatch[1] : null;
      if (!examId) return;

      await examsAPI.unblockStudent(examId, studentId);
      // Refresh data
      const data = await examsAPI.getExamResultsDetail(examId);
      setExamData(data);
    } catch (err) {
      console.error('Failed to unblock student:', err);
      alert('Failed to unblock student');
    }
  };

  if (loading) {
    return (
      <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/reports">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aggregating Intelligence...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!examData) {
    return (
      <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/reports">
        <div className="max-w-2xl mx-auto py-20 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">No Exam Selected</h2>
          <p className="text-slate-500 mb-8">Please select an exam from the dashboard to view its detailed analytical report.</p>
          <button 
            onClick={() => onNavigate('/faculty-exams')}
            className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
          >
            Go to Exams
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const filteredStudents = examData.students.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/reports">
      <div className="max-w-[1600px] mx-auto pb-24 animate-slide-up px-4 md:px-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Certified Integrity</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                  {examData.exam.title}
                  <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">ID: {examData.exam.id}</span>
                </h1>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Academic Performance & Compliance Audit Report
                </p>
            </div>
            <div className="flex gap-3">
                <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                    <Download className="w-4 h-4 text-indigo-600" /> Export Data
                </button>
                <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95">
                    <Mail className="w-4 h-4" /> Notify Students
                </button>
            </div>
        </div>

        {/* Audit Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
                label="Total Submissions" 
                value={examData.summary.total_students} 
                trend={`${Math.round((examData.summary.pass_count / examData.summary.total_students) * 100) || 0}% Pass`}
                icon={Users}
                color="text-indigo-600"
                bg="bg-indigo-50"
            />
            <StatCard 
                label="Mean Academic Score" 
                value={`${examData.summary.avg_score}%`} 
                trend={`Max ${examData.summary.max_score}%`}
                icon={Award}
                color="text-emerald-600"
                bg="bg-emerald-50"
                subLabel={examData.summary.avg_score > 80 ? 'Grade A' : examData.summary.avg_score > 60 ? 'Grade B' : 'Grade C'}
            />
            <StatCard 
                label="Integrity Incidents" 
                value={examData.summary.total_violations} 
                trend={`${examData.summary.flagged_students} Students Flagged`}
                icon={ShieldAlert}
                color={examData.summary.total_violations > 0 ? "text-red-600" : "text-emerald-600"}
                bg={examData.summary.total_violations > 0 ? "bg-red-50" : "bg-emerald-50"}
            />
            <StatCard 
                label="Compliance Rating" 
                value={`${Math.round(examData.students.reduce((acc: number, s: any) => acc + (s.integrity_score || 100), 0) / (examData.students.length || 1))}%`} 
                trend="Weighted Mean"
                icon={CheckCircle}
                color="text-blue-600"
                bg="bg-blue-50"
            />

        </div>

        {/* Student Performance Matrix */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden mb-12">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Student Assessment Matrix</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time dynamic student results & violation logs</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="Identify student..." 
                            value={searchQuery || ''}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-indigo-500 w-full md:w-72 transition-all"
                        />
                    </div>
                    <button className="p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-400 transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-5">Full Academic Name</th>
                            <th className="px-8 py-5 text-center">Score</th>
                            <th className="px-8 py-5 text-center">Integrity</th>
                            <th className="px-8 py-5 text-center">Status</th>
                            <th className="px-8 py-5 text-center">Incidents</th>
                            <th className="px-8 py-5 text-right">Audit Action</th>

                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map((student: any) => (
                            <tr key={student.id} className="hover:bg-slate-50/80 transition-all group">
                                <td className="px-8 py-6">
                                  <div className="flex flex-col">
                                    <span className="font-black text-slate-800 tracking-tight text-base group-hover:text-indigo-600 transition-colors">{student.name}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{student.email}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-lg font-black text-slate-900 leading-none">{student.score}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">/ {examData.exam.total_marks}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-lg font-black leading-none ${
                                            student.integrity_score >= 90 ? 'text-emerald-600' :
                                            student.integrity_score >= 70 ? 'text-amber-600' : 'text-red-600'
                                        }`}>
                                            {student.integrity_score}%
                                        </span>
                                        <div className="w-12 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                            <div 
                                                className={`h-full ${student.integrity_score >= 90 ? 'bg-emerald-500' : student.integrity_score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${student.integrity_score}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                            student.result === 'pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            student.result === 'fail' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-slate-50 text-slate-600 border-slate-100'
                                        }`}>
                                            {student.result || 'Pending'}
                                        </span>
                                        {(student.is_blocked || student.is_auto_submitted) && (
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {student.is_blocked && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-black uppercase border border-red-200">Blocked</span>
                                                )}
                                                {student.is_auto_submitted && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase border border-amber-200">Auto</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className={`text-sm font-black ${student.violations_count > examData.exam.violation_threshold ? 'text-red-500' : student.violations_count > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        {student.violations_count}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Flags</span>
                                    </div>
                                </td>

                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {student.is_blocked ? (
                                            <button 
                                                onClick={() => handleUnblockStudent(student.student_id)}
                                                className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
                                                title="Unblock Student"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleBlockStudent(student.student_id)}
                                                className="p-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-all shadow-sm"
                                                title="Block Student"
                                            >
                                                <ShieldAlert className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                          onClick={() => {
                                            setSelectedStudent(student);
                                            setShowModal(true);
                                          }}
                                          className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all shadow-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Full Audit
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                <span>Showing {filteredStudents.length} Students Identified</span>
                <div className="flex gap-4">
                  <button className="hover:text-indigo-600 transition-colors cursor-pointer">Previous Batch</button>
                  <button className="hover:text-indigo-600 transition-colors cursor-pointer">Next Batch</button>
                </div>
            </div>
        </div>

        {/* Global Performance Benchmarks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-indigo-600" /> Score Distribution Benchmarks
                </h3>
                <div className="h-72 w-full">
                    {/* Reusing Histogram with Dynamic Logic if possible */}
                    <HistogramChart data={[
                      { range: '0-20', count: examData.students.filter((s:any) => s.percentage <= 20).length },
                      { range: '20-40', count: examData.students.filter((s:any) => s.percentage > 20 && s.percentage <= 40).length },
                      { range: '40-60', count: examData.students.filter((s:any) => s.percentage > 40 && s.percentage <= 60).length },
                      { range: '60-80', count: examData.students.filter((s:any) => s.percentage > 60 && s.percentage <= 80).length },
                      { range: '80-100', count: examData.students.filter((s:any) => s.percentage > 80).length }
                    ]} />
                </div>
            </div>
            
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <Activity className="w-48 h-48" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-[0.2em] mb-8 relative z-10">Advanced Integrity Analysis</h3>
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-[10px] text-indigo-400 mb-1">Top Violation Type</h4>
                      <p className="text-xl font-black">{examData.summary.total_violations > 0 ? "Multiple Faces" : "None Detected"}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-[10px] text-emerald-400 mb-1">Session Fidelity</h4>
                      <p className="text-xl font-black">{Math.max(0, 100 - examData.summary.flagged_students * 5)}% Stable</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-[10px] text-blue-400 mb-1">Flagged for Verification</h4>
                      <p className="text-xl font-black">{examData.summary.flagged_students} Students</p>
                    </div>
                    <ShieldAlert className="w-8 h-8 text-red-400" />
                  </div>
                </div>
            </div>
        </div>

        {/* Global Controls */}
        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row gap-6">
          <button className="flex-1 flex items-center justify-center gap-4 py-6 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all">
            <BarChart2 className="w-5 h-5" /> Generate Comparative Study
          </button>
          <button className="flex-1 flex items-center justify-center gap-4 py-6 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white hover:border-indigo-500 hover:text-indigo-600 transition-all">
            <Download className="w-5 h-5" /> Comprehensive Batch Export
          </button>
        </div>

      </div>

      {/* Student Audit Modal */}
      {showModal && selectedStudent && (
        <StudentAuditModal 
          student={selectedStudent} 
          examThreshold={examData.exam.violation_threshold}
          onClose={() => setShowModal(false)}
          onBlock={() => {
            handleBlockStudent(selectedStudent.student_id);
            setShowModal(false);
          }}
          onUnblock={() => {
            handleUnblockStudent(selectedStudent.student_id);
            setShowModal(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────

const StatCard = ({ label, value, trend, icon: Icon, color, bg, subLabel }: any) => (
    <div className="bg-white p-6 rounded-[1.8rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-2xl ${bg} ${color} shadow-sm`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${
              trend.includes('Flagged') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
                <Activity className="w-3 h-3" /> {trend}
            </div>
        </div>
        <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
            {subLabel && <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{subLabel}</span>}
        </div>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">{label}</p>
    </div>
);

const HistogramChart = ({ data }: { data: { range: string, count: number }[] }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    
    return (
        <div className="w-full h-full flex items-end justify-between gap-4 px-2 pt-10">
            {data.map((d, i) => {
                const barHeight = (d.count / maxCount) * 100;
                return (
                    <div key={i} className="flex flex-col items-center flex-1 group h-full justify-end">
                        <div className="relative w-full max-w-[80px] h-full flex items-end">
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-white py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap z-20 shadow-xl">
                                {d.count} Enrolled Records
                            </div>
                            
                            {/* Bar */}
                            <div 
                                className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-2xl transition-all duration-700 group-hover:from-indigo-500 group-hover:to-indigo-300 opacity-90 group-hover:opacity-100 relative shadow-lg shadow-indigo-100/50"
                                style={{ height: `${Math.max(5, barHeight)}%` }}
                            >
                              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-2/3 bg-white/20 rounded-full blur-sm"></div>
                            </div>
                        </div>
                        <span className="text-[10px] font-black tracking-widest text-slate-400 mt-4 uppercase">{d.range}%</span>
                    </div>
                );
            })}
        </div>
    );
};

const StudentAuditModal = ({ student, examThreshold, onClose, onBlock, onUnblock }: any) => {
  const [activeTab, setActiveTab] = useState<'violations' | 'activity'>('violations');
  const violations = student.violations || student.session?.violations || [];
  const activities = student.activities || student.session?.activities || [];


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-scale-up border border-white/20">
        
        {/* Modal Header */}
        <div className="bg-slate-900 p-8 md:p-12 text-white relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-indigo-300" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Detailed Compliance Log</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight">{student.name}</h2>
            <p className="text-indigo-200/60 font-bold uppercase tracking-[0.1em] text-xs mt-1">Audit Record • {student.email}</p>
          </div>

          <div className="flex flex-col items-end gap-3 relative z-10">
            <div className="flex items-baseline gap-4">
              <div className="flex flex-col items-end">
                <span className="text-4xl font-black text-white">{student.score}</span>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Academic Marks</span>
              </div>
              <div className="w-px h-10 bg-white/10 mx-2"></div>
              <div className="flex flex-col items-end">
                <span className={`text-4xl font-black ${student.integrity_score >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {student.integrity_score}%
                </span>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Integrity Rank</span>
              </div>
            </div>
            <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
              student.violations_count > examThreshold ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {student.violations_count} Detected Anomalies
            </div>
          </div>


          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-2xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex flex-col h-[70vh]">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 p-2 md:px-12 md:py-4 gap-2">
            <button 
              onClick={() => setActiveTab('violations')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'violations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> Integrity Log
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4" /> Activity Stream
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 md:p-12">
            {activeTab === 'violations' ? (
              <div className="space-y-6">
                {violations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <CheckCircle className="w-20 h-20 mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-[0.2em] text-sm italic">Pristine Session - No Violations Identified</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {violations.map((v: any, i: number) => {
                      const imgUrl = v.evidence_screenshot ? 
                        (v.evidence_screenshot.startsWith('http') ? v.evidence_screenshot : `http://localhost:8000${v.evidence_screenshot}`) 
                        : null;
                      return (
                      <div key={i} className="group bg-white border border-slate-100 rounded-[2.5rem] p-6 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50/50 transition-all duration-500 relative flex flex-col md:flex-row gap-8 items-center overflow-hidden">
                        
                        {imgUrl ? (
                          <div className="relative w-full md:w-72 rounded-3xl overflow-hidden border border-slate-100 h-48 bg-slate-50 shadow-md shrink-0">
                            <img 
                              src={imgUrl} 
                              alt="Violation Evidence" 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                                <Clock className="w-3 h-3 text-indigo-300" />
                                {new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-500">
                               <button 
                                 onClick={() => window.open(imgUrl, '_blank')}
                                 className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-2xl text-slate-900 shadow-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                               >
                                 <Maximize2 className="w-4 h-4 text-indigo-600" /> Expand
                               </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full md:w-72 rounded-3xl border-2 border-dashed border-slate-200 h-48 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0 group-hover:border-indigo-200 transition-colors">
                             <Video className="w-10 h-10 mb-3 opacity-20 group-hover:text-indigo-400 transition-colors" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No Visual Evidence</span>
                          </div>
                        )}

                        <div className="flex-1 w-full flex flex-col justify-center">
                           <div className="flex justify-between items-start w-full mb-3">
                             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                               v.severity === 'high' ? 'bg-red-50 text-red-600 border-red-100 shadow-red-100/50' : 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50'
                             }`}>
                               {v.violation_type_display || v.violation_type}
                             </span>
                             {!imgUrl && (
                                 <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-slate-100">
                                   <Clock className="w-3 h-3" />
                                   {new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                 </div>
                             )}
                           </div>
                           
                           <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                             {v.description || "Integrity Protocol Violation"}
                           </h4>
                           
                           <p className="text-sm font-medium text-slate-500 leading-relaxed p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             This anomaly triggered an automatic flag by the QuantumGuard AI proctoring engine. Severity rating indicated as <strong className="uppercase">{v.severity}</strong>.
                           </p>
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {activities.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <p className="font-bold uppercase tracking-widest text-xs">Zero Activity Logged</p>
                  </div>
                ) : (
                  <div className="relative pl-8 space-y-12 before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                    {activities.map((a: any, i: number) => (
                      <div key={i} className="relative group">
                        <div className="absolute -left-[27px] top-1.5 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full z-10 group-hover:scale-125 transition-transform shadow-sm"></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">{a.activity_type_display}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(a.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{a.description}</p>
                          {a.metadata && Object.keys(a.metadata).length > 0 && (
                            <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                              <pre className="text-[10px] font-mono text-slate-500 overflow-x-auto">
                                {JSON.stringify(a.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-8 md:px-12 md:py-8 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> High Fidelity Session
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Multi-Factor Auth
              </div>
            </div>
            <div className="flex gap-4">
              {student.is_blocked ? (
                <button 
                  onClick={onUnblock}
                  className="px-8 py-4 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
                >
                  Unblock Student
                </button>
              ) : (
                <button 
                  onClick={onBlock}
                  className="px-8 py-4 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all shadow-sm"
                >
                  Block Student
                </button>
              )}
              <button className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm" onClick={onClose}>Close Audit</button>
              <button 
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                onClick={() => window.print()}
              >Print Compliance Report</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BarChart2 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x2="12" y1="20" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);



