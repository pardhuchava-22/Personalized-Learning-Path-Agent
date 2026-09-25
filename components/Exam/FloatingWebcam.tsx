import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CameraPreview, CameraHandle } from '../Proctoring/CameraPreview';
import { useObjectDetection } from '../../hooks/useObjectDetection';
import { AlertCircle, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

interface FloatingWebcamProps {
  className?: string;
  onDetection?: (detections: any[]) => void;
  onSnapshot?: () => string | null;
}

export const FloatingWebcam: React.FC<FloatingWebcamProps> = ({ className = '', onDetection }) => {
  const cameraHandleRef = useRef<CameraHandle>(null);
  // Stable ref for the actual video element — persists across renders
  const stableVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  // Callback fired by CameraPreview when video is actually playing
  const handleVideoReady = useCallback((videoEl: HTMLVideoElement) => {
    stableVideoRef.current = videoEl;
    setVideoReady(true);
    console.log('[FloatingWebcam] Video element ready for detection, readyState:', videoEl.readyState);
  }, []);

  // Pass the STABLE ref to the detection hook — not a new object each render
  const { detections, loading: modelLoading, apiHealthy } = useObjectDetection(
    stableVideoRef, 
    hasPermission && videoReady
  );

  // Expose a snapshot function for violation evidence capture
  const takeSnapshot = useCallback((): string | null => {
    if (cameraHandleRef.current) {
      return cameraHandleRef.current.takeScreenshot();
    }
    return null;
  }, []);

  // Make snapshot function available to parent via a custom event
  useEffect(() => {
    (window as any).__proctoringTakeSnapshot = takeSnapshot;
    return () => { delete (window as any).__proctoringTakeSnapshot; };
  }, [takeSnapshot]);

  useEffect(() => {
    if (!modelLoading) {
      if (onDetection) {
        onDetection(detections);
      }
      const face = detections.find(d => d.class === 'face');
      setFaceDetected(!!face);
    }
  }, [detections, modelLoading, onDetection]);


  const faceList = detections.filter(d => d.class === 'face');
  const personList = detections.filter(d => d.class === 'ssd_person' || d.class === 'person');
  const hasMultiplePeople = detections.some(d => d.class === 'multiple_people_detected') || faceList.length > 1 || personList.length > 1;
  const currentFaceCount = Math.max(faceList.length, personList.length, hasMultiplePeople ? 2 : 1);

  const activeViolations = detections.filter(d => 
    d.class === 'cell phone' || 
    d.class === 'face_covered' || 
    (d.class === 'face' && d.data?.pose !== 'center')
  );
  if (hasMultiplePeople) {
    activeViolations.push({ class: 'multiple_people_detected', score: 1.0 });
  }

  return (
    <div className={`fixed z-50 w-72 group transition-all duration-500 hover:scale-105 ${className}`}>
      <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden border-4 transition-all ${hasMultiplePeople ? 'border-red-500 ring-4 ring-red-500/30' : 'border-white ring-1 ring-slate-200'}`}>
        
        {/* Detection Overlay */}
        <div className="relative">
            <CameraPreview 
                ref={cameraHandleRef}
                permissionGranted={hasPermission}
                onPermissionGranted={() => setHasPermission(true)}
                onVideoReady={handleVideoReady}
                faceDetected={faceDetected}
                autoStart={true}
                minimalUI={true}
            />
            
            {/* AI Status Scanning Line */}
            {hasPermission && !modelLoading && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="w-full h-0.5 bg-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.5)] animate-scan-fast"></div>
                </div>
            )}

            {/* AI Indicators */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
                <StatusBadge 
                    icon={Cpu} 
                    label={modelLoading ? 'MODELS LOADING...' : apiHealthy === false ? 'CLOUD OFFLINE' : 'CLOUD AI'} 
                    active={!modelLoading && apiHealthy !== false}
                    pulse={modelLoading || apiHealthy === null}
                />
                {hasMultiplePeople ? (
                    <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce flex items-center gap-1 shadow-lg">
                        <AlertCircle className="w-3 h-3" /> {currentFaceCount} FACES
                    </div>
                ) : activeViolations.length > 0 && (
                    <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce flex items-center gap-1 shadow-lg">
                        <AlertCircle className="w-3 h-3" /> ALERT
                    </div>
                )}
            </div>
        </div>

        {/* Footer Info */}
        <div className={`p-3 flex items-center justify-between transition-colors ${hasMultiplePeople ? 'bg-red-950 text-red-200' : 'bg-slate-900 text-white'}`}>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasMultiplePeople ? 'bg-red-500 animate-ping' : faceDetected ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${hasMultiplePeople ? 'text-red-300' : 'text-white'}`}>
                    {modelLoading 
                      ? 'Calibrating...' 
                      : hasMultiplePeople 
                        ? `MULTIPLE FACES (${currentFaceCount})` 
                        : faceDetected 
                          ? 'Identity Secure' 
                          : 'Face Detection Active'}
                </span>
            </div>
            {hasMultiplePeople ? <AlertCircle className="w-4 h-4 text-red-400 animate-bounce" /> : faceDetected ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
        </div>
      </div>

      {/* Persistent Violation Banners */}
      <div className="mt-3 space-y-2 pointer-events-none">
          {hasMultiplePeople && (
              <div className="bg-red-600 text-white p-3 rounded-2xl shadow-xl animate-shake flex items-center gap-3 border-2 border-white/20">
                  <div className="bg-white/20 p-2 rounded-xl"><AlertCircle className="w-5 h-5" /></div>
                  <div>
                      <p className="font-black text-xs uppercase">Multiple People Detected ({currentFaceCount} in view)</p>
                      <p className="text-[10px] opacity-80 font-bold">Exam Screen Locked — Extra person must leave</p>
                  </div>
              </div>
          )}
          {detections.some(d => d.class === 'cell phone' && d.score > 0.45) && (
              <div className="bg-red-600 text-white p-3 rounded-2xl shadow-xl animate-shake flex items-center gap-3 border-2 border-white/20">
                  <div className="bg-white/20 p-2 rounded-xl"><AlertCircle className="w-5 h-5" /></div>
                  <div>
                      <p className="font-black text-xs uppercase">Mobile Phone Detected</p>
                      <p className="text-[10px] opacity-80 font-bold">Violation Recorded & Snapshot Captured</p>
                  </div>
              </div>
          )}
          {detections.some(d => d.class === 'face_covered') && (
              <div className="bg-red-600 text-white p-3 rounded-2xl shadow-xl animate-shake flex items-center gap-3 border-2 border-white/20">
                  <div className="bg-white/20 p-2 rounded-xl"><AlertCircle className="w-5 h-5" /></div>
                  <div>
                      <p className="font-black text-xs uppercase">Face Covered / Occluded</p>
                      <p className="text-[10px] opacity-80 font-bold">Ensure face is fully visible & uncovered</p>
                  </div>
              </div>
          )}
      </div>

      <style>{`
        @keyframes scan-fast {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-fast {
          position: absolute;
          width: 100%;
          animation: scan-fast 3s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out infinite;
        }
      `}
      </style>
    </div>
  );
};

const StatusBadge = ({ icon: Icon, label, active, pulse }: { icon: any, label: string, active: boolean, pulse: boolean }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-md border shadow-sm transition-all ${active ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-300'} ${pulse ? 'animate-pulse' : ''}`}>
        <Icon className={`w-3 h-3 ${active ? 'text-white' : 'text-slate-400'}`} />
        <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </div>
);
