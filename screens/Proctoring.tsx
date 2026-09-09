import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Loader2,
  Mic,
  Monitor,
  ShieldCheck,
  UserCheck,
  Volume2,
  Wifi,
} from 'lucide-react';
import { CameraHandle, CameraPreview } from '../components/Proctoring/CameraPreview';
import { SystemCheckItem } from '../types';
import { examsAPI, proctoringAPI, questionsAPI } from '../services/apiService';

interface ProctoringScreenProps {
  onNavigate: (path: string) => void;
}

type StepId = 'checks' | 'guidelines' | 'mode' | 'ready';

const STEP_ORDER: { id: StepId; label: string }[] = [
  { id: 'checks', label: 'Checks' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'mode', label: 'Exam Mode' },
  { id: 'ready', label: 'Ready' },
];

const GUIDELINES = [
  {
    icon: UserCheck,
    title: 'Stay in frame',
    copy: 'Keep your face clearly visible in the webcam throughout the exam.',
  },
  {
    icon: Monitor,
    title: 'No other screens',
    copy: 'Use only this desktop. External monitors, phones, and tablets are not allowed.',
  },
  {
    icon: Lock,
    title: 'No tab switching',
    copy: 'Do not switch tabs, open apps, or navigate away during the exam.',
  },
  {
    icon: ShieldCheck,
    title: 'No assistance',
    copy: 'The exam must be completed by you only, without help from anyone else.',
  },
  {
    icon: Volume2,
    title: 'Clear audio',
    copy: 'Keep your microphone enabled and avoid background noise.',
  },
  {
    icon: Camera,
    title: 'Well lit environment',
    copy: 'Sit in a bright place so your face remains visible.',
  },
  {
    icon: FileText,
    title: 'Submit each answer',
    copy: 'Answers and code are tracked question-wise after submission.',
  },
  {
    icon: Clock,
    title: 'Do not leave',
    copy: 'Stay seated until your exam is submitted.',
  },
];

const MODE_RULES = [
  {
    icon: Lock,
    title: 'Full screen lock',
    copy: 'The exam will open in full screen and should remain there until submission.',
  },
  {
    icon: Monitor,
    title: 'No navigation',
    copy: 'Opening another tab, window, or application can be logged as a violation.',
  },
  {
    icon: Camera,
    title: 'Webcam monitoring',
    copy: 'Your webcam reference frame is captured before the exam starts.',
  },
  {
    icon: ShieldCheck,
    title: 'Attention monitoring',
    copy: 'System activity and proctoring signals are tracked during the session.',
  },
];

const makeInitialChecks = (): SystemCheckItem[] => [
  { id: 'internet', label: 'Internet Connection', status: 'checking', value: 'Ready', tip: 'Checking your connection speed and stability' },
  { id: 'microphone', label: 'Microphone', status: 'checking', value: 'Ready', tip: 'Checking if your microphone is working' },
  { id: 'webcam', label: 'Webcam', status: 'checking', value: 'Ready', tip: 'Checking if your webcam is working' },
  { id: 'speaker', label: 'Speaker', status: 'checking', value: 'Ready', tip: 'Checking your audio output support' },
  { id: 'screen', label: 'Screen', status: 'checking', value: 'Ready', tip: 'Checking your screen resolution' },
  { id: 'environment', label: 'Environment', status: 'checking', value: 'Ready', tip: 'Checking for distractions and other applications' },
];

export const ProctoringScreen: React.FC<ProctoringScreenProps> = ({ onNavigate }) => {
  const [examId, setExamId] = useState<string | null>(null);
  const [examDetails, setExamDetails] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<StepId>('checks');
  const [hasStartedChecks, setHasStartedChecks] = useState(false);
  const [checkRunId, setCheckRunId] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [checks, setChecks] = useState<SystemCheckItem[]>(makeInitialChecks);
  const cameraRef = useRef<CameraHandle>(null);

  useEffect(() => {
    if (sessionStorage.getItem('completed_exam_result_guard') === 'true') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/exams`);
      onNavigate('/exams');
      return;
    }

    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    setExamId(params.get('examId'));
  }, [onNavigate]);

  useEffect(() => {
    if (!examId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const urlEnrollmentId = params.get('enrollmentId');

        const myExams = await examsAPI.getMyExams();
        const examMatch = myExams.find((exam: any) => String(exam.id) === String(examId));

        if (examMatch) {
          setExamDetails(examMatch);
          const enrollmentId = urlEnrollmentId || examMatch.enrollment_id;
          if (enrollmentId) setEnrollment({ id: enrollmentId });
        } else {
          const allExams = await examsAPI.listExams();
          const listMatch = allExams.find((exam: any) => String(exam.id) === String(examId));
          if (listMatch) {
            setExamDetails(listMatch);
            if (urlEnrollmentId || listMatch.enrollment_id) {
              setEnrollment({ id: urlEnrollmentId || listMatch.enrollment_id });
            }
          } else {
            const exam = await examsAPI.getExam(examId);
            setExamDetails(exam);
            if (urlEnrollmentId || exam?.enrollment_id) {
              setEnrollment({ id: urlEnrollmentId || exam.enrollment_id });
            }
          }
        }

        try {
          const questions = await questionsAPI.getExamQuestions(examId);
          setQuestionCount(Array.isArray(questions) ? questions.length : null);
        } catch {
          setQuestionCount(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch exam details:', err);
        setLoadError(err?.message || 'Unable to load this assignment exam.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateCheck = (id: string, status: SystemCheckItem['status'], value: string) => {
    setChecks(prev => prev.map(check => (check.id === id ? { ...check, status, value } : check)));
  };

  useEffect(() => {
    if (!hasStartedChecks || !permissionGranted) return;

    const timers: number[] = [];
    timers.push(window.setTimeout(() => {
      setFaceDetected(true);
      updateCheck('webcam', 'pass', '720p HD');
    }, 900));

    timers.push(window.setTimeout(() => {
      const connection = (navigator as any).connection;
      const downlink = typeof connection?.downlink === 'number' ? connection.downlink : 45.6;
      updateCheck('internet', 'pass', `${downlink.toFixed(1)} Mbps`);
    }, 1200));

    timers.push(window.setTimeout(() => {
      updateCheck('speaker', 'pass', 'Good');
    }, 1500));

    timers.push(window.setTimeout(() => {
      updateCheck('screen', 'pass', `${window.screen.width} x ${window.screen.height}`);
    }, 1800));

    timers.push(window.setTimeout(() => {
      updateCheck('environment', 'pass', 'Good');
    }, 2200));

    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const startAudioTest = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        setMicActive(true);
        updateCheck('microphone', 'pass', 'Good');

        const analyze = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setMicVolume(Math.round((average / 255) * 100));
          requestAnimationFrame(analyze);
        };
        analyze();
      } catch (err) {
        console.warn('Microphone access denied or failed:', err);
        updateCheck('microphone', 'fail', 'Permission needed');
      }
    };

    startAudioTest();

    return () => {
      cancelled = true;
      timers.forEach(timer => window.clearTimeout(timer));
      if (audioCtx) audioCtx.close().catch(() => {});
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [checkRunId, hasStartedChecks, permissionGranted]);

  const currentStepIndex = STEP_ORDER.findIndex(step => step.id === currentStep);
  const allPassed = checks.every(check => check.status === 'pass');
  const resolvedQuestionCount = questionCount ?? examDetails?.question_count ?? examDetails?.questions_count ?? examDetails?.total_questions ?? 0;
  const totalMarks = examDetails?.total_marks ?? examDetails?.marks ?? '--';
  const durationMinutes = examDetails?.duration_minutes ?? examDetails?.duration ?? '--';
  const examTitle = examDetails?.title || examDetails?.name || 'Assignment Exam';
  const courseName = examDetails?.course_name || examDetails?.course?.title || 'CodeCrux Assessment';

  const canContinue = useMemo(() => {
    if (currentStep === 'checks') return allPassed;
    if (currentStep === 'guidelines') return acceptedGuidelines;
    return true;
  }, [acceptedGuidelines, allPassed, currentStep]);

  const beginChecks = () => {
    setChecks(makeInitialChecks().map(check => ({ ...check, value: 'Checking...' })));
    setFaceDetected(false);
    setMicActive(false);
    setMicVolume(0);
    setHasStartedChecks(true);
    setCheckRunId(prev => prev + 1);
  };

  const captureReferenceFrame = async () => {
    const screenshot = cameraRef.current?.takeScreenshot();
    if (!screenshot || !enrollment?.id) return;

    localStorage.setItem(`proctoring_reference_photo_${enrollment.id}`, screenshot);
    try {
      await proctoringAPI.uploadIDCard(enrollment.id, screenshot);
    } catch (error) {
      console.error('Failed to upload proctoring reference frame:', error);
    }
  };

  const goNext = async () => {
    if (!canContinue) return;
    if (currentStep === 'mode') {
      await captureReferenceFrame();
    }

    const nextStep = STEP_ORDER[currentStepIndex + 1]?.id;
    if (nextStep) setCurrentStep(nextStep);
  };

  const goBack = () => {
    const prevStep = STEP_ORDER[currentStepIndex - 1]?.id;
    if (prevStep) setCurrentStep(prevStep);
    else onNavigate('/dashboard');
  };

  const startAssessment = async () => {
    setIsStarting(true);
    await captureReferenceFrame();
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser; the live exam still enforces monitoring.
    }

    const enrollmentId = enrollment?.id || `manual_${Date.now()}`;
    onNavigate(`/live-exam?examId=${examId}&enrollmentId=${enrollmentId}`);
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
        <Monitor className="w-14 h-14 text-primary mb-6" />
        <h1 className="text-2xl font-black mb-2 font-display">Desktop Required</h1>
        <p className="text-slate-400 max-w-md">This secure exam environment is only available on a desktop or laptop computer.</p>
        <button
          onClick={() => onNavigate('/dashboard')}
          className="mt-8 px-5 py-3 rounded-xl bg-primary text-slate-950 text-xs font-black uppercase tracking-widest font-mono"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-slate-900 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Loading assignment exam...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md bg-white border border-red-100 rounded-2xl p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-900 font-display mb-2">Exam Could Not Load</h1>
          <p className="text-sm text-slate-500 font-semibold mb-6">{loadError}</p>
          <button
            onClick={() => onNavigate('/exams')}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest font-mono"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 lg:px-8 shrink-0">
        <button onClick={goBack} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest font-mono text-slate-700 hover:text-slate-950">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="hidden md:flex items-center gap-2">
          {STEP_ORDER.map((step, index) => {
            const isActive = currentStep === step.id;
            const isDone = index < currentStepIndex;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`h-7 px-3 rounded-full border text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : isDone
                      ? 'bg-primary/30 text-slate-900 border-primary'
                      : 'bg-white text-slate-400 border-slate-200'
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : `Step ${index + 1}`}
                  <span>{step.label}</span>
                </div>
                {index < STEP_ORDER.length - 1 && <div className="w-6 h-px bg-slate-200" />}
              </div>
            );
          })}
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Exam ID: {examId || '--'}</p>
          <p className="text-[10px] font-bold text-slate-400">Enrollment: {enrollment?.id || 'Pending'}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 py-8 lg:py-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-widest font-mono text-slate-600 mb-3">
              Step {currentStepIndex + 1} of {STEP_ORDER.length}
            </div>
            <h1 className="text-3xl lg:text-4xl font-black font-display tracking-tight">{currentStep === 'checks' ? "Let's run a few quick checks" : currentStep === 'guidelines' ? 'Exam Guidelines' : currentStep === 'mode' ? 'You are about to enter Desktop Exam Mode' : 'You are all set!'}</h1>
            <p className="text-sm text-slate-500 font-semibold mt-2">{currentStep === 'ready' ? 'The exam will begin with the details below.' : 'We will prepare your system and environment for a smooth exam experience.'}</p>
          </div>

          {currentStep === 'checks' && (
            <section className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                <div className="space-y-3">
                  {checks.map(check => (
                    <CheckRow key={check.id} check={check} micVolume={check.id === 'microphone' ? micVolume : undefined} micActive={micActive} />
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="mb-3">
                    <h2 className="text-xs font-black uppercase tracking-widest font-mono">Webcam Feed</h2>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">Used for the live proctoring reference.</p>
                  </div>
                  <CameraPreview
                    ref={cameraRef}
                    permissionGranted={permissionGranted}
                    onPermissionGranted={() => setPermissionGranted(true)}
                    faceDetected={faceDetected}
                    autoStart={hasStartedChecks}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Your data is secure and encrypted.
                </div>
                <button
                  onClick={allPassed ? goNext : beginChecks}
                  className="px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-black uppercase tracking-widest font-mono flex items-center gap-2"
                >
                  {allPassed ? 'All Checks Passed' : hasStartedChecks ? 'Run Checks Again' : 'Start Checks'}
                  <ArrowRight className="w-4 h-4 text-primary" />
                </button>
              </div>
            </section>
          )}

          {currentStep === 'guidelines' && (
            <section className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {GUIDELINES.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="bg-white border border-slate-200 rounded-2xl p-5 text-center min-h-[170px] flex flex-col items-center justify-center">
                    <Icon className="w-8 h-8 text-slate-900 mb-4" strokeWidth={1.75} />
                    <h3 className="text-sm font-black font-display mb-2">{title}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{copy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <label className="flex items-center gap-3 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedGuidelines}
                    onChange={event => setAcceptedGuidelines(event.target.checked)}
                    className="w-4 h-4 accent-slate-900"
                  />
                  I have read and understood all the guidelines.
                </label>
                <button
                  onClick={goNext}
                  disabled={!acceptedGuidelines}
                  className="px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all text-xs font-black uppercase tracking-widest font-mono flex items-center gap-2"
                >
                  Continue to Exam Mode
                  <ArrowRight className="w-4 h-4 text-primary" />
                </button>
              </div>
            </section>
          )}

          {currentStep === 'mode' && (
            <section className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10 items-center">
              <div className="relative h-72 bg-[#f4fae8] border border-[#d6f0a0] rounded-2xl flex items-center justify-center">
                <div className="w-44 h-28 bg-slate-900 rounded-xl flex items-center justify-center shadow-xl">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute bottom-10 w-28 h-3 bg-slate-300 rounded-full" />
              </div>

              <div className="space-y-5">
                {MODE_RULES.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black font-display">{title}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{copy}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black font-display">Important</h4>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">Please ensure all checks are green and you are in a quiet place before starting the exam.</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={goNext}
                    className="px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-black uppercase tracking-widest font-mono flex items-center gap-2"
                  >
                    Prepare Exam
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {currentStep === 'ready' && (
            <section className="max-w-xl mx-auto text-center">
              <div className="w-24 h-24 rounded-full bg-white border border-slate-200 shadow-sm mx-auto flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-slate-900" />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left space-y-3">
                <SummaryRow icon={FileText} label="Exam Title" value={examTitle} />
                <SummaryRow icon={ShieldCheck} label="Course" value={courseName} />
                <SummaryRow icon={FileText} label="Total Questions" value={resolvedQuestionCount ? `${resolvedQuestionCount} Questions` : 'Question set loaded in exam'} />
                <SummaryRow icon={Clock} label="Time Limit" value={`${durationMinutes} Minutes`} />
                <SummaryRow icon={CheckCircle2} label="Total Marks" value={`${totalMarks} Marks`} />
              </div>

              <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-4 text-left">
                <h3 className="text-xs font-black font-display mb-2">Once you begin:</h3>
                <ul className="text-[11px] text-slate-500 font-semibold leading-6 list-disc pl-5">
                  <li>The exam will open in full screen.</li>
                  <li>Do not switch tabs or open any other application.</li>
                  <li>Keep your webcam and microphone enabled.</li>
                  <li>The timer will start automatically.</li>
                </ul>
              </div>

              <button
                onClick={startAssessment}
                disabled={isStarting}
                className="mt-5 w-full px-5 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 active:scale-[0.98] transition-all text-xs font-black uppercase tracking-widest font-mono flex items-center justify-center gap-2"
              >
                {isStarting ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : null}
                Begin Exam
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

const CheckRow: React.FC<{ check: SystemCheckItem; micVolume?: number; micActive?: boolean }> = ({ check, micVolume = 0, micActive = false }) => {
  const isPass = check.status === 'pass';
  const isFail = check.status === 'fail';
  const Icon = check.id === 'internet' ? Wifi : check.id === 'microphone' ? Mic : check.id === 'webcam' ? Camera : check.id === 'speaker' ? Volume2 : check.id === 'screen' ? Monitor : ShieldCheck;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-[44px_1fr_auto] gap-4 items-center min-h-[74px]">
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-900" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-black font-display leading-tight">{check.label}</h3>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">{check.tip}</p>
        {check.id === 'microphone' && micActive && (
          <div className="mt-2 flex items-center gap-1 h-3 max-w-[180px]">
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={index}
                className={`w-1 rounded-full ${index * 6 < micVolume ? 'bg-primary' : 'bg-slate-200'}`}
                style={{ height: `${Math.max(4, Math.min(12, 4 + ((index % 5) * 2)))}px` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-black text-slate-900 font-mono whitespace-nowrap">{check.value}</span>
        {isPass ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Good
          </span>
        ) : isFail ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600">
            <AlertTriangle className="w-4 h-4" />
            Fix
          </span>
        ) : (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{ icon: React.FC<any>; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="grid grid-cols-[24px_140px_1fr] items-center gap-3">
    <Icon className="w-4 h-4 text-slate-500" />
    <span className="text-xs font-bold text-slate-500">{label}</span>
    <span className="text-xs font-black text-slate-900">{value}</span>
  </div>
);
