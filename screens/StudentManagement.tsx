
import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { useAuth } from '../services/authContext';
import { usersAPI } from '../services/apiService';
import { 
  Search, Plus, Upload, MessageSquare, ChevronDown, 
  MoreHorizontal, Mail, Edit, Trash2, X, Check, ArrowUpDown,
  User as UserIcon, BookOpen, TrendingUp, Clock, Calendar,
  GraduationCap, Send, Loader2, Sparkles, ShieldCheck, Key,
  UserPlus, UserMinus, ShieldAlert, Filter, ChevronRight, Activity,
  AtSign, Phone, Globe, Trash, Users
} from 'lucide-react';

interface StudentManagementProps {
  onNavigate: (path: string) => void;
}

interface Student {
  id: string;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Pending';
  courses: string[];
  performance: number;
  grade: string;
  lastActive: string;
  enrollmentDate: string;
  avatar: string;
}

export const StudentManagementScreen: React.FC<StudentManagementProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeProfile, setActiveProfile] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<'All' | 'Active' | 'Inactive'>('All');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
  });

  const facultyUser: User = {
    id: String(authUser?.id || ''),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty',
    email: authUser?.email || '',
    role: 'faculty',
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await usersAPI.getStudents();
      setStudentsData(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    return studentsData.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSegment = activeSegment === 'All' ? true : s.status === activeSegment;
      return matchesSearch && matchesSegment;
    });
  }, [searchQuery, activeSegment, studentsData]);

  // Handlers
  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await usersAPI.addStudent({
              ...formData,
              role: 'student',
              password_confirm: formData.password // Shim for backend validation
          });
          setIsAddModalOpen(false);
          setFormData({ username: '', email: '', first_name: '', last_name: '', password: '', password_confirm: '' });
          fetchStudents();
      } catch (err: any) {
          alert('Failed to add student: ' + err.message);
      }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStudent) return;
      try {
          await usersAPI.updateStudent(editingStudent.id, {
              first_name: formData.first_name,
              last_name: formData.last_name,
              email: formData.email,
          });
          setIsEditModalOpen(false);
          fetchStudents();
      } catch (err: any) {
          alert('Update failed: ' + err.message);
      }
  };

  const handleDeleteStudent = async () => {
      if (!editingStudent) return;
      try {
          await usersAPI.deleteStudent(editingStudent.id);
          setIsDeleteModalOpen(false);
          setEditingStudent(null);
          if (activeProfile?.id === editingStudent.id) setActiveProfile(null);
          fetchStudents();
      } catch (err: any) {
          alert('Deletion failed: ' + err.message);
      }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStudent) return;
      try {
          await usersAPI.resetPassword(editingStudent.id, formData.password);
          setIsResetPasswordModalOpen(false);
          setFormData(prev => ({ ...prev, password: '' }));
          alert('Password reset successfully');
      } catch (err: any) {
          alert('Password reset failed: ' + err.message);
      }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/students">
      <div className="max-w-[1600px] mx-auto pb-24 animate-slide-up px-4 md:px-0">
        
        {/* Superior Header with Glassmorphism */}
        <div className="relative mb-12 p-8 md:p-12 bg-slate-900 rounded-[2.5rem] overflow-hidden text-white shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/20 rounded-xl backdrop-blur-md border border-indigo-500/20">
                            <Users className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400">Academy Hub</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight">Student Command</h1>
                    <p className="text-slate-400 max-w-xl font-medium text-lg leading-relaxed">
                        Manage academic identities, monitor performance trajectories, and govern access protocols from a unified administrative vector.
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-4">
                    <button 
                        onClick={() => {
                            setFormData({ username: '', email: '', first_name: '', last_name: '', password: '', password_confirm: '' });
                            setIsAddModalOpen(true);
                        }}
                        className="group flex items-center gap-3 bg-indigo-600 text-white px-8 py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 hover:-translate-y-1"
                    >
                        <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
                        Onboard Student
                    </button>
                    <button className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md text-white px-8 py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all shadow-sm">
                        <Upload className="w-5 h-5 text-indigo-400" />
                        Import CSV
                    </button>
                </div>
            </div>
        </div>

        {/* Intelligence Filters & Search */}
        <div className="flex flex-col xl:flex-row gap-6 mb-10 items-center justify-between bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
            <div className="relative flex-1 w-full group">
                <Search className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search by identity, email, or system handle..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner placeholder:text-slate-400"
                />
            </div>
            
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                <div className="flex bg-slate-50 p-1.5 rounded-[1.8rem] border border-slate-100 flex-1 xl:flex-none">
                    {['All', 'Active', 'Inactive'].map((seg) => (
                        <button
                            key={seg}
                            onClick={() => setActiveSegment(seg as any)}
                            className={`flex-1 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeSegment === seg ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {seg}
                        </button>
                    ))}
                </div>
                <button className="flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">
                    <Filter className="w-5 h-5 text-indigo-600" />
                    Filters
                </button>
            </div>
        </div>

        {/* Academic Matrix (Table) */}
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden relative min-h-[400px]">
             {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Academic Core...</p>
                </div>
             ) : error ? (
                <div className="p-20 text-center">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Security Protocol Fault</h3>
                    <p className="text-slate-500 font-medium mb-8">{error}</p>
                    <button onClick={fetchStudents} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Retry Connection</button>
                </div>
             ) : filteredStudents.length === 0 ? (
                <div className="p-32 text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <UserMinus className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Zero Ingress Detected</h3>
                    <p className="text-slate-500 font-medium max-w-md mx-auto">No records matching your parameters were found in the current sector.</p>
                </div>
             ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <th className="px-8 py-6 w-20">
                                    <div className="flex items-center justify-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={() => {
                                                if (selectedIds.size === filteredStudents.length) setSelectedIds(new Set());
                                                else setSelectedIds(new Set(filteredStudents.map(s => s.id)));
                                            }}
                                        />
                                    </div>
                                </th>
                                <th className="px-8 py-6">Student Identity</th>
                                <th className="px-8 py-6">Academic Status</th>
                                <th className="px-8 py-6 hidden xl:table-cell">Course Enrollment</th>
                                <th className="px-8 py-6 text-center">GPA Index</th>
                                <th className="px-8 py-6 text-right">Verification</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((student) => (
                                <tr 
                                    key={student.id} 
                                    onClick={() => setActiveProfile(student)}
                                    className={`group hover:bg-indigo-50/30 transition-all cursor-pointer ${selectedIds.has(student.id) ? 'bg-indigo-50/50' : ''}`}
                                >
                                    <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedIds.has(student.id)}
                                                onChange={() => toggleSelection(student.id)}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-white shadow-sm" />
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${student.performance > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{student.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 lowercase">{student.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border
                                            ${student.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100'}
                                        `}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 hidden xl:table-cell">
                                        <div className="flex flex-wrap gap-2">
                                            {student.courses.slice(0, 2).map((c, i) => (
                                                <span key={i} className="px-2 py-1 bg-white border border-slate-100 text-[10px] font-bold text-slate-500 rounded-lg">{c}</span>
                                            ))}
                                            {student.courses.length > 2 && (
                                                <span className="px-2 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-400 rounded-lg">+{student.courses.length - 2}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-lg font-black ${student.grade.startsWith('A') ? 'text-emerald-600' : student.grade.startsWith('B') ? 'text-indigo-600' : 'text-amber-600'}`}>{student.grade}</span>
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${student.performance > 80 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${student.performance}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingStudent(student);
                                                    setFormData({
                                                        username: student.username,
                                                        email: student.email,
                                                        first_name: student.first_name,
                                                        last_name: student.last_name,
                                                        password: '',
                                                        password_confirm: ''
                                                    });
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingStudent(student);
                                                    setIsResetPasswordModalOpen(true);
                                                }}
                                                className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100"
                                            >
                                                <Key className="w-5 h-5" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingStudent(student);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}
        </div>

        {/* MODALS */}
        
        {/* Onboard / Add Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
                <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-slide-up">
                    <div className="p-10 border-b border-slate-50 bg-slate-50/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-200">
                                {isEditModalOpen ? <Edit className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{isEditModalOpen ? 'Edit Profile' : 'Onboard Access'}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Academic Authentication Matrix</p>
                            </div>
                        </div>
                        <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <form onSubmit={isEditModalOpen ? handleUpdateStudent : handleAddStudent} className="p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {!isEditModalOpen && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">System Handle</label>
                                    <div className="relative group">
                                        <AtSign className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="johndoe_2024" 
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Vector</label>
                                <div className="relative group">
                                    <Mail className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        required
                                        type="email" 
                                        placeholder="student@academy.com" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Primary Name</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="First Name" 
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Secondary Name</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="Last Name" 
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner"
                                />
                            </div>
                            {!isEditModalOpen && (
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Initial Credential</label>
                                    <div className="relative group">
                                        <Key className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                        <input 
                                            required
                                            type="password" 
                                            placeholder="Secure Access Password" 
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="flex-1 py-5 bg-white border border-slate-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 transition-all">Abort</button>
                            <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-1 select-none">
                                {isEditModalOpen ? 'Verify Changes' : 'Initialize Identity'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Reset Password Modal */}
        {isResetPasswordModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
                <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-slide-up">
                    <div className="p-10 border-b border-slate-50 text-center">
                         <div className="w-16 h-16 bg-amber-500 rounded-[1.2rem] shadow-xl shadow-amber-200 flex items-center justify-center mx-auto mb-6">
                            <Key className="w-8 h-8 text-white" />
                         </div>
                         <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Credential Reset</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Vector: {editingStudent?.name}</p>
                    </div>
                    <form onSubmit={handleResetPassword} className="p-10 space-y-6">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">New Secure Access Key</label>
                             <input 
                                required
                                type="password" 
                                placeholder="Enter strong password" 
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all shadow-inner"
                             />
                        </div>
                         <div className="flex gap-4">
                            <button type="button" onClick={() => setIsResetPasswordModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Abort</button>
                            <button type="submit" className="flex-1 py-4 bg-amber-500 text-white rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all">Rotate Key</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Delete Confirmation */}
        {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
                <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-slide-up">
                    <div className="p-10 text-center">
                         <div className="w-16 h-16 bg-red-500 rounded-[1.2rem] shadow-xl shadow-red-200 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <ShieldAlert className="w-8 h-8 text-white" />
                         </div>
                         <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Identity Deletion</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-8">Access Token: {editingStudent?.username}</p>
                         <p className="text-slate-500 font-medium mb-10 text-sm leading-relaxed">
                            Warning: This operation will permanently decommission this student record and all associated assessment telemetry. This action is <span className="text-red-600 font-black">irreversible</span>.
                         </p>
                         <div className="flex gap-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-5 bg-white border border-slate-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Cancel</button>
                            <button onClick={handleDeleteStudent} className="flex-1 py-5 bg-red-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-600 transition-all">Deactivate</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Sidebar Profile Vector (Glassmorphic) */}
        {activeProfile && (
            <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[500px] bg-white/80 backdrop-blur-2xl border-l border-white shadow-[0_0_100px_rgba(0,0,0,0.1)] z-[80] animate-slide-right flex flex-col overflow-hidden">
                {/* Profile Header */}
                <div className="p-10 bg-indigo-900 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <button onClick={() => setActiveProfile(null)} className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10"><X className="w-6 h-6" /></button>
                    
                    <div className="flex items-center gap-6 mt-4">
                        <img src={activeProfile.avatar} alt="" className="w-24 h-24 rounded-[2rem] border-4 border-white/20 shadow-2xl" />
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase">{activeProfile.name}</h2>
                            <p className="text-indigo-300 font-bold text-sm tracking-wide">{activeProfile.email}</p>
                            <div className="flex gap-2 pt-2">
                                <span className="px-3 py-1 bg-white/10 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">{activeProfile.id}</span>
                                <span className="px-3 py-1 bg-emerald-500 rounded-lg text-[9px] font-black text-white uppercase tracking-widest">{activeProfile.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Intelligence Feed */}
                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    
                    {/* KPI Pulse */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-6 rounded-[2.2rem] border border-slate-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Academic Index</span>
                            <span className="text-3xl font-black text-indigo-600">{activeProfile.performance}%</span>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[2.2rem] border border-slate-100 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Grading</span>
                            <span className="text-3xl font-black text-emerald-600">{activeProfile.grade}</span>
                        </div>
                    </div>

                    {/* Active Assets */}
                    <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <BookOpen className="w-4 h-4 text-indigo-600" /> Authorized Assets
                         </h4>
                         <div className="space-y-3">
                            {activeProfile.courses.map((course, i) => (
                                <div key={i} className="p-5 rounded-[1.8rem] bg-white border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-all shadow-sm">
                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{course}</span>
                                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            ))}
                         </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 space-y-6">
                         <div className="flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Enrolled Vector</p>
                                <p className="text-sm font-bold text-slate-800">{activeProfile.enrollmentDate}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Interaction</p>
                                <p className="text-sm font-bold text-slate-800">{activeProfile.lastActive}</p>
                            </div>
                         </div>
                    </div>

                    {/* Security Actions */}
                    <div className="space-y-3 pt-6 border-t border-slate-100">
                         <button className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-[1.8rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                             <Send className="w-5 h-5" /> Transmission Matrix
                         </button>
                         <button 
                            onClick={() => {
                                setEditingStudent(activeProfile);
                                setFormData({
                                    username: activeProfile.username,
                                    email: activeProfile.email,
                                    first_name: activeProfile.first_name,
                                    last_name: activeProfile.last_name,
                                    password: '',
                                    password_confirm: ''
                                });
                                setIsEditModalOpen(true);
                            }}
                            className="w-full flex items-center justify-center gap-3 py-5 bg-white border border-slate-200 text-slate-600 rounded-[1.8rem] text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                         >
                             <Edit className="w-5 h-5" /> Modify Parameters
                         </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </DashboardLayout>
  );
};
