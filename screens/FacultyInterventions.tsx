import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { 
  ShieldAlert, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  MessageSquare, 
  ChevronRight, 
  AlertCircle, 
  Check, 
  X, 
  Compass, 
  BrainCircuit, 
  Sparkles,
  Bot,
  Layers,
  Award,
  Loader2,
  Terminal,
  Activity,
  ShieldCheck,
  Send,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../services/authContext';
import { learningAgentAPI } from '../services/apiService';

interface FacultyInterventionsProps {
  onNavigate: (path: string) => void;
}

export const FacultyInterventionsScreen: React.FC<FacultyInterventionsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIntervention, setSelectedIntervention] = useState<any | null>(null);
  
  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'other'>('all');

  // Teacher Action Modal / Form
  const [actionNotes, setActionNotes] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    try {
      setIsLoading(true);
      const data = await learningAgentAPI.getFacultyAlerts();
      if (Array.isArray(data)) {
        setInterventions(data);
        if (data.length > 0 && !selectedIntervention) {
          setSelectedIntervention(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load faculty alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacultyAction = async (actionType: 'approved' | 'modified' | 'mentorship_scheduled' | 'dismissed') => {
    if (!selectedIntervention) return;
    setIsSubmittingAction(true);
    setActionFeedback(null);

    try {
      await learningAgentAPI.submitFacultyAction(
        selectedIntervention.id,
        actionType,
        actionNotes || 'Approved as recommended by Teacher Notification Agent.'
      );
      
      setActionFeedback(`Successfully updated status to "${actionType.replace('_', ' ').toUpperCase()}". Student has been notified.`);
      setActionNotes('');
      
      // Reload alerts
      await loadInterventions();
      
      // Update selected item in view
      setSelectedIntervention((prev: any) => prev ? { ...prev, approval_status: actionType } : null);
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const facultyUser = {
    id: user?.id ? String(user.id) : '1',
    name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Instructor',
    email: user?.email || 'admin@sparkless.com',
    role: (user?.role as 'student' | 'faculty') || 'faculty',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  };

  const filteredInterventions = interventions.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.student_name || '').toLowerCase().includes(term) ||
      (item.alert_title || '').toLowerCase().includes(term) ||
      (item.subject || '').toLowerCase().includes(term) ||
      (item.student_email || '').toLowerCase().includes(term) ||
      (item.symptom || '').toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return item.approval_status === 'pending';
    if (statusFilter === 'approved') return item.approval_status === 'approved';
    if (statusFilter === 'other') return item.approval_status !== 'pending' && item.approval_status !== 'approved';
    return true;
  });

  const pendingCount = interventions.filter(i => i.approval_status === 'pending').length;
  const approvedCount = interventions.filter(i => i.approval_status === 'approved').length;
  const otherCount = interventions.filter(i => i.approval_status !== 'pending' && i.approval_status !== 'approved').length;

  if (isLoading) {
    return (
      <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-interventions">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-slate-400 font-black uppercase tracking-[0.3em] text-xs">
            Aggregating Diagnostic Dossiers...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentUser={facultyUser} currentPath="/faculty-interventions" onNavigate={onNavigate}>
      <div className="max-w-[1600px] mx-auto pb-24 animate-slide-up px-4 md:px-0 font-sans">
        
        {/* Premium Header Container */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-900 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <BrainCircuit className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Autonomous Agent Intelligence</span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Interventions Hub</h1>
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-500">
              Student Diagnostic Dossiers & Approvals
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-2xl mt-1">
              Review real-time alerts dispatched by the multi-agent diagnostic system when students pass exams but exhibit severe hidden conceptual gaps.
            </p>
          </div>

          {/* Pending Approvals KPI Card */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 text-white rounded-[1.8rem] px-6 py-4 flex items-center gap-4 shadow-xl shadow-slate-200">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse ring-4 ring-rose-500/20"></div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Pending Approvals</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {pendingCount}
                  </span>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    {pendingCount === 1 ? 'Action Required' : 'Actions Required'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {actionFeedback && (
          <div className="mb-8 bg-emerald-50 border border-emerald-100 text-emerald-900 px-6 py-4 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Action Dispatched</p>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">{actionFeedback}</p>
              </div>
            </div>
            <button 
              onClick={() => setActionFeedback(null)} 
              className="w-8 h-8 rounded-xl bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content: Split Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Interventions List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Search & Filter Header */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-sm space-y-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by student, subject, or alert..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-[1.2rem] text-xs font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-sm"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 text-[10px] font-black uppercase tracking-wider">
                <button 
                  onClick={() => setStatusFilter('all')} 
                  className={`flex-1 py-2 rounded-xl transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  All ({interventions.length})
                </button>
                <button 
                  onClick={() => setStatusFilter('pending')} 
                  className={`flex-1 py-2 rounded-xl transition-all ${statusFilter === 'pending' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Pending ({pendingCount})
                </button>
                <button 
                  onClick={() => setStatusFilter('approved')} 
                  className={`flex-1 py-2 rounded-xl transition-all ${statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Approved ({approvedCount})
                </button>
                {otherCount > 0 && (
                  <button 
                    onClick={() => setStatusFilter('other')} 
                    className={`flex-1 py-2 rounded-xl transition-all ${statusFilter === 'other' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Other ({otherCount})
                  </button>
                )}
              </div>
            </div>

            {/* List of Flagged Student Cards */}
            {filteredInterventions.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 shadow-sm text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-600">No Interventions Found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {searchTerm ? 'Try adjusting your search query or filter.' : 'All students are performing within expected diagnostic parameters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInterventions.map((item) => {
                  const isSelected = selectedIntervention?.id === item.id;
                  const isPending = item.approval_status === 'pending';
                  const isApproved = item.approval_status === 'approved';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIntervention(item)}
                      className={`p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer relative group overflow-hidden ${
                        isSelected 
                          ? 'bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-100/40 ring-4 ring-indigo-50/70' 
                          : 'bg-white hover:bg-slate-50/60 border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-lg hover:shadow-slate-100/80'
                      }`}
                    >
                      {/* Active Left Indicator */}
                      {isSelected && (
                        <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-indigo-600 rounded-r-full"></div>
                      )}

                      {/* Card Header: Student Avatar & Name & Status Badge */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 ${
                            isSelected ? 'bg-indigo-900 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {(item.student_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-black text-slate-900 tracking-tight block truncate group-hover:text-indigo-600 transition-colors">
                              {item.student_name}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 block truncate">
                              {item.student_email || 'student@sparkless.com'}
                            </span>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0 ${
                          isPending 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                            : isApproved 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {isPending && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                          {isApproved && <Check className="w-3 h-3 text-emerald-600" />}
                          {item.approval_status}
                        </span>
                      </div>

                      {/* Alert Title */}
                      <div className="text-xs font-black text-indigo-600 group-hover:text-indigo-700 transition-colors mb-1 truncate">
                        {item.alert_title}
                      </div>

                      {/* Symptom Snippet */}
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed mb-3">
                        {item.symptom}
                      </p>

                      {/* Bottom Meta Tags */}
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3 border-t border-slate-50">
                        <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                          {item.subject}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            item.severity === 'high'
                              ? 'bg-rose-50 text-rose-600 border-rose-100'
                              : item.severity === 'medium'
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {item.severity} Risk
                          </span>
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Diagnostic Dossier & Action Console (7 cols) */}
          <div className="lg:col-span-7">
            {selectedIntervention ? (
              <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-100 shadow-xl shadow-slate-100/50 space-y-8 relative overflow-hidden">
                
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-slate-200">
                      {(selectedIntervention.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          Dossier #{selectedIntervention.id}
                        </span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                          Agent 5 Notified
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {selectedIntervention.student_name}
                      </h2>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        {selectedIntervention.student_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-4 py-2 rounded-2xl uppercase tracking-widest flex items-center gap-2 shadow-sm ${
                      selectedIntervention.approval_status === 'pending'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : selectedIntervention.approval_status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {selectedIntervention.approval_status === 'pending' && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      )}
                      {selectedIntervention.approval_status === 'approved' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      Status: {selectedIntervention.approval_status}
                    </span>
                  </div>
                </div>

                {/* Subject, Symptom & Severity Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50/80 p-5 rounded-[1.8rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      Subject Domain
                    </div>
                    <div className="font-black text-slate-900 text-sm truncate">
                      {selectedIntervention.subject}
                    </div>
                  </div>

                  <div className="bg-rose-50/40 p-5 rounded-[1.8rem] border border-rose-100/60 shadow-sm sm:col-span-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      Identified Cognitive Gap
                    </div>
                    <div className="font-bold text-rose-800 text-xs leading-snug">
                      {selectedIntervention.symptom}
                    </div>
                  </div>
                </div>

                {/* Terminal Dossier Body */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-indigo-600" />
                      Agent Findings & Diagnostic Dossier
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Real-Time Ingress
                    </span>
                  </div>

                  {/* Terminal Styled Box */}
                  <div className="rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
                    <div className="bg-slate-900 px-6 py-3.5 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                        <span className="ml-3 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          TEACHER_NOTIFICATION_AGENT • DOSSIER_AUDIT
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold tracking-wider">
                          SYNCHRONIZED
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-950 p-6 font-mono text-xs text-slate-300 whitespace-pre-line leading-relaxed overflow-x-auto max-h-[340px] overflow-y-auto">
                      {selectedIntervention.dossier_summary}
                    </div>
                  </div>
                </div>

                {/* Instructor Action Panel */}
                <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 border border-slate-200/80 rounded-[2.2rem] p-7 sm:p-8 space-y-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-indigo-300 flex items-center justify-center shadow-md shadow-indigo-100">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Instructor Action & Approval Controls
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Authorize remedial path adaptation or schedule direct office hours check-in.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Teacher Guidance / Conditions:
                    </label>
                    <textarea
                      rows={3}
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Add instructor guidance or conditions (e.g., 'Approved. Complete Milestone 1-3 before Friday quiz. 10 bonus points on midterm.')"
                      className="w-full bg-white border border-slate-200 rounded-[1.4rem] p-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none shadow-sm transition-all leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => handleFacultyAction('approved')}
                      disabled={isSubmittingAction}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2.5 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.3rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-100 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve Adapted Path
                    </button>

                    <button
                      onClick={() => handleFacultyAction('modified')}
                      disabled={isSubmittingAction}
                      className="flex-1 min-w-[190px] flex items-center justify-center gap-2.5 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.3rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Compass className="w-4 h-4" />
                      Approve with Note
                    </button>

                    <button
                      onClick={() => handleFacultyAction('mentorship_scheduled')}
                      disabled={isSubmittingAction}
                      className="flex-1 min-w-[210px] flex items-center justify-center gap-2.5 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.3rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Schedule Office Hours
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm text-slate-400">
                <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">No Student Selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Select a student intervention dossier from the list on the left to inspect multi-agent diagnostics and take action.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

