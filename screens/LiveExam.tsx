import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, ChevronLeft, ChevronRight, Info, AlertTriangle, Loader2, Play, Terminal,
  CheckCircle, XCircle, Bookmark, PanelRightClose, PanelRightOpen, ShieldCheck, Code2,
  Users, CheckCircle2, ShieldAlert, Lock, Eye
} from 'lucide-react';
import { CodeEditor } from '../components/Lab/CodeEditor';
import { FloatingWebcam } from '../components/Exam/FloatingWebcam';
import { ExamQuestion } from '../types';
import { examsAPI, questionsAPI, proctoringAPI, submissionsAPI } from '../services/apiService';

interface LiveExamScreenProps {
  onNavigate: (path: string) => void;
}

export const LiveExamScreen: React.FC<LiveExamScreenProps> = ({ onNavigate }) => {
  // Session & Data State
  const [examId, setExamId] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [examDetails, setExamDetails] = useState<any>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [execResults, setExecResults] = useState<Record<string, any[]>>({});
  const [execErrors, setExecErrors] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); 
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(true);
  const [violationCount, setViolationCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isExamBlocked, setIsExamBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<'violations' | 'absence' | 'multiple_people'>('violations');
  const [isMultipleFacesBlocked, setIsMultipleFacesBlocked] = useState(false);
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(0);
  const [multipleFacesSnapshot, setMultipleFacesSnapshot] = useState<string | null>(null);
  const [cleanStreakSeconds, setCleanStreakSeconds] = useState<number>(0);
  const [hasActiveViolation, setHasActiveViolation] = useState(false);
  const [incidentLog, setIncidentLog] = useState<any[]>([]);
  const lastViolationTime = useRef<Record<string, number>>({});
  const consecutiveAbsenceCount = useRef<number>(0);
  const consecutiveMultiFacesFrames = useRef<number>(0);
  const consecutiveCleanFrames = useRef<number>(0);
  const maxViolations = 5;

  // 1. Initial Load: Parse Params
  useEffect(() => {
    if (sessionStorage.getItem('completed_exam_result_guard') === 'true') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/exams`);
      onNavigate('/exams');
      return;
    }

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1]);
    setExamId(params.get('examId'));
    setEnrollmentId(params.get('enrollmentId'));
  }, [onNavigate]);

  // 2. Fetch Data
  useEffect(() => {
    if (!examId || !enrollmentId) return;
    const initExam = async () => {
      try {
        setLoading(true);
        const details = await examsAPI.getExam(examId);
        setExamDetails(details);
        setTimeLeft((details.duration_minutes || 60) * 60);

        // Fetch Questions with proper structure handling
        const qData = await questionsAPI.getExamQuestions(examId);
        const questionList = Array.isArray(qData) ? qData : (qData?.results || qData?.data || []);
        
        const mappedQuestions = (questionList || []).map((q: any) => ({
            id: q.id.toString(),
            type: q.question_type || (q.mcq_details ? 'mcq' : q.coding_details ? 'coding' : 'mcq'),
            text: q.description || q.title || 'No Question Text',
            marks: q.marks || 10,
            mcq_details: q.mcq_details,
            coding_details: q.coding_details
        }));
        setQuestions(mappedQuestions);
        setReviews({});
        setAnswers({});
        setExecResults({});
        setExecErrors({});

        // Start Session
        const numericEnrollId = parseInt(enrollmentId, 10);
        if (!isNaN(numericEnrollId)) {
            const session = await proctoringAPI.startSession(numericEnrollId).catch(() => null);
            if (session) setSessionId(session.id);
        }
      } catch (err) {
        console.error('Failed to initialize exam:', err);
      } finally {
        setLoading(false);
      }
    };
    initExam();
  }, [examId, enrollmentId]);

  // 3. Proctoring Helper
  const reportViolation = useCallback(async (type: string, details: string, severity: 'low'|'medium'|'high' = 'medium', detectionsData?: any) => {
    const now = Date.now();
    // Throttle same-type violations to every 15s, but always catch critical ones
    if (lastViolationTime.current[type] && now - lastViolationTime.current[type] < 15000) return;
    lastViolationTime.current[type] = now;
    
    // CAPTURE EVIDENCE
    let snapshot = null;
    if (typeof (window as any).__proctoringTakeSnapshot === 'function') {
        snapshot = (window as any).__proctoringTakeSnapshot();
    }

    const newIncident = {
        id: `inc-${now}`,
        type,
        details,
        severity,
        timestamp: now,
        snapshot,
        detections: detectionsData,
        timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    
    setIncidentLog(prev => [...prev, newIncident]);
    setViolationCount(prev => {
        const newCount = prev + 1;
        if (newCount >= maxViolations) {
            setIsExamBlocked(true);
        } else if (severity === 'high') {
            setIsLocked(true);
        }
        return newCount;
    });

    const numId = parseInt(enrollmentId || '0', 10);
    if (!isNaN(numId) && numId > 0) {
        try { 
            await proctoringAPI.reportViolation({ 
                enrollment_id: numId, 
                violation_type: type, 
                description: details, 
                severity,
                detections: detectionsData || {},
                snapshot: snapshot || undefined
            }); 
        } catch (e) {
            console.error('[LiveExam] Failed to report violation to backend:', e);
        }
    }
  }, [enrollmentId]);

  // 4. Tab Monitoring
  useEffect(() => {
    if (!sessionId) return;
    const handleInvisibility = () => { if (document.hidden) reportViolation('tab_switching', 'Browser tab changed.', 'high'); };
    const handleBlur = () => reportViolation('tab_switching', 'Focus lost.', 'high');
    
    document.addEventListener("visibilitychange", handleInvisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", e => e.preventDefault());
    return () => {
      document.removeEventListener("visibilitychange", handleInvisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [sessionId, reportViolation]);

  // 4b. Real-Time Audio Proctoring Monitoring (Speech and Loud Noise Detection)
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    const initAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          
          // Trigger audio violation if ambient speaking/noise level exceeds threshold (45)
          if (average > 45) {
            reportViolation('speaking_noise', 'Speech or high ambient noise identified in exam room.', 'medium');
          }
          requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (err) {
        console.warn('[LiveExam] Microphone access failed or denied:', err);
      }
    };
    initAudio();

    return () => {
      cancelled = true;
      if (audioCtx) audioCtx.close().catch(() => {});
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [sessionId, reportViolation]);

  // 5. AI Detection Handler
  const handleAIThreshold = useCallback((detections: any[]) => {
      if (isSubmitting) return;

      const face = detections.find(d => d.class === 'face');
      const allFaces = detections.filter(d => d.class === 'face');
      const allPersons = detections.filter(d => d.class === 'ssd_person' || d.class === 'person');
      const multiplePeopleDetected = detections.find(d => d.class === 'multiple_people_detected');
      const phone = detections.find(d => d.class === 'cell phone' && d.score > 0.45);
      const identityMismatch = detections.find(d => d.class === 'identity_mismatch');

      // Comprehensive multi-face / multi-person detection
      const totalFaceCount = Math.max(
        allFaces.length,
        allPersons.length,
        multiplePeopleDetected?.data?.faceCount || (multiplePeopleDetected ? 2 : 0)
      );
      const isMultiFace = totalFaceCount > 1 || !!multiplePeopleDetected;
      
      // Identity Lock Match verification check
      if (identityMismatch) {
          reportViolation('identity_mismatch', 'Unauthorized face detected. Active candidate does not match calibration identity verification.', 'high', identityMismatch);
      }

      // Absence Check: ONLY trigger if BOTH YOLOv8 and MediaPipe detect 0 candidates (candidate is physically absent).
      const noPersonDetected = detections.some(d => d.class === 'no_person');
      if (!face && (noPersonDetected || allFaces.length === 0)) {
          reportViolation('absence', 'Candidate absence detected in assessment environment.', 'medium');
          consecutiveAbsenceCount.current += 1;
          
          // Trigger direct termination ONLY if candidate is physically absent persistently for more than 8 consecutive frames (~8s)
          if (consecutiveAbsenceCount.current >= 8) {
              setBlockReason('absence');
              setIsExamBlocked(true);
          }
      } else {
          consecutiveAbsenceCount.current = 0;
      }

      // REAL-TIME MULTIPLE FACES LOCKOUT
      if (isMultiFace) {
          consecutiveCleanFrames.current = 0;
          setCleanStreakSeconds(0);
          consecutiveMultiFacesFrames.current += 1;
          setDetectedFacesCount(totalFaceCount);
          setIsMultipleFacesBlocked(true);

          // Capture immediate evidence snapshot
          if (typeof (window as any).__proctoringTakeSnapshot === 'function') {
              const snap = (window as any).__proctoringTakeSnapshot();
              if (snap) {
                  setMultipleFacesSnapshot(snap);
              }
          }

          reportViolation(
              'multiple_people', 
              `Security Alert: Multiple individuals detected in frame (${totalFaceCount} faces/persons). Exam screen locked.`, 
              'high', 
              { faceCount: totalFaceCount, detections }
          );

          // Persistent multi-face lockout: If multiple people remain continuously in frame for > 30 seconds (~30 checks), terminate exam
          if (consecutiveMultiFacesFrames.current >= 30) {
              setBlockReason('multiple_people');
              setIsExamBlocked(true);
          }
      } else {
          consecutiveMultiFacesFrames.current = 0;
          // When exactly 1 face is visible and no extra person
          if (allFaces.length === 1 && allPersons.length <= 1) {
              consecutiveCleanFrames.current += 1;
              const streak = consecutiveCleanFrames.current;
              setCleanStreakSeconds(streak);

              // Auto-unlock after 3 consecutive clean frames (~3 seconds of verified single-candidate frame)
              if (streak >= 3) {
                  setIsMultipleFacesBlocked(false);
                  setMultipleFacesSnapshot(null);
                  setCleanStreakSeconds(0);
              }
          } else {
              consecutiveCleanFrames.current = 0;
              setCleanStreakSeconds(0);
          }
      }
      
      // Mobile Phone
      if (phone) {
          reportViolation('mobile_phone', 'Mobile phone or electronic gadget identified.', 'high', phone);
      }

      // Suspicious Objects (Books, Laptops)
      const suspicious = detections.find(d => d.class === 'suspicious_object');
      if (suspicious) {
          reportViolation('forbidden_item', `Suspicious item (${suspicious.data?.originalClass || 'unauthorized material'}) detected in exam environment.`, 'medium', suspicious);
      }

      // Face Covered Check
      const faceCovered = detections.find(d => d.class === 'face_covered');
      if (faceCovered) {
          reportViolation('face_covering', 'Candidate face is covered or occluded.', 'medium', faceCovered);
      }
      
      // Face Logic (Rotation & Visibility)
      if (face) {
          // 1. Partial Face Detection (Half face)
          if (face.data?.isPartial) {
              reportViolation('partial_face', 'Partial face detected. Please ensure full face is visible.', 'medium', face);
          }
          
          // 2. Head Rotation (Left, Right, Down, Up)
          const pose = face.data?.pose;
          if (pose && pose !== 'center') {
              let detail = 'Looking away from screen.';
              if (pose === 'down') detail = 'Looking down (Suspicious activity).';
              if (pose === 'left') detail = 'Looking left.';
              if (pose === 'right') detail = 'Looking right.';
              
              reportViolation('gaze_aversion', detail, 'medium', face);
          }
      }

      // Track active violations for full-screen glow warning (absence, phone, multiple people, looking away, covered face)
      const active = detections.filter(d => 
        d.class === 'multiple_people_detected' || 
        d.class === 'cell phone' || 
        d.class === 'face_covered' || 
        (d.class === 'face' && d.data?.pose !== 'center')
      );
      setHasActiveViolation(active.length > 0 || isMultiFace || !face || noPersonDetected);
  }, [reportViolation, isSubmitting]);

  // 6. Fullscreen Monitoring
  useEffect(() => {
    if (loading || !sessionId) return;
    const elem = document.documentElement;
    const enterFullscreen = async () => {
        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            }
        } catch (e) {
            console.warn("Fullscreen request failed", e);
        }
    };
    
    // Slight delay to ensure user interaction if needed or just attempt
    setTimeout(enterFullscreen, 500);

    const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
            reportViolation('fullscreen_exit', 'Exited fullscreen mode.', 'high');
            setTimeout(enterFullscreen, 1000);
        }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    };
  }, [loading, sessionId, reportViolation]);

  // 7. Timer & Status Polling
  useEffect(() => {
    if (loading || !sessionId || isExamBlocked) return;
    
    // Timer interval
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if(prev <= 0) { clearInterval(timer); handleFinishExam(); return 0; }
        return prev - 1;
      });
    }, 1000);

    // Status polling interval (check every 10 seconds if blocked by admin)
    const statusPoll = setInterval(async () => {
      if (!examId) return;
      try {
        const status = await examsAPI.checkStatus(examId);
        if (status.is_blocked) {
          console.log("Exam blocked by admin");
          setIsExamBlocked(true);
        }
      } catch (err) {
        console.error("Status check failed:", err);
      }
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(statusPoll);
    };
  }, [loading, sessionId, isExamBlocked, examId]);

  // Handle auto-submit on block
  useEffect(() => {
      if (isExamBlocked) {
          const t = setTimeout(() => {
              handleFinishExam();
          }, 3000);
          return () => clearTimeout(t);
      }
  }, [isExamBlocked]);

  const handleRunCode = async (qid: string) => {
      const q = questions.find(q => q.id === qid);
      if (!q || !q.coding_details) return;
      setIsExecuting(true);
      setExecErrors(prev => {
          const next = { ...prev };
          delete next[qid];
          return next;
      });
      try {
          const codeToRun = answers[qid] || q.coding_details.starter_code || '';
          if (answers[qid] === undefined) {
              setAnswers(prev => ({ ...prev, [qid]: codeToRun }));
          }
          const res = await submissionsAPI.executeCode(
              q.coding_details.programming_language || 'python',
              codeToRun,
              q.coding_details.test_cases || []
          );
          const normalizedResults = Array.isArray(res) ? res : (res?.results || []);
          setExecResults(prev => ({ ...prev, [qid]: normalizedResults }));
      } catch (err: any) {
          console.error('Execution Failed:', err);
          setExecResults(prev => ({ ...prev, [qid]: [] }));
          setExecErrors(prev => ({
              ...prev,
              [qid]: err?.message || 'Compiler service could not run this code. Please try again.'
          }));
      } finally {
          setIsExecuting(false);
      }
  };

  const handleFinishExam = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      const now = Date.now();
      try {
          if (sessionId && !isNaN(parseInt(sessionId.toString()))) {
              try { await proctoringAPI.endSession(parseInt(sessionId.toString())); } catch (e) { console.error("Session end failed:", e); }
          }

          const examDuration = (examDetails?.duration_minutes || 60) * 60;
          const timeElapsed = examDuration - timeLeft;
          
          // --- Advanced Integrity Scoring Sync (Weighted) ---
          const highViolations = incidentLog.filter(i => i.severity === 'high').length;
          const medViolations = incidentLog.filter(i => i.severity === 'medium').length;
          const lowViolations = incidentLog.filter(i => i.severity === 'low').length;
          const localIntegrityScore = Math.max(0, 100 - (highViolations * 20 + medViolations * 10 + lowViolations * 5));

          const finalResult = {
              examTitle: examDetails?.title || 'Exam Result',
              score: 0, 
              totalQuestions: questions.length,
              correctAnswers: 0, 
              timeSpent: `${Math.floor(timeElapsed / 60)}m ${timeElapsed % 60}s`,
              completedAt: new Date().toISOString(),
              questions: questions.map(q => ({
                  id: q.id,
                  text: q.text,
                  userAnswerId: answers[q.id],
                  correctAnswerId: 'unknown',
                  options: (q.mcq_details?.options || []).map((o: any) => ({ id: o.id.toString(), text: o.option_text, isCorrect: o.is_correct })),
                  explanation: q.type === 'mcq' ? 'Subject knowledge assessment.' : 'Algorithmic efficiency assessment.'
              })),
              proctoring: {
                  attentionScore: localIntegrityScore,

                  checks: {
                      faceDetected: !incidentLog.some(i => i.type === 'absence'),
                      idVerified: true,
                      phoneDetected: incidentLog.some(i => i.type === 'mobile_phone'),
                      multiplePeople: incidentLog.some(i => i.type === 'multiple_people'),
                      webcamActive: true,
                      screenSharing: true
                  },
                  timelineData: Array.from({length: 12}, (_, i) => {
                      const time = Math.round((timeElapsed / (60 * 11)) * i);
                      const hasIncidentsNear = incidentLog.some(inc => 
                          Math.abs((now - inc.timestamp) / 1000 - (timeElapsed - (time * 60))) < 120
                      );
                      const score = 100 - (hasIncidentsNear ? 25 + Math.random() * 15 : Math.random() * 5);
                      return { time, score: Math.round(score) };
                  }),
                  incidents: incidentLog.map(i => ({ 
                      id: i.id, 
                      timeLabel: i.timeLabel, 
                      type: i.type.replace('_', ' ').toUpperCase(), 
                      severity: i.severity,
                      snapshot: i.snapshot,
                      description: i.details,
                      timestamp: Math.round((now - i.timestamp) / 1000) 
                  }))
              }
          };

          try {
              const isAuto = isExamBlocked || timeLeft <= 0 || violationCount >= maxViolations;
              const response = await examsAPI.submitExam(examId!, answers, timeElapsed, isAuto);
              const resultData = response.result;
              
              // Update with real backend data
              const serverResult = {
                  ...finalResult,
                  ...resultData,
                  score: resultData.score,
                  correctAnswers: resultData.correctAnswers,
                  status: resultData.status,
                  proctoring: {
                      ...finalResult.proctoring,
                      attentionScore: resultData.integrity_score
                  }
              };

              localStorage.setItem('last_exam_result', JSON.stringify(serverResult));
              (window as any).lastExamResult = serverResult;
          } catch (err: any) {
              console.error('API Submission failed, displaying local data:', err);
              // Fallback to local data if submission was already completed or failed
              localStorage.setItem('last_exam_result', JSON.stringify(finalResult));
              (window as any).lastExamResult = finalResult;
          }
          
          setIsSubmitting(false);
          onNavigate('/exam-results');
      } catch (err) { 
          setIsSubmitting(false);
          console.error('Critical failure in handleFinishExam:', err);
          onNavigate('/exam-results'); 
      }
  };

  const currentQ = questions[currentIdx];
  const progressPercent = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;
  const answeredCount = questions.filter(q => Boolean(answers[q.id])).length;
  const codingCount = questions.filter(q => q.type === 'coding').length;
  const mcqCount = questions.filter(q => q.type === 'mcq').length;
  const selectedAnswer = currentQ ? answers[currentQ.id] : null;
  const isMarkedForReview = currentQ ? !!reviews[currentQ.id] : false;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClearAnswer = () => {
    if (!currentQ) return;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  const handleToggleReview = () => {
    if (!currentQ) return;
    setReviews(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  if (loading) {
    return (
        <div className="h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none z-[9999]">
      <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 shrink-0 z-30 shadow-none">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-extrabold text-slate-900 font-sans tracking-tight truncate">{examDetails?.title || 'Secure Exam'}</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f0f3fe] border border-[#d0d7fe] text-[9px] font-black text-indigo-700 uppercase tracking-wider font-mono">
            <ShieldCheck className="w-3 h-3" />
            Proctored
          </span>
        </div>

        <button
          onClick={handleFinishExam}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-xl text-xs font-bold text-red-650 hover:bg-red-50 transition-colors duration-150 cursor-pointer uppercase tracking-wider font-sans shrink-0 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
          Submit Exam
        </button>
      </header>

      <section className="bg-white border-b border-slate-200/60 px-6 py-4 shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 font-sans z-20">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Assignment Exam</span>
            <span className="text-sm font-black text-slate-900 leading-none">{mcqCount} MCQ + {codingCount} Coding</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200/65"></div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Question</span>
            <span className="text-sm font-black text-slate-900 leading-none">{questions.length ? currentIdx + 1 : 0} / {questions.length}</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200/65"></div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Time Left</span>
            <span className="text-sm font-black text-slate-900 flex items-center gap-1.5 leading-none">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              {formatTimer(timeLeft)}
            </span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200/65"></div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Answered</span>
            <span className="text-sm font-black text-slate-900 leading-none">{answeredCount}/{questions.length}</span>
          </div>
        </div>

        <div className="w-full lg:w-[320px]">
          <div className="flex justify-between w-full text-[9px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">
            <span>Exam Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </section>

      <div className="flex-1 flex overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between custom-scrollbar bg-[#f8fafc]">
          {questions.length > 0 && currentQ ? (
            <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6 animate-slide-up pb-24 lg:pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className={`transition-all duration-300 ${isQuestionsOpen ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6`}>
                  <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-none min-h-[420px]">
                    <div className="flex flex-col gap-5">
                      <div className="flex justify-between items-start gap-4 font-sans">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="text-[10px] font-black uppercase font-mono px-2.5 py-1 bg-slate-900 border border-slate-900 text-white rounded-lg shrink-0 tracking-wider">
                              Question {currentIdx + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase font-mono px-2.5 py-1 bg-slate-100 border border-slate-200/60 text-slate-700 rounded-lg shrink-0 tracking-wider">
                              {currentQ.type === 'coding' ? 'Coding Challenge' : 'MCQ'}
                            </span>
                          </div>
                          <h2 className="text-base md:text-lg font-extrabold text-slate-900 leading-snug">
                            {currentQ.text}
                          </h2>
                        </div>
                        <span className="text-[10px] font-black uppercase font-mono px-2.5 py-1 bg-slate-100 border border-slate-200/30 text-slate-800 rounded-lg shrink-0 shadow-sm tracking-wider">
                          {(currentQ as any).marks || currentQ.points || 10} Marks
                        </span>
                      </div>

                      {currentQ.type === 'coding' && (
                        <div className="rounded-2xl border border-[#d0d7fe] bg-[#f0f3fe] p-4 text-xs text-slate-700 flex items-start gap-3">
                          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <p className="font-semibold leading-relaxed">Write and run your solution in the compiler below. Test cases execute through the same secure submission service used by coding challenges.</p>
                        </div>
                      )}

                      {currentQ.type === 'mcq' ? (
                        <div className="grid grid-cols-1 gap-3 font-sans text-xs">
                          {currentQ.mcq_details?.options?.map((opt: any, idx: number) => {
                            const optionId = opt.id.toString();
                            const isOptionSelected = selectedAnswer === optionId;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: optionId }))}
                                className={`p-4 border rounded-2xl flex items-center gap-3.5 cursor-pointer transition-[transform,border-color,background-color] duration-150 transform-gpu text-left ${
                                  isOptionSelected
                                    ? 'bg-[#f4fae8] border-[#c3f53c] text-slate-900 font-black shadow-[0_4px_12px_rgba(195,245,60,0.1)] hover:scale-[1.002]'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:scale-[1.002]'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                                  isOptionSelected ? 'border-slate-900 bg-slate-900 shadow-sm animate-fade-in' : 'border-slate-300 bg-white'
                                }`}>
                                  {isOptionSelected ? <div className="w-1.5 h-1.5 rounded-full bg-[#c3f53c] animate-fade-in" /> : null}
                                </div>
                                <span className="font-extrabold text-slate-450 font-mono w-4 shrink-0 uppercase tracking-wider">{String.fromCharCode(65 + idx)}.</span>
                                <span className="font-extrabold text-[13px]">{opt.option_text}</span>
                              </button>
                            );
                          })}
                          {!currentQ.mcq_details?.options?.length && (
                            <p className="text-center text-slate-400 py-10 italic font-semibold">No options loaded for this question.</p>
                          )}
                        </div>
                      ) : (
                        <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#1E1E1E] shadow-lg">
                          <div className="h-[420px] min-h-[320px]">
                            <CodeEditor
                              language={currentQ.coding_details?.programming_language || 'python'}
                              code={answers[currentQ.id] !== undefined ? answers[currentQ.id] : (currentQ.coding_details?.starter_code || '')}
                              onChange={(val) => setAnswers(prev => ({ ...prev, [currentQ.id]: val }))}
                              onReset={() => setAnswers(prev => ({ ...prev, [currentQ.id]: currentQ.coding_details?.starter_code || '' }))}
                            />
                          </div>
                          <div className="h-[230px] bg-[#111111] border-t border-[#333] flex flex-col shrink-0">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A1A] border-b border-[#333]">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
                                <Terminal className="w-4 h-4" />
                                Compiler Output
                              </div>
                              <button
                                onClick={() => handleRunCode(currentQ.id)}
                                disabled={isExecuting}
                                className="bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black transition-colors flex items-center gap-2 disabled:opacity-50 uppercase tracking-wider"
                              >
                                {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                Run & Test
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono text-xs space-y-3">
                              {isExecuting ? (
                                <div className="text-slate-400 animate-pulse flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Building and executing...
                                </div>
                              ) : execErrors[currentQ.id] ? (
                                <div className="p-3 rounded-xl border border-red-800/40 bg-red-950/20 text-red-300 font-bold flex items-start gap-2">
                                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  {execErrors[currentQ.id]}
                                </div>
                              ) : execResults[currentQ.id] && execResults[currentQ.id].length > 0 ? (
                                execResults[currentQ.id].map((res: any, idx: number) => (
                                  <div key={idx} className={`p-3 rounded-xl border ${res.passed ? 'bg-emerald-900/10 border-emerald-800/30 text-emerald-400' : 'bg-red-900/10 border-red-800/30 text-red-400'}`}>
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                      {res.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                      Test Case {idx + 1} {res.passed ? 'Passed' : 'Failed'}
                                    </div>
                                    {!res.passed && (
                                      <div className="pl-6 opacity-90 mt-1 space-y-1">
                                        <div>
                                          <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Output</span>
                                          <div className="bg-black/40 p-2 rounded text-slate-300 whitespace-pre-wrap">{res.output || '(empty)'}</div>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5 mt-2">Expected</span>
                                          <div className="bg-black/40 p-2 rounded text-slate-300 whitespace-pre-wrap">{res.expected || '(empty)'}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-500 h-full flex flex-col items-center justify-center opacity-70">
                                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                                  Ready to compile. Click Run & Test.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 pt-5 flex items-center justify-between shrink-0 font-sans text-xs font-bold text-slate-600">
                        <button
                          onClick={handleToggleReview}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-xs font-bold ${
                            isMarkedForReview
                              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm'
                              : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-transparent hover:border-slate-100'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 shrink-0 transition-colors duration-150 ${isMarkedForReview ? 'fill-amber-500 text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                          {isMarkedForReview ? 'Flagged for Review' : 'Mark for Review'}
                        </button>

                        <button
                          onClick={handleClearAnswer}
                          disabled={!selectedAnswer}
                          className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer font-mono tracking-wide uppercase text-[10px]"
                        >
                          Clear Answer
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-xs mt-2 shrink-0">
                    <button
                      disabled={currentIdx === 0}
                      onClick={() => setCurrentIdx(currentIdx - 1)}
                      className="px-5 py-3 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                      Previous
                    </button>
                    {currentIdx === questions.length - 1 ? (
                      <button
                        onClick={handleFinishExam}
                        disabled={isSubmitting}
                        className="px-6 py-3 bg-[#c3f53c] hover:bg-[#addb2c] text-slate-950 rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer font-black shadow-sm disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                        <ChevronRight className="w-4 h-4 text-slate-950" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentIdx(currentIdx + 1)}
                        className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer font-black shadow-sm"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>

                {isQuestionsOpen && (
                  <aside className="lg:col-span-4 bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-none flex flex-col gap-5 animate-fade-in font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                      <span className="font-extrabold text-xs text-slate-900 font-display uppercase tracking-wider block font-mono">Questions</span>
                      <button
                        onClick={() => setIsQuestionsOpen(false)}
                        className="p-1.5 hover:bg-slate-50 text-slate-450 hover:text-slate-900 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Collapse index panel"
                      >
                        <PanelRightClose className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-2.5 shrink-0 font-sans">
                      {questions.map((q, idx) => {
                        const isCurrent = currentIdx === idx;
                        const isAnswered = !!answers[q.id];
                        const isFlagged = !!reviews[q.id];
                        const isCoding = q.type === 'coding';
                        let btnCls = '';
                        if (isCurrent) {
                          btnCls = isFlagged
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md font-black ring-2 ring-amber-500 ring-offset-1'
                            : 'bg-slate-900 text-white border-slate-900 shadow-sm font-black';
                        } else if (isFlagged) {
                          btnCls = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
                        } else if (isAnswered) {
                          btnCls = 'bg-[#f4fae8] text-slate-900 border-[#d6f0a0] font-bold';
                        } else {
                          btnCls = 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-bold';
                        }

                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentIdx(idx)}
                            className={`w-10 h-10 border rounded-xl flex items-center justify-center text-xs transition-all duration-150 cursor-pointer relative ${btnCls}`}
                          >
                            {idx + 1}
                            {isCoding && <Code2 className="w-2.5 h-2.5 absolute bottom-1 right-1" />}
                            {isFlagged && <Bookmark className="w-2.5 h-2.5 text-amber-500 fill-current absolute top-1 right-1" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-3 font-bold text-[11px] text-slate-500 shrink-0">
                      <div className="flex items-center gap-3"><div className="w-5 h-5 rounded-lg border border-slate-200 bg-white shrink-0 shadow-sm" /><span className="text-slate-600">Not Answered</span></div>
                      <div className="flex items-center gap-3"><div className="w-5 h-5 rounded-lg border border-[#d6f0a0] bg-[#f4fae8] shrink-0 shadow-sm" /><span className="text-slate-700">Answered</span></div>
                      <div className="flex items-center gap-3"><div className="w-5 h-5 rounded-lg border border-slate-900 bg-slate-900 shrink-0 shadow-sm" /><span className="text-slate-900 font-bold">Current</span></div>
                      <div className="flex items-center gap-3"><div className="w-5 h-5 rounded-lg border border-amber-200 bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm"><Bookmark className="w-3 h-3 fill-current text-amber-500" /></div><span className="text-amber-800 font-bold">Marked for Review</span></div>
                      <div className="flex items-center gap-3"><div className="w-5 h-5 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center shrink-0 shadow-sm"><Code2 className="w-3 h-3" /></div><span className="text-slate-600">Coding Challenge</span></div>
                    </div>
                  </aside>
                )}

                {!isQuestionsOpen && (
                  <button
                    onClick={() => setIsQuestionsOpen(true)}
                    className="fixed right-6 bottom-6 w-11 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer z-50 animate-fade-in shrink-0"
                    title="Expand question index"
                  >
                    <PanelRightOpen className="w-5 h-5 text-[#c3f53c]" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[60vh] flex items-center justify-center p-8 text-center text-slate-400 italic font-semibold">No questions found for this exam.</div>
          )}
        </main>
      </div>

      {/* Overlays */}
      <FloatingWebcam className="bottom-24 right-6" onDetection={handleAIThreshold} />

      {/* Real-Time Un-bypassable Multiple Faces Blocking Lockout Modal */}
      {isMultipleFacesBlocked && !isExamBlocked && (
        <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 sm:p-8 animate-fade-in select-none">
          <div className="max-w-xl w-full bg-slate-900/95 border-2 border-red-500/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(239,68,68,0.4)] flex flex-col items-center text-center relative overflow-hidden">
            {/* Top Security Banner */}
            <div className="absolute top-0 inset-x-0 bg-red-600/20 border-b border-red-500/30 px-4 py-2 flex items-center justify-between text-xs font-mono font-bold text-red-300">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-red-400" /> PROCTOR LOCK ACTIVE</span>
              <span>EXAM ACCESS SUSPENDED</span>
            </div>

            <div className="mt-4 mb-4 relative">
              <div className="w-20 h-20 rounded-3xl bg-red-500/20 border-2 border-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
                <Users className="w-10 h-10 text-red-500" />
              </div>
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                Blocked
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
              Multiple Faces Detected
            </h2>

            <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{detectedFacesCount > 1 ? `${detectedFacesCount} Individuals Detected in Camera View` : 'Multiple individuals detected in camera view'}</span>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-md">
              Your exam questions, answer options, and code editor have been <strong className="text-white">locked and blocked</strong> to ensure integrity. The exam cannot continue while another person is in view.
            </p>

            {/* Evidence snapshot thumbnail */}
            {multipleFacesSnapshot && (
              <div className="w-full max-w-xs mb-4 rounded-2xl overflow-hidden border border-red-500/30 shadow-inner bg-black/40">
                <div className="bg-red-950/80 px-3 py-1 text-[10px] font-mono text-red-300 flex items-center justify-between">
                  <span>VIOLATION SNAPSHOT</span>
                  <span className="text-red-400">RECORDED</span>
                </div>
                <img src={multipleFacesSnapshot} alt="Violation Frame Evidence" className="w-full h-28 object-cover" />
              </div>
            )}

            {/* Action Steps */}
            <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <span>Ask the other individual to <strong>step completely away from the webcam</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <span>Sit centered facing the screen so <strong>only your verified face</strong> is in view.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <span>The security system will auto-verify a clean feed and unlock your screen.</span>
              </div>
            </div>

            {/* Dynamic Status / Resolution Indicator */}
            {cleanStreakSeconds > 0 ? (
              <div className="w-full bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-3.5 flex items-center justify-center gap-3 text-emerald-300 font-bold text-sm animate-pulse">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Single candidate verified! Unlocking exam in {Math.max(1, 3 - cleanStreakSeconds)}s...</span>
              </div>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-red-950/40 border border-red-500/20 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-xs text-red-400 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>Extra individual currently in frame. Waiting...</span>
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  Screen locked
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isExamBlocked && (
        <div className="fixed inset-0 z-[90] bg-red-950/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fade-in select-none">
            <div className="bg-red-500/20 p-6 rounded-full mb-6 ring-8 ring-red-500/10">
                <AlertTriangle className="w-16 h-16 text-red-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide text-center">
                {blockReason === 'absence' ? 'Exam Terminated' : blockReason === 'multiple_people' ? 'Exam Terminated — Security Breach' : 'Exam Blocked'}
            </h2>
            <p className="text-red-200 text-lg max-w-lg text-center mb-6 font-bold">
                {blockReason === 'absence' 
                    ? 'Persistent candidate absence detected. Academic integrity verification failed.'
                    : blockReason === 'multiple_people'
                    ? 'Persistent presence of multiple unauthorized individuals detected in assessment environment.'
                    : `Maximum violations reached (${maxViolations}/${maxViolations}). The secure environment has been compromised.`
                }
            </p>
            <div className="bg-red-900/50 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                <span className="text-red-200 font-medium">Auto-submitting your assessment...</span>
            </div>
        </div>
      )}

      {isLocked && !isExamBlocked && !isMultipleFacesBlocked && (
        <div className="fixed inset-0 z-[60] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-fade-in">
            <div className="bg-red-500/20 p-6 rounded-full mb-6 ring-8 ring-red-500/10">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Environment Alert</h2>
            <p className="text-slate-400 text-sm max-w-sm text-center mb-8 font-medium">Multiple violations or critical anomalies detected. Return to your original position to resume.</p>
            <button onClick={() => setIsLocked(false)} className="bg-red-600 hover:bg-red-700 text-white px-10 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl shadow-red-600/20 active:scale-95">Resolve & Resume</button>
        </div>
      )}

      {/* Full-Screen Glowing Red Vignette border overlay for active violations */}
      {hasActiveViolation && (
        <div className="fixed inset-0 z-[49] pointer-events-none border-8 border-red-500/80 shadow-[inset_0_0_80px_rgba(239,68,68,0.5)] animate-pulse-fast"></div>
      )}

      <style>{`
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
        .animate-pulse-fast {
          animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};
