import React, { useState, useEffect } from 'react';
import { 
  Clock, Bookmark, AlertTriangle, Play, CheckCircle2, Code2, Sparkles, 
  FileText, ChevronLeft, ArrowRight, BadgeCheck, Lock, Check,
  Sparkle, ListChecks, FileCode, MessageSquare, Compass, ShieldAlert, X,
  HelpCircle
} from 'lucide-react';
import { VideoPlayer } from '../components/Course/VideoPlayer';
import { NotesEditor } from '../components/Course/NotesEditor';
import { AIAssistant } from '../components/Course/AIAssistant';
import { coursesAPI } from '../services/apiService';
import { useCourses } from '../services/courseContext';
import { useTranslation } from '../hooks/useTranslation';

interface VideoLearningProps {
  onNavigate: (path: string) => void;
}

export const VideoLearningScreen: React.FC<VideoLearningProps> = ({ onNavigate }) => {
  const { updateModuleStatus } = useCourses();
  const { t } = useTranslation();
  
  // URL Hash Parsing
  const [courseId, setCourseId] = useState<string>('');
  const [moduleId, setModuleId] = useState<string>('');
  const [module, setModule] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  
  // UI Panels / Tabs
  const [activeSidebarTab, setActiveSidebarTab] = useState<'curriculum' | 'notes' | 'ai'>('curriculum');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'takeaways' | 'checklist'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Playback States
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Progress & Checklist
  const [videoFinished, setVideoFinished] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [checklistItems, setChecklistItems] = useState([
    { id: '1', label: 'Watch video module in its entirety', done: false },
    { id: '2', label: 'Review AI key concept summaries', done: false },
    { id: '3', label: 'Take dynamic concept notes in workspace', done: false },
    { id: '4', label: 'Prepare for understanding check quiz / challenge', done: false },
  ]);

  // Synchronize hash paths on mount and updates
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const [pathPart, queryPart] = hash.split('?');
      const parts = pathPart.split('/').filter(Boolean);
      
      let cid = '';
      const courseIdx = parts.indexOf('course');
      if (courseIdx !== -1 && courseIdx + 1 < parts.length) {
        cid = parts[courseIdx + 1];
      } else {
        const learnIdx = parts.indexOf('learn');
        if (learnIdx > 0) {
          cid = parts[learnIdx - 1];
        }
      }
      
      setCourseId(cid);
      
      const searchParams = new URLSearchParams(queryPart || '');
      const paramModuleId = searchParams.get('module_id');
      if (paramModuleId) {
        setModuleId(paramModuleId);
      }
    };
    
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch Course details and Module details dynamically
  useEffect(() => {
    if (!courseId || courseId === 'undefined') return;
    
    const fetchCourseData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fullCourse = await coursesAPI.getCourse(courseId);
        setCourse(fullCourse);
        
        // Find appropriate module (requested or first incomplete)
        const targetModuleId = moduleId || (fullCourse.modules && fullCourse.modules.length > 0 ? String(fullCourse.modules[0].id) : '');
        if (targetModuleId && targetModuleId !== 'undefined') {
          const modDetail = await coursesAPI.getModule(targetModuleId);
          setModule(modDetail);
          setModuleId(targetModuleId);
          
          // Initialise playback tracking
          setCurrentTime(modDetail.progress?.watch_time_seconds || 0);
          const finished = modDetail.progress?.is_completed || false;
          setVideoFinished(finished);
          
          // Sync checklist state
          setChecklistItems(prev => prev.map(item => {
            if (item.id === '1') return { ...item, done: finished };
            if (item.id === '2') return { ...item, done: finished };
            return item;
          }));
        }
      } catch (err: any) {
        console.error("Failed to load dynamic curriculum content:", err);
        setError(err.message || "Failed to load dynamic lesson details.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseData();
  }, [courseId, moduleId]);

  const saveProgress = async (seconds: number, isFinished: boolean) => {
    if (!moduleId || loading) return;
    try {
      await coursesAPI.updateVideoProgress(moduleId, Math.round(seconds), isFinished);
      
      // Update local module progress state
      setModule(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: {
            ...prev.progress,
            watch_time_seconds: Math.round(seconds),
            is_completed: isFinished
          }
        };
      });

      // Update local course modules list so progress ticks instantly
      setCourse(prev => {
        if (!prev || !Array.isArray(prev.modules)) return prev;
        const updatedModules = prev.modules.map((m: any) => {
          if (String(m.id) === String(moduleId)) {
            return {
              ...m,
              progress: {
                ...m.progress,
                watch_time_seconds: Math.round(seconds),
                is_completed: isFinished
              }
            };
          }
          return m;
        });
        return { ...prev, modules: updatedModules };
      });

      // Synchronize overall course provider context so other screens update too
      if (isFinished && courseId) {
        updateModuleStatus(courseId, moduleId, 'completed');
      }
    } catch (err) {
      console.error("Failed to auto-save watch time progress to SQLite database:", err);
    }
  };

  // Periodic Auto-Saving playback progress (Every 4.5 seconds debounced)
  useEffect(() => {
    if (!moduleId || loading || !currentTime) return;
    
    const saveProgressTimer = setTimeout(() => {
      saveProgress(currentTime, videoFinished);
    }, 4500);

    return () => clearTimeout(saveProgressTimer);
  }, [currentTime, videoFinished, moduleId]);

  // Local Fallback Progress Tracker Interval (Smooth updates & auto-pause check)
  useEffect(() => {
    if (!moduleId || loading || !isPlaying || videoFinished) return;

    const interval = setInterval(() => {
      setCurrentTime(prevTime => {
        const nextTime = prevTime + 1;
        
        // Find current module watch end bounds
        const currMod = module || (course?.modules || []).find((m: any) => String(m.id) === String(moduleId)) || null;
        const watchEndSec = currMod?.watch_end_seconds || 0;

        if (watchEndSec > 0 && nextTime >= watchEndSec) {
          // Pause player
          const iframe = document.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
              '*'
            );
          }
          setIsPlaying(false);
          setVideoFinished(true);
          setShowCelebration(true);
          setChecklistItems(prev => prev.map(item => 
            (item.id === '1' || item.id === '2') ? { ...item, done: true } : item
          ));
          saveProgress(watchEndSec, true);
          clearInterval(interval);
          return watchEndSec;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, moduleId, loading, videoFinished, course, module]);

  // Listen to message notifications from YouTube Player API iframe
  useEffect(() => {
    const handleYoutubeMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'infoDelivery' && data.info) {
          if (data.info.currentTime !== undefined) {
            const time = data.info.currentTime;
            setCurrentTime(time);

            // Check auto-pause boundary
            const currMod = module || (course?.modules || []).find((m: any) => String(m.id) === String(moduleId)) || null;
            const watchEndSec = currMod?.watch_end_seconds || 0;
            if (watchEndSec > 0 && time >= watchEndSec && !videoFinished) {
              const iframe = document.querySelector('iframe');
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(
                  JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
                  '*'
                );
              }
              setIsPlaying(false);
              setVideoFinished(true);
              setShowCelebration(true);
              setChecklistItems(prev => prev.map(item => 
                (item.id === '1' || item.id === '2') ? { ...item, done: true } : item
              ));
              saveProgress(watchEndSec, true);
            }
          }
          if (data.info.duration !== undefined) {
            setDuration(data.info.duration);
          }
        }
        if (data.event === 'onStateChange') {
          // 1 = playing, 2 = paused, 0 = completed
          if (data.info === 1) setIsPlaying(true);
          if (data.info === 2) {
            setIsPlaying(false);
            saveProgress(currentTime, videoFinished);
          }
          if (data.info === 0) {
            setIsPlaying(false);
            setVideoFinished(true);
            setShowCelebration(true);
            setChecklistItems(prev => prev.map(item => 
              (item.id === '1' || item.id === '2') ? { ...item, done: true } : item
            ));
            saveProgress(duration || currentTime || 3600, true);
          }
        }
      } catch (err) {
        // Safe to ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleYoutubeMessage);
    return () => window.removeEventListener('message', handleYoutubeMessage);
  }, [moduleId, duration, currentTime, videoFinished, course, module]);

  const triggerCompletionUpdate = async () => {
    await saveProgress(duration || currentTime || 3600, true);
  };

  const handleSeekTo = (seconds: number) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
      setCurrentTime(seconds);
    }
  };

  const navigateToModule = (targetId: string) => {
    window.location.hash = `#course/${courseId}/learn?module_id=${targetId}`;
  };

  const handleNavigateToAssessment = () => {
    if (!module) return;
    if (module.has_quiz) {
      onNavigate(`/quiz?course_id=${courseId}&module_id=${moduleId}`);
    } else if (module.has_challenge) {
      onNavigate(`/lab?course_id=${courseId}&module_id=${moduleId}`);
    }
  };

  const toggleChecklist = (id: string) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const formatClock = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds || 0));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    if (hours) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const parseDurationToSeconds = (value?: string) => {
    if (!value) return 0;
    const parts = value.split(':').map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return 0;
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    return parts[0] || 0;
  };

  // Process data safely
  const courseModules = Array.isArray(course?.modules) 
    ? [...course.modules].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) 
    : [];

  const currentModuleIndex = courseModules.findIndex((m: any) => String(m.id) === String(moduleId));
  const currentModule = module || courseModules[currentModuleIndex] || null;

  // Timeline & Progress metrics
  const totalDurationSeconds = course?.total_duration_seconds || parseDurationToSeconds(course?.video_duration) || 3600;
  
  // Modules Map
  const moduleTimeline = courseModules.map((entry: any, idx: number) => {
    const isCompleted = entry.progress?.is_completed || false;
    const isCurrent = String(entry.id) === String(moduleId);
    
    // Auto calculate watch time boundaries
    const estimatedMinutes = entry.estimated_minutes || 60;
    const startSec = entry.watch_start_seconds || 0;
    const endSec = entry.watch_end_seconds || (startSec + (estimatedMinutes * 60));

    return {
      id: entry.id,
      title: entry.title,
      order: entry.order || (idx + 1),
      isCompleted,
      isCurrent,
      isLocked: idx > 0 && !courseModules.at(idx - 1)?.progress?.is_completed && !isCurrent,
      watchStart: formatClock(startSec),
      watchEnd: formatClock(endSec),
      startSec,
      endSec,
      estimatedMinutes,
      description: entry.description,
      hasQuiz: entry.has_quiz || false,
      hasChallenge: entry.has_challenge || false
    };
  });

  const watchProgressPercent = Math.min(
    100,
    duration ? Math.round((currentTime / duration) * 100) : 0
  );

  // Overall course learning percentage
  const totalCompletedModules = moduleTimeline.filter(m => m.isCompleted).length;
  const courseProgressPercent = courseModules.length 
    ? Math.round((totalCompletedModules / courseModules.length) * 100) 
    : 0;

  // AI Timestamps extraction
  const activeModuleTimestamps = Array.isArray(currentModule?.timestamps) 
    ? [...currentModule.timestamps].sort((a: any, b: any) => (a.seconds || a.timestamp_seconds || 0) - (b.seconds || b.timestamp_seconds || 0)) 
    : [];

  const currentSegment = activeModuleTimestamps.find((ts: any, idx: number) => {
    const seconds = ts.seconds || ts.timestamp_seconds || 0;
    const nextSeconds = activeModuleTimestamps.at(idx + 1)?.seconds || activeModuleTimestamps.at(idx + 1)?.timestamp_seconds;
    return currentTime >= seconds && (!nextSeconds || currentTime < nextSeconds);
  }) || (activeModuleTimestamps.length > 0 ? activeModuleTimestamps[0] : null);

  // AI Takeaways fallback parser
  const keyTakeaways = currentModule?.description 
    ? currentModule.description.split('. ').filter((s: string) => s.trim().length > 10).map((s: string) => s.replace(/^\*|-/, '').trim())
    : ["Master concepts and core parameters presented in this lesson.", "Build practice code files in notes blocks to verify logical execution.", "Validate edge cases and write unit tests.", "Analyze transcript segments using AI Coach interactive chat."];

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#050816] overflow-hidden items-center justify-center text-slate-100 font-sans">
        <div className="text-center relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-6 shadow-lg shadow-cyan-500/10"></div>
          <p className="text-cyan-400/90 text-sm font-semibold tracking-widest uppercase font-mono animate-pulse">{t('video.loading') || "Initializing Learning Interface..."}</p>
        </div>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="flex h-screen w-full bg-[#050816] overflow-hidden items-center justify-center p-6 text-center text-slate-100 font-sans">
        <div className="max-w-md bg-[#0F172A]/80 border border-slate-800 rounded-[32px] p-8 flex flex-col items-center gap-6 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">{t('video.not_loaded') || "Curriculum Offline"}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-2">
              {error || "We encountered an error loading the course modules from the database."}
            </p>
          </div>
          <button 
            onClick={() => onNavigate(`/course/${courseId}`)}
            className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
          >
            {t('video.return_course') || "Return to Overview"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#030712] overflow-hidden font-sans text-slate-200 selection:bg-cyan-500/30">

      {/* Primary Split Learning Workspace */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        
        {/* ==========================================
            LEFT COLUMN: LEARNING CANVAS (Aspect Player)
            ========================================== */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#030712] relative z-0">
          
          {/* Header Row */}
          <header className="flex h-20 bg-[#0B0F19]/80 border-b border-slate-800/80 items-center justify-between px-6 shrink-0 z-20 backdrop-blur-md shadow-md">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate(`/course/${courseId}`)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/60 hover:bg-slate-700/85 text-slate-350 hover:text-white transition-all border border-slate-700/60 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-slate-800"></div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400/90 font-bold block mb-0.5">
                  {t('video.day')} {currentModule?.learning_day || currentModule?.order || 1} {t('video.of')} {courseModules.length}
                </span>
                <h1 className="font-extrabold text-white text-base truncate max-w-md lg:max-w-xl">
                  {currentModule?.title || module.title}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Dynamic overall course progress */}
              <div className="hidden md:flex flex-col items-end gap-1.5 mr-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium font-mono">{t('video.course_completion')}</span>
                  <span className="text-emerald-400 font-bold font-mono">{courseProgressPercent}%</span>
                </div>
                <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${courseProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Sidebar toggle button */}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSidebarOpen 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-450 shadow-md shadow-cyan-500/5' 
                    : 'text-slate-400 border-slate-800 bg-[#0B0F19]/40 hover:bg-slate-800 hover:text-white'
                }`}
                title={isSidebarOpen ? "Collapse sidebar workspace" : "Expand sidebar workspace"}
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Scrolling Canvas */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 lg:p-8 justify-start items-center w-full gap-8">
            
            <div className="w-full max-w-[1080px] flex flex-col gap-8">
              
              {/* Premium double-layered video frame */}
              <div className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-[36px] blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
                <VideoPlayer
                  title={currentModule?.title || module.title}
                  videoId={currentModule?.source_video_id || module.source_video_id}
                  onComplete={() => {
                    setVideoFinished(true);
                    setShowCelebration(true);
                    setChecklistItems(prev => prev.map(item => 
                      (item.id === '1' || item.id === '2') ? { ...item, done: true } : item
                    ));
                    saveProgress(duration || currentTime || 3600, true);
                  }}
                  className="relative z-10"
                />
              </div>

              {/* Redesigned Premium Horizontal CONNECTED Timeline Nodes */}
              <div className="bg-[#0A0E1A]/80 border border-slate-800/80 rounded-[32px] p-6 lg:p-8 shadow-xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-widest text-cyan-400/90 uppercase mb-1">
                      {t('video.timeline_graph')}
                    </h3>
                    <p className="text-base font-extrabold text-white">
                      {t('video.progression_nodes')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-800/60 text-slate-400 border border-slate-700/50 rounded-lg text-xs font-mono font-medium">
                      {t('video.total')} {moduleTimeline.length} {t('video.days')}
                    </span>
                    <span className="px-3 py-1 bg-cyan-500/10 text-cyan-450 border border-cyan-500/20 rounded-lg text-xs font-mono font-bold">
                      {t('video.progress_label')} {totalCompletedModules}/{moduleTimeline.length}
                    </span>
                  </div>
                </div>

                {/* Timeline Connected Circle Nodes */}
                <div className="relative py-6 px-2 flex items-center justify-between min-h-[96px]">
                  {/* Connecting Line behind circles */}
                  <div className="absolute left-8 right-8 top-12 h-1 bg-slate-800 rounded-full z-0">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-slate-800 transition-all duration-500"
                      style={{ 
                        width: moduleTimeline.length > 1 
                          ? `${(Math.max(0, currentModuleIndex) / (moduleTimeline.length - 1)) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>

                  {/* Connected Nodes */}
                  {moduleTimeline.map((item, idx) => {
                    let circleStyle = "bg-[#030712] border-slate-800 text-slate-500 shadow-inner";
                    let glowStyle = "";
                    let icon = <span className="font-mono font-bold text-xs">{item.order}</span>;

                    if (item.isCompleted) {
                      circleStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-450 hover:bg-emerald-500/20 cursor-pointer";
                      icon = <Check className="w-4.5 h-4.5 stroke-[2.5]" />;
                    } else if (item.isCurrent) {
                      circleStyle = "bg-cyan-500/10 border-cyan-400 text-cyan-400 ring-4 ring-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer";
                      glowStyle = "absolute -inset-1 bg-cyan-500/20 rounded-full blur animate-ping opacity-60";
                      icon = <Play className="w-3.5 h-3.5 fill-cyan-400 ml-0.5" />;
                    } else if (item.isLocked) {
                      circleStyle = "bg-slate-900/40 border-slate-850/80 text-slate-650 cursor-not-allowed opacity-60";
                      icon = <Lock className="w-3.5 h-3.5" />;
                    } else {
                      // Unlocked pending
                      circleStyle = "bg-slate-800/80 border-slate-700 text-slate-350 hover:bg-slate-700 cursor-pointer hover:border-slate-500";
                    }

                    return (
                      <div 
                        key={item.id} 
                        className="relative z-10 flex flex-col items-center group flex-1"
                      >
                        {/* Circle Node Container */}
                        <div className="relative">
                          {glowStyle && <div className={glowStyle} />}
                          <button
                            onClick={() => !item.isLocked && navigateToModule(item.id)}
                            disabled={item.isLocked}
                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 font-bold relative z-10 select-none ${circleStyle}`}
                          >
                            {icon}
                          </button>
                        </div>

                        {/* Text labels below circle */}
                        <div className="mt-3 text-center max-w-[90px] select-none">
                          <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${item.isCurrent ? 'text-cyan-400' : item.isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {t('video.day')} {item.order}
                          </p>
                          <p className="text-[11px] font-bold text-slate-300 truncate mt-0.5 group-hover:text-white transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                            {item.estimatedMinutes} min
                          </p>
                        </div>
                        
                        {/* High-End Hover Card Popup */}
                        <div className="absolute bottom-16 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 z-50 pointer-events-none transform -translate-y-1">
                          <div className="bg-[#121A30] border border-slate-700 p-3.5 rounded-2xl shadow-xl w-60 text-left backdrop-blur-md">
                            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                              {t('video.day')} {item.order} · {item.estimatedMinutes} Mins
                            </span>
                            <h4 className="text-xs font-bold text-white mt-1 leading-snug">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2">
                              {item.description || "No description provided."}
                            </p>
                            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-550 font-mono">
                              <span>{t('video.timestamps')}</span>
                              <span>{item.watchStart} - {item.watchEnd}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Interactive Tab Controls under video */}
              <div className="bg-[#0A0E1A]/80 border border-slate-800/80 rounded-[32px] p-6 lg:p-8 shadow-xl backdrop-blur-xl">
                
                {/* Horizontal tabs list */}
                <div className="flex border-b border-slate-800/80 pb-4 mb-6 gap-2">
                  <button
                    onClick={() => setActiveSubTab('overview')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      activeSubTab === 'overview'
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                        : 'text-slate-450 hover:text-white border border-transparent bg-transparent'
                    }`}
                  >
                    <Compass className="w-4 h-4 inline mr-2 -mt-0.5" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveSubTab('takeaways')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      activeSubTab === 'takeaways'
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                        : 'text-slate-450 hover:text-white border border-transparent bg-transparent'
                    }`}
                  >
                    <Sparkle className="w-4 h-4 inline mr-2 -mt-0.5" />
                    Key Takeaways
                  </button>
                  <button
                    onClick={() => setActiveSubTab('checklist')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      activeSubTab === 'checklist'
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                        : 'text-slate-450 hover:text-white border border-transparent bg-transparent'
                    }`}
                  >
                    <ListChecks className="w-4.5 h-4.5 inline mr-2 -mt-0.5" />
                    {t('video.checklist')}
                  </button>
                </div>

                {/* Tab content renderer */}
                <div className="text-slate-300 text-sm leading-relaxed min-h-[140px]">
                  
                  {/* Overview tab */}
                  {activeSubTab === 'overview' && (
                    <div className="flex flex-col md:grid md:grid-cols-3 gap-6 animate-fade-in">
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 mb-2">
                          {t('video.module_summary')}
                        </h4>
                        <p className="text-[#E2E8F0] font-semibold text-sm leading-relaxed mb-3">
                          {t('video.watch')} {formatClock(currentModule?.watch_start_seconds || 0)}-{formatClock(currentModule?.watch_end_seconds || totalDurationSeconds)} from <span className="text-cyan-400 font-bold">{course?.title || 'Python Full Course for Beginners'}</span> and practice: <span className="text-emerald-450 font-bold">{currentModule?.title || 'Introduction to Programming Concepts'}</span>.
                        </p>
                        <p className="text-slate-400 leading-relaxed text-xs">
                          {currentModule?.description || module.description || t('video.default_description')}
                        </p>
                      </div>
                      
                      <div className="bg-[#0F172A]/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold block mb-1">
                            {t('video.learning_bounds')}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {t('video.assigned_timeline')}
                          </h4>
                          <div className="mt-3 flex items-center justify-between text-xs border-b border-slate-800/50 pb-2">
                            <span className="text-slate-450 font-medium">{t('video.watch_start')}</span>
                            <span className="font-mono font-bold text-slate-200">{formatClock(currentModule?.watch_start_seconds || 0)}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-450 font-medium">{t('video.watch_end')}</span>
                            <span className="font-mono font-bold text-slate-200">{formatClock(currentModule?.watch_end_seconds || totalDurationSeconds)}</span>
                          </div>
                        </div>

                        {activeModuleTimestamps.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-800/80">
                            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-bold block">
                              {t('video.active_topic_pin')}
                            </span>
                            <p className="text-xs font-bold text-white mt-1 truncate">
                              {currentSegment ? currentSegment.label : t('video.exploring_module')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Takeaways tab */}
                  {activeSubTab === 'takeaways' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      {keyTakeaways.map((point: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="bg-[#0F172A]/30 border border-slate-800/60 rounded-2xl p-4.5 flex items-start gap-4 hover:border-slate-700/80 transition-all duration-300"
                        >
                          <div className="w-7 h-7 shrink-0 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-mono font-bold text-cyan-450 mt-0.5">
                            {idx + 1}
                          </div>
                          <p className="text-xs font-medium text-slate-350 leading-relaxed">
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Checklist tab */}
                  {activeSubTab === 'checklist' && (
                    <div className="flex flex-col gap-3.5 animate-fade-in">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                          {t('video.individual_deliverables')}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {checklistItems.filter(i => i.done).length} of {checklistItems.length} completed
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {checklistItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => toggleChecklist(item.id)}
                            className={`p-4 border rounded-2xl flex items-center justify-between gap-4 text-left transition-all duration-300 cursor-pointer ${
                              item.done 
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300' 
                                : 'bg-[#0F172A]/30 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-[#0F172A]/50'
                            }`}
                          >
                            <span className="text-xs font-bold leading-snug">{item.label}</span>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                              item.done 
                                ? 'bg-emerald-500 border-emerald-450 text-slate-950 shadow-md shadow-emerald-500/10' 
                                : 'bg-transparent border-slate-700 text-transparent'
                            }`}>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>

          {/* Sticky Action Footer */}
          <footer className="h-24 bg-[#0B0F19]/80 backdrop-blur-xl border-t border-slate-800/80 px-6 flex items-center justify-between shrink-0 z-20 shadow-inner">
            {/* Playback time stamp */}
            <div className="flex items-center gap-3 bg-[#0F172A]/80 border border-slate-800/80 rounded-xl px-4 py-2 text-xs font-mono font-bold text-slate-300 shadow-inner select-none">
              <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>{formatClock(currentTime)}</span>
              <span className="text-slate-600 font-normal">/</span>
              <span className="text-slate-400">{formatClock(duration || totalDurationSeconds)}</span>
            </div>

            {/* Video progress indicator bar */}
            <div className="hidden lg:flex items-center gap-4 flex-1 max-w-sm mx-6">
              <span className="text-xs font-mono font-bold text-slate-400 shrink-0">{t('video.progress_label')}</span>
              <div className="relative flex-1 py-1">
                <input
                  type="range"
                  min="0"
                  max={duration || totalDurationSeconds || 3600}
                  value={currentTime}
                  onChange={(e) => handleSeekTo(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full bg-slate-800 outline-none appearance-none cursor-pointer accent-cyan-400"
                />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full pointer-events-none"
                  style={{ width: `${watchProgressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400 shrink-0 select-none">{watchProgressPercent}%</span>
            </div>

            {/* Structured gating assessment redirect */}
            <div className="flex items-center gap-3">
              {videoFinished ? (
                (currentModule.hasQuiz || currentModule.hasChallenge) ? (
                  <button 
                    onClick={handleNavigateToAssessment}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-350 text-slate-950 font-bold rounded-2xl flex items-center gap-2 text-xs uppercase tracking-wider transition-all duration-300 animate-pulse shadow-lg shadow-emerald-500/20 border border-transparent cursor-pointer"
                  >
                    <BadgeCheck className="w-4.5 h-4.5" />
                    Open Assessment
                  </button>
                ) : (
                  <button 
                    onClick={async () => {
                      if (courseId) {
                        try {
                          const resume = await coursesAPI.getCourseResume(courseId);
                          onNavigate(resume.route || `/course/${courseId}`);
                        } catch {
                          onNavigate(`/course/${courseId}`);
                        }
                      } else {
                        onNavigate('/courses');
                      }
                    }}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-lg shadow-black/10"
                  >
                    {t('video.complete_label')} & Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-900/40 border border-slate-850 rounded-2xl text-slate-500 select-none">
                  <Lock className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    {t('video.unlock_assessment')}
                  </span>
                </div>
              )}
            </div>
          </footer>
        </main>

        {/* ==========================================
            RIGHT COLUMN: INTERACTIVE HUB SIDEBAR
            ========================================== */}
        {isSidebarOpen && (
          <aside className="w-96 bg-[#090D1A]/95 border-l border-slate-800/80 flex flex-col shrink-0 relative z-30 animate-slide-left backdrop-blur-xl shadow-2xl">
            
            {/* Header Tabs Navigation */}
            <div className="h-20 border-b border-slate-800/85 flex items-center px-4 justify-between bg-[#0B0F19]/40 shrink-0 select-none">
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800/60 shadow-inner w-full">
                <button 
                  onClick={() => setActiveSidebarTab('curriculum')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeSidebarTab === 'curriculum' 
                      ? 'bg-cyan-500/10 text-cyan-405 border border-cyan-500/20 font-extrabold shadow-sm' 
                      : 'text-slate-450 hover:text-slate-200 bg-transparent border border-transparent'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  Path
                </button>
                <button 
                  onClick={() => setActiveSidebarTab('notes')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeSidebarTab === 'notes' 
                      ? 'bg-cyan-500/10 text-cyan-405 border border-cyan-500/20 font-extrabold shadow-sm' 
                      : 'text-slate-450 hover:text-slate-200 bg-transparent border border-transparent'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Notes
                </button>
                <button 
                  onClick={() => setActiveSidebarTab('ai')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeSidebarTab === 'ai' 
                      ? 'bg-cyan-500/10 text-cyan-405 border border-cyan-500/20 font-extrabold shadow-sm' 
                      : 'text-slate-450 hover:text-slate-200 bg-transparent border border-transparent'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Coach
                </button>
              </div>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              
              {/* Tab 1: Vertical Learning Curriculum Path */}
              {activeSidebarTab === 'curriculum' && (
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4 animate-fade-in">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest select-none">
                      {t('video.dynamic_path')}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-450 select-none">
                      {courseModules.length} Days
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3 font-sans text-xs">
                    {moduleTimeline.map((entry) => (
                      <button
                        key={entry.id}
                        disabled={entry.isLocked}
                        onClick={() => navigateToModule(entry.id)}
                        className={`w-full p-4 border rounded-2xl flex flex-col gap-2.5 text-left transition-all duration-300 ${
                          entry.isCurrent 
                            ? 'border-cyan-500 bg-cyan-500/5 shadow-md shadow-cyan-500/5' 
                            : entry.isLocked 
                              ? 'border-slate-900/60 bg-slate-900/20 opacity-50 cursor-not-allowed'
                              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={`font-bold tracking-wide truncate ${entry.isCurrent ? 'text-white' : 'text-slate-300'}`}>
                            {t('video.day')} {entry.order} · {entry.title}
                          </span>
                          
                          <div className="shrink-0 flex items-center justify-center">
                            {entry.isCompleted ? (
                              <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            ) : entry.isCurrent ? (
                              <div className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/35 flex items-center justify-center text-cyan-405 animate-pulse">
                                <Play className="w-3 h-3 fill-cyan-400" />
                              </div>
                            ) : entry.isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-md border border-slate-700" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-450 font-semibold font-mono tracking-wider uppercase">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {entry.estimatedMinutes} Mins
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {entry.hasQuiz && (
                              <span className="px-2 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800">
                                {t('video.quiz')}
                              </span>
                            )}
                            {entry.hasChallenge && (
                              <span className="px-2 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-800">
                                {t('video.challenge')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Dynamic Study Notebook */}
              {activeSidebarTab === 'notes' && (
                <div className="absolute inset-0 flex flex-col animate-fade-in bg-white text-slate-900 rounded-b-2xl overflow-hidden">
                  <NotesEditor
                    courseTitle={course?.title}
                    moduleTitle={currentModule?.title || module.title}
                    timestamps={activeModuleTimestamps.map(ts => ({
                      time: ts.time || formatClock(ts.seconds || ts.timestamp_seconds || 0),
                      label: ts.label || "Study marker"
                    }))}
                    summary={currentModule?.description || module.description}
                  />
                </div>
              )}

              {/* Tab 3: Interactive Socratic AI Coach Chat */}
              {activeSidebarTab === 'ai' && (
                <div className="absolute inset-0 overflow-y-auto p-5 animate-fade-in bg-[#090D1A]/50 custom-scrollbar">
                  <AIAssistant 
                    courseTitle={course?.title} 
                    moduleTitle={currentModule?.title || module.title} 
                    moduleId={moduleId}
                  />
                </div>
              )}

            </div>

            {/* Sidebar Topic Pin Sub-Section */}
            {activeSidebarTab === 'curriculum' && activeModuleTimestamps.length > 0 && (
              <div className="h-44 border-t border-slate-800/80 p-4 flex flex-col gap-2.5 shrink-0 bg-[#0B0F19]/40 select-none">
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
                  {t('video.active_topic_pins')}
                </span>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                  {activeModuleTimestamps.map((ts: any) => {
                    const seconds = ts.seconds || ts.timestamp_seconds || 0;
                    const isCurrent = currentSegment && currentSegment.id === ts.id;
                    const timeLabel = ts.time || formatClock(seconds);
                    
                    return (
                      <button 
                        key={ts.id} 
                        onClick={() => handleSeekTo(seconds)}
                        className={`p-2.5 border rounded-xl flex items-center justify-between gap-4 transition-all duration-300 text-left cursor-pointer ${
                          isCurrent 
                            ? 'border-cyan-500/60 bg-cyan-500/10 text-white font-bold'
                            : 'border-slate-800 bg-[#0F172A]/25 text-slate-400 hover:border-slate-700 hover:bg-[#0F172A]/40 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate text-xs">{ts.label}</span>
                        <span className="font-mono text-[10px] text-cyan-400 bg-cyan-550/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold shrink-0">
                          {timeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </aside>
        )}

      </div>

      {/* Sleek Glassmorphic Celebration Overlay Card */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative max-w-lg w-full bg-gradient-to-b from-[#0B0F19] to-[#04060C] border border-[#06B6D4]/30 rounded-[36px] p-8 text-center shadow-2xl overflow-hidden">
            {/* Neon Glow background blobs */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button 
              onClick={() => setShowCelebration(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Celebration Header */}
            <div className="relative z-10 flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5 animate-bounce">
                <Sparkles className="w-8 h-8 text-emerald-450" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                  {t('video.module_completed')}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1">
                  {t('video.outstanding_effort')}
                </h2>
              </div>
            </div>

            {/* Celebration Details */}
            <p className="text-slate-350 text-xs leading-relaxed mb-6">
              {t('video.success_completed')} **Day {currentModule?.learning_day || currentModule?.order || 1}** of your curriculum:
              <span className="block text-white font-bold mt-1.5 text-sm">"{currentModule?.title}"</span>
            </p>

            {/* Assessment Breakdown Box */}
            <div className="bg-[#050814]/90 border border-slate-850 rounded-2xl p-5 mb-8 text-left">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-3 select-none">
                {t('video.unlocked_deliverables')}
              </h4>
              
              <div className="flex flex-col gap-3 font-sans">
                {currentModule?.has_quiz && (
                  <div className="flex items-center justify-between border-b border-slate-800/30 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{t('video.understanding_mcq')}</span>
                        <span className="text-[10px] text-slate-455 leading-none">{t('video.verify_core_logic')}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-555/15 px-2 py-0.5 rounded border border-cyan-500/20 font-bold shrink-0">
                      {t('video.required')}
                    </span>
                  </div>
                )}

                {currentModule?.has_challenge && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{t('video.algorithmic_challenge')}</span>
                        <span className="text-[10px] text-slate-455 leading-none">{t('video.write_starter_templates')}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-450 bg-emerald-555/15 px-2 py-0.5 rounded border border-emerald-500/20 font-bold shrink-0">
                      {t('video.practice_lab')}
                    </span>
                  </div>
                )}

                {!currentModule?.has_quiz && !currentModule?.has_challenge && (
                  <div className="flex items-center gap-3 py-1.5 text-slate-455">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold">{t('video.no_assessments_pending')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 justify-center select-none">
              {(currentModule?.has_quiz || currentModule?.has_challenge) ? (
                <button 
                  onClick={() => {
                    setShowCelebration(false);
                    handleNavigateToAssessment();
                  }}
                  className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-405 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  {t('video.start_assessment')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button 
                  onClick={async () => {
                    setShowCelebration(false);
                    if (courseId) {
                      try {
                        const resume = await coursesAPI.getCourseResume(courseId);
                        onNavigate(resume.route || `/course/${courseId}`);
                      } catch {
                        onNavigate(`/course/${courseId}`);
                      }
                    } else {
                      onNavigate('/courses');
                    }
                  }}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-450 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  {t('video.complete_label')} & Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={() => setShowCelebration(false)}
                className="px-4.5 py-3 bg-[#0B0F19] hover:bg-slate-900 text-slate-350 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                {t('video.keep_reviewing')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
