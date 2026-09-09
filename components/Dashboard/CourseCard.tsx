import React, { useState, useRef, useEffect } from 'react';
import { Course } from '../../types';
import { Button } from '../ui/Button';
import { Clock, BookOpen, MoreVertical, Trash2, Edit2, Share2 } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  onDelete?: (id: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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
    <div className="bg-white rounded-2xl border border-slate-100 hover:border-primary/40 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] group flex flex-col h-full relative">
      
      {/* Thumbnail */}
      <div className="h-40 w-full overflow-hidden relative">
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
        
        <div className="absolute top-3 left-3">
             <span className="text-[10px] font-bold tracking-wider text-white bg-white/20 backdrop-blur-md border border-white/30 px-2 py-1 rounded-full uppercase shadow-sm">
                {course.category || 'General'}
            </span>
        </div>

        {/* Action Menu Button */}
        <div className="absolute top-3 right-3" ref={menuRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-slate-900 flex items-center justify-center transition-all shadow-sm cursor-pointer"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-fade-in origin-top-right">
                    <button className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                        Edit Details
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        Share
                    </button>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsMenuOpen(false);
                            if (onDelete) onDelete(course.id); 
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Course
                    </button>
                </div>
            )}
        </div>

        <div className="absolute bottom-3 right-3">
             <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">
                Module {course.completedLessons + 1}/{course.totalLessons}
             </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
            <span className={`
                text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase
                ${course.difficulty === 'Advanced' ? 'text-purple-600 bg-purple-50' : 
                  course.difficulty === 'Intermediate' ? 'text-amber-600 bg-amber-50' : 
                  'text-emerald-600 bg-emerald-50'}
            `}>
                {course.difficulty || 'Intermediate'}
            </span>
        </div>
        
        <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2 leading-tight flex-1 group-hover:text-primary transition-colors">
            {course.title}
        </h3>
        
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-4 mt-2">
            <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>2h 15m</span>
            </div>
            <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{course.totalLessons} Lessons</span>
            </div>
        </div>

        {/* Progress */}
        <div className="mt-auto">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-slate-500 font-medium">Progress</span>
            <span className="text-slate-800 font-bold">{course.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div 
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${course.progress}%` }}
            ></div>
          </div>

          <Button 
            variant="secondary" 
            className="w-full h-9 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border-transparent hover:border-slate-200 hover:text-primary transition-all"
            onClick={() => window.location.hash = '/learning'}
          >
            Continue Learning
          </Button>
        </div>
      </div>
    </div>
  );
};