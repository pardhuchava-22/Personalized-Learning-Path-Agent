
import React from 'react';
import { Trophy, ArrowUpRight, Award, Zap } from 'lucide-react';

export const XPWidget: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-50 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-orange-50 to-transparent rounded-tr-full opacity-40"></div>
      
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Trophy Icon with Floating Effect */}
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/40 mb-6 transform rotate-3 group-hover:rotate-6 group-hover:-translate-y-1 transition-all duration-300 relative">
            <Trophy className="w-10 h-10 text-white drop-shadow-md" />
            <div className="absolute -top-2 -right-2 bg-white p-1.5 rounded-xl shadow-lg">
                <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
            </div>
        </div>
        
        <h3 className="text-4xl font-black text-slate-800 mb-1 tracking-tighter">2,400 XP</h3>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-8">Weekly Rank: Top 10%</p>
        
        <div className="flex items-center gap-3 w-full">
            <button className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-xs font-black text-slate-500 hover:bg-slate-50 hover:border-slate-200 transition-all uppercase tracking-widest active:scale-95">
                Redeem
            </button>
            <button className="flex-1 py-3.5 rounded-2xl bg-charcoal text-white text-xs font-black shadow-xl shadow-slate-900/10 hover:bg-primary hover:text-charcoal hover:shadow-primary/10 transition-all uppercase tracking-widest active:scale-95">
                Collect
            </button>
        </div>
      </div>
    </div>
  );
};