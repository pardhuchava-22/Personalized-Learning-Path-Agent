
import React, { useState } from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import { User } from '../../types';
import { roleLabel } from '../../services/roles';
import { NotificationCenter } from './NotificationCenter';

interface TopBarProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  currentUser?: User;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, isSidebarOpen, currentUser }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-20 bg-charcoal-canvas/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 transition-all duration-300">
      <div className="flex items-center gap-4">
        {/* Animated Hamburger Toggle */}
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <span className={`w-full h-0.5 bg-current rounded-full transform transition-all duration-300 origin-left ${isSidebarOpen ? 'rotate-45 translate-x-px' : ''}`} />
            <span className={`w-full h-0.5 bg-current rounded-full transition-all duration-300 ${isSidebarOpen ? 'opacity-0 translate-x-2' : 'opacity-100'}`} />
            <span className={`w-full h-0.5 bg-current rounded-full transform transition-all duration-300 origin-left ${isSidebarOpen ? '-rotate-45 translate-x-px' : ''}`} />
          </div>
        </button>

        {/* Search Bar */}
        <div className="hidden sm:flex items-center relative group">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
          <input 
            type="text"
            placeholder="Search for courses, skills, or videos..."
            className="w-64 lg:w-96 pl-10 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 md:gap-5 relative">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors relative border border-transparent hover:border-slate-100 cursor-pointer"
            title="View Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#bbf451] rounded-full border-2 border-white shadow-sm shadow-[#bbf451]/40"></span>
          </button>

          <NotificationCenter 
            isOpen={showNotifications} 
            onClose={() => setShowNotifications(false)} 
          />
        </div>

        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

        <button className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-white transition-all border border-transparent hover:border-slate-100/80">
            <div className="w-9 h-9 rounded-full border border-slate-200 overflow-hidden bg-white flex items-center justify-center p-[2px]">
                <img 
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name || 'User'}&backgroundColor=111217,c3f53c&fontSize=40&fontWeight=700`} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
            <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-800 leading-none">{currentUser?.name || 'Alex Johnson'}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">{roleLabel(currentUser?.role)}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
        </button>
      </div>
    </header>
  );
};
