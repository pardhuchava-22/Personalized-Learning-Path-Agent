import React from 'react';

interface ResultsScoreRingProps {
  score: number;
  status: 'passed' | 'failed';
  size?: number;
  strokeWidth?: number;
}

export const ResultsScoreRing: React.FC<ResultsScoreRingProps> = ({ 
  score, 
  status,
  size = 240,
  strokeWidth = 14
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const isPassed = status === 'passed';
  const colorStart = isPassed ? '#4F46E5' : '#EF4444';
  const colorEnd = isPassed ? '#7C3AED' : '#F87171';

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 rounded-full bg-slate-50/50 scale-95" />
      <svg width={size} height={size} className="-rotate-90 relative z-10">
        <defs>
          <linearGradient id={`scoreGradient-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#scoreGradient-${status})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#shadow)"
          className="transition-all duration-1500 ease-in-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <div className="flex items-baseline">
            <span className="text-[56px] font-black text-slate-900 leading-none tracking-tighter">
                {score}
            </span>
            <span className="text-xl font-bold text-slate-400 ml-1">%</span>
        </div>
        <div className="w-16 h-1 bg-slate-100 rounded-full my-3" />
        <span className={`text-[12px] font-black uppercase tracking-[0.2em] mb-4 ${isPassed ? 'text-indigo-600' : 'text-red-600'}`}>
           {isPassed ? 'Academic Merit' : 'Review Required'}
        </span>
        <div className={`
          px-4 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] border flex items-center gap-2
          ${isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/10' : 'bg-red-50 text-red-700 border-red-100 shadow-sm shadow-red-500/10'}
        `}>
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {isPassed ? 'Passed' : 'Failed'}
        </div>
      </div>
    </div>

  );
};
