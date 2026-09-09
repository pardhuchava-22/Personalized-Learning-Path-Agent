import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface VideoPlayerProps {
  title: string;
  videoId?: string;
  onComplete?: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, videoId, onComplete, className = '' }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Listen to messages from YouTube Player API iframe
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'onStateChange') {
          // 0 means ended (completed video)
          if (data.info === 0 && onComplete) {
            onComplete();
          }
        }
      } catch (err) {
        // Safe to ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  if (!videoId) {
    return (
      <div className={`w-full ${className}`}>
        <div className="rounded-[28px] bg-[#050816] border border-slate-800 shadow-2xl p-3 md:p-4">
          <div className="relative aspect-video overflow-hidden rounded-[22px] bg-[#0b0f19] flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[#06B6D4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm">{t('player.preparing')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Load YouTube Video with Iframe API enabled (using Privacy-Enhanced nocookie domain to bypass ad tracking & CORS warnings)
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&autoplay=0&rel=0`;

  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-[28px] bg-[#050816] border border-slate-800 shadow-2xl p-3 md:p-4">
        <div className="relative aspect-video overflow-hidden rounded-[22px] bg-[#0b0f19]">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full border-none block animate-fade-in"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};
