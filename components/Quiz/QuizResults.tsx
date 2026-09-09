import React from 'react';
import { CheckCircle, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  onRetry: () => void;
  onContinue: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  score,
  totalQuestions,
  onRetry,
  onContinue
}) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  const incorrect = totalQuestions - score;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 md:p-12 text-center animate-slide-up mt-10">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Quiz Completed!</h2>

      {/* Circular Progress */}
      <div className="relative w-48 h-48 mx-auto mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Background Circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="12"
          />
          {/* Progress Circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-slate-800">{percentage}%</span>
          <span className="text-sm text-slate-500 font-medium">Accuracy</span>
        </div>
      </div>

      <p className="text-lg font-medium text-slate-800 mb-8">
        Score: {score}/{totalQuestions}
      </p>

      {/* Breakdown Card */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-8 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-slate-700">Correct</span>
            </div>
            <span className="text-sm font-bold text-success">{score} questions</span>
        </div>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-error" />
                <span className="text-sm font-medium text-slate-700">Incorrect</span>
            </div>
            <span className="text-sm font-bold text-error">{incorrect} questions</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="secondary" onClick={onRetry} className="sm:w-auto px-8">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retry Quiz
        </Button>
        <Button variant="primary" onClick={onContinue} className="sm:w-auto px-8">
            Continue Learning
            <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
