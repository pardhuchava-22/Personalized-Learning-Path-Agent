import React, { useState, useRef, useEffect } from 'react';
import { Play, Clock, Users, MoreHorizontal, BookOpen, Share2, Ban } from 'lucide-react';
import { Button } from '../ui/Button';

interface ActiveCourseCardProps {
  title: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  timeLeft: string;
  students: number;
  image: string;
}

export const ActiveCourseCard: React.FC<ActiveCourseCardProps> = ({
  title,
  progress,
  totalLessons,
  completedLessons,
  timeLeft,
  students,
  image
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Today's Focus</h3>
        </div>
        
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-full transition-colors"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 animate-fade-in origin-top-right">
                    <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        Course Details
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Share2 className="w-4 h-4 text-slate-400" />
                        Share Progress
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                        <Ban className="w-4 h-4" />
                        Remove from Focus
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Circular Progress */}
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#gradient-course)"
              strokeWidth="8"
              strokeDasharray="283"
              strokeDashoffset={283 - (progress / 100) * 283}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
             <defs>
                <linearGradient id="gradient-course" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <div className="bg-indigo-50 p-2 rounded-full mb-1">
                 <Play className="w-4 h-4 text-primary fill-primary ml-0.5" />
             </div>
             <span className="text-lg font-bold text-slate-800">{progress}%</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 w-full text-center md:text-left">
            <h2 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{title}</h2>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-6 justify-center md:justify-start">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{timeLeft} remaining</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{students} students</span>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 text-xs h-10 border-slate-200 hover:bg-slate-50">
                    Skip Module
                </Button>
                <Button 
                    variant="primary" 
                    className="flex-1 text-xs h-10 shadow-lg shadow-primary/25 hover:shadow-primary/40"
                    onClick={() => window.location.hash = '/learning'}
                >
                    Continue Learning
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};