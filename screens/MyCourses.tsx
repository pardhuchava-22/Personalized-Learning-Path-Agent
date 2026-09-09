import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { Plus, Search, BookOpen, Play, MoreVertical, ChevronLeft, ChevronRight, LayoutGrid, List, ChevronDown, Clock, Calendar, Trash2, Edit2, ExternalLink, Pause, RotateCcw, AlertCircle, Youtube, Bell, ShieldCheck } from 'lucide-react';
import { SmartCourse, CourseStatus, User } from '../types';
import { useCourses } from '../services/courseContext';
import { useAuth } from '../services/authContext';
import { NotificationCenter } from '../components/Layout/NotificationCenter';

interface MyCoursesScreenProps {
  onNavigate: (path: string) => void;
}

// Status filter options
const STATUS_FILTERS: { label: string; value: CourseStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Not Started', value: 'not_started' },
  { label: 'Paused', value: 'paused' },
];

// Sort options
const SORT_OPTIONS = [
  { label: 'Recent First', value: 'recent' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'A-Z', value: 'alpha' },
  { label: 'Progress', value: 'progress' },
];

export const MyCoursesScreen: React.FC<MyCoursesScreenProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const user: User = { 
    id: String(authUser?.id || '1'), 
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Arka Maulana', 
    email: authUser?.email || 'arka.m@university.edu' 
  };

  const { courses, isLoading, error, refreshCourses } = useCourses();
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CourseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 8;

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter + Search + Sort
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Status filter
    if (activeFilter !== 'all') {
      result = result.filter(c => c.status === activeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case 'oldest':
        result.reverse();
        break;
      case 'alpha':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'progress':
        result.sort((a, b) => b.progress - a.progress);
        break;
      default: // recent
        break;
    }

    return result;
  }, [courses, activeFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const showingFrom = filteredCourses.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const showingTo = Math.min(currentPage * itemsPerPage, filteredCourses.length);

  const hasCourses = courses.length > 0;

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/courses">
      <div className="animate-slide-up pb-16 max-w-[1400px] mx-auto w-full px-2 sm:px-4 text-slate-800 font-sans flex flex-col gap-6">

        {/* ── GLOBAL HEADER ROW (Identical to Dashboard header) ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 border border-slate-100 p-2.5 rounded-2xl md:hidden">
              <ShieldCheck className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-mono">Student Curriculum</h2>
              <p className="text-slate-900 text-sm font-extrabold font-display">My Learning Ecosystem & Curriculum</p>
            </div>
          </div>

          {/* Right side aligned widgets: Unified Search, Notification Bell, and compact Profile */}
          <div className="flex items-center gap-4 self-end lg:self-auto">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input 
                type="text"
                placeholder="Search courses or modules..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-slate-50 transition-all placeholder:text-slate-400 w-48 sm:w-64 shadow-none font-sans"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-900 hover:bg-slate-50 rounded-xl transition-all relative border border-slate-200 bg-white cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border border-white"></span>
              </button>
              <NotificationCenter 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
                onNavigate={onNavigate}
              />
            </div>
            <div className="relative shrink-0 select-none cursor-pointer">
              <div className="w-9 h-9 rounded-full p-[2px] bg-white border border-slate-200 hover:border-slate-400 transition-all flex items-center justify-center">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=111217,c3f53c&fontSize=40&fontWeight=700`} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover" 
                  onClick={() => onNavigate('/settings')}
                />
              </div>
              <div className="absolute -top-1.5 -right-1.5 bg-slate-900 text-primary font-black text-[8px] px-1.5 py-0.5 rounded-full font-mono border border-slate-900">
                30%
              </div>
            </div>
          </div>
        </div>

        {/* ── SUBHEADER & ACTION BUTTON ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">My Curriculum</h1>
            <p className="text-slate-500 text-sm font-semibold mt-0.5">Track modules, take lessons, attempt quizzes, and practice coding challenges.</p>
          </div>
          <button
            onClick={() => onNavigate('/create-course')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest font-mono rounded-xl border border-slate-900 shadow-md active:scale-[0.98] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-primary" strokeWidth={3} />
            Create Course
          </button>
        </div>

        {/* ── CONTROLS & FILTER BAR (Clean background, borderless pills) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent border-none p-0 shadow-none">
          
          {/* Status Pills with Clean Borderless Styling & Correct Padding */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(filter => {
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => { setActiveFilter(filter.value); setCurrentPage(1); }}
                  className={`
                    px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-colors duration-150 cursor-pointer font-sans
                    ${isActive
                      ? 'bg-slate-900 text-white shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 bg-transparent'
                    }
                  `}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Sort + View Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">

            {/* Sort Dropdown with fixed alignment */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-colors duration-150 cursor-pointer min-w-[150px] justify-between font-sans text-xs font-bold uppercase tracking-wider"
              >
                <span className="text-slate-700">{SORT_OPTIONS.find(s => s.value === sortBy)?.label}</span>
                <ChevronDown className={`w-4 h-4 text-slate-450 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 animate-fade-in">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold font-sans uppercase transition-colors duration-150 cursor-pointer ${sortBy === opt.value ? 'text-slate-900 bg-slate-50' : 'text-slate-550 hover:bg-slate-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all rounded-lg cursor-pointer ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all rounded-lg cursor-pointer ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── CONTENT: EMPTY STATE or COURSE LIST ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-500 font-semibold">Loading courses from SQLite...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-red-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <h3 className="text-xl font-extrabold text-slate-900 mb-1.5 font-display uppercase tracking-tight">Courses Could Not Load</h3>
            <p className="text-sm text-slate-500 font-semibold mb-6 max-w-sm text-center leading-relaxed">{error}</p>
            <button
              onClick={refreshCourses}
              className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest font-mono rounded-2xl border-2 border-slate-900 shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-primary" strokeWidth={3} />
              Retry
            </button>
          </div>
        ) : !hasCourses || paginatedCourses.length === 0 ? (
          /* ── EMPTY STATE ── */
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
              <BookOpen className="w-9 h-9 text-slate-450" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1.5 font-display uppercase tracking-tight">No Courses Yet</h3>
            <p className="text-sm text-slate-500 font-semibold mb-6 max-w-sm text-center leading-relaxed">
              {activeFilter !== 'all' || searchQuery
                ? 'No learning schedules match your current filter settings.'
                : "Your curriculum is empty. Paste a YouTube video link to generate your AI-powered timeline."
              }
            </p>
            {activeFilter === 'all' && !searchQuery && (
              <button
                onClick={() => onNavigate('/create-course')}
                className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest font-mono rounded-2xl border-2 border-slate-900 shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-primary" strokeWidth={3} />
                Create Your First Course
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="flex flex-col gap-4">
            {paginatedCourses.map(course => (
              <CourseListItem
                key={course.id}
                course={course}
                isMenuOpen={openMenuId === course.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                onNavigate={onNavigate}
                menuRef={openMenuId === course.id ? menuRef : undefined}
              />
            ))}
          </div>
        ) : (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedCourses.map(course => (
              <CourseGridItem
                key={course.id}
                course={course}
                isMenuOpen={openMenuId === course.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                onNavigate={onNavigate}
                menuRef={openMenuId === course.id ? menuRef : undefined}
              />
            ))}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {hasCourses && filteredCourses.length > 0 && (
          <div className="flex items-center justify-between mt-6 border-t border-slate-100 pt-6">
            <p className="text-xs font-bold text-slate-450 font-sans uppercase tracking-wider">
              Showing {showingFrom} to {showingTo} of {filteredCourses.length} courses
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold font-sans transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                    currentPage === page
                      ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                      : 'border border-slate-200 text-slate-650 hover:bg-slate-50 bg-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};


// ============================================================
// PASTEL STYLE HELPER (Matches Dashboard Palette precisely)
// ============================================================

function getPastelConfig(status: CourseStatus): {
  cardClass: string;
  badgeClass: string;
} {
  switch (status) {
    case 'in_progress':
      return {
        cardClass: 'bg-[#f0f3fe] border-[#d0d7fe]/70 hover:border-[#b4c0fe]/80',
        badgeClass: 'text-indigo-800 bg-white border border-[#e0e4fe]'
      };
    case 'completed':
      return {
        cardClass: 'bg-[#f4fae8] border-[#d6f0a0]/70 hover:border-[#bede7c]/80',
        badgeClass: 'text-emerald-800 bg-white border border-[#e2f3c7]'
      };
    case 'paused':
      return {
        cardClass: 'bg-[#fffbeb] border-[#fef3c7]/70 hover:border-[#fde047]/50',
        badgeClass: 'text-amber-800 bg-white border border-[#fef9c3]'
      };
    default: // not_started
      return {
        cardClass: 'bg-slate-50/50 border-slate-200/60 hover:border-slate-300',
        badgeClass: 'text-slate-650 bg-white border border-slate-200'
      };
  }
}


// ============================================================
// COURSE LIST ITEM (Premium tabular layout with grid columns)
// ============================================================

interface CourseListItemProps {
  course: SmartCourse;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: (path: string) => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
}

const CourseListItem: React.FC<CourseListItemProps> = ({ course, isMenuOpen, onToggleMenu, onNavigate, menuRef }) => {
  const { deleteCourse, updateCourse } = useCourses();
  const pastel = getPastelConfig(course.status);

  return (
    <div
      className={`group border rounded-2xl p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 hover:scale-[1.002] transition-[transform,box-shadow,border-color] duration-200 transform-gpu cursor-pointer ${pastel.cardClass}`}
      onClick={() => onNavigate(`/course/${course.id}`)}
    >
      {/* Tabular Responsive Grid to completely prevent wrapping/squishing bugs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center w-full">

        {/* Column 1: Thumbnail (col-span-3) */}
        <div className="md:col-span-3 xl:col-span-2 shrink-0">
          <div className="relative w-full h-28 sm:h-24 rounded-xl overflow-hidden bg-slate-100 group/thumb">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-500"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-slate-950/20 group-hover/thumb:bg-slate-950/35 transition-colors"></div>
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow transition-transform group-hover/thumb:scale-105">
                <Play className="w-4 h-4 text-slate-950 ml-0.5 shrink-0" fill="currentColor" />
              </div>
            </div>
            {/* Duration badge */}
            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-950/80 text-white text-[9px] font-mono font-bold rounded border border-white/10 tracking-wider">
              {course.videoDuration}
            </div>
          </div>
        </div>

        {/* Column 2: Title, Metadata, Progress (col-span-6 / col-span-5) */}
        <div className="md:col-span-5 xl:col-span-6 min-w-0 w-full flex flex-col justify-center">
          <h3 className="text-[15px] font-extrabold text-slate-900 mb-1 leading-snug font-sans group-hover:text-slate-800 transition-colors truncate" title={course.title}>
            {course.title}
          </h3>
          
          {/* Metadata chips row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 border border-slate-100 text-slate-650 text-[9px] font-bold uppercase font-sans tracking-wide rounded-lg shrink-0">
              <Youtube className="w-3 h-3 text-red-500" />
              YouTube Course
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 border border-slate-100 text-slate-650 text-[9px] font-bold uppercase font-sans tracking-wide rounded-lg shrink-0">
              <Clock className="w-3 h-3 text-slate-405" />
              {formatDuration(course.videoDuration)}
            </span>
            {course.startDate ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 border border-slate-100 text-slate-650 text-[9px] font-bold uppercase font-sans tracking-wide rounded-lg shrink-0">
                <Calendar className="w-3 h-3 text-slate-405" />
                {course.startDate}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-bold uppercase font-sans tracking-wide rounded-lg shrink-0">
                <Calendar className="w-3 h-3 animate-pulse text-amber-500" />
                Not Started
              </span>
            )}
          </div>

          {/* Progress bar container (Clean layout exactly matching Dashboard) */}
          <div className="w-full max-w-[280px]">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-500 font-medium font-sans">Overall Progress</span>
              <span className="text-slate-900 font-bold font-sans">{course.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white border border-slate-150/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${course.progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Column 3: Stats, Status, Actions (col-span-4 / col-span-3) */}
        <div className="md:col-span-4 xl:col-span-4 flex items-center justify-between md:justify-end gap-6 border-t border-slate-100/50 pt-4 md:border-t-0 md:pt-0">
          
          {/* Status Badge */}
          <div className="shrink-0">
            <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-full font-mono shadow-sm ${pastel.badgeClass}`}>
              {course.status === 'in_progress' ? 'In Progress' : course.status === 'completed' ? 'Completed' : course.status === 'paused' ? 'Paused' : 'Not Started'}
            </span>
          </div>

          {/* Stats columns */}
          <div className="hidden xl:grid grid-cols-4 gap-4 border-l border-slate-200/50 pl-5 h-9 items-center">
            <StatColumn label="Modules" value={course.modules.completed} total={course.modules.total} showTotal={false} />
            <StatColumn label="Quizzes" value={course.quizzes.completed} total={course.quizzes.total} />
            <StatColumn label="Code" value={course.codingChallenges.completed} total={course.codingChallenges.total} />
            <StatColumn label="Review" value={course.revisions.completed} total={course.revisions.total} />
          </div>

          {/* Three-dot context menu */}
          <div className="relative shrink-0" ref={menuRef as any}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
              className="w-9 h-9 rounded-xl bg-white/80 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white transition-all cursor-pointer flex items-center justify-center shadow-sm"
            >
              <MoreVertical className="w-4.5 h-4.5" />
            </button>
            {isMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30 animate-fade-in"
              >
                <MenuButton icon={ExternalLink} label="View Course" onClick={() => onNavigate(`/course/${course.id}`)} />
                {course.status === 'in_progress' && (
                  <MenuButton icon={Pause} label="Pause Course" onClick={() => updateCourse(course.id, { status: 'paused' })} />
                )}
                {course.status === 'paused' && (
                  <MenuButton icon={RotateCcw} label="Resume Course" onClick={() => updateCourse(course.id, { status: 'in_progress' })} />
                )}
                <div className="h-px bg-slate-100 my-1.5"></div>
                <MenuButton icon={Trash2} label="Delete Course" onClick={() => deleteCourse(course.id)} danger />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile/Tablet stats (visible below xl) */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-200/50 xl:hidden text-center shrink-0">
        <MobileStat label="Modules" value={course.modules.completed} />
        <MobileStat label="Quizzes" value={`${course.quizzes.completed}/${course.quizzes.total}`} />
        <MobileStat label="Challenges" value={`${course.codingChallenges.completed}/${course.codingChallenges.total}`} />
        <MobileStat label="Revisions" value={`${course.revisions.completed}/${course.revisions.total}`} />
      </div>
    </div>
  );
};


// ============================================================
// COURSE GRID ITEM (Premium Card view matching CourseCard exactly)
// ============================================================

interface CourseGridItemProps {
  course: SmartCourse;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onNavigate: (path: string) => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
}

const CourseGridItem: React.FC<CourseGridItemProps> = ({ course, isMenuOpen, onToggleMenu, onNavigate, menuRef }) => {
  const { deleteCourse, updateCourse } = useCourses();
  const pastel = getPastelConfig(course.status);
  
  return (
    <div
      className={`group border rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:scale-[1.005] flex flex-col h-full bg-white relative transform-gpu cursor-pointer ${pastel.cardClass}`}
      onClick={() => onNavigate(`/course/${course.id}`)}
    >
      {/* Thumbnail area */}
      <div className="relative h-40 overflow-hidden bg-slate-100 shrink-0">
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/35 transition-colors"></div>
        
        {/* Category tag */}
        <div className="absolute top-3 left-3 shadow-sm">
          <span className="text-[9px] font-extrabold tracking-wider text-slate-800 bg-white/90 backdrop-blur border border-slate-200 px-2 py-0.5 rounded-full uppercase">
            {course.status === 'in_progress' ? 'In Progress' : course.status === 'completed' ? 'Completed' : course.status === 'paused' ? 'Paused' : 'Not Started'}
          </span>
        </div>

        {/* Action Menu Button & Dropdown */}
        <div className="absolute top-3 right-3 z-20" ref={menuRef as any}>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-slate-900 flex items-center justify-center transition-all shadow-sm cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-30 animate-fade-in origin-top-right"
            >
              <MenuButton icon={ExternalLink} label="View Course" onClick={() => onNavigate(`/course/${course.id}`)} />
              {course.status === 'in_progress' && (
                <MenuButton icon={Pause} label="Pause Course" onClick={() => updateCourse(course.id, { status: 'paused' })} />
              )}
              {course.status === 'paused' && (
                <MenuButton icon={RotateCcw} label="Resume Course" onClick={() => updateCourse(course.id, { status: 'in_progress' })} />
              )}
              <div className="h-px bg-slate-100 my-1.5"></div>
              <MenuButton icon={Trash2} label="Delete Course" onClick={() => deleteCourse(course.id)} danger />
            </div>
          )}
        </div>
        
        {/* Play overlay button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-4 h-4 text-slate-950 ml-0.5" fill="currentColor" />
          </div>
        </div>
        
        {/* Duration Stamps */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-slate-950/80 text-white text-[9px] font-mono font-bold rounded border border-white/10 tracking-wide">
          {course.videoDuration}
        </div>
      </div>

      {/* Content area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 mb-1.5 line-clamp-2 leading-tight font-sans group-hover:text-slate-800 transition-colors">{course.title}</h3>

          <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-slate-450 uppercase tracking-wider mb-4">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatDuration(course.videoDuration)}</span>
            {course.startDate && (
              <>
                <span className="text-slate-300">·</span>
                <span>{course.startDate}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress block */}
        <div className="mt-auto">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-slate-500 font-medium font-sans">Overall Progress</span>
            <span className="text-slate-800 font-bold font-sans">{course.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white border border-slate-150/40 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${course.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Stats grid row */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center shrink-0">
          <MiniStat label="Modules" value={course.modules.completed} />
          <MiniStat label="Quizzes" value={`${course.quizzes.completed}/${course.quizzes.total}`} />
          <MiniStat label="Code" value={`${course.codingChallenges.completed}/${course.codingChallenges.total}`} />
          <MiniStat label="Review" value={`${course.revisions.completed}/${course.revisions.total}`} />
        </div>
      </div>
    </div>
  );
};


// ============================================================
// HELPER COMPONENTS
// ============================================================

const StatColumn: React.FC<{ label: string; value: number; total?: number; showTotal?: boolean }> = ({
  label, value, total = 0, showTotal = true
}) => (
  <div className="text-center min-w-[70px] px-1">
    <p className="text-sm font-extrabold text-slate-900 leading-none font-sans">
      {showTotal ? `${value}/${total}` : value}
    </p>
    <p className="text-[8px] font-bold text-slate-450 mt-1 leading-none uppercase tracking-wider font-mono">{label}</p>
  </div>
);

const MobileStat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <p className="text-xs font-bold text-slate-900 leading-none font-sans">{value}</p>
    <p className="text-[8.5px] font-extrabold text-slate-400 mt-1 leading-none uppercase tracking-wider font-mono">{label}</p>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <p className="text-xs font-bold text-slate-900 leading-none font-sans">{value}</p>
    <p className="text-[8.5px] font-extrabold text-slate-400 mt-1 leading-none uppercase tracking-wider font-mono">{label}</p>
  </div>
);

const MenuButton: React.FC<{
  icon: React.FC<any>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-full text-left px-4.5 py-2.5 text-xs font-bold uppercase font-sans tracking-wide flex items-center gap-2.5 transition-colors cursor-pointer ${
      danger
        ? 'text-red-650 hover:bg-red-50'
        : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    <Icon className={`w-4 h-4 ${danger ? 'text-red-400' : 'text-slate-450'}`} />
    {label}
  </button>
);

// Format "20:00:00" → "20 Hrs 00 Min"
function formatDuration(duration: string): string {
  const parts = duration.split(':');
  if (parts.length === 3) {
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    return `${hrs} Hrs ${mins.toString().padStart(2, '0')} Min`;
  }
  return duration;
}
