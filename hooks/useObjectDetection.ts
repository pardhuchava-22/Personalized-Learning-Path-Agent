import React, { useState, useEffect, useCallback, useRef } from 'react';

// Shape of the proctoring detection response
export interface Detection {
  bbox?: [number, number, number, number];
  class: string;
  score: number;
  data?: any;
}

// Cloud API base URL - priority: env var > hardcoded HF endpoint > localhost fallback
const PROCTORING_API_BASE = (
  (typeof process !== 'undefined' && process.env?.REACT_APP_PROCTORING_API_URL) ||
  'https://venkat6789-proctoringengine.hf.space'
).replace(/\/$/, '');

const API_ENDPOINT = `${PROCTORING_API_BASE}/analyze-frame`;
const HEALTH_ENDPOINT = `${PROCTORING_API_BASE}/health`;

// Performance tuning constants
const DETECTION_INTERVAL_MS = 1000;  // 1s between frames for low latency
const CAPTURE_WIDTH = 480;           // Optimized capture = highly accurate detections (~15-18KB)
const CAPTURE_HEIGHT = 360;
const JPEG_QUALITY = 0.5;            // 50% JPEG quality keeps payload small
const REQUEST_TIMEOUT_MS = 8000;     // 8s timeout for HuggingFace cold starts
const MAX_RETRIES = 1;               // Retry once on transient failure

export const useObjectDetection = (videoRef: React.RefObject<HTMLVideoElement | null>, enabled: boolean = true) => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const requestRef = useRef<number>(undefined);
  const lastDetectionTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);
  const retryCount = useRef<number>(0);
  const consecutiveFailures = useRef<number>(0);

  // Connection health check on mount
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(HEALTH_ENDPOINT, { signal: controller.signal });
        clearTimeout(timeout);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setApiHealthy(data.status === 'healthy');
          console.log('[Proctoring] Cloud API health:', data);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[Proctoring] Cloud API health check failed:', err);
          setApiHealthy(false);
        }
      }
    };

    checkHealth();
    return () => { cancelled = true; };
  }, [enabled]);

  // Parse enrollment ID from URL hash query parameters for calibration reference photo
  const getEnrollmentId = (): string | null => {
    try {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        return params.get('enrollmentId');
      }
    } catch (e) {
      console.warn('[useObjectDetection] Failed to parse enrollmentId from URL hash:', e);
    }
    return null;
  };

  // Normalize detection objects - handles both 'class' and 'className' field names from API
  const normalizeDetection = (d: any): Detection => ({
    bbox: d.bbox,
    class: d.class || d.className || 'unknown',
    score: d.score,
    data: d.data
  });

  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !enabled || video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = Date.now();
    // Dynamic throttle: increase interval after consecutive failures to avoid hammering
    const effectiveInterval = consecutiveFailures.current > 2
      ? DETECTION_INTERVAL_MS * 2
      : DETECTION_INTERVAL_MS;

    if (now - lastDetectionTime.current < effectiveInterval || isFetching.current) {
      requestRef.current = requestAnimationFrame(detect);
      return;
    }

    // Capture the frame snapshot using canvas
    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      requestRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      isFetching.current = true;

      // Draw mirrored video frame matching the CameraPreview output
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

      // Retrieve cached calibration reference image from localStorage
      const enrollId = getEnrollmentId();
      const referenceBase64 = enrollId ? localStorage.getItem(`proctoring_reference_photo_${enrollId}`) : null;

      // Prepare request with AbortController timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          current_image: currentBase64,
          reference_image: referenceBase64 || undefined
        })
      });

      clearTimeout(timeout);

      if (response.ok) {
        const result = await response.json();
        const mappedDetections: Detection[] = [];

        // Reset failure tracking on success
        consecutiveFailures.current = 0;
        retryCount.current = 0;

        // 1. Process identity lock verification status
        if (result.same_person === false) {
          mappedDetections.push({
            class: 'identity_mismatch',
            score: 1.0 - (result.same_person_confidence || 0),
            data: { reason: 'Active candidate face does not match calibration ID reference.' }
          });
        }

        // 2. Map standard detections (faces, objects, phones) - normalize field names
        if (Array.isArray(result.detections)) {
          result.detections.forEach((d: any) => {
            mappedDetections.push(normalizeDetection(d));
          });
        }

        // 3. Translate violations summary to detections schema (backwards compatibility)
        const v = result.violations;
        if (v) {
          if (v.multiple_people) {
            if (!mappedDetections.some(d => d.class === 'multiple_people_detected')) {
              mappedDetections.push({ class: 'multiple_people_detected', score: 1.0 });
            }
          }
          if (v.no_person) {
            if (!mappedDetections.some(d => d.class === 'no_person')) {
              mappedDetections.push({ class: 'no_person', score: 1.0 });
            }
          }
          if (v.phone_detected) {
            if (!mappedDetections.some(d => d.class === 'cell phone')) {
              mappedDetections.push({ class: 'cell phone', score: 0.95 });
            }
          }
          if (v.suspicious_object) {
            if (!mappedDetections.some(d => d.class === 'suspicious_object')) {
              mappedDetections.push({ class: 'suspicious_object', score: 0.90, data: { originalClass: 'book' } });
            }
          }
          if (v.face_covered) {
            if (!mappedDetections.some(d => d.class === 'face_covered')) {
              mappedDetections.push({ class: 'face_covered', score: 0.95 });
            }
          }
          if (v.head_turned && v.head_pose !== 'center') {
            const mainFace = mappedDetections.find(d => d.class === 'face');
            if (mainFace) {
              mainFace.data = { ...mainFace.data, pose: v.head_pose };
            } else {
              mappedDetections.push({
                class: 'face',
                score: 0.95,
                data: { pose: v.head_pose, isPartial: false }
              });
            }
          }
        }

        setDetections(mappedDetections);
        lastDetectionTime.current = now;
      } else {
        consecutiveFailures.current++;
        console.warn(`[Proctoring] API response ${response.status}:`, await response.text().catch(() => ''));
      }
    } catch (err: any) {
      consecutiveFailures.current++;

      // Retry once on abort/network error
      if (retryCount.current < MAX_RETRIES && (err.name === 'AbortError' || err.message?.includes('Failed to fetch'))) {
        retryCount.current++;
        console.warn(`[Proctoring] Request failed, retry ${retryCount.current}/${MAX_RETRIES}:`, err.message);
      } else {
        retryCount.current = 0;
        console.warn('[Proctoring] Cloud API connection error:', err.message || err);
      }
    } finally {
      isFetching.current = false;
      requestRef.current = requestAnimationFrame(detect);
    }
  }, [enabled, videoRef]);

  useEffect(() => {
    if (enabled) {
      requestRef.current = requestAnimationFrame(detect);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled, detect]);

  return { loading, detections, apiHealthy };
};
