
import React, { useEffect, useRef, useState } from 'react';
import { analyzeHand } from '../services/gestureLogic';
import { HandData } from '../types';

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
  active: boolean;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate, active }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!active || !videoRef.current) return;

    let camera: any = null;
    let hands: any = null;

    const initialize = async () => {
      setError(null);
      setIsInitializing(true);
      
      try {
        // @ts-ignore
        hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults((results: any) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const gesture = analyzeHand(landmarks);
            const wrist = landmarks[0];
            const indexBase = landmarks[5];
            const pinkyBase = landmarks[17];
            const dx = pinkyBase.x - indexBase.x;
            const dy = pinkyBase.y - indexBase.y;
            const angle = Math.atan2(dy, dx);

            onHandUpdate({
              landmarks,
              gesture,
              position: { x: wrist.x, y: wrist.y },
              rotation: { x: wrist.z, y: angle }
            });
          } else {
            onHandUpdate({
              landmarks: [],
              gesture: 'none',
              position: { x: 0.5, y: 0.5 },
              rotation: { x: 0, y: 0 }
            });
          }
        });

        // @ts-ignore
        camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && hands) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          setError('Camera permission denied. Please enable camera access in your browser settings and refresh.');
        } else {
          setError('Failed to acquire camera feed. Please check if your camera is in use by another app.');
        }
        setIsInitializing(false);
      }
    };

    initialize();

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, [onHandUpdate, active]);

  if (!active) return null;

  return (
    <div className="fixed bottom-4 right-4 w-64 h-48 rounded-2xl overflow-hidden glass border border-white/20 shadow-2xl z-50 flex items-center justify-center bg-black/40">
      <video ref={videoRef} className={`w-full h-full object-cover scale-x-[-1] ${error ? 'hidden' : 'block'}`} />
      
      {isInitializing && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-[10px] text-white/60 uppercase tracking-widest">Initializing Camera...</span>
        </div>
      )}

      {error && (
        <div className="p-4 text-center">
          <div className="text-red-400 text-xs font-bold uppercase mb-2">Camera Error</div>
          <p className="text-[10px] text-white/60 leading-relaxed mb-3">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-[9px] uppercase tracking-widest text-white transition-colors border border-white/20"
          >
            Refresh Page
          </button>
        </div>
      )}

      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 rounded text-[10px] font-bold tracking-widest uppercase pointer-events-none">
        Hand Feed
      </div>
    </div>
  );
};

export default HandTracker;
