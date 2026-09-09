import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { useAuth } from '../services/authContext';
import { User } from '../types';
import { toAppRole } from '../services/roles';
import { Bot, Search, Sparkles, Send, CheckCircle2, ArrowRight } from 'lucide-react';

interface LearningPathAgentProps {
  onNavigate: (path: string) => void;
  currentPath?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export const LearningPathAgentScreen: React.FC<LearningPathAgentProps> = ({ onNavigate, currentPath = '/learning-path' }) => {
  const { user: authUser } = useAuth();

  const studentUser: User = {
    id: String(authUser?.id || '1'),
    name: authUser ? `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() || authUser.username || 'Arka' : 'Arka',
    email: authUser?.email || 'arka@example.com',
    role: toAppRole(authUser?.role)
  };

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'I am struggling to understand quadratic equations and word problems.',
      timestamp: '10:30 AM'
    },
    {
      id: '2',
      sender: 'agent',
      text: 'I understand your difficulty. Let me analyze your query.',
      timestamp: '10:30 AM'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Extracted symptom metadata state
  const [analysis, setAnalysis] = useState({
    domain: 'Mathematics',
    topic: 'Quadratic Equations',
    difficulty: 'High',
    coreChallenge: 'Difficulty understanding and converting word problems into equations.'
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: time
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Dynamic AI response
    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: `I have received your struggle regarding "${query}". Click "Analyze Query" to extract detailed cognitive vectors.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleAnalyzeQuery = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const latestUserMsg = [...messages].reverse().find(m => m.sender === 'user')?.text.toLowerCase() || '';
      
      let newDomain = 'Mathematics';
      let newTopic = 'Quadratic Equations';
      let newDiff = 'High';
      let newChallenge = 'Difficulty understanding and converting word problems into equations.';

      if (latestUserMsg.includes('python') || latestUserMsg.includes('code') || latestUserMsg.includes('function') || latestUserMsg.includes('gil')) {
        newDomain = 'Computer Science';
        newTopic = 'Python Programming';
        newDiff = 'Medium';
        newChallenge = 'Struggling with procedural execution and object reference handling in complex algorithms.';
      } else if (latestUserMsg.includes('matrix') || latestUserMsg.includes('linear') || latestUserMsg.includes('vector')) {
        newDomain = 'Mathematics';
        newTopic = 'Linear Algebra';
        newDiff = 'High';
        newChallenge = 'Difficulty synthesizing matrix transformations and solving system equations.';
      } else if (latestUserMsg.includes('data structure') || latestUserMsg.includes('tree') || latestUserMsg.includes('graph') || latestUserMsg.includes('algorithm')) {
        newDomain = 'Computer Science';
        newTopic = 'Data Structures & Algorithms';
        newDiff = 'High';
        newChallenge = 'Recurrence relations translation deficit and time complexity bottlenecks.';
      }

      setAnalysis({
        domain: newDomain,
        topic: newTopic,
        difficulty: newDiff,
        coreChallenge: newChallenge
      });
      setIsAnalyzing(false);
    }, 700);
  };

  // If another agent route is selected, show its clean placeholder ready for step-by-step implementation
  if (currentPath === '/mastery-assessment') {
    return (
      <DashboardLayout currentUser={studentUser} currentPath={currentPath} onNavigate={onNavigate}>
        <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 animate-slide-up">
          <div className="flex flex-col gap-1 mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">STUDENT PORTAL</div>
            <h1 className="text-2xl font-black text-slate-900 font-display">Mastery Assessment Agent</h1>
            <p className="text-xs text-slate-500">Historical Disparity & Vector Analysis.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 min-h-[420px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-base mb-3">2</div>
            <h3 className="text-base font-bold text-slate-800 font-display">Mastery Assessment Workspace</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Ready for step-by-step implementation.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (currentPath === '/gap-diagnosis') {
    return (
      <DashboardLayout currentUser={studentUser} currentPath={currentPath} onNavigate={onNavigate}>
        <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 animate-slide-up">
          <div className="flex flex-col gap-1 mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">STUDENT PORTAL</div>
            <h1 className="text-2xl font-black text-slate-900 font-display">Gap Diagnosis Agent</h1>
            <p className="text-xs text-slate-500">Root cause mechanism and cognitive friction isolation.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 min-h-[420px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-base mb-3">3</div>
            <h3 className="text-base font-bold text-slate-800 font-display">Gap Diagnosis Workspace</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Ready for step-by-step implementation.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (currentPath === '/path-sequencing') {
    return (
      <DashboardLayout currentUser={studentUser} currentPath={currentPath} onNavigate={onNavigate}>
        <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 animate-slide-up">
          <div className="flex flex-col gap-1 mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">STUDENT PORTAL</div>
            <h1 className="text-2xl font-black text-slate-900 font-display">Path Sequencing Agent</h1>
            <p className="text-xs text-slate-500">Adaptive curriculum synthesis and 4-stage scaffolded sequence.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 min-h-[420px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base mb-3">4</div>
            <h3 className="text-base font-bold text-slate-800 font-display">Path Sequencing Workspace</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Ready for step-by-step implementation.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (currentPath === '/teacher-notification') {
    return (
      <DashboardLayout currentUser={studentUser} currentPath={currentPath} onNavigate={onNavigate}>
        <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-4 animate-slide-up">
          <div className="flex flex-col gap-1 mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">STUDENT PORTAL</div>
            <h1 className="text-2xl font-black text-slate-900 font-display">Teacher Notification Alert</h1>
            <p className="text-xs text-slate-500">Instructor dossier and intervention approval dispatch.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 min-h-[420px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-base mb-3">5</div>
            <h3 className="text-base font-bold text-slate-800 font-display">Teacher Notification Workspace</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">Ready for step-by-step implementation.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // SCREEN 1: STUDENT INTERACTION AGENT (Exact Match to Reference Photo)
  return (
    <DashboardLayout currentUser={studentUser} currentPath="/learning-path" onNavigate={onNavigate}>
      <div className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-2 text-slate-800 font-sans flex flex-col gap-6 animate-slide-up">
        
        {/* Top Header Row matching Reference Image */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              STUDENT PORTAL
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight font-display">
              Welcome, {studentUser.name || 'Arka'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3.5 text-slate-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="Search course or exams..."
                className="bg-white border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 w-52 sm:w-64 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all shadow-2xs"
              />
            </div>

            {/* Student Avatar Icon */}
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {(studentUser.name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Agent Title & Bot Icon Row */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
              Student Interaction Agent
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Understand the student's problem and extract key symptoms.
            </p>
          </div>

          {/* Purple Circular AI Avatar Badge */}
          <div className="w-11 h-11 rounded-full bg-[#635bff] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#635bff]/25 animate-subtle-pulse">
            <div className="relative">
              <Bot className="w-6 h-6 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white"></span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Left Chat, Right Ingestion */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-1 items-stretch">
          
          {/* LEFT CARD: Chat with AI Agent */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between min-h-[480px] animate-fade-in-up">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-5 font-display">
                Chat with AI Agent
              </h3>

              {/* Message Feed */}
              <div className="space-y-4">
                {messages.map((msg, mIdx) => (
                  <div 
                    key={msg.id}
                    className={`p-4 sm:p-5 rounded-2xl transition-all duration-300 animate-fade-in-up stagger-${(mIdx % 3) + 1} hover:shadow-2xs ${
                      msg.sender === 'user' 
                        ? 'bg-[#f4f2fb] border border-[#ebe7f8]' 
                        : 'bg-[#f9f8fe] border border-[#f0edf9]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {msg.sender === 'user' ? (
                        <span className="text-xs font-bold text-slate-700">You</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#635bff] text-white flex items-center justify-center text-[10px] font-black animate-subtle-pulse">
                            A
                          </div>
                          <span className="text-xs font-bold text-slate-900">AI Agent</span>
                        </div>
                      )}
                      <span className="text-[11px] font-medium text-slate-400 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ))}

                {/* AI Typing Indicator */}
                {isTyping && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f9f8fe] border border-[#f0edf9] flex items-center gap-2 text-xs text-[#635bff] font-semibold animate-fade-in-up">
                    <div className="w-5 h-5 rounded-full bg-[#635bff] text-white flex items-center justify-center text-[10px] font-black animate-subtle-pulse">
                      A
                    </div>
                    <span>AI Agent is typing</span>
                    <span className="inline-flex gap-1 items-center ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#635bff] animate-typing-dot-1"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#635bff] animate-typing-dot-2"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#635bff] animate-typing-dot-3"></span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Input Field & Send Button */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-6">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Describe your problem..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all duration-300 shadow-2xs"
              />
              <button
                type="submit"
                className="bg-[#635bff] hover:bg-[#5248e5] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs shrink-0 active:scale-95 cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>

          {/* RIGHT CARD: Query Ingestion & Symptom Extraction */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between min-h-[480px] animate-fade-in-up">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug mb-6 font-display">
                Query Ingestion & Symptom Extraction
              </h3>

              {/* Extraction Metrics */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-slate-100 animate-fade-in-up stagger-1">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Detected Domain</span>
                  <p className="text-sm font-bold text-slate-900">{analysis.domain}</p>
                </div>

                <div className="pb-4 border-b border-slate-100 animate-fade-in-up stagger-2">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Detected Topic</span>
                  <p className="text-sm font-bold text-slate-900">{analysis.topic}</p>
                </div>

                <div className="pb-4 border-b border-slate-100 animate-fade-in-up stagger-3">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Difficulty Level</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-warning-pulse"></span>
                    <span className="text-sm font-bold text-slate-900">{analysis.difficulty}</span>
                  </div>
                </div>

                <div className="pb-2 animate-fade-in-up stagger-4">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Core Challenge</span>
                  <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium">
                    {analysis.coreChallenge}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={handleAnalyzeQuery}
                disabled={isAnalyzing}
                className="w-full bg-[#635bff] hover:bg-[#5248e5] text-white font-bold text-xs sm:text-sm py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing Query...</span>
                  </>
                ) : (
                  <span>Analyze Query</span>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};
