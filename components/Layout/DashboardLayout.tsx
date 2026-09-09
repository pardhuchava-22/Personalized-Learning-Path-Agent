
import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { User } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentUser?: User;
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  currentUser, 
  currentPath = '/dashboard',
  onNavigate
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Set initial state based on device width
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-charcoal-canvas flex transition-all duration-300">
      <Sidebar 
        isOpen={isSidebarOpen} 
        currentUser={currentUser} 
        onNavigate={onNavigate}
        currentPath={currentPath}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div 
        className={`
            flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}
        `}
      >
        <div className="md:hidden">
          <TopBar 
              isSidebarOpen={isSidebarOpen}
              onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              currentUser={currentUser}
          />
        </div>
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-opt custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>

        <footer className="py-6 border-t border-slate-200 px-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400">
            <p>© 2024 QuantumGuard Education AI. All rights reserved.</p>
            <div className="flex gap-4 mt-2 md:mt-0">
                <a href="#" className="hover:text-primary">Privacy</a>
                <a href="#" className="hover:text-primary">Terms</a>
                <a href="#" className="hover:text-primary">Help</a>
            </div>
        </footer>
      </div>
    </div>
  );
};
