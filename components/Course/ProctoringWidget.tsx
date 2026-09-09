
import React, { useEffect, useRef, useState } from 'react';
import { Camera, AlertTriangle, Activity, Smartphone, Users, Lock, ShieldCheck } from 'lucide-react';

interface ProctoringWidgetProps {
  className?: string;
  onAlert: (message: string) => void;
  compact?: boolean;
}

export const ProctoringWidget: React.FC<ProctoringWidgetProps> = ({ className = '', onAlert, compact = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [status, setStatus] = useState<'active' | 'warning' | 'error'>('active');
  const [statusMessage, setStatusMessage] = useState('Active');

  useEffect(() => {
    startCamera();
    
    // Advanced Simulation Logic for Specific Alerts
    const monitoringInterval = setInterval(() => {
        if ((!hasPermission && !isSimulated) || status === 'error') return;

        const rand = Math.random();
        
        // 5% chance of Mobile detection
        if (rand > 0.95) {
            triggerWarning('Mobile Detected', 'Unauthorized device visible in camera frame.');
        } 
        // 3% chance of Multiple people
        else if (rand > 0.92 && rand <= 0.95) {
             triggerWarning('2 People Detected', 'Only one person is allowed during the session.');
        } 
        // 2% chance of specific 'Sit Alone' warning
        else if (rand > 0.90 && rand <= 0.92) {
             triggerWarning('Sit Alone', 'Please ensure you are alone in the room to continue.');
        }
        else {
             if (status === 'warning') {
                 setStatus('active');
                 setStatusMessage('Monitoring Active');
             }
        }
    }, 8000); // Check every 8 seconds

    return () => clearInterval(monitoringInterval);
  }, [hasPermission, isSimulated, status]);

  const triggerWarning = (shortMsg: string, detailedMsg: string) => {
      if ((status as string) === 'error') return;
      setStatus('warning');
      setStatusMessage(shortMsg);
      onAlert(`${shortMsg}: ${detailedMsg}`);
      
      // Auto-recover visual status after 5s if no new alert
      setTimeout(() => {
          if ((status as string) !== 'error') {
            setStatus('active');
            setStatusMessage('Active');
          }
      }, 5000);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
        setStatus('active');
        setStatusMessage('Active');
      }
    } catch (err) {
      console.warn("ProctoringWidget: Camera access denied. Enabling simulation.");
      setIsSimulated(true);
      setHasPermission(false);
      setStatus('active');
      setStatusMessage('Active');
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-900 border border-slate-800 shadow-lg ${className}`}>
      
      {/* Video Feed Area */}
      <div className="relative aspect-video w-full bg-slate-950 group">
         {hasPermission ? (
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${status === 'warning' ? 'opacity-40 blur-sm' : 'opacity-90'}`} 
            />
         ) : isSimulated ? (
             <div className={`w-full h-full relative ${status === 'warning' ? 'opacity-40 blur-sm' : 'opacity-90'}`}>
                 <img 
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400&auto=format&fit=crop"
                    alt="Simulated Feed"
                    className="w-full h-full object-cover transform -scale-x-100"
                 />
                 <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[8px] font-bold rounded shadow-sm">
                    DEMO
                 </div>
             </div>
         ) : (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                 <div className="bg-slate-900 p-2 rounded-full mb-2 border border-slate-800">
                    <Lock className="w-5 h-5 opacity-40" />
                 </div>
                 <span className="text-[10px] font-medium tracking-wide">Camera Access Required</span>
             </div>
         )}
         
         {/* Warning Overlay */}
         {status === 'warning' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 backdrop-blur-sm z-10 animate-fade-in px-4 text-center">
                 <div className="bg-red-500 p-2 rounded-full mb-2 shadow-lg shadow-red-500/20 animate-pulse">
                    {statusMessage.includes('Mobile') ? <Smartphone className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />}
                 </div>
                 <span className="text-white text-[10px] font-bold uppercase tracking-wider drop-shadow-md">{statusMessage}</span>
             </div>
         )}

         {/* Error State */}
         {status === 'error' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20 p-4 text-center">
                 <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
                 <span className="text-slate-300 text-[10px] font-medium mb-3">Permissions Missing</span>
                 <button onClick={startCamera} className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-500 transition-colors font-semibold shadow-md shadow-indigo-500/20">
                    Enable Camera
                 </button>
             </div>
         )}

         {/* REC Indicator */}
         {(hasPermission || isSimulated) && status !== 'error' && (
             <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5">
                 <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></div>
                 <span className="text-[9px] font-bold text-white tracking-widest opacity-80">REC</span>
             </div>
         )}
      </div>

      {/* Professional Status Footer */}
      <div className="bg-white px-3 py-2 flex items-center justify-between border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-full ${status === 'active' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {status === 'active' ? (
                     <ShieldCheck className="w-3 h-3 text-emerald-600" />
                ) : (
                     <Activity className="w-3 h-3 text-red-500" />
                )}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">AI Proctor</span>
                <span className="text-[9px] text-slate-400 font-medium">
                    {status === 'active' ? 'System Normal' : status === 'error' ? 'Offline' : 'Anomaly Detected'}
                </span>
            </div>
          </div>
          
          <div className={`
            text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider
            ${status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}
          `}>
              {status === 'active' ? 'SECURE' : 'ALERT'}
          </div>
      </div>
    </div>
  );
};
