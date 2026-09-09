
import React from 'react';
import { Check, X, CheckCircle2, Circle } from 'lucide-react';
import { QuizQuestion as QuizQuestionType } from '../../types';

interface QuizQuestionProps {
  question: QuizQuestionType;
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
  isSubmitted: boolean;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  selectedOptionId,
  onSelectOption,
  isSubmitted,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Question Text */}
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-relaxed">
          {question.text}
        </h1>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-4">
        {question.options.map((option, idx) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.id === question.correctOptionId;
          
          // Determine Styles based on state
          let containerClass = "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md";
          let textClass = "text-slate-700";
          let icon = <div className="text-slate-400 font-bold text-sm">{String.fromCharCode(65 + idx)}</div>;

          if (isSubmitted) {
            if (isCorrect) {
              containerClass = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500";
              textClass = "text-emerald-900 font-medium";
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
            } else if (isSelected && !isCorrect) {
              containerClass = "border-red-300 bg-red-50";
              textClass = "text-red-900";
              icon = <X className="w-5 h-5 text-red-500" />;
            } else {
              containerClass = "border-slate-100 bg-slate-50 opacity-60";
            }
          } else if (isSelected) {
            containerClass = "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-md transform scale-[1.01]";
            textClass = "text-indigo-900 font-medium";
            icon = <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>;
          }

          return (
            <button
              key={option.id}
              onClick={() => !isSubmitted && onSelectOption(option.id)}
              disabled={isSubmitted}
              className={`
                relative w-full text-left p-5 rounded-xl border-2 transition-all duration-200 group flex items-center gap-4
                ${containerClass}
              `}
            >
              {/* Option Indicator / Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${isSelected && !isSubmitted ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-white'}
                ${isSubmitted && isCorrect ? 'bg-emerald-100' : ''}
                ${isSubmitted && isSelected && !isCorrect ? 'bg-red-100' : ''}
              `}>
                {icon}
              </div>

              {/* Option Text */}
              <span className={`text-base leading-relaxed flex-1 ${textClass}`}>
                {option.text}
              </span>

              {/* Selection Ring (Visual Aid) */}
              {!isSubmitted && (
                 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-slate-300'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                 </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
