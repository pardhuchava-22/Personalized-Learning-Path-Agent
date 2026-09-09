import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Camera, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface CameraPreviewProps {
  onPermissionGranted?: () => void;
  onVideoReady?: (videoEl: HTMLVideoElement) => void;
  permissionGranted: boolean;
  faceDetected: boolean;
  autoStart?: boolean;
  minimalUI?: boolean;
}

export interface CameraHandle {
  takeScreenshot: () => string | null;
  videoElement: HTMLVideoElement | null;
}

export const CameraPreview = forwardRef<CameraHandle, CameraPreviewProps>(({ 
  onPermissionGranted = () => {}, 
  onVideoReady,
  permissionGranted,
  faceDetected,
  autoStart = false,
  minimalUI = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isSimulated, setIsSimulated] = useState(false);
  const hasAutoStarted = useRef(false);

  // Expose takeScreenshot AND videoElement via ref
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      if (!videoRef.current && !isSimulated) return null;
      
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      if (isSimulated) {
          return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop";
      }

      if (videoRef.current) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg');
      }
      return null;
    },
    videoElement: videoRef.current
  }), [videoRef.current, isSimulated]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setStream(mediaStream);
      onPermissionGranted();
    } catch (err) {
      console.warn("CameraPreview: Access denied or unavailable. Using simulation.");
      setIsSimulated(true);
      onPermissionGranted();
    }
  };

  useEffect(() => {
    if (autoStart && !permissionGranted && !hasAutoStarted.current) {
        hasAutoStarted.current = true;
        startCamera();
    }
  }, [autoStart, permissionGranted]);

  // Stable attachment effect — also notify parent when video is playing
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const el = videoRef.current;
      const handlePlaying = () => {
        if (onVideoReady) onVideoReady(el);
      };
      // Fire when video starts playing (readyState 4)
      if (el.readyState >= 3) {
        handlePlaying();
      } else {
        el.addEventListener('playing', handlePlaying, { once: true });
      }
      return () => {
        el.removeEventListener('playing', handlePlaying);
      };
    }
  }, [stream, permissionGranted, onVideoReady]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  if (!permissionGranted && !isSimulated) {
    if (minimalUI) {
      return (
        <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700">
           <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      );
    }

    return (
      <div className="w-full max-w-[480px] aspect-[4/3] bg-slate-900 rounded-xl flex flex-col items-center justify-center p-8 text-center border-2 border-slate-200 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-[#4F46E5]/10 rounded-full flex items-center justify-center mb-6">
                <Camera className="w-8 h-8 text-[#4F46E5]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Camera Check</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
                We need to verify your camera functionality for proctoring.
            </p>
            <Button onClick={startCamera} className="w-auto px-8">
                Start Verification
            </Button>
            {error && (
                <p className="text-warning text-xs mt-4 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> {error}
                </p>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[480px] mx-auto">
        <div className={`
            relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-colors duration-300 bg-black
            ${faceDetected ? 'border-[#10B981]' : 'border-[#F59E0B]'}
        `}>
            {isSimulated ? (
                <div className="relative w-full h-full">
                    <img 
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop" 
                        alt="Simulated Camera Feed" 
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute top-3 left-3 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                        DEMO MODE
                    </div>
                </div>
            ) : (
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100 ring-4 ring-black"
                />
            )}


            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                <div className={`flex items-center gap-2 text-xs font-medium ${faceDetected ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                    {faceDetected ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
                    {faceDetected ? 'Face Verified' : 'Detecting...'}
                </div>
                {!isSimulated && (
                    <span className="text-[10px] text-white/70 font-mono bg-black/40 px-2 py-0.5 rounded">
                        HD 720p
                    </span>
                )}
            </div>
        </div>
    </div>
  );
});
