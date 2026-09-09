import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';
import { SystemCheckItem } from '../../types';

interface SystemChecklistProps {
  items: SystemCheckItem[];
}

export const SystemChecklist: React.FC<SystemChecklistProps> = ({ items }) => {
  return (
    <div className="mt-6 space-y-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div 
            key={item.id}
            className={`flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}
          >
            <div className="flex items-center gap-3">
               <div className="w-5 h-5 flex items-center justify-center">
                  {item.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-[#10B981]" />}
                  {item.status === 'warning' && <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />}
                  {item.status === 'fail' && <XCircle className="w-5 h-5 text-[#EF4444]" />}
                  {item.status === 'checking' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
               </div>
               <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </div>

            <div className="flex items-center gap-3">
                <span className={`
                    text-xs font-semibold
                    ${item.status === 'pass' ? 'text-[#10B981]' : 
                      item.status === 'warning' ? 'text-[#F59E0B]' : 
                      item.status === 'fail' ? 'text-[#EF4444]' : 'text-slate-400'}
                `}>
                    {item.value}
                </span>
                
                <div className="group relative">
                    <Info className="w-4 h-4 text-slate-300 cursor-help hover:text-primary" />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-white p-3 rounded-lg shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        <p className="text-xs text-slate-700 leading-relaxed">{item.tip}</p>
                        <div className="absolute top-full right-1 -mt-1 border-4 border-transparent border-t-white"></div>
                    </div>
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
