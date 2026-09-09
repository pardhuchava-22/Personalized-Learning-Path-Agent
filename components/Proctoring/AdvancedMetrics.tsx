import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface MetricsData {
  brightness: number;
  faceConfidence: number;
  liveness: number;
  internetSpeed: number;
  fps: number;
}

interface AdvancedMetricsProps {
  metrics: MetricsData;
}

export const AdvancedMetrics: React.FC<AdvancedMetricsProps> = ({ metrics }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getBrightnessColor = (val: number) => {
    if (val > 40) return 'bg-[#10B981]';
    if (val > 20) return 'bg-[#F59E0B]';
    return 'bg-[#EF4444]';
  };

  const getSpeedColor = (val: number) => {
    if (val > 5) return 'text-[#10B981]';
    if (val > 2) return 'text-[#F59E0B]';
    return 'text-[#EF4444]';
  };

  return (
    <div className="mt-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-semibold text-[#4F46E5] hover:text-[#4338ca] transition-colors mb-3"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        Advanced Metrics
      </button>

      {isOpen && (
        <div className="bg-[#F1F5F9] rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
            
            {/* Brightness */}
            <div className="col-span-2 md:col-span-1">
                <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Brightness</span>
                    <span className="text-[10px] font-mono text-slate-700">{metrics.brightness}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${getBrightnessColor(metrics.brightness)} transition-all duration-500`} 
                        style={{ width: `${metrics.brightness}%` }}
                    />
                </div>
            </div>

            {/* Face Confidence (Circular) */}
            <div className="flex items-center gap-3">
                 <div className="relative w-10 h-10">
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-[#4F46E5] transition-all duration-500" strokeDasharray={`${metrics.faceConfidence}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-700">
                         {metrics.faceConfidence}%
                     </div>
                 </div>
                 <div className="flex flex-col">
                     <span className="text-[10px] font-medium text-slate-500 uppercase">Confidence</span>
                     <span className="text-[10px] text-slate-700">High accuracy</span>
                 </div>
            </div>

            {/* Other Stats */}
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Internet</span>
                    <span className={`text-[10px] font-mono ${getSpeedColor(metrics.internetSpeed)}`}>{metrics.internetSpeed} Mbps</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Camera FPS</span>
                    <span className="text-[10px] font-mono text-slate-700">{metrics.fps}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-slate-500 uppercase">Liveness</span>
                    <span className="text-[10px] font-mono text-[#10B981]">{metrics.liveness.toFixed(2)}</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
