
import React from 'react';
import { Exam } from '../../types';
import { Calendar, Clock, AlertCircle, ArrowRight, CheckCircle2, ChevronRight, Play } from 'lucide-react';

interface ExamCardProps {
  exam: Exam;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {
  const examDate = new Date(exam.date);
  const now = new Date();
  
  // Calculate difference in days
  const diffTime = examDate.getTime() - now.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 3600 * 24));
  
  const isCompleted = exam.status === 'Completed';
  const isToday = examDate.toDateString() === now.toDateString();
  const isUrgent = daysUntil <= 3 && daysUntil >= 0;

  return (
    <div className={`group bg-white rounded-[2rem] border border-slate-100 p-6 relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2 ${isToday && !isCompleted ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}`}>
      
      {/* Visual Accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-50 transition-colors duration-500"></div>
      
      {/* Badge Ribbon */}
      {isUrgent && !isCompleted && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-600 rounded-full border border-orange-200">
               <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black uppercase tracking-widest">Urgent</span>
          </div>
      )}
      
      {isCompleted && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200">
               <CheckCircle2 className="w-3.5 h-3.5" />
               <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
          </div>
      )}

      {/* Title & Metadata */}
      <div className="relative z-10 space-y-4">
        <div>
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">{exam.courseName}</div>
            <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-2 min-h-[3rem] group-hover:text-indigo-600 transition-colors">
                {exam.title}
            </h3>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 text-slate-500">
                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-white transition-colors">
                    <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                    <span className="text-xs font-bold text-slate-700">{examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 text-slate-500 border-l border-slate-100 pl-4">
                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-white transition-colors">
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
                    <span className="text-xs font-bold text-slate-700">{exam.durationMinutes} Mins</span>
                </div>
            </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 group-hover:bg-indigo-50 transition-colors duration-500">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                 <span>Exam Overview</span>
                 <span className="text-indigo-600">{exam.questionCount || 0} Questions</span>
             </div>
             <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-medium italic">
                 {exam.description || `Comprehensive examination covering key concepts of ${exam.courseName}.`}
             </p>
        </div>

        {/* Action Button */}
        <button 
          disabled={isCompleted && !isToday}
          onClick={() => {
            const url = `/proctoring?examId=${exam.id}${exam.enrollmentId ? `&enrollmentId=${exam.enrollmentId}` : ''}`;
            window.location.hash = url;
          }}
          className={`w-full group/btn flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden ${
            isCompleted 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-slate-900 text-white shadow-lg hover:shadow-indigo-200 hover:-translate-y-1'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Evaluation Finalized
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Initiate Proctoring
              <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
