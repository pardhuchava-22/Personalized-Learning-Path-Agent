
import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User, ExamQuestion } from '../types';
import { useAuth } from '../services/authContext';
import { toAppRole } from '../services/roles';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { 
  ChevronRight, ChevronLeft, Check, Plus, Trash2, GripVertical, 
  Youtube, Calendar, Clock, Eye, Sparkles, Save, FileText,
  Code, Type, List, Wand2, Loader2, ArrowRight, ChevronDown, X, AlertTriangle
} from 'lucide-react';
import { examsAPI } from '../services/apiService';

interface FacultyExamCreateProps {
  onNavigate: (path: string) => void;
}

// --- Internal Types ---
type Step = 'details' | 'source' | 'editor' | 'settings';

export const FacultyExamCreateScreen: React.FC<FacultyExamCreateProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const facultyUser: User = { 
    id: String(authUser?.id || ''), 
    name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty', 
    email: authUser?.email || '', 
    role: toAppRole(authUser?.role) 
  };
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [generationStage, setGenerationStage] = useState('');

  // --- Form State ---
  const [details, setDetails] = useState({
    title: '',
    courseId: '',
    courseName: '',
    duration: 60,
    startDate: '',
    startTime: '10:00',
    totalMarks: 100,
    passingMarks: 40
  });

  const [aiConfig, setAiConfig] = useState({
    sourceType: 'manual' as 'manual' | 'youtube',
    youtubeUrl: '',
    difficulty: 'Intermediate',
    questionCount: 5,
    includeCoding: true
  });

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  // --- Question Handlers ---

  const addManualQuestion = (type: 'mcq' | 'coding') => {
    const newQuestion: ExamQuestion = {
        id: `q_${Date.now()}`,
        type,
        text: '',
        points: 5,
        ...(type === 'mcq' ? { 
            options: [
                { id: `opt_${Date.now()}_1`, text: 'Option 1', isCorrect: true },
                { id: `opt_${Date.now()}_2`, text: 'Option 2', isCorrect: false }
            ] 
        } : {
            language: 'python',
            starterCode: '# write your code here',
            testCases: [
                { id: `tc_${Date.now()}_1`, input: '', output: '', isHidden: false }
            ]
        })
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<ExamQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // --- MCQ Option Handlers ---

  const addOption = (questionId: string) => {
    setQuestions(prev => prev.map(q => {
        if (q.id === questionId && q.options) {
            return {
                ...q,
                options: [...q.options, { id: `opt_${Date.now()}`, text: '', isCorrect: false }]
            };
        }
        return q;
    }));
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<{text: string; isCorrect: boolean}>) => {
    setQuestions(prev => prev.map(q => {
        if (q.id === questionId && q.options) {
            return {
                ...q,
                options: q.options.map(opt => {
                    if (opt.id === optionId) {
                        return { ...opt, ...updates };
                    }
                    // Only one correct option for now
                    if (updates.isCorrect === true) {
                        return { ...opt, isCorrect: false };
                    }
                    return opt;
                })
            };
        }
        return q;
    }));
  };

  const deleteOption = (questionId: string, optionId: string) => {
    setQuestions(prev => prev.map(q => {
        if (q.id === questionId && q.options) {
            return {
                ...q,
                options: q.options.filter(opt => opt.id !== optionId)
            };
        }
        return q;
    }));
  };

  // --- Coding Test Case Handlers ---

  const addTestCase = (questionId: string) => {
    setQuestions(prev => prev.map(q => {
        if (q.id === questionId && q.testCases) {
            return {
                ...q,
                testCases: [...q.testCases, { id: `tc_${Date.now()}`, input: '', output: '', isHidden: false }]
            };
        }
        return q;
    }));
  };

  const updateTestCase = (questionId: string, testCaseId: string, updates: Partial<{input: string; output: string; isHidden: boolean}>) => {
    setQuestions(prev => prev.map(q => {
        if (q.id === questionId && q.testCases) {
            return {
                ...q,
                testCases: q.testCases.map(tc => tc.id === testCaseId ? { ...tc, ...updates } : tc)
            };
        }
        return q;
    }));
  };

  const deleteTestCase = (questionId: string, testCaseId: string) => {
    setQuestions(prev => prev.map(q => {
        if (q.id === questionId && q.testCases) {
            return {
                ...q,
                testCases: q.testCases.filter(tc => tc.id !== testCaseId)
            };
        }
        return q;
    }));
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePublishExam = async () => {
    if (!details.title || !details.startDate) {
        setErrorMsg('Please fill in exam title and date.');
        return;
    }
    if (questions.length === 0) {
        setErrorMsg('Please add at least one question.');
        return;
    }

    setIsPublishing(true);
    setErrorMsg('');

    try {
        const payload = {
            title: details.title,
            course_id: null, // Would normally come from dropdown
            course_name: details.courseName,
            start_time: `${details.startDate}T${details.startTime}:00Z`,
            duration_minutes: details.duration,
            total_marks: questions.reduce((sum, q) => sum + (q.points || 0), 0),
            passing_marks: details.passingMarks,
            questions: questions
        };

        await examsAPI.createFromScratch(payload);
        onNavigate('/faculty-exams');
    } catch (err: any) {
        setErrorMsg(err.message || 'Failed to publish exam');
    } finally {
        setIsPublishing(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(c => c + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  // Real AI Generation Logic
  const handleGenerateContent = async () => {
    if (!aiConfig.youtubeUrl) return;
    
    setIsProcessingAI(true);
    setErrorMsg('');
    setGenerationStage('Connecting to Gemini AI...');
    
    try {
        // Preparation stages for better UX
        setTimeout(() => setGenerationStage('Extracting video transcript...'), 1000);
        
        const response = await examsAPI.generateAIContent({
            youtube_url: aiConfig.youtubeUrl,
            difficulty: aiConfig.difficulty,
            count: aiConfig.questionCount,
            include_coding: aiConfig.includeCoding
        });

        if (response.success && response.questions) {
            setGenerationStage('Structuring questions and code challenges...');
            
            // Format questions to ensure IDs are unique and types are correct
            const processedQuestions: ExamQuestion[] = response.questions.map((q: any) => ({
                ...q,
                id: q.id || `gen_${Math.random().toString(36).substr(2, 9)}`
            }));
            
            setQuestions(processedQuestions);
            setIsProcessingAI(false);
            handleNext(); // Move to editor step automatically
        } else {
            throw new Error('No questions were generated. Please try a different video or check your API key.');
        }
    } catch (err: any) {
        console.error('AI Generation Error:', err);
        setErrorMsg(err.message || 'Failed to generate content. Ensure yt-dlp is installed on the server.');
        setIsProcessingAI(false);
    }
  };

  // --- Render Steps ---

  const renderStepper = () => (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-10 relative">
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
      <div 
        className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -z-10 transition-all duration-500 ease-out"
        style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
      ></div>

      {[1, 2, 3, 4].map((step) => {
        const labels = ['Details', 'Content Source', 'Editor', 'Settings'];
        return (
            <div key={step} className="flex flex-col items-center gap-2 bg-[#F8FAFC] px-2">
            <div 
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                ${step < currentStep ? 'bg-indigo-600 border-indigo-600 text-white' : 
                    step === currentStep ? 'bg-white border-indigo-600 text-indigo-600 shadow-[0_0_0_4px_rgba(79,70,229,0.2)] scale-110' : 
                    'bg-white border-slate-300 text-slate-400'}
                `}
            >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${step <= currentStep ? 'text-indigo-600' : 'text-slate-400'}`}>
                {labels[step-1]}
            </span>
            </div>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-exams">
      <div className="max-w-5xl mx-auto pb-24 animate-slide-up relative">
        
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 cursor-pointer hover:text-indigo-600 w-fit" onClick={() => onNavigate('/faculty-exams')}>
            <ChevronLeft className="w-3 h-3" /> Back to Exams
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 text-center mb-8">Smart Exam Creator</h1>
        
        {renderStepper()}

        <div className="min-h-[400px]">
            {/* STEP 1: DETAILS */}
            {currentStep === 1 && (
                <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 font-primary">Exam Details</h2>
                    <div className="space-y-6">
                        <Input 
                            label="Exam Title" 
                            placeholder="e.g. Advanced Algorithms Final"
                            value={details.title}
                            onChange={(e) => setDetails({...details, title: e.target.value})}
                        />
                        <div>
                            <label className="block text-xs font-medium text-slate-900 mb-1.5 uppercase tracking-wider">Course / Subject</label>
                            <Input 
                                placeholder="e.g. Computer Science 101"
                                value={details.courseName}
                                onChange={(e) => setDetails({...details, courseName: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-900 mb-1.5 uppercase tracking-wider">Start Date</label>
                                <input 
                                    type="date" 
                                    className="w-full h-12 bg-transparent border-b border-slate-200 focus:border-indigo-600 outline-none transition-all duration-300"
                                    value={details.startDate}
                                    onChange={(e) => setDetails({...details, startDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-900 mb-1.5 uppercase tracking-wider">Start Time</label>
                                <input 
                                    type="time" 
                                    className="w-full h-12 bg-transparent border-b border-slate-200 focus:border-indigo-600 outline-none transition-all duration-300"
                                    value={details.startTime}
                                    onChange={(e) => setDetails({...details, startTime: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Duration (Minutes)" 
                                type="number" 
                                value={details.duration} 
                                onChange={(e) => setDetails({...details, duration: parseInt(e.target.value) || 0})} 
                            />
                            <Input 
                                label="Total Marks" 
                                type="number" 
                                value={details.totalMarks} 
                                onChange={(e) => setDetails({...details, totalMarks: parseInt(e.target.value) || 0})} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: CONTENT SOURCE (AI) */}
            {currentStep === 2 && (
                <div className="max-w-4xl mx-auto animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">How would you like to create this exam?</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Manual Card */}
                        <div 
                            onClick={() => setAiConfig({...aiConfig, sourceType: 'manual'})}
                            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${aiConfig.sourceType === 'manual' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${aiConfig.sourceType === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <FileText className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Start from Scratch</h3>
                            <p className="text-sm text-slate-500 mt-2">Manually add questions one by one. Best for specific, custom assessments.</p>
                        </div>

                        {/* AI Card */}
                        <div 
                            onClick={() => setAiConfig({...aiConfig, sourceType: 'youtube'})}
                            className={`p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden ${aiConfig.sourceType === 'youtube' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                            {aiConfig.sourceType === 'youtube' && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">SELECTED</div>}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${aiConfig.sourceType === 'youtube' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500'}`}>
                                <Youtube className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                AI Video Generator <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                            </h3>
                            <p className="text-sm text-slate-500 mt-2">Paste a YouTube URL. Our AI analyzes the transcript to generate relevant questions and code challenges.</p>
                        </div>
                    </div>

                    {/* AI Configuration Panel */}
                    {aiConfig.sourceType === 'youtube' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm animate-slide-up">
                            {isProcessingAI ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Wand2 className="w-6 h-6 text-indigo-600" />
                                        </div>
                                    </div>
                                    <h3 className="mt-6 text-lg font-bold text-slate-900">Generating Exam Content</h3>
                                    <p className="text-slate-500 text-sm mt-2 animate-pulse">{generationStage}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <Input 
                                        label="YouTube Video URL" 
                                        placeholder="https://www.youtube.com/watch?v=..." 
                                        value={aiConfig.youtubeUrl}
                                        onChange={(e) => setAiConfig({...aiConfig, youtubeUrl: e.target.value})}
                                        leftIcon={<Youtube className="w-5 h-5 text-red-500" />}
                                    />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Difficulty</label>
                                            <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                                {['Easy', 'Intermediate', 'Hard'].map(level => (
                                                    <button 
                                                        key={level}
                                                        onClick={() => setAiConfig({...aiConfig, difficulty: level})}
                                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${aiConfig.difficulty === level ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Question Count: {aiConfig.questionCount}</label>
                                            <input 
                                                type="range" min="3" max="20" 
                                                value={aiConfig.questionCount}
                                                onChange={(e) => setAiConfig({...aiConfig, questionCount: parseInt(e.target.value)})}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="coding" 
                                            checked={aiConfig.includeCoding}
                                            onChange={(e) => setAiConfig({...aiConfig, includeCoding: e.target.checked})}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="coding" className="text-sm text-slate-700 font-medium">Include Coding Challenges (if applicable)</label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: EDITOR */}
            {currentStep === 3 && (
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Question Builder</h2>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => addManualQuestion('mcq')}
                                className="text-xs font-bold bg-white text-indigo-600 border border-indigo-100 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
                            >
                                <List className="w-4 h-4" /> + MCQ
                            </button>
                            <button 
                                onClick={() => addManualQuestion('coding')}
                                className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)] transition-all flex items-center gap-2"
                            >
                                <Code className="w-4 h-4" /> + Coding
                            </button>
                        </div>
                    </div>

                    {questions.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Plus className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg">No questions added yet</h3>
                            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Use AI to generate content or add questions manually using the buttons above.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-12">
                            {questions.map((q, idx) => (
                                <QuestionEditorCard 
                                    key={q.id} 
                                    question={q} 
                                    index={idx} 
                                    onDelete={() => deleteQuestion(q.id)}
                                    onUpdate={(updates) => updateQuestion(q.id, updates)}
                                    // MCQ Option Props
                                    onAddOption={() => addOption(q.id)}
                                    onUpdateOption={(optId, upd) => updateOption(q.id, optId, upd)}
                                    onDeleteOption={(optId) => deleteOption(q.id, optId)}
                                    // Coding Props
                                    onAddTestCase={() => addTestCase(q.id)}
                                    onUpdateTestCase={(tcId, upd) => updateTestCase(q.id, tcId, upd)}
                                    onDeleteTestCase={(tcId) => deleteTestCase(q.id, tcId)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 4: SETTINGS (Placeholder) */}
            {currentStep === 4 && (
                <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Publish!</h2>
                    <p className="text-slate-500 mb-8">Review your exam settings or publish immediately.</p>
                    <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 space-y-2 mb-8">
                        <p><span className="font-bold">Title:</span> {details.title}</p>
                        <p><span className="font-bold">Questions:</span> {questions.length}</p>
                        <p><span className="font-bold">Duration:</span> {details.duration} mins</p>
                    </div>
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:pl-64 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="secondary" 
                        onClick={handlePrev} 
                        disabled={currentStep === 1 || isProcessingAI || isPublishing}
                        className="w-auto px-6 border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    {errorMsg && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold animate-shake">
                            <AlertTriangle className="w-4 h-4" /> {errorMsg}
                        </div>
                    )}
                </div>
                
                {currentStep === 4 ? (
                    <Button 
                        onClick={handlePublishExam} 
                        isLoading={isPublishing}
                        className="w-auto px-10 bg-indigo-600 hover:bg-indigo-700 shadow-[0_8px_20px_rgba(79,70,229,0.3)] font-bold transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                        Publish Exam <Check className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    currentStep === 2 && aiConfig.sourceType === 'youtube' ? (
                        <Button 
                            onClick={handleGenerateContent} 
                            isLoading={isProcessingAI}
                            disabled={!aiConfig.youtubeUrl}
                            className="w-auto px-8 bg-indigo-600"
                        >
                            Analyze & Generate <Wand2 className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleNext} className="w-auto px-8 font-bold">
                            Next Step <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )
                )}
            </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

// --- Sub-Component: Question Editor Card ---
interface QuestionEditorCardProps {
    question: ExamQuestion;
    index: number;
    onDelete: () => void;
    onUpdate: (updates: Partial<ExamQuestion>) => void;
    onAddOption: () => void;
    onUpdateOption: (id: string, updates: Partial<{text: string; isCorrect: boolean}>) => void;
    onDeleteOption: (id: string) => void;
    onAddTestCase: () => void;
    onUpdateTestCase: (id: string, updates: Partial<{input: string; output: string; isHidden: boolean}>) => void;
    onDeleteTestCase: (id: string) => void;
}

const QuestionEditorCard: React.FC<QuestionEditorCardProps> = ({ 
    question, index, onDelete, onUpdate, 
    onAddOption, onUpdateOption, onDeleteOption,
    onAddTestCase, onUpdateTestCase, onDeleteTestCase
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_2px_15px_rgba(0,0,0,0.03)] overflow-hidden group hover:border-indigo-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500">
            {/* Card Header */}
            <div className={`bg-slate-50/80 px-6 py-4 flex items-center justify-between border-b border-slate-100 transition-colors ${isExpanded ? 'bg-white' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-bold font-mono">Q{index + 1}</div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${question.type === 'coding' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                {question.type}
                            </span>
                            <span className="text-sm font-bold text-slate-900 truncate max-w-[300px]">
                                {question.text || <span className="text-slate-400 font-normal italic">Enter question text...</span>}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <Input 
                            type="number" 
                            className="w-10 border-none h-6 p-0 text-center text-xs font-bold bg-transparent" 
                            value={question.points} 
                            onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">pts</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Expanded Editor */}
            {isExpanded && (
                <div className="p-8 space-y-8 animate-fade-in">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <Type className="w-3 h-3 text-indigo-500" /> Problem Statement
                        </label>
                        <textarea 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white min-h-[100px] transition-all resize-none leading-relaxed"
                            placeholder="Type your question here..."
                            value={question.text}
                            onChange={(e) => onUpdate({ text: e.target.value })}
                        />
                    </div>

                    {/* Coding Specifics */}
                    {question.type === 'coding' && (
                        <div className="space-y-8 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Code className="w-3 h-3 text-indigo-500" /> Starter Code
                                        </label>
                                        <select 
                                            className="text-[10px] font-bold text-slate-500 bg-transparent outline-none"
                                            value={question.language}
                                            onChange={(e) => onUpdate({ language: e.target.value })}
                                        >
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                        </select>
                                    </div>
                                    <textarea 
                                        className="w-full p-5 bg-[#0F172A] text-emerald-400 font-mono text-xs rounded-2xl min-h-[160px] border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                                        spellCheck={false}
                                        value={question.starterCode}
                                        onChange={(e) => onUpdate({ starterCode: e.target.value })}
                                        placeholder="# Starter code for students..."
                                    />
                                    <div className="mt-4">
                                        <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Sparkles className="w-3 h-3 text-amber-500" /> Reference Solution
                                        </label>
                                        <textarea 
                                            className="w-full p-5 bg-slate-900 text-indigo-300 font-mono text-xs rounded-2xl min-h-[160px] border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                                            spellCheck={false}
                                            value={(question as any).solutionCode || ''}
                                            onChange={(e) => onUpdate({ solutionCode: e.target.value } as any)}
                                            placeholder="# Your reference implementation..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Plus className="w-3 h-3 text-indigo-500" /> Execution Constraints
                                        </label>
                                        <Input 
                                            placeholder="e.g. Time Limit: 1s, Memory: 256MB" 
                                            className="bg-slate-50 border-slate-200 rounded-xl"
                                            value={question.constraints}
                                            onChange={(e) => onUpdate({ constraints: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest">Test Cases</label>
                                            <button 
                                                onClick={onAddTestCase}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-full transition-all"
                                            >
                                                + Add Case
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {question.testCases?.map((tc, i) => (
                                                <div key={tc.id} className="group/tc flex flex-col gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Input</span>
                                                            <input 
                                                                className="w-full bg-transparent text-xs font-mono font-bold outline-none" 
                                                                placeholder="e.g. [1, 2, 3]"
                                                                value={tc.input}
                                                                onChange={(e) => onUpdateTestCase(tc.id, { input: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Expected Output</span>
                                                            <input 
                                                                className="w-full bg-transparent text-xs font-mono font-bold text-emerald-600 outline-none" 
                                                                placeholder="e.g. 6"
                                                                value={tc.output}
                                                                onChange={(e) => onUpdateTestCase(tc.id, { output: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => onUpdateTestCase(tc.id, { isHidden: !tc.isHidden })}
                                                                className={`p-1.5 rounded-lg transition-all ${tc.isHidden ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300 hover:text-slate-600'}`}
                                                                title={tc.isHidden ? "Hidden Test Case" : "Visible Test Case"}
                                                            >
                                                                {tc.isHidden ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-40" />}
                                                            </button>
                                                            <button 
                                                                onClick={() => onDeleteTestCase(tc.id)}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MCQ Specifics */}
                    {question.type === 'mcq' && (
                        <div className="space-y-4">
                            <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <List className="w-3 h-3 text-indigo-500" /> Answer Options
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {question.options?.map((opt, i) => (
                                    <div key={opt.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-all group/opt">
                                        <button 
                                            onClick={() => onUpdateOption(opt.id, { isCorrect: true })}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-white border-slate-200 group-hover/opt:border-indigo-200'}`}
                                        >
                                            {opt.isCorrect && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                        </button>
                                        <input 
                                            className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none" 
                                            placeholder={`Option ${i + 1}`}
                                            value={opt.text}
                                            onChange={(e) => onUpdateOption(opt.id, { text: e.target.value })}
                                        />
                                        <button 
                                            onClick={() => onDeleteOption(opt.id)}
                                            className="opacity-0 group-hover/opt:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={onAddOption}
                                    className="flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 group/add transition-all"
                                >
                                    <Plus className="w-4 h-4 text-slate-400 group-hover/add:text-indigo-500" />
                                    <span className="text-sm font-bold text-slate-500 group-hover/add:text-indigo-600">Add New Option</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
