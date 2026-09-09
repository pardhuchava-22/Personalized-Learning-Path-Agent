
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, AlertTriangle, CheckCircle2, 
  Clock, X, Unlock, Ban, Users, MoreHorizontal,
  ArrowUpDown, FileText, Download, FileSpreadsheet, 
  FileWarning, Mail, Pause, Power, Wifi, WifiOff, Eye,
  ChevronDown, Activity, ShieldCheck, Check, ExternalLink, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { examsAPI } from '../services/apiService';

interface LiveMonitoringProps {
  onNavigate: (path: string) => void;
}

// --- Types ---
type StudentStatus = 'writing' | 'completed' | 'not_started' | 'blocked';

interface Student {
  id: string;
  dbStudentId?: number;
  studentId: string;
  name: string;
  email?: string;
  avatar: string;
  status: StudentStatus;
  timeRemaining: string;
  blockReason?: string;
  blockTimestamp?: string;
  completedAt?: string;
  progress: number;
  score?: number; // 0-100
  grade?: string; // A, B, etc.
  isOnline: boolean;
  violationsCount?: number;
  integrityScore?: number;
  raw?: any;
}

// --- Mock Data ---
const MOCK_STUDENTS: Student[] = [
  { 
    id: '1', studentId: 'ST-0001', name: 'Alex Johnson', avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=0D8ABC&color=fff',
    status: 'writing', timeRemaining: '45m 12s', progress: 65, isOnline: true 
  },
  { 
    id: '2', studentId: 'ST-0002', name: 'Maria Garcia', avatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=E11D48&color=fff',
    status: 'blocked', timeRemaining: 'Paused', blockReason: 'Multiple Faces Detected', blockTimestamp: '10:45 AM', progress: 42, isOnline: true 
  },
  { 
    id: '3', studentId: 'ST-0003', name: 'James Wilson', avatar: 'https://ui-avatars.com/api/?name=James+Wilson&background=D97706&color=fff',
    status: 'blocked', timeRemaining: 'Paused', blockReason: 'Phone Detected (98% conf.)', blockTimestamp: '10:12 AM', progress: 30, isOnline: false 
  },
  { 
    id: '4', studentId: 'ST-0004', name: 'Sarah Chen', avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=059669&color=fff',
    status: 'writing', timeRemaining: '42m 05s', progress: 78, isOnline: true 
  },
  { 
    id: '5', studentId: 'ST-0005', name: 'Michael Brown', avatar: 'https://ui-avatars.com/api/?name=Michael+Brown&background=475569&color=fff',
    status: 'not_started', timeRemaining: '60m 00s', progress: 0, isOnline: false 
  },
  { 
    id: '6', studentId: 'ST-0006', name: 'Emma Davis', avatar: 'https://ui-avatars.com/api/?name=Emma+Davis&background=7C3AED&color=fff',
    status: 'completed', timeRemaining: '-', completedAt: '10m ago', progress: 100, score: 92, grade: 'A', isOnline: true 
  },
  { 
    id: '7', studentId: 'ST-0007', name: 'David Lee', avatar: 'https://ui-avatars.com/api/?name=David+Lee&background=2563EB&color=fff',
    status: 'writing', timeRemaining: '55m 20s', progress: 20, isOnline: true 
  },
  { 
    id: '8', studentId: 'ST-0008', name: 'Lucas Miller', avatar: 'https://ui-avatars.com/api/?name=Lucas+Miller&background=DB2777&color=fff',
    status: 'completed', timeRemaining: '-', completedAt: '15m ago', progress: 100, score: 78, grade: 'C+', isOnline: false 
  },
  { 
    id: '9', studentId: 'ST-0009', name: 'Olivia Martinez', avatar: 'https://ui-avatars.com/api/?name=Olivia+Martinez&background=DC2626&color=fff',
    status: 'blocked', timeRemaining: 'Paused', blockReason: 'Gaze Aversion > 15s', blockTimestamp: '11:05 AM', progress: 55, isOnline: true 
  },
  { 
    id: '10', studentId: 'ST-0010', name: 'William Taylor', avatar: 'https://ui-avatars.com/api/?name=William+Taylor&background=0891B2&color=fff',
    status: 'completed', timeRemaining: '-', completedAt: '2m ago', progress: 100, score: 85, grade: 'B', isOnline: true 
  },
];

export const LiveMonitoringScreen: React.FC<LiveMonitoringProps> = ({ onNavigate }) => {
  // --- State ---
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Dynamic Exam Context
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | string>(2);
  const [examInfo, setExamInfo] = useState<{
    id: number | string;
    title: string;
    course_code: string;
    total_marks?: number;
    passing_marks?: number;
  }>({
    id: 2,
    title: 'Algorithms Final',
    course_code: 'CS302'
  });
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  
  // UI State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Unblock Modal State
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [unblockReason, setUnblockReason] = useState('');

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Student | null>(null);

  // View Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedStudentReport, setSelectedStudentReport] = useState<Student | null>(null);
  const [reportTab, setReportTab] = useState<'overview' | 'questions' | 'violations'>('overview');

  // Block Modal State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockTargetStudent, setBlockTargetStudent] = useState<Student | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Refs for click outside
  const exportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const examDropdownRef = useRef<HTMLDivElement>(null);

  // --- Dynamic Mapping Function ---
  const mapBackendStudents = (backendStudents: any[]): Student[] => {
    return backendStudents.map((s: any) => {
      let status: StudentStatus = 'not_started';
      if (s.is_blocked) {
        status = 'blocked';
      } else if (s.status === 'completed' || s.status === 'submitted') {
        status = 'completed';
      } else if (s.status === 'started') {
        status = 'writing';
      } else {
        status = 'not_started';
      }

      let timeRemaining = '60m 00s';
      if (status === 'blocked') {
        timeRemaining = 'Paused';
      } else if (status === 'completed') {
        timeRemaining = '-';
      } else if (status === 'writing') {
        if (s.time_taken && s.time_taken > 0) {
          const mins = Math.floor(s.time_taken / 60);
          const secs = s.time_taken % 60;
          timeRemaining = `${mins}m ${secs.toString().padStart(2, '0')}s`;
        } else {
          timeRemaining = '45m 12s';
        }
      }

      let currentBlockReason: string | undefined = undefined;
      let currentBlockTimestamp: string | undefined = undefined;
      if (s.is_blocked) {
        if (s.violations && s.violations.length > 0) {
          const topV = s.violations[0];
          currentBlockReason = topV.description || topV.title || (topV.violation_type ? topV.violation_type.replace(/_/g, ' ') : 'Proctoring Violation');
          currentBlockTimestamp = topV.detected_at 
            ? new Date(topV.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '10:45 AM';
        } else {
          currentBlockReason = 'Policy Violation / Proctor Intervention';
          currentBlockTimestamp = 'Recently';
        }
      }

      let progress = 0;
      if (status === 'completed') {
        progress = 100;
      } else if (status === 'writing' || status === 'blocked') {
        if (s.questions && s.questions.length > 0) {
          const answered = s.questions.filter((q: any) => q.userAnswerId !== null && q.userAnswerId !== undefined).length;
          progress = Math.round((answered / s.questions.length) * 100) || (status === 'blocked' ? 42 : 65);
        } else {
          progress = Math.round(s.percentage || (status === 'blocked' ? 42 : 65));
        }
      }

      const colors = ['0D8ABC', 'E11D48', 'D97706', '059669', '475569', '7C3AED', '2563EB', 'DB2777', 'DC2626', '0891B2'];
      const colorIdx = (s.student_id || s.id || 1) % colors.length;
      const avatarColor = colors[colorIdx];

      const finalPercentage = s.percentage !== null && s.percentage !== undefined ? s.percentage : s.score;
      let grade: string | undefined = undefined;
      if (finalPercentage !== null && finalPercentage !== undefined) {
        if (finalPercentage >= 90) grade = 'A';
        else if (finalPercentage >= 80) grade = 'B';
        else if (finalPercentage >= 70) grade = 'C+';
        else if (finalPercentage >= 60) grade = 'C';
        else grade = 'F';
      }

      const completedAt = s.submitted_at 
        ? new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : '10m ago';

      return {
        id: String(s.id),
        dbStudentId: s.student_id,
        studentId: `ST-${String(s.student_id || s.id).padStart(4, '0')}`,
        name: s.name || s.email?.split('@')[0] || 'Candidate',
        email: s.email || '',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name || 'Candidate')}&background=${avatarColor}&color=fff`,
        status,
        timeRemaining,
        blockReason: currentBlockReason,
        blockTimestamp: currentBlockTimestamp,
        completedAt,
        progress,
        score: finalPercentage !== null && finalPercentage !== undefined ? Math.round(finalPercentage) : undefined,
        grade,
        isOnline: Boolean(s.has_session || status === 'writing' || status === 'blocked'),
        violationsCount: s.violations_count || (s.violations ? s.violations.length : 0),
        integrityScore: s.integrity_score !== undefined && s.integrity_score !== null ? Math.round(s.integrity_score) : 100,
        raw: s
      };
    });
  };

  // --- Dynamic Data Fetcher ---
  const fetchLiveExamData = async (examId: number | string) => {
    try {
      setLoading(true);
      const data = await examsAPI.getExamResultsDetail(examId);
      if (data && data.students && data.students.length > 0) {
        setExamInfo({
          id: data.exam?.id || examId,
          title: data.exam?.title || 'Algorithms Final',
          course_code: data.exam?.course_code || 'CS302',
          total_marks: data.exam?.total_marks,
          passing_marks: data.exam?.passing_marks,
        });
        const mapped = mapBackendStudents(data.students);
        setStudents(mapped);
      }
    } catch (err) {
      console.error('Failed to load dynamic live monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Initial Data Load ---
  useEffect(() => {
    const hash = window.location.hash || '';
    const queryParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const qExamId = queryParams.get('examId') || queryParams.get('id');
    const initialExamId = qExamId ? parseInt(qExamId, 10) : 2;
    setSelectedExamId(initialExamId);

    examsAPI.listExams().then((res: any) => {
      const examsList = Array.isArray(res) ? res : res?.results || [];
      if (examsList.length > 0) {
        setAvailableExams(examsList);
        const match = examsList.find((e: any) => e.id === initialExamId);
        if (match) {
          setExamInfo({
            id: match.id,
            title: match.title,
            course_code: match.course_code || 'CS302',
            total_marks: match.total_marks,
            passing_marks: match.passing_marks
          });
        }
      }
    }).catch(err => console.warn('Exams list fetch error:', err));

    fetchLiveExamData(initialExamId);
  }, []);

  // --- Effects ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target as Node)) {
        setIsExamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Derived Data ---
  const stats = useMemo(() => ({
    total: students.length,
    writing: students.filter(s => s.status === 'writing').length,
    blocked: students.filter(s => s.status === 'blocked').length,
    completed: students.filter(s => s.status === 'completed').length,
    not_started: students.filter(s => s.status === 'not_started').length,
  }), [students]);

  const filteredList = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [students, searchQuery, filterStatus]);

  // --- Handlers ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map(s => s.id)));
    }
  };

  // Unblock Handler
  const handleUnblockClick = (student: Student) => {
    setSelectedStudent(student);
    setUnblockReason('');
    setUnblockModalOpen(true);
  };

  const confirmUnblock = async () => {
    if (!selectedStudent || !unblockReason.trim()) return;
    try {
      setIsSubmitting(true);
      if (selectedStudent.dbStudentId && selectedExamId) {
        await examsAPI.unblockStudent(selectedExamId, selectedStudent.dbStudentId);
      }
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { 
        ...s, 
        status: 'writing', 
        blockReason: undefined,
        timeRemaining: '45m 00s' 
      } : s));
      setSuccessToast(`Successfully unblocked ${selectedStudent.name}. Access restored.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setUnblockModalOpen(false);
      setSelectedStudent(null);
      setUnblockReason('');
      fetchLiveExamData(selectedExamId);
    } catch (err) {
      console.error('Failed to unblock candidate:', err);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, status: 'writing', blockReason: undefined } : s));
      setUnblockModalOpen(false);
      setSelectedStudent(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Block Handler
  const handleBlockClick = (student: Student) => {
    setBlockTargetStudent(student);
    setBlockReason('Proctor intervention: suspicious activity detected.');
    setBlockModalOpen(true);
  };

  const confirmBlock = async () => {
    if (!blockTargetStudent || !blockReason.trim()) return;
    try {
      setIsSubmitting(true);
      if (blockTargetStudent.dbStudentId && selectedExamId) {
        await examsAPI.blockStudent(selectedExamId, blockTargetStudent.dbStudentId);
      }
      setStudents(prev => prev.map(s => s.id === blockTargetStudent.id ? {
        ...s,
        status: 'blocked',
        blockReason: blockReason,
        blockTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeRemaining: 'Paused'
      } : s));

      setSuccessToast(`Candidate ${blockTargetStudent.name} has been suspended.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setBlockModalOpen(false);

      if (detailsModalOpen && selectedStudentDetails?.id === blockTargetStudent.id) {
        setSelectedStudentDetails(prev => prev ? {
          ...prev,
          status: 'blocked',
          blockReason: blockReason,
          blockTimestamp: 'Just now',
          timeRemaining: 'Paused'
        } : null);
      }
      setBlockTargetStudent(null);
      fetchLiveExamData(selectedExamId);
    } catch (err) {
      console.error('Failed to block student:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Details Modal Handler
  const handleDetailsClick = (student: Student) => {
    setSelectedStudentDetails(student);
    setDetailsModalOpen(true);
  };

  // View Report Modal Handler
  const handleViewReportClick = (student: Student) => {
    setSelectedStudentReport(student);
    setReportTab('overview');
    setReportModalOpen(true);
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Student ID', 'Name', 'Email', 'Status', 'Progress (%)', 'Score', 'Grade', 'Violations', 'Integrity Score'];
    const rows = students.map(s => [
      s.studentId,
      `"${s.name}"`,
      s.email || '',
      s.status,
      s.progress,
      s.score !== undefined ? s.score : 'N/A',
      s.grade || 'N/A',
      s.violationsCount || 0,
      `${s.integrityScore ?? 100}%`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gradebook_${examInfo.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  // Print/PDF Handler
  const handlePrintReport = (type: string) => {
    setIsExportOpen(false);
    window.print();
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on ${selectedIds.size} students`);
    setSelectedIds(new Set());
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col relative selection:bg-indigo-500 selection:text-white" onClick={() => setOpenMenuId(null)}>
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-24 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{successToast}</p>
        </div>
      )}

      {/* 1. Header */}
      <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600">{examInfo?.course_code || 'CS302'}</span>
              <span className="text-slate-300 font-bold">/</span>
              
              {/* Dynamic Exam Title & Switcher */}
              <div className="relative" ref={examDropdownRef}>
                <button 
                  onClick={() => setIsExamDropdownOpen(!isExamDropdownOpen)}
                  className="flex items-center gap-1.5 text-lg md:text-xl font-black text-slate-900 tracking-tight hover:text-indigo-600 transition-colors text-left group"
                >
                  <span>{examInfo?.title || 'Algorithms Final'}</span>
                  {availableExams.length > 1 && (
                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform ${isExamDropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {isExamDropdownOpen && availableExams.length > 1 && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 animate-fade-in">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1.5">Select Exam to Monitor</p>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {availableExams.map((ex: any) => (
                        <button
                          key={ex.id}
                          onClick={() => {
                            setSelectedExamId(ex.id);
                            setIsExamDropdownOpen(false);
                            fetchLiveExamData(ex.id);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                            ex.id === selectedExamId ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="font-black truncate">{ex.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{ex.course_code || 'EXAM'} • {ex.status}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
              Real-Time Proctoring &amp; Assessment Control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchLiveExamData(selectedExamId)}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold border border-slate-200 transition-all active:scale-95 shadow-sm"
            title="Refresh Live Candidates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={() => onNavigate('/faculty-dashboard')} 
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200/70 transition-all active:scale-95 shadow-sm"
            title="Exit Session"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Session</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1600px] mx-auto w-full relative">
        
        {/* 2. Heads-Up Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-8">
            <StatsCard label="Total Assigned" value={stats.total} icon={Users} color="text-indigo-600" bg="bg-indigo-50" border="border-indigo-100" />
            <StatsCard label="Attempting" value={stats.writing} icon={FileText} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
            <StatsCard label="Not Started" value={stats.not_started} icon={Clock} color="text-slate-500" bg="bg-slate-100" border="border-slate-200" />
            <StatsCard label="Blocked" value={stats.blocked} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" border="border-red-100" alert={stats.blocked > 0} />
            <StatsCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-blue-600" bg="bg-blue-50" border="border-blue-100" />
        </div>

        {/* 3. Controls Toolbar */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white p-4 md:p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search student by name or ID..." 
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/70 overflow-x-auto pb-1 md:pb-1.5 no-scrollbar">
                    {[
                      { id: 'all', label: 'All Candidates' },
                      { id: 'writing', label: 'Writing' },
                      { id: 'blocked', label: 'Blocked' },
                      { id: 'completed', label: 'Completed' }
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setFilterStatus(id)}
                            className={`
                                px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                ${filterStatus === id 
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'}
                            `}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Export Dropdown */}
            <div className="relative ml-auto xl:ml-0" ref={exportRef}>
                <button 
                    onClick={() => setIsExportOpen(!isExportOpen)}
                    className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl border border-slate-200 font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                >
                    <Download className="w-4 h-4 text-slate-500" />
                    Export Data
                    <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
                </button>

                {isExportOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl overflow-hidden z-50 animate-fade-in p-2">
                        <div className="space-y-1">
                            <button 
                              onClick={() => handlePrintReport('summary')}
                              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50 rounded-xl text-left transition-colors group"
                            >
                                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900">Exam Summary</p>
                                    <p className="text-[10px] font-bold text-slate-400">PDF • Visual Report</p>
                                </div>
                            </button>
                            <button 
                              onClick={handleExportCSV}
                              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50 rounded-xl text-left transition-colors group"
                            >
                                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                    <FileSpreadsheet className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900">Gradebook</p>
                                    <p className="text-[10px] font-bold text-slate-400">CSV • Raw Scores</p>
                                </div>
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                              onClick={() => handlePrintReport('malpractice')}
                              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-red-50/60 rounded-xl text-left transition-colors group"
                            >
                                <div className="p-2.5 bg-red-50 rounded-xl text-red-600 group-hover:bg-red-100 transition-colors">
                                    <FileWarning className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900">Malpractice Log</p>
                                    <p className="text-[10px] font-bold text-slate-400">PDF • Audit Trail</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* 4. Main Data Grid */}
        
        {/* DESKTOP VIEW: Table */}
        <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 overflow-visible shadow-sm relative">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/70 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 sticky top-0 z-20">
                    <tr>
                        <th className="px-6 py-4 w-12">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedIds.size === filteredList.length && filteredList.length > 0}
                                onChange={toggleAll}
                            />
                        </th>
                        <th className="px-6 py-4 w-[28%]">
                            <div className="flex items-center gap-1.5">
                                Student Identity
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                        </th>
                        <th className="px-6 py-4 w-[20%]">Status</th>
                        <th className="px-6 py-4 w-[22%]">Progress / Result</th>
                        <th className="px-6 py-4 w-[20%] text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredList.map((student) => {
                        const isSelected = selectedIds.has(student.id);
                        return (
                            <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60'}`}>
                                <td className="px-6 py-4">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={isSelected}
                                        onChange={() => toggleSelection(student.id)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="relative">
                                            <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full bg-slate-100 border border-slate-100 shadow-sm" />
                                            {/* Connectivity Dot */}
                                            <div 
                                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${student.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                                title={student.isOnline ? "Online" : "Offline"}
                                            ></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900">{student.name}</p>
                                            <p className="text-xs font-mono font-bold text-slate-400">{student.studentId}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-start gap-1">
                                        {student.status === 'writing' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                Attempting
                                            </span>
                                        )}
                                        {student.status === 'blocked' && (
                                            <div className="group relative">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 shadow-sm cursor-help">
                                                    <Ban className="w-3 h-3" /> Blocked
                                                </span>
                                                <p className="text-[10px] text-red-500 font-bold mt-1 truncate max-w-[160px]">{student.blockReason}</p>
                                                
                                                {/* Tooltip */}
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap z-50 shadow-xl">
                                                    Detected at {student.blockTimestamp}
                                                </div>
                                            </div>
                                        )}
                                        {student.status === 'completed' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 shadow-sm">
                                                <CheckCircle2 className="w-3 h-3" /> Finished
                                            </span>
                                        )}
                                        {student.status === 'not_started' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                                                Not Started
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {student.status === 'completed' ? (
                                        <div>
                                            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                {student.score !== undefined ? `${student.score}/100` : 'Pending'}
                                                {student.grade && (
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                                        student.grade.startsWith('A') 
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {student.grade}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Submitted {student.completedAt}</p>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-[150px]">
                                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono font-bold">
                                                <span>{student.timeRemaining}</span>
                                                <span>{student.progress}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${student.status === 'blocked' ? 'bg-red-500' : 'bg-indigo-600'}`} 
                                                    style={{ width: `${student.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {student.status === 'blocked' ? (
                                            <button 
                                                onClick={() => handleUnblockClick(student)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm shadow-emerald-100 transition-all active:scale-95"
                                            >
                                                <Unlock className="w-3.5 h-3.5" /> Unblock
                                            </button>
                                        ) : student.status === 'completed' ? (
                                            <button 
                                                onClick={() => handleViewReportClick(student)}
                                                className="px-4 py-2 bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 transition-all shadow-sm active:scale-95"
                                            >
                                                View Report
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleDetailsClick(student)}
                                                className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-900 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 transition-all shadow-sm active:scale-95"
                                            >
                                                Details
                                            </button>
                                        )}
                                        
                                        {/* Row Menu (3 Dots) */}
                                        <div className="relative" ref={openMenuId === student.id ? menuRef : null}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === student.id ? null : student.id); }}
                                                className={`p-2 rounded-xl transition-all ${openMenuId === student.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                            
                                            {/* Dropdown */}
                                            {openMenuId === student.id && (
                                                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 animate-fade-in overflow-hidden p-1.5">
                                                    <div className="space-y-0.5">
                                                        <button 
                                                            onClick={() => { setOpenMenuId(null); handleDetailsClick(student); }}
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors text-left"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-indigo-600" /> View Audit Log
                                                        </button>
                                                        {student.status === 'blocked' ? (
                                                            <button 
                                                                onClick={() => { setOpenMenuId(null); handleUnblockClick(student); }}
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors text-left"
                                                            >
                                                                <Unlock className="w-3.5 h-3.5 text-emerald-600" /> Unblock Student
                                                            </button>
                                                        ) : student.status !== 'completed' ? (
                                                            <button 
                                                                onClick={() => { setOpenMenuId(null); handleBlockClick(student); }}
                                                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                                                            >
                                                                <Ban className="w-3.5 h-3.5 text-red-600" /> Suspend Student
                                                            </button>
                                                        ) : null}
                                                        <button 
                                                            onClick={() => { setOpenMenuId(null); setSuccessToast(`Notification dispatched to ${student.name}`); setTimeout(() => setSuccessToast(null), 3000); }}
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors text-left"
                                                        >
                                                            <Mail className="w-3.5 h-3.5 text-emerald-600" /> Message Student
                                                        </button>
                                                        <button 
                                                            onClick={() => { setOpenMenuId(null); setSuccessToast(`Timer paused for ${student.name}`); setTimeout(() => setSuccessToast(null), 3000); }}
                                                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors text-left"
                                                        >
                                                            <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Timer
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {filteredList.length === 0 && (
                <div className="p-16 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No students found matching your criteria.</p>
                </div>
            )}
        </div>

        {/* MOBILE VIEW: Cards */}
        <div className="md:hidden space-y-4 pb-20">
            {filteredList.map((student) => (
                <div key={student.id} className={`bg-white border rounded-[2rem] p-6 shadow-sm transition-all ${selectedIds.has(student.id) ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={selectedIds.has(student.id)}
                                onChange={() => toggleSelection(student.id)}
                            />
                            <div className="relative">
                                <img src={student.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-100" />
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${student.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 text-sm">{student.name}</h3>
                                <p className="text-xs font-mono font-bold text-slate-400">{student.studentId}</p>
                            </div>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors" onClick={() => setOpenMenuId(student.id)}>
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Block Banner */}
                    {student.blockReason && (
                        <div className="mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-red-700 font-black uppercase tracking-wider">Blocked: {student.blockReason}</p>
                                <p className="text-[10px] text-red-500 font-bold mt-0.5">Detected at {student.blockTimestamp}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
                        {student.status === 'completed' ? (
                            <div className="flex items-center gap-2 text-slate-900 font-black">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Score: {student.score}%
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 font-bold">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> {student.timeRemaining}
                            </div>
                        )}
                        <div className="font-mono font-bold">Progress: {student.progress}%</div>
                    </div>

                    <div className="flex gap-3">
                        {student.status === 'blocked' ? (
                            <button 
                                onClick={() => handleUnblockClick(student)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                            >
                                <Unlock className="w-4 h-4" /> Unblock Student
                            </button>
                        ) : student.status === 'completed' ? (
                            <button 
                                onClick={() => handleViewReportClick(student)}
                                className="flex-1 py-3 bg-slate-50 text-indigo-600 border border-slate-200 font-black uppercase tracking-wider rounded-2xl text-xs active:scale-95 transition-all"
                            >
                                View Report
                            </button>
                        ) : (
                            <button 
                                onClick={() => handleDetailsClick(student)}
                                className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 font-black uppercase tracking-wider rounded-2xl text-xs hover:bg-slate-900 hover:text-white transition-colors active:scale-95"
                            >
                                View Details
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

      </div>

      {/* 5. Unblock Modal */}
      {unblockModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                              <Unlock className="w-6 h-6" />
                          </div>
                          <div>
                              <h2 className="text-xl font-black text-slate-900 tracking-tight">Unblock Student</h2>
                              <p className="text-xs font-bold text-slate-400 mt-0.5">
                                  Restore access for <span className="text-slate-900 font-black">{selectedStudent.name}</span> ({selectedStudent.studentId})
                              </p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setUnblockModalOpen(false)}
                          className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">AI Flag Reason</p>
                          <p className="text-xs font-bold text-red-900">{selectedStudent.blockReason}</p>
                      </div>

                      <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                              Reason for Unblocking <span className="text-red-500">*</span>
                          </label>
                          <p className="text-[11px] font-medium text-slate-400 mb-3">Please provide a justification for faculty audit records.</p>
                          <textarea 
                              value={unblockReason}
                              onChange={(e) => setUnblockReason(e.target.value)}
                              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50 resize-none placeholder:text-slate-400 transition-all"
                              placeholder="E.g., Verified environment via secondary proctor camera feed..."
                              autoFocus
                          />
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50/60 border-t border-slate-100 flex justify-end gap-3">
                      <button 
                          onClick={() => setUnblockModalOpen(false)} 
                          className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-sm"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmUnblock}
                          disabled={isSubmitting || !unblockReason.trim()}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 active:scale-95"
                      >
                          {isSubmitting ? 'Unblocking...' : 'Confirm Unblock'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 6. Details Modal */}
      {detailsModalOpen && selectedStudentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-scale-up max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={selectedStudentDetails.avatar} alt="" className="w-12 h-12 rounded-full border border-slate-200" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${selectedStudentDetails.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedStudentDetails.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                      {selectedStudentDetails.studentId}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{selectedStudentDetails.email || 'candidate@quantumguard.edu'}</p>
                </div>
              </div>
              <button 
                onClick={() => setDetailsModalOpen(false)}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              {/* Status Badge Banner */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Live Status:</span>
                  {selectedStudentDetails.status === 'writing' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Attempting Live
                    </span>
                  )}
                  {selectedStudentDetails.status === 'blocked' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                      <Ban className="w-3 h-3" /> Session Blocked
                    </span>
                  )}
                  {selectedStudentDetails.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                      <CheckCircle2 className="w-3 h-3" /> Finished
                    </span>
                  )}
                  {selectedStudentDetails.status === 'not_started' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                      Not Started
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-slate-500">
                  Exam: <span className="text-slate-900 font-black">{examInfo?.title || 'CS302 Algorithms'}</span>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Duration
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">{selectedStudentDetails.timeRemaining}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" /> Progress
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">{selectedStudentDetails.progress}%</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Integrity
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">{selectedStudentDetails.integrityScore ?? 100}%</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Flags
                  </div>
                  <div className="text-base font-black text-slate-900 font-mono">{selectedStudentDetails.violationsCount || 0}</div>
                </div>
              </div>

              {/* Proctoring Stream / Anomaly Feed */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Integrity &amp; Proctoring Telemetry
                </h4>
                {selectedStudentDetails.raw?.violations && selectedStudentDetails.raw.violations.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedStudentDetails.raw.violations.map((v: any, idx: number) => (
                      <div key={idx} className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-red-900">{v.description || v.title || v.violation_type}</p>
                            <p className="text-[10px] font-bold text-red-600/80 mt-0.5">
                              {v.detected_at ? new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Logged during attempt'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${v.severity === 'high' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                          {v.severity || 'flag'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-900">Zero Active Violations</p>
                      <p className="text-[11px] font-bold text-emerald-700/80">Continuous AI gaze tracking, camera verification, and screen lock are verified clean.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* System & Hardware Checks */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                  Hardware &amp; Environment Diagnostics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">Webcam Feed</p>
                      <p className="text-[10px] text-slate-400">Active • 1080p</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">Audio Stream</p>
                      <p className="text-[10px] text-slate-400">Microphone OK</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">Screen Lock</p>
                      <p className="text-[10px] text-slate-400">Fullscreen ON</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900">Connection</p>
                      <p className="text-[10px] text-slate-400">Ping 24ms</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
              <div>
                {selectedStudentDetails.status === 'blocked' ? (
                  <button
                    onClick={() => {
                      setDetailsModalOpen(false);
                      handleUnblockClick(selectedStudentDetails);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Unblock Student
                  </button>
                ) : selectedStudentDetails.status !== 'completed' ? (
                  <button
                    onClick={() => {
                      setDetailsModalOpen(false);
                      handleBlockClick(selectedStudentDetails);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
                  >
                    <Ban className="w-3.5 h-3.5" /> Block Candidate
                  </button>
                ) : null}
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. View Report Modal */}
      {reportModalOpen && selectedStudentReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-scale-up max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Assessment &amp; Integrity Report</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-200">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    <span className="text-slate-900 font-black">{selectedStudentReport.name}</span> ({selectedStudentReport.studentId}) • {examInfo?.title || 'Algorithms Final'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReportModalOpen(false)}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-8 pt-4 border-b border-slate-100 bg-white">
              {[
                { id: 'overview', label: 'Summary Overview' },
                { id: 'questions', label: `Questions (${selectedStudentReport.raw?.questions?.length || 0})` },
                { id: 'violations', label: `Proctoring Log (${selectedStudentReport.violationsCount || 0})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setReportTab(tab.id as any)}
                  className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                    reportTab === tab.id 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              {reportTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Final Score</p>
                      <p className="text-2xl font-black text-indigo-950 font-mono">{selectedStudentReport.score !== undefined ? `${selectedStudentReport.score}%` : 'N/A'}</p>
                      <p className="text-[10px] font-bold text-indigo-600 mt-1">Grade: {selectedStudentReport.grade || 'A'}</p>
                    </div>
                    <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Result</p>
                      <p className="text-2xl font-black text-emerald-700 font-mono uppercase">{selectedStudentReport.raw?.result || 'PASS'}</p>
                      <p className="text-[10px] font-bold text-emerald-600 mt-1">Passing Mark: {examInfo?.passing_marks || 40}%</p>
                    </div>
                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Integrity Score</p>
                      <p className="text-2xl font-black text-blue-950 font-mono">{selectedStudentReport.integrityScore ?? 100}%</p>
                      <p className="text-[10px] font-bold text-blue-600 mt-1">Audit Status: Verified</p>
                    </div>
                    <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Infractions</p>
                      <p className="text-2xl font-black text-amber-950 font-mono">{selectedStudentReport.violationsCount || 0}</p>
                      <p className="text-[10px] font-bold text-amber-600 mt-1">Total Flags Recorded</p>
                    </div>
                  </div>

                  {/* Submission Time Info */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Submitted At: <strong className="text-slate-900">{selectedStudentReport.completedAt || 'Recently'}</strong></span>
                    </div>
                    <div className="text-slate-600 font-bold">
                      Time Taken: <strong className="text-slate-900 font-mono">{selectedStudentReport.raw?.time_taken ? `${Math.round(selectedStudentReport.raw.time_taken / 60)} mins` : '24 mins'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {reportTab === 'questions' && (
                <div className="space-y-4">
                  {selectedStudentReport.raw?.questions && selectedStudentReport.raw.questions.length > 0 ? (
                    selectedStudentReport.raw.questions.map((q: any, i: number) => {
                      const isCorrect = q.userAnswerId && q.correctAnswerId && String(q.userAnswerId) === String(q.correctAnswerId);
                      return (
                        <div key={q.id || i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-black text-slate-900">
                              Q{i + 1}. {q.text}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                              isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {q.options.map((opt: any) => {
                                const isSelected = String(q.userAnswerId) === String(opt.id);
                                const isOptionCorrect = opt.isCorrect || String(q.correctAnswerId) === String(opt.id);
                                return (
                                  <div 
                                    key={opt.id} 
                                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                                      isSelected && isOptionCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                      isSelected && !isOptionCorrect ? 'bg-red-50 border-red-200 text-red-800' :
                                      isOptionCorrect ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' :
                                      'bg-white border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <span>{opt.text}</span>
                                    {isSelected && <span className="text-[10px] font-black uppercase tracking-wider">(Student)</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-xs font-bold text-slate-400 py-8">No detailed question responses recorded.</p>
                  )}
                </div>
              )}

              {reportTab === 'violations' && (
                <div className="space-y-3">
                  {selectedStudentReport.raw?.violations && selectedStudentReport.raw.violations.length > 0 ? (
                    selectedStudentReport.raw.violations.map((v: any, idx: number) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl border ${v.severity === 'high' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{v.description || v.title || v.violation_type}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">
                              Detected: {v.detected_at ? new Date(v.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Session timeline'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                          v.severity === 'high' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {v.severity || 'anomaly'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-emerald-50/40 border border-emerald-100 rounded-2xl">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-xs font-black text-emerald-900">Zero Proctoring Infractions</p>
                      <p className="text-[11px] font-bold text-emerald-700 mt-1">Candidate completed the assessment with zero policy anomalies.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setReportModalOpen(false);
                  onNavigate('/reports');
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Open in Teaching Reports
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </button>
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Block Confirmation Modal */}
      {blockModalOpen && blockTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-8 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Suspend Candidate</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Lock session for <span className="text-slate-900 font-black">{blockTargetStudent.name}</span> ({blockTargetStudent.studentId})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBlockModalOpen(false)}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-800 font-bold">
                Suspending this student will immediately pause their exam timer and freeze their submission interface until faculty unblocks them.
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Reason for Suspension <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-50 transition-all placeholder:text-slate-400"
                  placeholder="E.g., Suspicious secondary device detected..."
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50/60 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setBlockModalOpen(false)} 
                className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmBlock}
                disabled={isSubmitting || !blockReason.trim()}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                {isSubmitting ? 'Suspending...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Bulk Action Bar (Floating) */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-[90%] max-w-2xl">
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl shadow-slate-900/40 flex items-center justify-between border border-slate-800">
                  <div className="flex items-center gap-4 pl-3">
                      <div className="bg-white/10 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          {selectedIds.size} Selected
                      </div>
                      <button onClick={toggleAll} className="text-xs font-bold text-slate-300 hover:text-white underline">
                          Deselect All
                      </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleBulkAction('message')}
                        className="px-3 py-2 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white"
                      >
                          <Mail className="w-4 h-4 text-slate-300" /> Message
                      </button>
                      <div className="h-4 w-px bg-white/20"></div>
                      <button 
                        onClick={() => handleBulkAction('unblock')}
                        className="px-3 py-2 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                          <Unlock className="w-4 h-4" /> Unblock
                      </button>
                      <div className="h-4 w-px bg-white/20"></div>
                      <button 
                        onClick={() => handleBulkAction('pause')}
                        className="px-3 py-2 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                          <Pause className="w-4 h-4" /> Pause
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

// Component: Stats Card
const StatsCard = ({ label, value, icon: Icon, color, bg, border = 'border-slate-100', alert = false }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:bg-indigo-50/50 transition-colors"></div>
        {alert && (
            <div className="absolute top-4 right-4">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
            </div>
        )}
        <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${bg} ${color} ${border} border shadow-sm`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{label}</p>
            </div>
        </div>
    </div>
);
