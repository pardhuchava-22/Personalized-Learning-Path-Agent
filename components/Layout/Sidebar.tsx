import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  LayoutDashboard, 
  BookOpen, 
  BarChart2, 
  Beaker, 
  FileText, 
  Settings, 
  LogOut,
  Users,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Code2
} from 'lucide-react';
import { User as UserType } from '../../types';
import { useAuth } from '../../services/authContext';
import { isFacultyRole } from '../../services/roles';
import { useTranslation } from '../../hooks/useTranslation';

interface SidebarProps {
  isOpen: boolean;
  currentUser?: UserType;
  onNavigate: (path: string) => void;
  currentPath: string;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentUser, onNavigate, currentPath, onToggle }) => {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number; left: number } | null>(null);

  const studentNavItems = [
    { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    { label: t('nav.my_courses'), icon: BookOpen, path: '/courses' },
    { label: t('nav.progress'), icon: BarChart2, path: '/analytics' },
    { label: t('nav.assignments'), icon: ClipboardList, path: '/exams' },
    { label: t('nav.code_remediation'), icon: Code2, path: '/code-remediation' },
    { label: t('nav.settings'), icon: Settings, path: '/settings' }
  ];

  const facultyNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/faculty-dashboard' },
    { label: 'AI Interventions', icon: Sparkles, path: '/faculty-interventions' },
    { label: 'Exams', icon: FileText, path: '/faculty-exams' },
    { label: 'Students', icon: Users, path: '/students' },
    { label: 'Reports', icon: ClipboardList, path: '/reports' },
    { label: 'Analytics', icon: BarChart2, path: '/faculty-analytics' },
    { label: 'Settings', icon: Settings, path: '/settings' }
  ];

  const navItems = isFacultyRole(currentUser?.role) ? facultyNavItems : studentNavItems;

  // Tooltip logic: only show when sidebar is collapsed (isOpen=false on Desktop)
  const handleMouseEnter = (e: React.MouseEvent, label: string) => {
    if (!isOpen && window.innerWidth >= 768) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredItem({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 10
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <>
      <aside 
        className={`
          fixed left-0 top-0 h-full bg-charcoal text-white z-30 transition-all duration-300 ease-in-out border-r-2 border-slate-900 overflow-hidden
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
      >
        <div className="flex flex-col h-full font-sans">
          {/* Logo Area (Circular Lime green ET Style brand & ChatGPT inspired Collapse Toggle) */}
          <div className={`h-20 flex items-center border-b-2 border-slate-900 min-h-[5rem] transition-all duration-300 ${isOpen ? 'px-4' : 'px-0 justify-center'}`}>
              {isOpen ? (
                  <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 transition-all duration-300">
                          <div className="bg-primary text-charcoal w-9 h-9 rounded-full font-black flex items-center justify-center shrink-0 text-sm font-display border-2 border-slate-900">
                              QG
                          </div>
                          <span className="text-lg font-bold tracking-tight whitespace-nowrap font-display">
                              QuantumGuard
                          </span>
                      </div>
                      {onToggle && (
                          <button 
                              onClick={onToggle}
                              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
                              title="Close sidebar"
                          >
                              <PanelLeftClose className="w-5 h-5" />
                          </button>
                      )}
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center w-full gap-2">
                      {onToggle && (
                          <button 
                              onClick={onToggle}
                              className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 flex items-center justify-center"
                              title="Open sidebar"
                          >
                              <PanelLeftOpen className="w-5 h-5" />
                          </button>
                      )}
                  </div>
              )}
          </div>

          {/* Navigation */}
          <nav className={`flex-1 py-6 overflow-y-auto custom-scrollbar overflow-x-hidden transition-all duration-300 ${isOpen ? 'px-3 space-y-3' : 'px-0 space-y-3'}`}>
              {navItems.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                      <button
                          key={item.label}
                          onClick={() => onNavigate(item.path)}
                          onMouseEnter={(e) => handleMouseEnter(e, item.label)}
                          onMouseLeave={handleMouseLeave}
                          className={`
                              flex items-center transition-all duration-200 group relative border-2
                              ${isOpen 
                                  ? 'w-full gap-3 px-3.5 py-3 rounded-xl text-[13px] font-semibold' 
                                  : 'w-10 h-10 justify-center rounded-xl mx-auto p-0'
                              }
                              ${isActive 
                                  ? 'bg-primary text-charcoal border-slate-900 font-bold' 
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white border-transparent'
                              }
                          `}
                      >
                          <item.icon 
                              className={`
                                  w-4 h-4 transition-transform duration-300 shrink-0
                                  ${isActive ? 'text-charcoal' : 'text-slate-500 group-hover:text-white group-hover:scale-110'}
                              `} 
                          />
                          <span className={`whitespace-nowrap transition-all duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
                              {item.label}
                          </span>
                      </button>
                  );
              })}
          </nav>

          {/* Bottom Actions */}
          <div className={`border-t border-slate-850 transition-all duration-300 ${isOpen ? 'p-3' : 'p-2'}`}>
              <button 
                  onClick={() => {
                    logout();
                    onNavigate('/login');
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, 'Logout')}
                  onMouseLeave={handleMouseLeave}
                  className={`
                      flex items-center text-[13px] font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group
                      ${isOpen 
                          ? 'w-full gap-3 px-3 py-2.5 rounded-xl' 
                          : 'w-10 h-10 justify-center rounded-xl mx-auto p-0'
                      }
                  `}
              >
                  <LogOut className="w-4 h-4 shrink-0 text-slate-500 group-hover:scale-110 transition-transform" />
                  <span className={`whitespace-nowrap transition-all duration-300 ${!isOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
                      Logout
                  </span>
              </button>
          </div>
        </div>
      </aside>

      {/* Portal Tooltip for Collapsed State */}
      {hoveredItem && !isOpen && createPortal(
        <div 
            className="fixed z-[9999] px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-700 animate-fade-in pointer-events-none whitespace-nowrap"
            style={{ 
              top: hoveredItem.top, 
              left: hoveredItem.left, 
              transform: 'translateY(-50%)' 
            }}
        >
            {hoveredItem.label}
            {/* Arrow */}
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-[5px] border-transparent border-r-slate-900"></div>
        </div>,
        document.body
      )}
    </>
  );
};
