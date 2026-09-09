import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, Terminal, HelpCircle, ArrowRight } from 'lucide-react';
import { ChatMessage } from '../../types';
import { coursesAPI } from '../../services/apiService';

interface AIAssistantProps {
  courseTitle?: string;
  moduleTitle?: string;
  moduleId?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ courseTitle, moduleTitle, moduleId }) => {
  const topicLabel = moduleTitle || courseTitle || 'this lesson';
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      text: `Hello! I'm your Socratic AI Coach for **${topicLabel}**. I will help guide your learning journey without giving answers directly. \n\nWhat concept in this lesson would you like to explore or clarify?`, 
      sender: 'ai', 
      timestamp: new Date() 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (messageText = input) => {
    const textToSend = messageText.trim();
    if (!textToSend || !moduleId || loading) return;

    const userMsgId = Date.now().toString();
    const newMsg: ChatMessage = { id: userMsgId, text: textToSend, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await coursesAPI.chatWithCoach(moduleId, textToSend);
      const reply = response.reply || `I'm here to help! Let's think about this concept together. What specific part of this module feels most challenging?`;
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: reply,
        sender: 'ai',
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error("AI Coach API error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: `I apologize, I encountered a communication lag. Let's try analyzing the topic again. Could you rephrase your question about **${topicLabel}**?`,
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Preset chips for Socratic assistance
  const suggestionChips = [
    { text: 'Explain this simply', icon: <Bot className="w-3 h-3 text-cyan-400" /> },
    { text: 'Give a Python example', icon: <Terminal className="w-3 h-3 text-emerald-400" /> },
    { text: 'Quiz me on this', icon: <HelpCircle className="w-3 h-3 text-amber-400" /> }
  ];

  return (
    <div className="flex flex-col h-[520px] bg-[#070b16]/65 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      
      {/* Messages Panel */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.sender === 'user' 
                ? 'bg-[#1E2E4A]/80 border border-cyan-500/20 text-[#E0E7FF] rounded-br-none shadow-md' 
                : 'bg-[#0B1528] border border-slate-800/60 text-slate-200 rounded-bl-none shadow-lg'
              }
            `}>
              {msg.sender === 'ai' && (
                <div className="flex items-center gap-2 mb-2 text-xs text-cyan-400 font-bold uppercase tracking-wider select-none">
                  <Bot className="w-3.5 h-3.5 animate-pulse text-cyan-450" />
                  AI Coach
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        
        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-[#0B1528] border border-slate-800/60 text-slate-350 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-cyan-450 font-bold uppercase tracking-wider">
                <Bot className="w-3.5 h-3.5 animate-spin text-cyan-405" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Chips */}
      {!loading && messages.length < 5 && (
        <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar select-none bg-[#0B0F19]/20 border-t border-slate-800/30">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.text)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A]/70 hover:bg-[#1E2E4A]/40 border border-slate-800 hover:border-cyan-500/30 text-[11px] font-bold text-slate-300 hover:text-white rounded-full transition-all cursor-pointer shadow-sm"
            >
              {chip.icon}
              {chip.text}
            </button>
          ))}
        </div>
      )}

      {/* Action Input Area */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0B0F19]/40 relative shrink-0">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            placeholder={loading ? "AI is processing..." : "Ask a question about this module..."}
            className="w-full h-12 pl-4 pr-24 bg-[#050814]/95 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500 text-sm transition-all shadow-inner disabled:opacity-50"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <button 
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="h-8 px-3.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 disabled:from-slate-800 disabled:to-slate-850 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-cyan-500/10 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 text-xs uppercase tracking-wider"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
