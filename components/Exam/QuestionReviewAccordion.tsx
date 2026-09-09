import React, { useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { ExamQuestionReview } from '../../types';

interface QuestionReviewAccordionProps {
  questions: ExamQuestionReview[];
}

export const QuestionReviewAccordion: React.FC<QuestionReviewAccordionProps> = ({ questions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h3 className="text-[14px] font-bold text-slate-900">Question Review</h3>
        <p className="text-[12px] text-slate-500">View your answers and explanations</p>
      </div>

      <div className="space-y-3">
        {questions.map((q, index) => {
          const isCorrect = q.userAnswerId === q.correctAnswerId;
          const isExpanded = expandedId === q.id;

          return (
            <div 
                key={q.id} 
                className={`bg-white rounded-lg border transition-all duration-200 ${isExpanded ? 'border-primary shadow-sm' : 'border-slate-200'}`}
            >
              <button 
                onClick={() => toggle(q.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold
                        ${isCorrect ? 'bg-green-100 text-success' : 'bg-red-100 text-error'}
                    `}>
                        {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-900 truncate pr-4">{q.text}</p>
                    </div>

                    <div className={`
                        px-2 py-1 rounded text-[10px] font-bold shrink-0
                        ${isCorrect ? 'bg-[#ECFDF5] text-success' : 'bg-[#FEF2F2] text-error'}
                    `}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                    </div>
                </div>
                
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                    <p className="text-[14px] text-slate-800 font-medium mb-4 mt-4">{q.text}</p>
                    
                    <div className="space-y-2 mb-6">
                        {q.options.map(opt => {
                            const isSelected = opt.id === q.userAnswerId;
                            const isTheCorrect = opt.id === q.correctAnswerId;
                            
                            let bgClass = "bg-white border-slate-200";
                            if (isTheCorrect) bgClass = "bg-[#ECFDF5] border-[#10B981]";
                            else if (isSelected && !isCorrect) bgClass = "bg-[#FEF2F2] border-[#EF4444]";

                            return (
                                <div key={opt.id} className={`p-3 rounded-lg border text-[12px] flex items-center justify-between ${bgClass}`}>
                                    <span className="text-slate-700">{opt.text}</span>
                                    {isTheCorrect && <Check className="w-4 h-4 text-success" />}
                                    {isSelected && !isCorrect && <X className="w-4 h-4 text-error" />}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Explanation</p>
                        <p className="text-[12px] text-slate-700 leading-relaxed">{q.explanation}</p>
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
