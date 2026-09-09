import React from 'react';
import { Lock, CheckCircle2, PlayCircle, BookOpen, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { Module } from '../../types';

interface CurriculumSidebarProps {
  modules: Module[];
  currentModuleId: string;
  onSelectModule: (id: string) => void;
  className?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CurriculumSidebar: React.FC<CurriculumSidebarProps> = ({ 
  modules, 
  currentModuleId, 
  onSelectModule,
  className = '',
  isCollapsed,
  onToggleCollapse
}) => {
  const completedCount = modules.filter(m => m.status === 'completed').length;
  const progress = Math.round((completedCount / modules.length) * 100);

  return (
    <div className={`bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-300 ease-in-out relative ${className}`}>
      
      {/* Header */}
      <div className={`p-5 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
            <div className="w-full">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <LayoutList className="w-4 h-4 text-indigo-600" />
                        Curriculum
                    </h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full ring-1 ring-indigo-500/10">
                        {progress}% Done
                    </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        ) : (
            <div className="relative group cursor-help">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-500/20">
                    {progress}%
                </div>
            </div>
        )}
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {modules.map((module, index) => {
          const isCurrent = module.id === currentModuleId;
          const isLocked = module.status === 'locked';
          const isCompleted = module.status === 'completed';

          return (
            <div key={module.id} className="relative group/item">
              <button 
                onClick={() => !isLocked && onSelectModule(module.id)}
                disabled={isLocked}
                className={`
                  w-full flex items-center transition-all duration-200 rounded-xl
                  ${isCollapsed ? 'justify-center py-3 px-0' : 'px-4 py-3 gap-3 text-left'}
                  ${isCurrent 
                    ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500/20 shadow-sm' 
                    : 'bg-transparent text-slate-600 hover:bg-slate-50'}
                  ${isLocked ? 'cursor-not-allowed opacity-60 grayscale' : ''}
                `}
              >
                {/* Icon State */}
                <div className={`shrink-0 transition-transform duration-300 ${!isCollapsed && 'group-hover/item:scale-110'}`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-slate-400" />
                  ) : (
                    <PlayCircle className={`w-5 h-5 ${isCurrent ? 'text-indigo-600 fill-indigo-100' : 'text-slate-400'}`} />
                  )}
                </div>

                {/* Content (Expanded Only) */}
                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h4 className={`text-[13px] font-semibold leading-snug mb-0.5 line-clamp-2 ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {module.title}
                            </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                                {module.duration}
                            </span>
                            {isCurrent && (
                                <span className="flex h-1.5 w-1.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                </span>
                            )}
                        </div>
                    </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
