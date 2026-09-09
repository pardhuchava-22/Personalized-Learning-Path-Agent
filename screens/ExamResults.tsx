import React, { useEffect, useState } from 'react';
import { ProctoringReport } from '../components/Exam/ProctoringReport';
import { PerformanceResultsView } from '../components/Quiz/PerformanceResultsView';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface ExamResultsProps {
  onNavigate: (path: string) => void;
}

const parseTimeSpentSeconds = (value: string | undefined) => {
  if (!value) return 0;
  const hours = value.match(/(\d+)\s*h/i)?.[1];
  const minutes = value.match(/(\d+)\s*m/i)?.[1];
  const seconds = value.match(/(\d+)\s*s/i)?.[1];
  return (Number(hours || 0) * 3600) + (Number(minutes || 0) * 60) + Number(seconds || 0);
};

const toTitleCase = (value: string | undefined) => {
  if (!value) return 'Integrity Event';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
};

const absoluteMediaUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (value.startsWith('http') || value.startsWith('data:')) return value;
  return `http://localhost:8000${value.startsWith('/') ? value : `/${value}`}`;
};

const normalizeProctoring = (result: any) => {
  const base = result.proctoring || {};
  const rawViolations = result.violations || base.violations || [];
  const durationSeconds = parseTimeSpentSeconds(result.timeSpent) || 60;
  const completedAt = result.completedAt ? new Date(result.completedAt).getTime() : Date.now();

  const incidents = (base.incidents?.length ? base.incidents : rawViolations.map((v: any, index: number) => {
    const detectedAt = v.detected_at || v.detectedAt || v.timestamp;
    const detectedMs = detectedAt ? new Date(detectedAt).getTime() : completedAt;
    const secondsFromEnd = Math.max(0, Math.round((completedAt - detectedMs) / 1000));
    const timestamp = Math.max(0, Math.min(durationSeconds, durationSeconds - secondsFromEnd));
    return {
      id: String(v.id || `incident-${index}`),
      timeLabel: detectedAt
        ? new Date(detectedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : `${timestamp}s`,
      timestamp,
      type: toTitleCase(v.title || v.violation_title || v.violation_type_display || v.type || v.violation_type),
      severity: v.severity || 'medium',
      snapshot: absoluteMediaUrl(v.screenshot || v.evidence_screenshot),
      evidencePath: v.path || v.evidence_path,
      description: v.description || `${toTitleCase(v.type || v.violation_type)} detected during the assessment.`
    };
  }));

  const timelineData = base.timelineData?.length ? base.timelineData : (() => {
    const points = [0, 0.25, 0.5, 0.75, 1].map(part => {
      const time = Math.round(durationSeconds * part);
      const impact = incidents.reduce((total: number, incident: any) => {
        const distance = Math.abs((incident.timestamp || 0) - time);
        if (distance > Math.max(20, durationSeconds * 0.18)) return total;
        const severityDrop = incident.severity === 'high' ? 24 : incident.severity === 'low' ? 8 : 14;
        return total + Math.max(4, severityDrop - Math.round(distance / 5));
      }, 0);
      return { time, score: Math.max(0, Math.round((result.integrity_score ?? base.attentionScore ?? 100) - impact)) };
    });
    if (incidents.length) {
      incidents.forEach((incident: any) => points.push({
        time: incident.timestamp || 0,
        score: Math.max(0, (result.integrity_score ?? base.attentionScore ?? 100) - (incident.severity === 'high' ? 24 : 14))
      }));
    }
    return points.sort((a, b) => a.time - b.time);
  })();

  return {
    attentionScore: result.integrity_score ?? base.attentionScore ?? 100,
    checks: {
      faceDetected: !incidents.some((i: any) => /absence|face not|no face/i.test(i.type)),
      idVerified: true,
      phoneDetected: incidents.some((i: any) => /phone|mobile|gadget/i.test(i.type)),
      multiplePeople: incidents.some((i: any) => /multiple/i.test(i.type)),
      webcamActive: !incidents.some((i: any) => /camera off/i.test(i.type)),
      screenSharing: !incidents.some((i: any) => /tab|fullscreen|window/i.test(i.type)),
      ...(base.checks || {})
    },
    timelineData,
    incidents
  };
};

export const ExamResultsScreen: React.FC<ExamResultsProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    sessionStorage.setItem('completed_exam_result_guard', 'true');
  }, []);

  useEffect(() => {
    // Try to get result from global state or localStorage
    const savedResult = (window as any).lastExamResult || JSON.parse(localStorage.getItem('last_exam_result') || 'null');
    
    if (savedResult) {
      setResult(savedResult);
    } else {
      // Fallback to minimal mock if nothing found (should not happen in real flow)
      setResult({
        examTitle: 'Assessment Completed',
        completedAt: new Date().toISOString(),
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        timeSpent: 'N/A',
        difficulty: 'Stable',
        status: 'completed',
        questions: [],
        proctoring: {
          attentionScore: 100,
          checks: { faceDetected: true, idVerified: true },
          timelineData: [],
          incidents: []
        }
      });
    }
  }, []);

  if (!result) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">{t('exam.generating_report')}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800 animate-slide-up overflow-y-auto">
      <PerformanceResultsView
        type="exam"
        title={result.examTitle || 'Final Exam'}
        courseTitle="Exam Proctoring System"
        moduleTitle={result.examTitle || 'Final Proctored Milestone'}
        score={result.score || 0}
        totalQuestions={result.totalQuestions || 0}
        correctAnswers={result.correctAnswers || 0}
        timeSpent={result.timeSpent || 'N/A'}
        grade={result.score >= 90 ? 'A' : result.score >= 80 ? 'B' : result.score >= 70 ? 'C' : result.score >= 60 ? 'D' : 'F'}
        completedAt={new Date(result.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ", " + new Date(result.completedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        attemptsCount={1}
        questions={result.questions ? result.questions.map((q: any) => {
          const normalizedOptions = q.options || [];
          const correctId = q.correctAnswerId || normalizedOptions.find((o: any) => o.isCorrect)?.id;
          const userAnswerText = normalizedOptions.find((o: any) => String(o.id) === String(q.userAnswerId))?.text || (q.userAnswerId && q.type !== 'Multiple Choice' ? q.userAnswerId : 'Not answered');
          const correctAnswerText = normalizedOptions.find((o: any) => String(o.id) === String(correctId))?.text || (correctId && q.type !== 'Multiple Choice' ? correctId : 'Not available');
          const isCorrect = String(q.userAnswerId) === String(correctId);
          return {
            id: q.id,
            text: q.text,
            type: q.type || 'Multiple Choice',
            userAnswerText,
            correctAnswerText,
            isCorrect,
            explanation: q.explanation || 'Exam question'
          };
        }) : []}
        proctoringReport={<ProctoringReport session={normalizeProctoring(result)} />}
        strongTopics={(result.questions || []).filter((q: any) => String(q.userAnswerId) === String(q.correctAnswerId || q.options?.find((o: any) => o.isCorrect)?.id)).map((q: any, i: number) => `Question ${i + 1}: ${(q.text || 'Concept').slice(0, 42)}`)}
        weakTopics={(result.questions || []).filter((q: any) => String(q.userAnswerId) !== String(q.correctAnswerId || q.options?.find((o: any) => o.isCorrect)?.id)).map((q: any, i: number) => `Review: ${(q.text || 'Unanswered concept').slice(0, 48)}`)}
        onRetry={() => onNavigate('/exams')}
        onContinue={() => onNavigate('/dashboard')}
        onDownloadCertificate={() => {
          alert('Downloading digital Certificate of Integrity...');
        }}
      />
    </div>
  );
};
