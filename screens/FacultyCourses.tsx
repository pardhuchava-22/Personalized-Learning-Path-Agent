
import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User, Course } from '../types';
import { useAuth } from '../services/authContext';
import { 
  Plus, Search, MoreVertical, Users, BookOpen, Clock, 
  BarChart2, Edit, Trash2, Eye, Filter
} from 'lucide-react';

interface FacultyCoursesProps {
  onNavigate: (path: string) => void;
}

export const FacultyCoursesScreen: React.FC<FacultyCoursesProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const facultyUser: User = { id: String(authUser?.id || ''), name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty', email: authUser?.email || '', role: 'faculty' };

  // Mock Courses
  const [courses, setCourses] = useState<Course[]>([
    { 
        id: '1', title: 'CS101: Introduction to Computer Science', instructor: 'Prof. Smith', 
        progress: 0, completedLessons: 0, totalLessons: 24, 
        thumbnail: 'https://picsum.photos/seed/cs101/400/225', 
        category: 'Engineering', difficulty: 'Beginner'
    },
    { 
        id: '2', title: 'CS302: Advanced Algorithms', instructor: 'Prof. Smith', 
        progress: 0, completedLessons: 0, totalLessons: 18, 
        thumbnail: 'https://picsum.photos/seed/algo/400/225', 
        category: 'Engineering', difficulty: 'Advanced'
    },
    { 
        id: '3', title: 'BIO200: Molecular Biology', instructor: 'Prof. Smith', 
        progress: 0, completedLessons: 0, totalLessons: 15, 
        thumbnail: 'https://picsum.photos/seed/bio/400/225', 
        category: 'Science', difficulty: 'Intermediate'
    }
  ]);

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-courses">
      <div className="max-w-7xl mx-auto pb-12 animate-slide-up">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
                <p className="text-sm text-slate-500 mt-1">Manage your curriculum and track student enrollment.</p>
            </div>
            <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Create New Course
            </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search courses..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Filter className="w-4 h-4" />
                Filter
            </button>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
                <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    {/* Thumbnail */}
                    <div className="h-40 relative bg-slate-100">
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-white/90 backdrop-blur-sm shadow-sm ${
                                course.difficulty === 'Advanced' ? 'text-red-600' : 
                                course.difficulty === 'Intermediate' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                                {course.difficulty}
                            </span>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{course.title}</h3>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                            <div className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" /> {course.totalLessons} Lessons
                            </div>
                            <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> 124 Students
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                            <button className="text-xs font-bold text-indigo-600 hover:underline">View Analytics</button>
                            <div className="flex gap-1">
                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </DashboardLayout>
  );
};
