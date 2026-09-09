import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { useAuth } from '../services/authContext';
import { roleLabel, toAppRole } from '../services/roles';
import { authAPI, notificationsAPI } from '../services/apiService';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { NotificationCenter } from '../components/Layout/NotificationCenter';
import { 
  User as UserIcon, Bell, Shield, 
  Globe, LogOut, Camera, Mail, Lock,
  Check, AlertCircle, Eye, EyeOff, CheckCheck, Sparkles, Info
} from 'lucide-react';

interface SettingsProps {
  onNavigate: (path: string) => void;
}

type SettingsTab = 'profile' | 'notifications' | 'security' | 'language';

export const SettingsScreen: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { user: authUser, logout, updateProfile } = useAuth();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const user: User = {
    id: String(authUser?.id || ''),
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'User',
    email: authUser?.email || '',
    role: toAppRole(authUser?.role)
  };

  // Active Tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showNotifCenter, setShowNotifCenter] = useState(false);

  // Form states for Personal Info
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [department, setDepartment] = useState(authUser?.department || 'Computer Science');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync state when authUser loads or updates
  useEffect(() => {
    if (authUser) {
      const name = `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() || authUser.username || '';
      if (name) setFullName(name);
      if (authUser.email) setEmail(authUser.email);
      if (authUser.department) setDepartment(authUser.department);
    }
  }, [authUser]);

  // Notifications preferences
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('user_notification_prefs');
    return saved ? JSON.parse(saved) : {
      emailExams: true,
      emailResults: true,
      pushReminders: true,
      pushAnnouncements: false
    };
  });
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);

  // Live Notifications in Hub
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Password update state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLastChanged, setPasswordLastChanged] = useState(() => {
    return localStorage.getItem('user_pwd_last_changed') || 'Last changed 3 months ago';
  });

  // Two-factor authentication
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem('user_2fa_enabled') === 'true';
  });

  // Language preferences
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('user_language_pref');
    if (saved) {
      if (saved.startsWith('English')) return 'English';
      return saved;
    }
    return 'English';
  });
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [langSuccess, setLangSuccess] = useState<string | null>(null);

  // Scroll to section helper
  const scrollToSection = (tab: SettingsTab) => {
    setActiveTab(tab);
    const element = document.getElementById(`section-${tab}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Fetch recent notifications when notification tab is opened
  useEffect(() => {
    if (activeTab === 'notifications') {
      setLoadingNotifs(true);
      notificationsAPI.getNotifications()
        .then(data => {
          if (Array.isArray(data)) setRecentNotifications(data);
        })
        .catch(err => console.error("Failed to fetch notifications:", err))
        .finally(() => setLoadingNotifs(false));
    }
  }, [activeTab]);

  // Handle Edit Profile button under Avatar
  const handleEditProfile = () => {
    scrollToSection('profile');
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 150);
  };

  // Save Personal Info
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      setProfileError('Please enter a valid full name.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await updateProfile({
        name: fullName.trim(),
        email: email.trim(),
        department: department.trim()
      });
      setProfileSuccess('Profile changes saved successfully!');
      setTimeout(() => setProfileSuccess(null), 3500);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Notifications
  const handleSaveNotifications = () => {
    localStorage.setItem('user_notification_prefs', JSON.stringify(notifications));
    setNotifSuccess('Notification preferences updated!');
    setTimeout(() => setNotifSuccess(null), 3000);
  };

  // Mark single notification read
  const handleMarkNotifRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      setRecentNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all notifications read
  const handleMarkAllNotifsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setRecentNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Update Password handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authAPI.changePassword(oldPassword, newPassword);
      setPasswordSuccess('Password updated successfully!');
      setPasswordLastChanged('Last changed just now');
      localStorage.setItem('user_pwd_last_changed', 'Last changed just now');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(null);
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please verify current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Save Language
  const handleSaveLanguage = () => {
    setIsSavingLang(true);
    setLangSuccess(null);
    localStorage.setItem('user_language_pref', language);
    window.dispatchEvent(new Event('languagechange'));
    
    setTimeout(() => {
      setIsSavingLang(false);
      setLangSuccess('Language preferences saved successfully!');
      setTimeout(() => setLangSuccess(null), 3000);
    }, 400);
  };

  // 2FA Toggle
  const handleToggle2FA = (val: boolean) => {
    setTwoFactorEnabled(val);
    localStorage.setItem('user_2fa_enabled', String(val));
  };

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/settings">
      <div className="max-w-4xl mx-auto pb-12 animate-slide-up">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
          <div className="relative">
            <button 
              onClick={() => setShowNotifCenter(!showNotifCenter)}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors relative cursor-pointer shadow-sm flex items-center gap-2 text-xs font-semibold"
              title="View Notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="w-2 h-2 bg-[#bbf451] rounded-full border border-white shadow-sm shadow-[#bbf451]/40"></span>
            </button>
            <NotificationCenter 
              isOpen={showNotifCenter} 
              onClose={() => setShowNotifCenter(false)} 
              onNavigate={onNavigate}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Navigation/Quick Profile */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full bg-[#fef08a] border-4 border-white shadow-md overflow-hidden flex items-center justify-center font-bold text-2xl text-slate-800">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AM'}
                        </div>
                        <button 
                          onClick={handleEditProfile}
                          title="Change Profile Photo / Info"
                          className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm border-2 border-white cursor-pointer"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-4">{roleLabel(authUser?.role)} Account</p>
                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={handleEditProfile}
                            className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors border border-slate-200 cursor-pointer"
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>

                {/* Left Navigation Menu */}
                <nav className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <button 
                      onClick={() => scrollToSection('profile')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors cursor-pointer text-left ${
                        activeTab === 'profile' 
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-600 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50 border-transparent'
                      }`}
                    >
                        <UserIcon className="w-4 h-4" /> Profile Information
                    </button>
                    <button 
                      onClick={() => scrollToSection('notifications')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors cursor-pointer text-left ${
                        activeTab === 'notifications' 
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-600 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50 border-transparent'
                      }`}
                    >
                        <Bell className="w-4 h-4" /> Notifications
                    </button>
                    <button 
                      onClick={() => scrollToSection('security')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors cursor-pointer text-left ${
                        activeTab === 'security' 
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-600 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50 border-transparent'
                      }`}
                    >
                        <Shield className="w-4 h-4" /> Security & Privacy
                    </button>
                    <button 
                      onClick={() => scrollToSection('language')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors cursor-pointer text-left ${
                        activeTab === 'language' 
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-600 font-semibold' 
                          : 'text-slate-600 hover:bg-slate-50 border-transparent'
                      }`}
                    >
                        <Globe className="w-4 h-4" /> Language
                    </button>
                </nav>
            </div>

            {/* Right Col: Forms */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Personal Info Section */}
                <section id="section-profile" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 scroll-mt-24">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <UserIcon className="w-5 h-5 text-indigo-600" /> Personal Information
                      </h3>
                      {profileSuccess && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{profileSuccess}</span>
                        </div>
                      )}
                      {profileError && (
                        <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 animate-fade-in font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>{profileError}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <Input 
                              ref={nameInputRef}
                              id="settings-full-name"
                              label="Full Name" 
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Enter your full name"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input 
                              label="Email Address" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter your email"
                              leftIcon={<Mail className="w-4 h-4" />} 
                            />
                        </div>
                        <div>
                            <Input 
                              label={`${roleLabel(authUser?.role)} ID`} 
                              value={user.role === 'faculty' ? 'FAC-2023-8492' : 'ST-2023-8492'} 
                              readOnly 
                              className="bg-slate-50 text-slate-500 cursor-not-allowed" 
                            />
                        </div>
                        <div>
                            <Input 
                              label="Department" 
                              value={department} 
                              onChange={(e) => setDepartment(e.target.value)}
                              className="bg-white text-slate-800" 
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button 
                          onClick={handleSaveProfile} 
                          isLoading={isSavingProfile}
                          className="w-auto px-6 cursor-pointer"
                        >
                          Save Changes
                        </Button>
                    </div>
                </section>

                {/* 2. Notifications Section */}
                <section id="section-notifications" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 scroll-mt-24">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Bell className="w-5 h-5 text-amber-500" /> Notifications
                      </h3>
                      {notifSuccess && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{notifSuccess}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <h4 className="text-sm font-bold text-slate-800 mb-4">Email Notifications</h4>
                            <div className="space-y-4">
                                <Toggle 
                                    label="Upcoming Exams" 
                                    description="Get notified 24h before an exam starts" 
                                    checked={notifications.emailExams} 
                                    onChange={(v) => {
                                      const next = { ...notifications, emailExams: v };
                                      setNotifications(next);
                                      localStorage.setItem('user_notification_prefs', JSON.stringify(next));
                                    }} 
                                />
                                <Toggle 
                                    label="Exam Results" 
                                    description="Receive detailed reports when grades are published" 
                                    checked={notifications.emailResults} 
                                    onChange={(v) => {
                                      const next = { ...notifications, emailResults: v };
                                      setNotifications(next);
                                      localStorage.setItem('user_notification_prefs', JSON.stringify(next));
                                    }} 
                                />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 mb-4">Push Notifications</h4>
                            <div className="space-y-4">
                                <Toggle 
                                    label="Study Reminders" 
                                    checked={notifications.pushReminders} 
                                    onChange={(v) => {
                                      const next = { ...notifications, pushReminders: v };
                                      setNotifications(next);
                                      localStorage.setItem('user_notification_prefs', JSON.stringify(next));
                                    }} 
                                />
                                <Toggle 
                                    label="Course Announcements" 
                                    checked={notifications.pushAnnouncements} 
                                    onChange={(v) => {
                                      const next = { ...notifications, pushAnnouncements: v };
                                      setNotifications(next);
                                      localStorage.setItem('user_notification_prefs', JSON.stringify(next));
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Live Recent Notifications Hub */}
                        <div className="pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-slate-800">Recent Notifications Feed</h4>
                            {recentNotifications.some(n => !n.read) && (
                              <button
                                onClick={handleMarkAllNotifsRead}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Mark all as read</span>
                              </button>
                            )}
                          </div>
                          
                          {loadingNotifs ? (
                            <div className="p-4 text-center text-xs text-slate-400">Loading notifications...</div>
                          ) : recentNotifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">No recent notifications.</div>
                          ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {recentNotifications.slice(0, 4).map(item => (
                                <div 
                                  key={item.id} 
                                  onClick={() => !item.read && handleMarkNotifRead(item.id)}
                                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                                    item.read 
                                      ? 'bg-white border-slate-200/80 text-slate-600' 
                                      : 'bg-indigo-50/50 border-indigo-200/60 text-slate-900 font-medium'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5">
                                      <Info className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800">{item.title}</p>
                                      <p className="text-[11px] text-slate-500 line-clamp-1">{item.message}</p>
                                    </div>
                                  </div>
                                  {!item.read && (
                                    <span className="w-2 h-2 rounded-full bg-[#bbf451] shrink-0 mt-1" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button onClick={handleSaveNotifications} className="w-auto px-6 cursor-pointer">
                            Save Preferences
                          </Button>
                        </div>
                    </div>
                </section>

                {/* 3. Security Section */}
                <section id="section-security" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 scroll-mt-24">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-emerald-600" /> Security
                    </h3>

                    <div className="space-y-4">
                        {/* Password Card */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Password</p>
                                    <p className="text-xs text-slate-500">{passwordLastChanged}</p>
                                </div>
                                <button 
                                  onClick={() => {
                                    setShowPasswordForm(!showPasswordForm);
                                    setPasswordError(null);
                                    setPasswordSuccess(null);
                                  }}
                                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                                >
                                  {showPasswordForm ? 'Close' : 'Update'}
                                </button>
                            </div>

                            {/* Expandable Password Update Form */}
                            {showPasswordForm && (
                              <form onSubmit={handleUpdatePassword} className="mt-4 pt-4 border-t border-slate-200/80 space-y-4 animate-slide-up">
                                {passwordSuccess && (
                                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 font-medium">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{passwordSuccess}</span>
                                  </div>
                                )}
                                {passwordError && (
                                  <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200 font-medium">
                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                    <span>{passwordError}</span>
                                  </div>
                                )}

                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                                  <div className="relative">
                                    <input 
                                      type={showOldPassword ? 'text' : 'password'}
                                      value={oldPassword}
                                      onChange={(e) => setOldPassword(e.target.value)}
                                      placeholder="Enter current password"
                                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 pr-10"
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => setShowOldPassword(!showOldPassword)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                                    <div className="relative">
                                      <input 
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min 6 characters"
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 pr-10"
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                      >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                                    <input 
                                      type="password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      placeholder="Re-enter new password"
                                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswordForm(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <Button 
                                    type="submit" 
                                    isLoading={isUpdatingPassword}
                                    className="w-auto px-5 py-2 text-xs cursor-pointer"
                                  >
                                    Update Password
                                  </Button>
                                </div>
                              </form>
                            )}
                        </div>

                        {/* Two-Factor Authentication Card */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <p className="text-sm font-bold text-slate-800">Two-Factor Authentication</p>
                                <p className="text-xs text-slate-500">Add an extra layer of security</p>
                            </div>
                            <Toggle checked={twoFactorEnabled} onChange={handleToggle2FA} />
                        </div>
                    </div>
                </section>

                {/* 4. Language Section */}
                <section id="section-language" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 scroll-mt-24">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Globe className="w-5 h-5 text-indigo-600" /> Language
                      </h3>
                      {langSuccess && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{langSuccess}</span>
                        </div>
                      )}
                    </div>

                    <div className="max-w-md space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-900 mb-1.5">
                              Dashboard Language
                            </label>
                            <select 
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition-colors"
                            >
                              <option value="English">English</option>
                              <option value="Español (Spanish)">Español (Spanish)</option>
                              <option value="Français (French)">Français (French)</option>
                              <option value="Deutsch (German)">Deutsch (German)</option>
                              <option value="हिन्दी (Hindi)">हिन्दी (Hindi)</option>
                              <option value="తెలుగు (Telugu)">తెలుగు (Telugu)</option>
                              <option value="日本語 (Japanese)">日本語 (Japanese)</option>
                              <option value="中文 (Chinese)">中文 (Chinese)</option>
                              <option value="العربية (Arabic)">العربية (Arabic)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                              Choose the language displayed across your dashboard and interface.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button 
                          onClick={handleSaveLanguage} 
                          isLoading={isSavingLang}
                          className="w-auto px-6 cursor-pointer"
                        >
                          Save Preferences
                        </Button>
                    </div>
                </section>

                {/* 5. Danger Zone */}
                <section className="bg-red-50 rounded-2xl border border-red-100 p-6 md:p-8">
                    <h3 className="text-lg font-bold text-red-700 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-600/80 mb-6">Irreversible actions regarding your account.</p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => {
                                logout();
                                onNavigate('/login');
                            }}
                            className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </section>

            </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
