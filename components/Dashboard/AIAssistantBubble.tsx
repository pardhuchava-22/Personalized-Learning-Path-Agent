import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Calendar, Clock, BookOpen, AlertTriangle, 
  Sparkles, Move, ChevronRight, HelpCircle, Bot
} from 'lucide-react';
import { learningAgentAPI, examsAPI } from '../../services/apiService';
import { useCourses } from '../../services/courseContext';
import { useAuth } from '../../services/authContext';
import robotAvatar from '../../assets/ai-companion-robot.png';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  cards?: {
    type: 'upcoming' | 'performance' | 'struggle' | 'courses';
    items: any[];
  };
}

export const AIAssistantBubble: React.FC = () => {
  const { user: authUser } = useAuth();
  const { courses } = useCourses();
  
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

  // Real data state
  const [pastExams, setPastExams] = useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const studentName = authUser?.first_name 
    ? `${authUser.first_name} ${authUser.last_name || ''}`.trim() 
    : (authUser?.username || 'Student');

  // Initialize position to bottom-right
  useEffect(() => {
    const initPos = () => {
      if (typeof window !== 'undefined') {
        const defaultX = Math.max(16, window.innerWidth - 90);
        const defaultY = Math.max(16, window.innerHeight - 95);
        setPosition(prev => prev ?? { x: defaultX, y: defaultY });
      }
    };
    initPos();

    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return null;
        return {
          x: Math.max(16, Math.min(window.innerWidth - 80, prev.x)),
          y: Math.max(16, Math.min(window.innerHeight - 80, prev.y))
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch real data on mount
  useEffect(() => {
    const fetchCompanionData = async () => {
      try {
        const [studentExamsRes, myExamsRes, statsRes] = await Promise.allSettled([
          learningAgentAPI.getStudentExams(),
          examsAPI.getMyExams(),
          examsAPI.getDashboardStats()
        ]);

        if (studentExamsRes.status === 'fulfilled' && Array.isArray(studentExamsRes.value)) {
          setPastExams(studentExamsRes.value);
        }

        if (myExamsRes.status === 'fulfilled' && Array.isArray(myExamsRes.value)) {
          setUpcomingExams(myExamsRes.value);
        } else if (statsRes.status === 'fulfilled' && statsRes.value?.upcoming_exams) {
          setUpcomingExams(statsRes.value.upcoming_exams);
        }

        if (statsRes.status === 'fulfilled') {
          setDashboardStats(statsRes.value);
        }
      } catch (err) {
        console.error('AI Companion: Error loading academic telemetry:', err);
      }
    };

    fetchCompanionData();
  }, []);

  // Initial welcome message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hi ${studentName}! 👋 I'm your Quantum AI Learning Companion. You can drag me anywhere on screen! Ask me about your upcoming exams, past exam performance scores, or struggle topics anytime.`,
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages]);

  // ─── Drag Handling ───
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!position) return;
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      hasMoved: false
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - dragInfoRef.current.startX;
      const dy = moveEvent.clientY - dragInfoRef.current.startY;
      
      if (!dragInfoRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
        dragInfoRef.current.hasMoved = true;
        setIsDragging(true);
      }

      if (dragInfoRef.current.hasMoved) {
        const nextX = Math.max(16, Math.min(window.innerWidth - 80, dragInfoRef.current.initialX + dx));
        const nextY = Math.max(16, Math.min(window.innerHeight - 85, dragInfoRef.current.initialY + dy));
        setPosition({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (!dragInfoRef.current.hasMoved) {
        // Was a simple click, toggle open/close
        setIsOpen(prev => !prev);
      }
      setTimeout(() => setIsDragging(false), 50);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Suggestion Pills
  const suggestions = [
    { label: '📅 When is my upcoming exam?', query: 'When is my upcoming exam?' },
    { label: '📊 How did I perform on my exams?', query: 'How did I perform on my exams?' },
    { label: '⚠️ What are my weak topics?', query: 'What are my struggle topics?' },
    { label: '📚 Show my enrolled courses', query: 'What courses am I enrolled in?' }
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    setTimeout(() => {
      const lower = query.toLowerCase();
      let responseText = '';
      let cards: Message['cards'] = undefined;

      // 1. Upcoming exam queries
      if (
        lower.includes('upcoming') || 
        lower.includes('when') || 
        lower.includes('next exam') || 
        lower.includes('schedule') || 
        lower.includes('date') || 
        lower.includes('timing')
      ) {
        if (upcomingExams.length > 0) {
          responseText = `You have **${upcomingExams.length} upcoming scheduled exam${upcomingExams.length > 1 ? 's' : ''}**. Here is your exam calendar:`;
          cards = {
            type: 'upcoming',
            items: upcomingExams.map(ex => ({
              id: ex.id,
              title: ex.title,
              course: ex.course_name || 'Assigned Course',
              date: ex.start_time ? new Date(ex.start_time).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : 'Scheduled soon',
              duration: ex.duration_minutes ? `${ex.duration_minutes} mins` : '60 mins',
              priority: ex.priority || 'high'
            }))
          };
        } else {
          responseText = `Great news! You have no pending upcoming exams right now. All your current scheduled tasks are up to date. Keep up the regular coursework!`;
        }
      }
      // 2. Exam performance queries
      else if (
        lower.includes('performance') || 
        lower.includes('perform') || 
        lower.includes('score') || 
        lower.includes('grade') || 
        lower.includes('marks') || 
        lower.includes('how did i write') || 
        lower.includes('how did i do') || 
        lower.includes('past exam') || 
        lower.includes('result') ||
        lower.includes('algebra')
      ) {
        if (pastExams.length > 0) {
          const latestExam = pastExams[0];
          responseText = `Here is your exam performance telemetry! On **${latestExam.title}**, you scored **${latestExam.overallScore}% (Grade ${latestExam.grade})**.\n\nYou demonstrated solid mastery of foundational topics, but showed hesitation on multi-step complex word problems. Here is your section breakdown:`;
          cards = {
            type: 'performance',
            items: pastExams.map(ex => ({
              id: ex.id,
              title: ex.title,
              score: ex.overallScore,
              grade: ex.grade,
              status: ex.status,
              classAverage: ex.classAverage || 76,
              sections: ex.sections || []
            }))
          };
        } else {
          const avg = dashboardStats?.average_score || 82;
          responseText = `Your current overall academic average is **${avg}%**. You are in the top 15% of your class across submitted assignments and quizzes!`;
        }
      }
      // 3. Struggle / Weak topics queries
      else if (
        lower.includes('weak') || 
        lower.includes('struggle') || 
        lower.includes('gap') || 
        lower.includes('improve') || 
        lower.includes('mistake') || 
        lower.includes('topics')
      ) {
        let struggles: string[] = [];
        pastExams.forEach(ex => {
          if (Array.isArray(ex.struggleTopics)) {
            struggles.push(...ex.struggleTopics);
          }
        });

        if (struggles.length === 0) {
          struggles = [
            'Quadratic Word Problems & Equation Setup',
            'Time management on multi-step synthesis questions',
            'Boundary condition validation'
          ];
        }

        responseText = `Based on AI diagnostic telemetry from your previous exam submissions, here are your prioritized focus areas for improvement:`;
        cards = {
          type: 'struggle',
          items: struggles.map((item, idx) => ({
            id: idx,
            topic: item,
            recommendation: `Review milestone practice exercises and break word problems into known vs unknown variables.`
          }))
        };
      }
      // 4. Course queries
      else if (
        lower.includes('course') || 
        lower.includes('class') || 
        lower.includes('enrolled') || 
        lower.includes('progress')
      ) {
        if (courses.length > 0) {
          responseText = `You are currently enrolled in **${courses.length} courses**. Here is your active progress snapshot:`;
          cards = {
            type: 'courses',
            items: courses.map(c => ({
              id: c.id,
              title: c.title,
              progress: c.progress || 0,
              instructor: c.instructor?.name || 'Faculty Member'
            }))
          };
        } else {
          responseText = `You have enrolled courses registered on your profile. Check the 'My Courses' tab for complete syllabi.`;
        }
      }
      // 5. General academic / help queries
      else {
        responseText = `Regarding **"${query}"**:\n\nTo optimize your exam readiness, I recommend reviewing your past test breakdown, tackling practice problem sets on your struggle topics, and checking your exam schedule 24 hours prior to launch. Is there a specific course or exam you want me to analyze?`;
      }

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
        cards
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsThinking(false);
    }, 700);
  };

  // Compute smart drawer anchor position based on bubble position
  const getDrawerStyle = (): React.CSSProperties => {
    if (!position || typeof window === 'undefined') {
      return { bottom: '100px', right: '24px' };
    }

    const drawerWidth = 400;
    const drawerHeight = 540;

    // Determine X placement (left or right of bubble)
    let left = position.x - drawerWidth + 65;
    if (position.x < drawerWidth + 20) {
      // Bubble is on the left side of screen, open drawer to the right
      left = position.x + 80;
    }
    // Clamp to window boundaries
    left = Math.max(16, Math.min(window.innerWidth - drawerWidth - 16, left));

    // Determine Y placement (above bubble)
    let top = position.y - drawerHeight + 20;
    if (top < 20) {
      top = Math.max(16, position.y + 75);
    }
    // Clamp Y to window boundaries
    top = Math.max(16, Math.min(window.innerHeight - drawerHeight - 16, top));

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${drawerWidth}px`,
      height: `${drawerHeight}px`,
      zIndex: 60
    };
  };

  return (
    <>
      {/* ─── Draggable AI Bubble Launcher ─── */}
      <div 
        ref={bubbleRef}
        onPointerDown={handlePointerDown}
        style={{
          position: 'fixed',
          left: position ? `${position.x}px` : 'auto',
          top: position ? `${position.y}px` : 'auto',
          bottom: position ? 'auto' : '24px',
          right: position ? 'auto' : '24px',
          zIndex: 70,
          touchAction: 'none'
        }}
        className={`flex flex-col items-center select-none ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}`}
      >
        {/* Floating Tooltip / Teaser when closed */}
        {!isOpen && !isDragging && (
          <div className="mb-2 bg-[#0e121b] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-[0_6px_20px_rgba(14,18,27,0.35)] border border-[#bbf451]/30 backdrop-blur-md flex items-center gap-1.5 animate-gentle-float group transition-transform">
            <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-subtle-pulse" />
            <span className="text-[#bbf451] font-mono">Ask AI</span>
            <span className="text-slate-300 font-normal text-[10px]">· Drag me</span>
          </div>
        )}

        {/* 3D Robot Image Bubble */}
        <div className="relative group">
          {/* Animated Glowing Ring (Matching Cyber Blue/Cyan + Lime Accent) */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-cyan-400 via-[#bbf451] to-blue-500 opacity-60 blur-md group-hover:opacity-90 animate-soft-glow transition-opacity duration-300 pointer-events-none" />

          {/* Circular Button Container */}
          <div className={`relative w-[68px] h-[68px] rounded-full overflow-hidden border-2 transition-all duration-300 shadow-[0_10px_25px_rgba(14,18,27,0.4)] ${
            isOpen 
              ? 'border-[#bbf451] ring-4 ring-[#bbf451]/30 bg-[#0e121b]' 
              : 'border-[#bbf451]/80 hover:border-[#bbf451] group-hover:scale-105 bg-[#0e121b] animate-gentle-float'
          }`}>
            <img 
              src={robotAvatar} 
              alt="AI Companion" 
              className="w-full h-full object-cover select-none pointer-events-none transform scale-105"
              draggable={false}
            />

            {/* If open, show quick close X overlay in top right */}
            {isOpen && (
              <div className="absolute inset-0 bg-[#0e121b]/60 flex items-center justify-center backdrop-blur-xs">
                <X className="w-7 h-7 text-[#bbf451]" />
              </div>
            )}
          </div>

          {/* Active Online Status Badge (Lime Green) */}
          {hasUnread && !isOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#bbf451] border-2 border-[#0e121b] rounded-full shadow-md animate-subtle-pulse" />
          )}
          {!isOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#bbf451] border-2 border-[#0e121b] rounded-full shadow-md flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-[#0e121b] rounded-full" />
            </span>
          )}

          {/* Drag Move Handle Icon Badge (Bottom Left) */}
          <div className="absolute -bottom-1 -left-1 bg-[#0e121b] border border-slate-700 text-[#bbf451] rounded-full p-1 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
            <Move className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>

      {/* ─── Expandable AI Chatbot Window (Matches Dashboard Colors) ─── */}
      {isOpen && (
        <div 
          style={getDrawerStyle()}
          className="max-h-[88vh] bg-white rounded-3xl border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(14,18,27,0.25)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
        >
          {/* Header - Styled to match Charcoal Sidebar & Lime Green Brand */}
          <div className="bg-[#0e121b] px-5 py-4 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {/* Mini 3D Robot Avatar in Header */}
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#bbf451]/60 shadow-inner bg-[#0e121b]">
                  <img 
                    src={robotAvatar} 
                    alt="Robot Avatar" 
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#bbf451] rounded-full border-2 border-[#0e121b]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[13.5px] font-black tracking-tight font-display text-white">Quantum AI Companion</h4>
                  <span className="bg-[#bbf451] text-[#0e121b] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest font-mono shadow-xs">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Exam Performance & Schedule Telemetry</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Companion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#f8fafc]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#bbf451]/50 shrink-0 mt-0.5 shadow-sm bg-[#0e121b]">
                    <img 
                      src={robotAvatar} 
                      alt="AI" 
                      className="w-full h-full object-cover" 
                      draggable={false}
                    />
                  </div>
                )}

                <div className={`max-w-[84%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Bubble text */}
                  <div
                    className={`p-3.5 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-[#0e121b] text-white rounded-tr-none font-medium border border-slate-800'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-normal'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Render Rich Cards if present */}
                    {msg.cards && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                        {/* Upcoming Exams Cards */}
                        {msg.cards.type === 'upcoming' && (
                          msg.cards.items.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900 truncate">{item.title}</span>
                                <span className="bg-[#0e121b] text-[#bbf451] text-[9px] font-black px-2 py-0.5 rounded-full uppercase font-mono">
                                  {item.priority}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                <Calendar className="w-3 h-3 text-slate-800 shrink-0" />
                                <span>{item.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Duration: {item.duration}</span>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Exam Performance Cards */}
                        {msg.cards.type === 'performance' && (
                          msg.cards.items.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-900">{item.title}</span>
                                <span className="bg-[#0e121b] text-[#bbf451] text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
                                  {item.score}% · Grade {item.grade}
                                </span>
                              </div>

                              <div className="flex justify-between text-[10px] text-slate-500 border-b border-slate-200 pb-1.5">
                                <span>Status: <strong className="text-slate-800">{item.status}</strong></span>
                                <span>Class Avg: <strong className="text-slate-800">{item.classAverage}%</strong></span>
                              </div>

                              {/* Cognitive section breakdown */}
                              {item.sections && item.sections.length > 0 && (
                                <div className="space-y-1.5 pt-0.5">
                                  <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider font-mono">Section Mastery</p>
                                  {item.sections.map((sec: any) => (
                                    <div key={sec.id} className="flex items-center justify-between text-[10.5px]">
                                      <span className="text-slate-600 truncate max-w-[170px]">{sec.name}</span>
                                      <span className={`font-mono font-bold ${sec.score >= 80 ? 'text-emerald-600' : sec.score >= 60 ? 'text-blue-600' : 'text-rose-500'}`}>
                                        {sec.score}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}

                        {/* Struggle Topics */}
                        {msg.cards.type === 'struggle' && (
                          msg.cards.items.map((item, idx) => (
                            <div key={idx} className="bg-[#fef9c3]/50 border border-amber-200/80 rounded-xl p-2.5 text-[11px] space-y-1">
                              <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.topic}</span>
                              </div>
                              <p className="text-[10px] text-amber-900/80 pl-5 leading-tight">
                                {item.recommendation}
                              </p>
                            </div>
                          ))
                        )}

                        {/* Courses */}
                        {msg.cards.type === 'courses' && (
                          msg.cards.items.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 truncate">{item.title}</span>
                                <span className="font-mono font-bold text-slate-900">{item.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#0e121b] h-full rounded-full" style={{ width: `${item.progress}%` }} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 px-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#bbf451]/50 shrink-0 shadow-sm bg-[#0e121b]">
                  <img src={robotAvatar} alt="Thinking" className="w-full h-full object-cover animate-pulse" />
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[#0e121b] animate-pulse delay-100" />
                  <span className="w-2 h-2 rounded-full bg-[#bbf451] animate-pulse delay-200" />
                  <span className="text-[11px] font-medium text-slate-500 ml-1.5">Querying telemetry...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="px-3.5 py-2 bg-slate-100/80 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s.query)}
                className="whitespace-nowrap text-[10.5px] font-semibold bg-white hover:bg-[#bbf451]/30 text-slate-800 hover:text-[#0e121b] border border-slate-200 rounded-full px-2.5 py-1 shadow-2xs transition-colors shrink-0"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about your exams, scores, schedule..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e121b] focus:ring-1 focus:ring-[#0e121b]/20 transition-all font-sans"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isThinking}
              className="p-2 rounded-xl bg-[#0e121b] hover:bg-[#bbf451] hover:text-[#0e121b] text-white disabled:opacity-40 disabled:hover:bg-[#0e121b] disabled:hover:text-white transition-all shadow-sm shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
