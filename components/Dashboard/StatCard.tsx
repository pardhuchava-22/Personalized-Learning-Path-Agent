import React from 'react';
import { Flame, ArrowUp, ArrowDown } from 'lucide-react';
import { StatMetric } from '../../types';

interface StatCardProps {
  stat: StatMetric;
}

export const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  const renderVisualization = () => {
    switch (stat.type) {
      case 'chart':
        // Simple SVG Sparkline
        const points = stat.data || [0, 0, 0, 0, 0];
        const max = Math.max(...points);
        const min = Math.min(...points);
        const range = max - min || 1;
        const width = 60;
        const height = 30;
        const pathData = points.map((p, i) => {
          const x = (i / (points.length - 1)) * width;
          const y = height - ((p - min) / range) * height;
          return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');

        return (
          <svg width={width} height={height} className="overflow-visible">
            <defs>
              <linearGradient id="tealGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
            </defs>
            <path
              d={pathData}
              fill="none"
              stroke="url(#tealGradient)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );

      case 'heatmap':
        // Mini heatmap grid simulation
        return (
          <div className="grid grid-cols-7 gap-1 w-[60px]">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-sm ${
                  Math.random() > 0.3 ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        );

      case 'score':
        // Circle indicator
        const score = typeof stat.value === 'string' ? parseInt(stat.value) : Number(stat.value);
        const colorClass = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-error';
        return (
          <div className={`w-5 h-5 rounded-full ${colorClass} shadow-sm ring-2 ring-white`} />
        );

      default:
         if (stat.trend) {
             return stat.trend === 'up' ? 
                <ArrowUp className="w-4 h-4 text-success" /> : 
                <ArrowDown className="w-4 h-4 text-error" />;
         }
         return null;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-28">
      <div className="flex justify-between items-start">
        <div>
           <p className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
             {stat.value}
             {stat.label.includes('Streak') && <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />}
           </p>
           <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{stat.label}</p>
        </div>
        <div className="flex items-center justify-center pt-1">
            {renderVisualization()}
        </div>
      </div>
    </div>
  );
};
