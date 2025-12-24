
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
    
    // 清理现有资源
    if (resourcesRef.current) {
      if (resourcesRef.current.camera) resourcesRef.current.camera.stop();
      if (resourcesRef.current.hands) resourcesRef.current.hands.close();
      resourcesRef.current = null;
    }

    try {
      // 1. 核心安全性检查：摄像头需要 HTTPS 或 localhost
      if (!window.isSecureContext) {
        throw new Error('摄像头访问需要安全上下文 (HTTPS)。请确保您的网站已启用 SSL。');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持摄像头访问，或处于非安全环境。');
      }

      // 2. 初始化 MediaPipe Hands
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

      // 3. 使用原生方式先尝试获取流，确保触发权限弹窗
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 4. 初始化 MediaPipe Camera Utility
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
      console.error("Camera Error:", err);
      let msg = err.message || '获取摄像头失败';
      
      if (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('permission denied')) {
        msg = '摄像头权限被拒绝。请在浏览器地址栏点击锁形图标，重新允许摄像头访问，然后刷新页面。';
      } else if (err.name === 'NotFoundError') {
        msg = '未检测到摄像头设备，请连接摄像头。';
      } else if (err.name === 'NotReadableError') {
        msg = '摄像头正被其他程序占用，请关闭其他视频会议软件。';
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
    <div className="fixed bottom-6 right-6 w-72 h-52 rounded-3xl overflow-hidden glass border border-white/10 shadow-2xl z-50 flex items-center justify-center bg-black/40 group">
      <video 
        ref={videoRef} 
        className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-1000 ${error || isInitializing ? 'opacity-0' : 'opacity-100'}`} 
        playsInline 
        muted
      />
      
      {isInitializing && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-10 h-10 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
          <span className="text-[10px] text-yellow-500/80 uppercase tracking-[0.3em] font-bold">视觉引擎初始化中</span>
        </div>
      )}

      {error && (
        <div className="p-8 text-center bg-black/90 absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/30">
             <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <div className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-3">权限/访问异常</div>
          <p className="text-[11px] text-white/60 leading-relaxed mb-6 tracking-wide line-clamp-4 px-2">{error}</p>
          <button 
            onClick={() => startCamera()}
            className="px-8 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-black transition-all active:scale-95 shadow-[0_0_20px_rgba(255,204,51,0.2)] pointer-events-auto"
          >
            重试授权
          </button>
        </div>
      )}

      <div className="absolute top-4 left-4 px-3 py-1 bg-yellow-500/10 backdrop-blur-md rounded-lg text-[8px] font-black tracking-[0.2em] uppercase text-yellow-500 border border-yellow-500/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        Live Feed
      </div>
    </div>
  );
};

export default HandTracker;
