import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Youtube, ChevronDown, Calendar as CalendarIcon, CheckCircle, 
  Code, PenTool, Briefcase, TrendingUp, Beaker, ChevronLeft, ChevronRight,
  Clock, BarChart2, Zap
} from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ValidationStatus, Course } from '../../types';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
}

// Categories Data
const CATEGORIES = [
  { id: 'cs', label: 'Computer Science', icon: Code, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { id: 'design', label: 'Design & Creative', icon: PenTool, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
  { id: 'business', label: 'Business & Finance', icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  { id: 'marketing', label: 'Marketing', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  { id: 'science', label: 'Science & Eng', icon: Beaker, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
];

// Difficulty Levels with Descriptions
const DIFFICULTIES = [
  { id: 'Beginner', label: 'Beginner', level: 1, desc: 'New to the subject' },
  { id: 'Intermediate', label: 'Intermediate', level: 2, desc: 'Some prior knowledge' },
  { id: 'Advanced', label: 'Advanced', level: 3, desc: 'Deep understanding' }
] as const;

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose, onCourseCreated }) => {
  // Form State
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [studyHours, setStudyHours] = useState(1.5); // Default to 1.5h
  const [difficulty, setDifficulty] = useState<string>('Beginner');
  
  // Custom Dropdown State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Calendar State
  const [date, setDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset State on Open
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setIsValidUrl(false);
      setIsSettingsOpen(false);
      setStudyHours(1.5);
      setDifficulty('Beginner');
      setCategory(CATEGORIES[0]);
      setDate(new Date());
      setViewMonth(new Date());
      setIsLoading(false);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateYouTubeUrl = (input: string) => {
    const regExp = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return regExp.test(input);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    const valid = validateYouTubeUrl(value);
    setIsValidUrl(valid);
    if (valid && !isSettingsOpen) {
        setIsSettingsOpen(true);
    }
  };

  const handleSubmit = () => {
    if (!isValidUrl) return;
    setIsLoading(true);
    
    // Simulate generation delay
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);
      
      // Create new course object
      const newCourse: Course = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Course from ${url.substring(0, 20)}...`, // Mock title
        instructor: 'AI Generated',
        progress: 0,
        completedLessons: 0,
        totalLessons: Math.floor(Math.random() * 10) + 5,
        thumbnail: `https://picsum.photos/seed/${Math.random()}/400/225`,
        difficulty: difficulty as any,
        category: category.label.split(' ')[0] // Simple category extraction
      };

      setTimeout(() => {
        onCourseCreated(newCourse);
        onClose();
      }, 1500);
    }, 2000);
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendarDays = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = date.getDate() === day && date.getMonth() === month && date.getFullYear() === year;
      const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

      days.push(
        <button
          key={day}
          onClick={() => {
            setDate(new Date(year, month, day));
            setIsCalendarOpen(false);
          }}
          className={`
            h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition-all
            ${isSelected ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}
            ${!isSelected && isToday ? 'border border-primary text-primary' : ''}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const changeMonth = (offset: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1));
  };

  // Format hours for display
  const formatHours = (val: number) => {
    if (val < 1) return `${val * 60} min`;
    return val === 1 ? '1 hr' : `${val} hrs`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 w-[360px] bg-white rounded-xl shadow-2xl border-l-4 border-success p-4 flex items-center gap-4 z-[60] animate-slide-up">
            <div className="p-2 bg-green-50 rounded-full">
                <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
                <p className="font-bold text-slate-900">Course Generated!</p>
                <p className="text-xs text-slate-500">Added to your curriculum.</p>
            </div>
        </div>
      )}

      {/* Modal Container */}
      <div className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl relative flex flex-col my-auto animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-20">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create New Course</h2>
                    <p className="text-sm text-slate-500 mt-1">Transform any YouTube content into a structured course.</p>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                    disabled={isLoading}
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar bg-white">
            
            {/* Step 1: URL Input */}
            <div className="mb-8">
                <Input 
                    label="YOUTUBE URL OR PLAYLIST"
                    placeholder="Paste link here (e.g., https://youtube.com/watch?v=...)"
                    value={url}
                    onChange={handleUrlChange}
                    leftIcon={<Youtube className={`w-5 h-5 ${isValidUrl ? 'text-red-600' : 'text-slate-400'}`} />}
                    status={url ? (isValidUrl ? ValidationStatus.Valid : ValidationStatus.Invalid) : ValidationStatus.Idle}
                    className="text-sm"
                />
                {!isValidUrl && url.length > 0 && (
                     <p className="text-error text-xs mt-2 ml-1">Please enter a valid YouTube video or playlist URL.</p>
                )}
            </div>

            {/* Step 2: Configuration (Collapsible) */}
            <div className={`transition-all duration-500 ease-in-out ${isSettingsOpen ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none h-0 overflow-hidden'}`}>
                
                {/* Category & Date Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    
                    {/* Category Dropdown */}
                    <div className="relative" ref={categoryRef}>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                        <button
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className={`
                                w-full h-[52px] bg-slate-50 border rounded-xl flex items-center justify-between px-4 text-left transition-all duration-200
                                ${isCategoryOpen ? 'border-primary ring-2 ring-primary/10 bg-white' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${category.bg}`}>
                                    <category.icon className={`w-4 h-4 ${category.color}`} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{category.label}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isCategoryOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-30 py-2 animate-fade-in max-h-60 overflow-y-auto">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setCategory(cat); setIsCategoryOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className={`p-1.5 rounded-lg ${cat.bg} group-hover:scale-110 transition-transform`}>
                                            <cat.icon className={`w-4 h-4 ${cat.color}`} />
                                        </div>
                                        <span className={`text-sm ${category.id === cat.id ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                            {cat.label}
                                        </span>
                                        {category.id === cat.id && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Date Picker */}
                    <div className="relative" ref={calendarRef}>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                        <button
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className={`
                                w-full h-[52px] bg-slate-50 border rounded-xl flex items-center justify-between px-4 text-left transition-all duration-200
                                ${isCalendarOpen ? 'border-primary ring-2 ring-primary/10 bg-white' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="w-5 h-5 text-slate-500" />
                                <span className="text-sm font-semibold text-slate-700">
                                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-primary bg-indigo-50 px-2 py-1 rounded">
                                {Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 0 ? 'TODAY' : 'UPCOMING'}
                            </span>
                        </button>

                        {/* Calendar Popover */}
                        {isCalendarOpen && (
                            <div className="absolute top-full left-0 right-0 md:left-auto md:right-0 mt-2 w-full md:w-[300px] bg-white border border-slate-100 rounded-xl shadow-xl z-30 p-4 animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
                                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                                    <span className="text-sm font-bold text-slate-800">
                                        {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                                </div>
                                
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                        <span key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>
                                    ))}
                                </div>
                                
                                <div className="grid grid-cols-7 gap-1">
                                    {renderCalendarDays()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Daily Goal Slider */}
                <div className="mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Daily Goal</label>
                            <p className="text-xs text-slate-400">How much time can you dedicate daily?</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-slate-900">{formatHours(studyHours)}</span>
                        </div>
                    </div>
                    
                    <div className="relative h-14 pt-2">
                        {/* Custom Range Slider */}
                        <input 
                            type="range" 
                            min="0.5" 
                            max="3" 
                            step="0.5"
                            value={studyHours}
                            onChange={(e) => setStudyHours(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary z-20 relative"
                            style={{
                                backgroundImage: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${((studyHours - 0.5) / 2.5) * 100}%, #e2e8f0 ${((studyHours - 0.5) / 2.5) * 100}%, #e2e8f0 100%)`
                            }}
                        />
                        
                        {/* Ticks & Labels */}
                        <div className="absolute top-6 left-0 w-full flex justify-between px-[2px]">
                            {[0.5, 1, 1.5, 2, 2.5, 3].map(tick => (
                                <div 
                                    key={tick} 
                                    className="flex flex-col items-center gap-1 cursor-pointer group"
                                    onClick={() => setStudyHours(tick)}
                                >
                                    <div className={`w-1 h-1.5 rounded-full ${tick <= studyHours ? 'bg-primary' : 'bg-slate-300'} mb-1`}></div>
                                    <span className={`text-[10px] font-medium transition-colors ${tick === studyHours ? 'text-primary font-bold' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                        {formatHours(tick)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Complexity Selector */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Complexity</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {DIFFICULTIES.map((level) => (
                            <button
                                key={level.id}
                                onClick={() => setDifficulty(level.id)}
                                className={`
                                    relative p-4 rounded-xl border-2 text-left transition-all duration-200 group
                                    ${difficulty === level.id 
                                        ? 'border-primary bg-indigo-50/50 shadow-sm' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-1.5 rounded-lg ${difficulty === level.id ? 'bg-indigo-100 text-primary' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                                        <BarChart2 className="w-4 h-4" />
                                    </div>
                                    {difficulty === level.id && <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />}
                                </div>
                                <h3 className={`text-sm font-bold mb-0.5 ${difficulty === level.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {level.label}
                                </h3>
                                <p className="text-[11px] text-slate-500">{level.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button 
                    variant="secondary" 
                    onClick={onClose}
                    className="w-full sm:w-auto sm:flex-1 border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold"
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                
                <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={!isValidUrl || isLoading}
                    isLoading={isLoading}
                    className={`
                        w-full sm:w-[60%] shadow-xl shadow-primary/20 
                        ${!isValidUrl ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] hover:shadow-primary/30'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        {isLoading ? (
                            'Analyzing Content...'
                        ) : (
                            <>
                                <Zap className="w-4 h-4 fill-yellow-300 text-yellow-100" />
                                <span>Generate Course Curriculum</span>
                            </>
                        )}
                    </div>
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};