
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
  const resourcesRef = useRef<{ camera: any; hands: any } | null>(null);

  const startCamera = async () => {
    if (!videoRef.current) return;
    
    setError(null);
    setIsInitializing(true);
    
    // Clean up existing resources if retrying
    if (resourcesRef.current) {
      if (resourcesRef.current.camera) resourcesRef.current.camera.stop();
      if (resourcesRef.current.hands) resourcesRef.current.hands.close();
      resourcesRef.current = null;
    }

    try {
      // Check for mediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access or you are not using HTTPS.');
      }

      // Initialize MediaPipe Hands
      // @ts-ignore
      const hands = new window.Hands({
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

      // Initialize Camera Utility
      // @ts-ignore
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && hands) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      resourcesRef.current = { camera, hands };
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Camera Initialization Error:", err);
      let msg = 'Failed to acquire camera feed.';
      if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('permission denied')) {
        msg = 'Camera permission denied. Please click the "Allow" button in your browser address bar or check site settings.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device. Please connect a webcam.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Camera is already in use by another application.';
      }
      setError(msg);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (active) {
      startCamera();
    }

    return () => {
      if (resourcesRef.current) {
        if (resourcesRef.current.camera) resourcesRef.current.camera.stop();
        if (resourcesRef.current.hands) resourcesRef.current.hands.close();
        resourcesRef.current = null;
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed bottom-4 right-4 w-64 h-48 rounded-2xl overflow-hidden glass border border-white/20 shadow-2xl z-50 flex items-center justify-center bg-black/40 group">
      <video 
        ref={videoRef} 
        className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${error || isInitializing ? 'opacity-0' : 'opacity-100'}`} 
        playsInline 
        muted
      />
      
      {isInitializing && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-[10px] text-white/60 uppercase tracking-[0.2em] animate-pulse">Initializing Vision...</span>
        </div>
      )}

      {error && (
        <div className="p-6 text-center bg-black/90 absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3 border border-red-500/20">
             <span className="text-red-500 text-xl font-bold">!</span>
          </div>
          <div className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-2">Access Error</div>
          <p className="text-[10px] text-white/50 leading-relaxed mb-4 uppercase tracking-wider line-clamp-3">{error}</p>
          <button 
            onClick={() => startCamera()}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-black transition-all active:scale-95 shadow-[0_0_15px_rgba(255,204,51,0.3)] pointer-events-auto"
          >
            Retry Access
          </button>
        </div>
      )}

      <div className="absolute top-2 left-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-bold tracking-[0.2em] uppercase text-white/70 border border-white/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        Live Feed
      </div>
    </div>
  );
};

export default HandTracker;
