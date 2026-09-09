import React, { useState } from 'react';
import { Check, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import { Module } from '../../types';
import { Button } from '../ui/Button';

interface ModuleDetailsProps {
  module: Module;
  onComplete: () => void;
  nextModule?: Module;
  prevModule?: Module;
}

export const ModuleDetails: React.FC<ModuleDetailsProps> = ({ 
  module, 
  onComplete,
  nextModule,
  prevModule
}) => {
  const [objectives, setObjectives] = useState(
    module.objectives?.map(obj => ({ text: obj, completed: false })) || []
  );

  const toggleObjective = (index: number) => {
    const newObjectives = [...objectives];
    newObjectives[index].completed = !newObjectives[index].completed;
    setObjectives(newObjectives);
  };

  const allCompleted = objectives.every(obj => obj.completed);

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] border-l border-slate-200">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Objectives Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Learning Objectives</h3>
                <span className="text-xs text-slate-400">{objectives.filter(o => o.completed).length}/{objectives.length}</span>
            </div>
            
            <div className="space-y-3">
                {objectives.map((obj, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group select-none">
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${obj.completed ? 'bg-success border-success' : 'border-slate-300 bg-white group-hover:border-primary'}`}>
                            {obj.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-xs transition-colors ${obj.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {obj.text}
                        </span>
                        <input type="checkbox" className="hidden" checked={obj.completed} onChange={() => toggleObjective(i)} />
                    </label>
                ))}
            </div>
        </div>

        {/* Details List */}
        <div className="space-y-4">
            <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-2">Module Details</h4>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-slate-500">Duration</span>
                    <span className="text-slate-800 font-medium text-right">{module.duration}</span>
                    <span className="text-slate-500">Difficulty</span>
                    <span className="text-slate-800 font-medium text-right flex justify-end items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
                        {module.difficulty || 'Intermediate'}
                    </span>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-2">Topics Covered</h4>
                <div className="flex flex-wrap gap-2">
                    {module.topics?.map(topic => (
                        <span key={topic} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded font-medium border border-slate-200">
                            {topic}
                        </span>
                    ))}
                </div>
            </div>
        </div>

        {/* Complete Button */}
        <Button 
            variant="primary" 
            onClick={onComplete}
            disabled={!allCompleted}
            className={`transition-all duration-300 ${!allCompleted ? 'opacity-50 cursor-not-allowed' : 'animate-pulse'}`}
        >
            Mark as Complete
        </Button>

        {/* Next Module Preview */}
        {nextModule && (
            <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Up Next</h4>
                <div className="bg-[#EEF2FF] rounded-lg p-3 border border-indigo-100 flex items-start gap-3 opacity-90 hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="mt-1">
                        <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-primary mb-1">{nextModule.title}</p>
                        <p className="text-[10px] text-slate-500 mb-1">{nextModule.duration} • Day {nextModule.day}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-2">In this next module, we dive deeper into state management...</p>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Sticky Bottom Nav */}
      <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
         <button 
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
            disabled={!prevModule}
        >
            <ChevronLeft className="w-4 h-4" />
            Previous
         </button>
         <button 
            className="flex items-center gap-1 text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary hover:opacity-80 disabled:opacity-30 transition-all"
            disabled={!nextModule}
        >
            Next Module
            <ChevronRight className="w-4 h-4 text-primary" />
         </button>
      </div>
    </div>
  );
};
