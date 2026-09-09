import React, { useState } from 'react';
import { LabChallenge } from '../../types';
import { CheckCircle2, Circle, Check, ChevronRight, X, Sparkles, Trophy } from 'lucide-react';
import { Button } from '../ui/Button';

interface LabSidebarProps {
  challenge: LabChallenge;
  onSubmit: () => void;
  isSubmitting: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const LabSidebar: React.FC<LabSidebarProps> = ({ challenge, onSubmit, isSubmitting, isOpen, onClose }) => {
  const [showHint, setShowHint] = useState(false);
  const [hintStep, setHintStep] = useState(0);

  const hints = [
    "Try using the CSS 'display: flex' property on the container.",
    "Make sure to set 'justify-content: center' to align items horizontally.",
    "The class name for the container is '.card-wrapper'."
  ];

  return (
    <div className={`
        fixed right-0 top-[56px] bottom-0 w-[300px] bg-[#FAFAFA] border-l border-[#E2E8F0] transform transition-transform duration-300 z-30
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:relative lg:top-0'}
    `}>
      {/* Mobile Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 p-2 text-slate-400 lg:hidden"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                    ${challenge.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                      challenge.difficulty === 'Medium' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'}
                `}>
                    {challenge.difficulty}
                </span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{challenge.title}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Description */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-600 leading-relaxed">
                    {challenge.description}
                </p>
            </div>

            {/* Requirements */}
            <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Requirements</h3>
                <div className="space-y-3">
                    {challenge.requirements.map(req => (
                        <div key={req.id} className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${req.completed ? 'bg-success border-success' : 'border-slate-300 bg-white'}`}>
                                {req.completed && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <p className={`text-xs ${req.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {req.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Test Cases */}
            <div>
                 <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Test Cases</h3>
                 <div className="space-y-2">
                    {challenge.testCases.map(test => (
                        <div key={test.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between group">
                            <span className="text-xs text-slate-700 font-medium">{test.description}</span>
                            {test.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : (
                                <Circle className="w-4 h-4 text-slate-300" />
                            )}
                            
                            {/* Hover tooltip for expected output (mock) */}
                            <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg -translate-y-full -mt-2 transition-opacity z-50 w-48">
                                Expected: {test.expected}
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>

        {/* AI Hint Drawer (Overlay) */}
        <div className={`
            absolute inset-y-0 right-0 w-full bg-[#FAF5FF] border-l-[3px] border-[#A78BFA] p-6 shadow-xl transition-transform duration-300 ease-in-out
            ${showHint ? 'translate-x-0' : 'translate-x-full'}
        `}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-[#7C3AED] font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Hint</span>
                </div>
                <button onClick={() => setShowHint(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mb-4">
                <p className="text-sm text-slate-700">{hints[hintStep]}</p>
            </div>

            {hintStep < hints.length - 1 && (
                <button 
                    onClick={() => setHintStep(prev => prev + 1)}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                    Show Next Hint <ChevronRight className="w-3 h-3" />
                </button>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-white space-y-3 z-10">
            {!showHint && (
                <button 
                    onClick={() => setShowHint(true)}
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-secondary bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-100"
                >
                    <Sparkles className="w-3 h-3" />
                    Get AI Hint
                </button>
            )}
            
            <Button 
                onClick={onSubmit}
                isLoading={isSubmitting}
                className="w-full text-xs"
            >
                Submit Solution
            </Button>
        </div>
      </div>
    </div>
  );
};
