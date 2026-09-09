import React, { useState, useEffect } from 'react';
import { 
  Sparkles, X, ChevronRight, RotateCcw, Video, Code2, 
  AlertTriangle, CheckCircle2, ArrowRight, Bot, Lightbulb, Play
} from 'lucide-react';
import robotAvatar from '../../assets/ai-companion-robot.png';

export interface RecommendationData {
  type: 'relisten_lecture' | 'code_remediation';
  title: string;
  message: string;
  score?: number;
  quizScore?: number;
  challengeScore?: number;
  conceptName?: string;
  courseId?: string | number;
  moduleId?: string | number;
}

interface AnimatedRecommendationBubbleProps {
  data: RecommendationData;
  onRelistenLecture?: () => void;
  onReattempt?: () => void;
  onGoToRemediation?: () => void;
  onClose?: () => void;
}

export const AnimatedRecommendationBubble: React.FC<AnimatedRecommendationBubbleProps> = ({
  data,
  onRelistenLecture,
  onReattempt,
  onGoToRemediation,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isScenario1 = data.type === 'relisten_lecture';
  const isScenario2 = data.type === 'code_remediation';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* ─── Compact Floating Bubble (when minimized) ─── */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="group flex items-center gap-3 bg-[#0e121b] text-white pl-2 pr-4 py-2 rounded-full border-2 border-[#bbf451] shadow-[0_10px_30px_rgba(14,18,27,0.4)] hover:scale-105 transition-all duration-300 animate-bounce"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#bbf451] bg-[#0e121b] shrink-0">
            <img src={robotAvatar} alt="AI" className="w-full h-full object-cover" />
            <span className="absolute -inset-1 rounded-full bg-[#bbf451] opacity-30 animate-pulse pointer-events-none" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-[#bbf451] font-mono uppercase tracking-wider">AI Suggestion</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#bbf451] animate-ping" />
            </div>
            <p className="text-[10px] text-slate-300 font-medium">
              {isScenario1 ? "Score < 35% · Click to view advice" : "Coding Remediation ready · Click to open"}
            </p>
          </div>
        </button>
      )}

      {/* ─── Animated Expanded Recommendation Card ─── */}
      {isExpanded && (
        <div className="w-[380px] sm:w-[420px] bg-white rounded-3xl border border-slate-200 shadow-[0_25px_60px_-15px_rgba(14,18,27,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col">
          {/* Header */}
          <div className="bg-[#0e121b] px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-[#bbf451]/60 bg-[#0e121b] shrink-0">
                <img src={robotAvatar} alt="AI" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[13px] font-black tracking-tight text-white font-display">Quantum AI Companion</h4>
                  <span className="bg-[#bbf451] text-[#0e121b] text-[8.5px] font-black px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    {isScenario1 ? "Review Alert" : "Concept Gap"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Adaptive Learning Recommendation</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Minimize bubble"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 bg-slate-50/70 space-y-3.5">
            {/* Scenario 1 (<35% in Quiz or Low in Both) */}
            {isScenario1 && (
              <>
                <div className="flex items-start gap-3 bg-red-50 border border-red-200/80 rounded-2xl p-3.5">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-[13px] font-extrabold text-red-950 font-display">
                        Foundational Review Recommended
                      </h5>
                      {data.score !== undefined && (
                        <span className="bg-red-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full font-mono">
                          {data.score}% Score
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-red-900/90 font-medium leading-relaxed mt-1">
                      {data.message || "You scored less than 35% in this assessment. Repeated guessing without reviewing the theory can hinder your progress. We recommend re-listening to your chosen course lecture video before re-attempting."}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>AI Study Strategy:</span>
                  </div>
                  <p className="text-slate-500 pl-5">
                    1. Re-listen to the core lecture video focusing on definitions and syntax.
                    <br />
                    2. Take key notes and then come back to re-attempt the quiz.
                  </p>
                </div>

                {/* Scenario 1 Actions */}
                <div className="flex flex-col gap-2 pt-1 font-mono">
                  {onRelistenLecture && (
                    <button
                      onClick={onRelistenLecture}
                      className="w-full flex items-center justify-center gap-2 bg-[#0e121b] hover:bg-[#bbf451] hover:text-[#0e121b] text-white text-[11.5px] font-black py-2.5 rounded-xl transition-all shadow-sm group"
                    >
                      <Video className="w-4 h-4 text-[#bbf451] group-hover:text-[#0e121b] transition-colors" />
                      <span>Re-listen to Course Lecture</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  )}
                  {onReattempt && (
                    <button
                      onClick={onReattempt}
                      className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold py-2 rounded-xl border border-slate-200 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Re-attempt Quiz</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Scenario 2 (Quiz Passed, Coding Challenge Failed) */}
            {isScenario2 && (
              <>
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 font-mono">
                      Performance Divergence
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full font-mono">
                        Quiz: {data.quizScore || 85}% ✓
                      </span>
                      <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-full font-mono">
                        Code: {data.challengeScore || 25}% ✕
                      </span>
                    </div>
                  </div>

                  <h5 className="text-[13px] font-black text-amber-950 font-display leading-tight">
                    Concept Understood · Hands-on Coding Lagging
                  </h5>

                  <p className="text-[11.5px] text-amber-900/90 font-medium leading-relaxed">
                    You performed very well in the theoretical quiz! However, in the coding challenge, you lagged in implementing: <strong className="text-amber-950 font-bold underline decoration-amber-400">{data.conceptName || "Loop off-by-one & boundary index logic"}</strong>.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Code2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Targeted Practice Arena Ready:</span>
                  </div>
                  <p className="text-slate-500 pl-5">
                    We have set up an interactive practice session in your <strong>Code Remediation</strong> track so you can master this exact concept before writing the re-exam!
                  </p>
                </div>

                {/* Scenario 2 Actions */}
                <div className="flex flex-col gap-2 pt-1 font-mono">
                  {onGoToRemediation && (
                    <button
                      onClick={onGoToRemediation}
                      className="w-full flex items-center justify-center gap-2 bg-[#0e121b] hover:bg-[#bbf451] hover:text-[#0e121b] text-[#bbf451] text-[11.5px] font-black py-2.5 rounded-xl transition-all shadow-sm group"
                    >
                      <Code2 className="w-4 h-4 text-[#bbf451] group-hover:text-[#0e121b] transition-colors" />
                      <span>Practice in Code Remediation Track</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 text-white group-hover:text-[#0e121b]" />
                    </button>
                  )}
                  {onReattempt && (
                    <button
                      onClick={onReattempt}
                      className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold py-2 rounded-xl border border-slate-200 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Re-attempt Coding Challenge</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
