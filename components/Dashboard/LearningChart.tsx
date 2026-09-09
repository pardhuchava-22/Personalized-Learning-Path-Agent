
import React from 'react';
import { MoreHorizontal, TrendingUp } from 'lucide-react';

export const LearningChart: React.FC = () => {
  // Data for the chart (Mon-Sun)
  const data = [45, 62, 52, 78, 72, 90, 82];
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Standard chart dimensions
  const width = 300;
  const height = 120;
  const paddingX = 15;
  const paddingY = 20;
  
  // Calculate points
  const points = data.map((val, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
    return { x, y, val };
  });

  // Path data
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaPath = `${pathData} L ${width - paddingX},${height} L ${paddingX},${height} Z`;

  // Friday is the focus point
  const focusIndex = 4;
  const focusPoint = points[focusIndex];

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full font-sans hover:shadow-md transition-all duration-300">
      
      {/* Chart Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="space-y-1">
           <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Performance</h3>
           </div>
           <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.1em] ml-4">Weekly assessment trends</p>
        </div>
        
        <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 ml-4">
          <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tests</span>
          </div>
          <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-50"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg. Score</span>
          </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full min-h-[160px] relative">
         
         {/* Background Grid Lines */}
         <div className="absolute inset-0 flex flex-col justify-between pb-8 pt-2 pointer-events-none opacity-40">
            {[100, 75, 50, 25, 0].map((val) => (
                <div key={val} className="w-full border-b border-dashed border-slate-100"></div>
            ))}
         </div>

         {/* The Chart SVG - Using preserveAspectRatio="none" only for width flexibilty, but we'll protect the tooltip */}
         <svg 
            className="w-full h-full overflow-visible" 
            viewBox={`0 0 ${width} ${height}`} 
            preserveAspectRatio="none"
         >
            <defs>
                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.2"/>
                </filter>
            </defs>
            
            <path d={areaPath} fill="url(#chartGradient)" />
            
            <path 
                d={pathData} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                filter="url(#shadow)"
            />
            
            {/* The dot is part of the SVG, it will stretch slightly but we can minimize it with a better viewBox */}
            <circle 
                cx={focusPoint.x} 
                cy={focusPoint.y} 
                r="6" 
                fill="white" 
                stroke="#6366f1" 
                strokeWidth="4" 
                className="drop-shadow-md"
            />
         </svg>
         
         {/* Tooltip - POSITIONED OUTSIDE SVG TO PREVENT STRETCHING */}
         <div 
            className="absolute z-20 pointer-events-none animate-bounce-in"
            style={{ 
                left: `${(focusPoint.x / width) * 100}%`, 
                top: `${(focusPoint.y / height) * 100}%`,
                transform: 'translate(-50%, -100%) translateY(-20px)'
            }}
         >
            <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-2xl flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-tight text-indigo-400">Score</span>
                <span className="text-sm font-bold">90%</span>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
            </div>
         </div>

         {/* X-Axis Labels */}
         <div className="flex justify-between mt-6 px-1">
             {labels.map((label, i) => (
                 <div key={label} className="flex flex-col items-center gap-1.5">
                     <span 
                        className={`text-[10px] tracking-widest uppercase ${i === focusIndex ? 'font-black text-slate-800' : 'font-bold text-slate-400'}`}
                     >
                         {label}
                     </span>
                     {i === focusIndex && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 ring-2 ring-indigo-50"></div>
                     )}
                 </div>
             ))}
         </div>
      </div>
    </div>
  );
};