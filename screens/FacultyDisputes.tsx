
import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { useAuth } from '../services/authContext';
import { Button } from '../components/ui/Button';
import { 
  Search, Filter, ChevronDown, MessageSquare, CheckCircle, 
  XCircle, AlertTriangle, Clock, TrendingUp, MoreHorizontal,
  ChevronRight, ArrowRight, User as UserIcon, Send, X,
  ShieldAlert, CornerUpLeft
} from 'lucide-react';

interface FacultyDisputesProps {
  onNavigate: (path: string) => void;
}

// --- Types ---
interface Appeal {
  id: string;
  studentName: string;
  studentAvatar: string;
  examTitle: string;
  questionId: string;
  questionPreview: string;
  questionFull: string;
  studentAnswer: string;
  correctAnswer: string;
  appealReason: string;
  status: 'Pending' | 'In Review' | 'Resolved' | 'Denied';
  priority: 'High' | 'Medium' | 'Low';
  submittedAt: string; // formatted
  score: number; // current score for question
  maxScore: number;
}

interface Message {
  id: string;
  sender: 'student' | 'faculty';
  name: string;
  text: string;
  timestamp: string;
}

// --- Mock Data ---
const APPEALS_DATA: Appeal[] = [
  {
    id: '1',
    studentName: 'Alex Johnson',
    studentAvatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=random',
    examTitle: 'Advanced Java Final',
    questionId: 'Q5',
    questionPreview: 'What is encapsulation in Java?',
    questionFull: 'Which of the following best describes the principle of Encapsulation in Java?',
    studentAnswer: 'Option C: Binding data and methods together',
    correctAnswer: 'Option A: Hiding implementation details',
    appealReason: 'The option C is also a valid definition according to the course textbook, page 42.',
    status: 'Pending',
    priority: 'High',
    submittedAt: '2 hours ago',
    score: 0,
    maxScore: 5
  },
  {
    id: '2',
    studentName: 'Maria Garcia',
    studentAvatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=random',
    examTitle: 'CS302: Algorithms',
    questionId: 'Q12',
    questionPreview: 'Calculate the time complexity of...',
    questionFull: 'Calculate the time complexity of the provided recursive Fibonacci function.',
    studentAnswer: 'O(n)',
    correctAnswer: 'O(2^n)',
    appealReason: 'I implemented the memoized version in the coding block, which is O(n), but the auto-grader marked it based on the naive approach.',
    status: 'In Review',
    priority: 'Medium',
    submittedAt: 'Yesterday',
    score: 2,
    maxScore: 10
  },
  {
    id: '3',
    studentName: 'James Wilson',
    studentAvatar: 'https://ui-avatars.com/api/?name=James+Wilson&background=random',
    examTitle: 'Web Development Basics',
    questionId: 'Q3',
    questionPreview: 'CSS Grid vs Flexbox usage...',
    questionFull: 'When is it more appropriate to use CSS Grid over Flexbox?',
    studentAnswer: 'For 1D layouts',
    correctAnswer: 'For 2D layouts',
    appealReason: 'I misread the question as Flexbox over Grid. Can I get partial credit?',
    status: 'Denied',
    priority: 'Low',
    submittedAt: 'Oct 20, 2024',
    score: 0,
    maxScore: 2
  }
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm1', sender: 'student', name: 'Maria Garcia', text: 'I really believe my code was optimized correctly.', timestamp: 'Yesterday 2:30 PM' },
  { id: 'm2', sender: 'faculty', name: 'Prof. Smith', text: 'I will take a look at your code submission shortly.', timestamp: 'Yesterday 4:00 PM' }
];

export const FacultyDisputesScreen: React.FC<FacultyDisputesProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const facultyUser: User = { id: String(authUser?.id || ''), name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty', email: authUser?.email || '', role: 'faculty' };
  
  // State
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  const [responseAction, setResponseAction] = useState<'deny' | 'uphold' | 'escalate'>('uphold');
  const [responseText, setResponseText] = useState('');
  const [adjustedScore, setAdjustedScore] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState('All');

  const selectedAppeal = APPEALS_DATA.find(a => a.id === selectedAppealId);

  // --- Handlers ---
  const handleOpenAppeal = (id: string) => {
    const appeal = APPEALS_DATA.find(a => a.id === id);
    if (appeal) {
      setSelectedAppealId(id);
      setAdjustedScore(appeal.maxScore); // Default to full points if upholding
      setResponseAction('uphold');
      setResponseText('');
    }
  };

  const handleClosePanel = () => {
    setSelectedAppealId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'In Review': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Denied': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
        case 'High': return 'text-red-600 bg-red-50 border-red-100';
        case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100';
        case 'Low': return 'text-slate-600 bg-slate-50 border-slate-100';
        default: return 'text-slate-600';
    }
  };

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-disputes">
      <div className="flex h-[calc(100vh-6rem)] -m-4 md:-m-8 overflow-hidden relative">
        
        {/* Main Content (Left) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] overflow-y-auto p-6 md:p-8">
            
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Exam Appeals & Disputes</h1>
                <p className="text-sm text-slate-500">Review and resolve student grade concerns and integrity flags.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pending</p>
                        <h3 className="text-2xl font-bold text-amber-500">12</h3>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-amber-500"><AlertTriangle className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Resolved</p>
                        <h3 className="text-2xl font-bold text-emerald-500">145</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-500"><CheckCircle className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Avg Response</p>
                        <h3 className="text-2xl font-bold text-indigo-600">4h</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Clock className="w-6 h-6" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Success Rate</p>
                        <h3 className="text-2xl font-bold text-emerald-600">98%</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by student name, exam..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
                    <div className="relative">
                        <select 
                            className="appearance-none bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer hover:bg-slate-50"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option>Status: All</option>
                            <option>Pending</option>
                            <option>In Review</option>
                            <option>Resolved</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select className="appearance-none bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer hover:bg-slate-50">
                            <option>Priority: All</option>
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Appeals List */}
            <div className="space-y-4 pb-20">
                {APPEALS_DATA.map((appeal) => (
                    <div 
                        key={appeal.id}
                        onClick={() => handleOpenAppeal(appeal.id)}
                        className={`bg-white rounded-xl border border-slate-200 p-5 cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 group ${selectedAppealId === appeal.id ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}
                    >
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-3">
                            <div className="flex items-center gap-3">
                                <img src={appeal.studentAvatar} alt={appeal.studentName} className="w-8 h-8 rounded-full bg-slate-100" />
                                <span className="font-bold text-slate-900 text-sm">{appeal.studentName}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(appeal.status)}`}>
                                    {appeal.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityColor(appeal.priority)}`}>
                                    {appeal.priority}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Submitted {appeal.submittedAt}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Exam & Question</p>
                                <p className="text-sm font-semibold text-slate-700">{appeal.examTitle} • <span className="text-indigo-600">{appeal.questionId}</span></p>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{appeal.questionPreview}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Appeal Reason</p>
                                <p className="text-sm text-slate-800 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">"{appeal.appealReason}"</p>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-3 border-t border-slate-50">
                            <button className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors">
                                <MessageSquare className="w-3.5 h-3.5" /> Message
                            </button>
                            <button className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1 px-4 py-1.5 rounded-lg transition-colors shadow-sm">
                                View Details <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Slide-over Detail Panel */}
        <div className={`
            fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-40 flex flex-col
            ${selectedAppealId ? 'translate-x-0' : 'translate-x-full'}
        `}>
            {selectedAppeal && (
                <>
                    {/* Panel Header */}
                    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                Appeal Details
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(selectedAppeal.status)}`}>{selectedAppeal.status}</span>
                            </h3>
                            <p className="text-xs text-slate-500">{selectedAppeal.examTitle}</p>
                        </div>
                        <button onClick={handleClosePanel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        
                        {/* Student Info */}
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden">
                                <img src={selectedAppeal.studentAvatar} alt={selectedAppeal.studentName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">{selectedAppeal.studentName}</h4>
                                <p className="text-xs text-slate-500">Submitted {selectedAppeal.submittedAt}</p>
                            </div>
                        </div>

                        {/* Question Details */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <ShieldAlert className="w-3.5 h-3.5" /> Dispute Context
                            </h4>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p className="text-xs font-bold text-slate-500 mb-2">{selectedAppeal.questionId} (Max {selectedAppeal.maxScore} pts)</p>
                                <p className="text-sm text-slate-800 font-medium mb-4">{selectedAppeal.questionFull}</p>
                                
                                <div className="space-y-3">
                                    <div className="p-3 bg-white rounded-lg border border-red-200 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                        <p className="text-xs text-slate-500 font-bold mb-1">Student's Answer (Score: {selectedAppeal.score})</p>
                                        <p className="text-sm text-slate-800">{selectedAppeal.studentAnswer}</p>
                                    </div>
                                    
                                    <div className="p-3 bg-white rounded-lg border border-emerald-200 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                        <p className="text-xs text-slate-500 font-bold mb-1">Correct Answer</p>
                                        <p className="text-sm text-slate-800">{selectedAppeal.correctAnswer}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <p className="text-xs font-bold text-amber-700 uppercase mb-2">Student Appeal</p>
                                <p className="text-sm text-amber-900 italic">"{selectedAppeal.appealReason}"</p>
                            </div>
                        </div>

                        {/* Action Section */}
                        <div className="pt-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Faculty Decision</h4>
                            
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    {['deny', 'uphold', 'escalate'].map((action) => (
                                        <button
                                            key={action}
                                            onClick={() => setResponseAction(action as any)}
                                            className={`
                                                flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border-2 transition-all
                                                ${responseAction === action 
                                                    ? (action === 'deny' ? 'border-red-500 bg-red-50 text-red-700' : action === 'uphold' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-orange-500 bg-orange-50 text-orange-700')
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-600'}
                                            `}
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>

                                {responseAction === 'uphold' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Adjust Score (Max {selectedAppeal.maxScore})</label>
                                        <input 
                                            type="number" 
                                            max={selectedAppeal.maxScore}
                                            min={0}
                                            value={adjustedScore}
                                            onChange={(e) => setAdjustedScore(parseFloat(e.target.value))}
                                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-bold text-emerald-700"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Response Note</label>
                                    <textarea 
                                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all min-h-[100px] resize-none"
                                        placeholder={`Explain why you are ${responseAction}ing this appeal...`}
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                    />
                                </div>

                                <Button 
                                    onClick={handleClosePanel}
                                    className={`w-full shadow-lg ${
                                        responseAction === 'deny' ? 'from-red-600 to-red-500 shadow-red-200' : 
                                        responseAction === 'uphold' ? 'from-emerald-600 to-emerald-500 shadow-emerald-200' : 
                                        'from-orange-500 to-amber-500 shadow-orange-200'
                                    }`}
                                >
                                    Submit Decision
                                </Button>
                            </div>
                        </div>

                        {/* Chat History */}
                        <div className="pt-6 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" /> Communication History
                            </h4>
                            <div className="space-y-4">
                                {MOCK_MESSAGES.map(msg => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'faculty' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-xl text-xs ${msg.sender === 'faculty' ? 'bg-indigo-50 text-indigo-900 rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                            <p className="font-bold mb-1 text-[10px] opacity-70">{msg.name} • {msg.timestamp}</p>
                                            <p>{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="mt-4 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                                <CornerUpLeft className="w-3 h-3" /> Reply to student
                            </button>
                        </div>

                    </div>
                </>
            )}
        </div>

        {/* Overlay for Panel (Mobile) */}
        {selectedAppealId && (
            <div 
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
                onClick={handleClosePanel}
            ></div>
        )}

      </div>
    </DashboardLayout>
  );
};
