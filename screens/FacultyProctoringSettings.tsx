
import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { useAuth } from '../services/authContext';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { 
  Shield, Camera, Monitor, Smartphone, Eye, AlertTriangle, 
  Save, Zap, Activity, Info, Video, Lock, MousePointer, 
  Wifi, UserCheck, Play
} from 'lucide-react';

interface FacultyProctoringSettingsProps {
  onNavigate: (path: string) => void;
}

type ProctoringPreset = 'lenient' | 'moderate' | 'strict';

export const FacultyProctoringSettingsScreen: React.FC<FacultyProctoringSettingsProps> = ({ onNavigate }) => {
  const { user: authUser } = useAuth();
  const facultyUser: User = { id: String(authUser?.id || ''), name: authUser ? `${authUser.first_name} ${authUser.last_name}`.trim() || authUser.username : 'Faculty', email: authUser?.email || '', role: 'faculty' };
  
  const [showToast, setShowToast] = useState(false);

  // --- Configuration State ---
  const [config, setConfig] = useState({
    // Camera & Face
    requireFaceVerification: true,
    continuousFaceDetection: true,
    matchFaceToId: false,
    faceSimilarityThreshold: 70,
    detectMultipleFaces: false,

    // Screen & Environment
    fullScreenMode: true,
    disableWindowSwitching: false,
    disableRightClick: false,
    requireStableInternet: true,
    minInternetSpeed: 2.0,

    // Object & Device
    phoneDetection: true,
    smartWatchDetection: false,
    handMovementDetection: false,

    // Attention
    trackGaze: true,
    calculateAttentionScore: true,
    attentionThreshold: 60,
    alertOnLowAttention: true,
    alertDuration: 30,

    // Incident
    autoPause: false,
    requireManualResume: false,
    flagSubmission: true,
    strictAction: 'Warn & Continue',

    // Emotion (Advanced)
    emotionRecognition: false,
    stressTracking: false,
    detectConfusion: false,

    // Recording
    recordSession: true,
    recordVideo: true,
    recordScreen: true,
    recordAudio: true,
    retentionPeriod: '30 days',
    autoDelete: true,
    studentDownload: false,
  });

  // --- Handlers ---

  const handleToggle = (key: keyof typeof config) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] as any }));
  };

  const handleChange = (key: keyof typeof config, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: ProctoringPreset) => {
    switch (preset) {
      case 'lenient':
        setConfig(prev => ({
          ...prev,
          requireFaceVerification: true,
          continuousFaceDetection: false,
          matchFaceToId: false,
          detectMultipleFaces: false,
          fullScreenMode: false,
          disableWindowSwitching: false,
          phoneDetection: false,
          trackGaze: false,
          alertOnLowAttention: false,
          strictAction: 'Warn & Continue',
          recordSession: false
        }));
        break;
      case 'moderate':
        setConfig(prev => ({
          ...prev,
          requireFaceVerification: true,
          continuousFaceDetection: true,
          matchFaceToId: false,
          detectMultipleFaces: true,
          fullScreenMode: true,
          disableWindowSwitching: true,
          phoneDetection: true,
          trackGaze: true,
          attentionThreshold: 50,
          alertOnLowAttention: true,
          strictAction: 'Warn & Continue',
          recordSession: true
        }));
        break;
      case 'strict':
        setConfig(prev => ({
          ...prev,
          requireFaceVerification: true,
          continuousFaceDetection: true,
          matchFaceToId: true,
          detectMultipleFaces: true,
          fullScreenMode: true,
          disableWindowSwitching: true,
          disableRightClick: true,
          phoneDetection: true,
          smartWatchDetection: true,
          trackGaze: true,
          attentionThreshold: 75,
          alertOnLowAttention: true,
          autoPause: true,
          strictAction: 'Pause Exam',
          recordSession: true,
          stressTracking: true
        }));
        break;
    }
  };

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <DashboardLayout currentUser={facultyUser} onNavigate={onNavigate} currentPath="/faculty-settings">
      <div className="max-w-5xl mx-auto pb-32 animate-slide-up">
        
        {/* Header */}
        <div className="mb-8 text-center md:text-left">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Proctoring & Integrity Settings</h1>
            <p className="text-sm text-slate-500">Configure monitoring and security parameters for your exams globally or per-exam.</p>
        </div>

        {/* Quick Setup Cards */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-8 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Quick Presets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Lenient */}
                <div className="bg-[#EEF2FF] rounded-xl p-5 border border-indigo-100 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-indigo-900">Lenient</h4>
                            <p className="text-[10px] text-indigo-600/80 font-medium">Minimal monitoring</p>
                        </div>
                        <Shield className="w-5 h-5 text-indigo-400" />
                    </div>
                    <ul className="text-[10px] text-indigo-800 space-y-1.5 mb-6 flex-1">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-400"></div>Face verification: Optional</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-400"></div>Full-screen: Optional</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-400"></div>No recording</li>
                    </ul>
                    <button 
                        onClick={() => applyPreset('lenient')}
                        className="w-full py-2 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                        Apply Lenient
                    </button>
                </div>

                {/* Moderate */}
                <div className="bg-[#FEF3C7] rounded-xl p-5 border border-amber-100 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-amber-900">Moderate</h4>
                            <p className="text-[10px] text-amber-700/80 font-medium">Standard security</p>
                        </div>
                        <Shield className="w-5 h-5 text-amber-500" />
                    </div>
                    <ul className="text-[10px] text-amber-900 space-y-1.5 mb-6 flex-1">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500"></div>Continuous Face Detection</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500"></div>Full-screen Enforced</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-amber-500"></div>Phone Detection</li>
                    </ul>
                    <button 
                        onClick={() => applyPreset('moderate')}
                        className="w-full py-2 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                        Apply Moderate
                    </button>
                </div>

                {/* Strict */}
                <div className="bg-[#FEE2E2] rounded-xl p-5 border border-red-100 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="font-bold text-red-900">Strict</h4>
                            <p className="text-[10px] text-red-700/80 font-medium">Maximum integrity</p>
                        </div>
                        <Shield className="w-5 h-5 text-red-500" />
                    </div>
                    <ul className="text-[10px] text-red-900 space-y-1.5 mb-6 flex-1">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500"></div>ID Verification Match</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500"></div>Gaze & Head Tracking</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-red-500"></div>360° Environment Scan</li>
                    </ul>
                    <button 
                        onClick={() => applyPreset('strict')}
                        className="w-full py-2 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-700 hover:bg-red-50 transition-colors"
                    >
                        Apply Strict
                    </button>
                </div>
            </div>
        </section>

        {/* --- Custom Configuration --- */}
        
        {/* 1. Camera & Face */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Camera className="w-5 h-5" /></div>
                <h3 className="text-sm font-bold text-slate-900">Camera & Face Verification</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <Toggle label="Require face verification before start" checked={config.requireFaceVerification} onChange={() => handleToggle('requireFaceVerification')} />
                <Toggle label="Continuous face detection" checked={config.continuousFaceDetection} onChange={() => handleToggle('continuousFaceDetection')} />
                
                <div className="md:col-span-2">
                    <Toggle label="Match face to ID photo" checked={config.matchFaceToId} onChange={() => handleToggle('matchFaceToId')} />
                    {config.matchFaceToId && (
                        <div className="mt-3 ml-12 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-semibold text-slate-600">Similarity Threshold</label>
                                <span className="text-xs font-bold text-indigo-600">{config.faceSimilarityThreshold}%</span>
                            </div>
                            <input 
                                type="range" min="50" max="100" 
                                value={config.faceSimilarityThreshold} 
                                onChange={(e) => handleChange('faceSimilarityThreshold', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    )}
                </div>

                <Toggle label="Detect multiple faces" checked={config.detectMultipleFaces} onChange={() => handleToggle('detectMultipleFaces')} />
            </div>
        </section>

        {/* 2. Screen & Environment */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Monitor className="w-5 h-5" /></div>
                <h3 className="text-sm font-bold text-slate-900">Screen & Environment</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <Toggle label="Enforce full-screen mode" checked={config.fullScreenMode} onChange={() => handleToggle('fullScreenMode')} />
                <Toggle label="Disable window switching" checked={config.disableWindowSwitching} onChange={() => handleToggle('disableWindowSwitching')} />
                <Toggle label="Disable right-click & copy-paste" checked={config.disableRightClick} onChange={() => handleToggle('disableRightClick')} />
                
                <div>
                    <Toggle label="Require stable internet" checked={config.requireStableInternet} onChange={() => handleToggle('requireStableInternet')} />
                    {config.requireStableInternet && (
                        <div className="mt-2 flex items-center gap-3">
                            <Wifi className="w-4 h-4 text-slate-400" />
                            <input 
                                type="number" 
                                value={config.minInternetSpeed}
                                onChange={(e) => handleChange('minInternetSpeed', parseFloat(e.target.value))}
                                className="w-20 px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 focus:border-indigo-500 outline-none"
                            />
                            <span className="text-xs text-slate-500">Mbps min speed</span>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* 3. Attention & Engagement */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Eye className="w-5 h-5" /></div>
                <h3 className="text-sm font-bold text-slate-900">Attention & Engagement</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <Toggle label="Track gaze & head position" checked={config.trackGaze} onChange={() => handleToggle('trackGaze')} />
                <Toggle label="Calculate attention score" checked={config.calculateAttentionScore} onChange={() => handleToggle('calculateAttentionScore')} />
                
                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-slate-700">Minimum Attention Threshold</label>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{config.attentionThreshold}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" 
                        value={config.attentionThreshold} 
                        onChange={(e) => handleChange('attentionThreshold', parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-6"
                    />
                </div>

                <div>
                    <Toggle label="Alert on low attention" checked={config.alertOnLowAttention} onChange={() => handleToggle('alertOnLowAttention')} />
                    {config.alertOnLowAttention && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-slate-400">Alert after</span>
                            <input 
                                type="number" 
                                value={config.alertDuration}
                                onChange={(e) => handleChange('alertDuration', parseInt(e.target.value))}
                                className="w-16 px-2 py-1 border border-slate-200 rounded bg-slate-50 text-center font-bold"
                            />
                            <span>seconds of inattention</span>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* 4. Incident Handling */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><AlertTriangle className="w-5 h-5" /></div>
                <h3 className="text-sm font-bold text-slate-900">Incident Handling</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <Toggle label="Log all incidents" checked={true} onChange={() => {}} /> {/* Disabled/Always On */}
                
                <div>
                    <Toggle label="Auto-pause on critical incident" checked={config.autoPause} onChange={() => handleToggle('autoPause')} />
                    {config.autoPause && (
                        <div className="mt-2 ml-12">
                            <Toggle label="Require manual resume" checked={config.requireManualResume} onChange={() => handleToggle('requireManualResume')} />
                        </div>
                    )}
                </div>

                <Toggle label="Flag submission for review" checked={config.flagSubmission} onChange={() => handleToggle('flagSubmission')} />

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Strict Violation Action</label>
                    <select 
                        value={config.strictAction}
                        onChange={(e) => handleChange('strictAction', e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 outline-none"
                    >
                        <option>Warn & Continue</option>
                        <option>Pause Exam</option>
                        <option>Force Submission</option>
                    </select>
                </div>
            </div>
        </section>

        {/* 5. Emotion AI */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Activity className="w-5 h-5" /></div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Emotion & Engagement Analysis</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Optional advanced analytics</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <Toggle label="Enable emotion recognition" checked={config.emotionRecognition} onChange={() => handleToggle('emotionRecognition')} />
                <Toggle label="Track stress levels" checked={config.stressTracking} onChange={() => handleToggle('stressTracking')} />
                <Toggle label="Detect confusion" checked={config.detectConfusion} onChange={() => handleToggle('detectConfusion')} />
            </div>
            
            {(config.emotionRecognition || config.stressTracking) && (
                <div className="mt-6 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    Helps identify struggling students in real-time. Data is anonymized for privacy.
                </div>
            )}
        </section>

        {/* 6. Recording & Data */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Video className="w-5 h-5" /></div>
                <h3 className="text-sm font-bold text-slate-900">Recording & Data</h3>
            </div>
            
            <div className="space-y-6">
                <Toggle label="Record exam session" checked={config.recordSession} onChange={() => handleToggle('recordSession')} />
                
                {config.recordSession && (
                    <div className="ml-12 grid grid-cols-3 gap-4">
                        <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                            <input type="checkbox" checked={config.recordVideo} onChange={() => handleToggle('recordVideo')} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-xs font-bold text-slate-700">Video</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                            <input type="checkbox" checked={config.recordScreen} onChange={() => handleToggle('recordScreen')} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-xs font-bold text-slate-700">Screen</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                            <input type="checkbox" checked={config.recordAudio} onChange={() => handleToggle('recordAudio')} className="w-4 h-4 text-indigo-600 rounded" />
                            <span className="text-xs font-bold text-slate-700">Audio</span>
                        </label>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">Data Retention Period</label>
                        <select 
                            value={config.retentionPeriod}
                            onChange={(e) => handleChange('retentionPeriod', e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-500 outline-none"
                        >
                            <option>7 days</option>
                            <option>30 days</option>
                            <option>90 days</option>
                            <option>1 year</option>
                        </select>
                    </div>
                    <div className="pt-6">
                        <Toggle label="Delete automatically after period" checked={config.autoDelete} onChange={() => handleToggle('autoDelete')} />
                    </div>
                    <Toggle label="Student can download recording" checked={config.studentDownload} onChange={() => handleToggle('studentDownload')} />
                </div>
            </div>
        </section>

        {/* Test Section */}
        <section className="bg-[#EEF2FF] rounded-xl border border-indigo-100 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h3 className="text-sm font-bold text-indigo-900 mb-1">Test Proctoring</h3>
                <p className="text-xs text-indigo-700/70">Run a test to see how proctoring works with your configuration.</p>
            </div>
            <button className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 shadow-sm">
                <Play className="w-4 h-4" /> Launch Test Environment
            </button>
        </section>

        {/* Bottom Actions Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:pl-64 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-4 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        Save Defaults
                    </button>
                    <button className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 group">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Apply to All Exams
                        {/* Tooltip hint */}
                        <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] p-2 rounded whitespace-nowrap">
                            Overrides all existing exam settings
                        </div>
                    </button>
                </div>
                
                <Button onClick={handleSave} className="w-full md:w-auto px-8">
                    Save Settings
                </Button>
            </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
            <div className="fixed bottom-24 right-8 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slide-up z-50">
                <div className="p-2 bg-emerald-100 rounded-full shrink-0">
                    <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h4 className="font-bold text-sm">Settings Saved!</h4>
                    <p className="text-xs opacity-80 mt-0.5">Configuration updated successfully.</p>
                </div>
            </div>
        )}

      </div>
    </DashboardLayout>
  );
};
