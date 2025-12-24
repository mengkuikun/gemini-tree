
import React, { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TreeState, HandData, PhotoData } from './types';
import HandTracker from './components/HandTracker';
import TreeVisuals from './components/TreeVisuals';

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [state, setState] = useState<TreeState>(TreeState.COLLAPSED);
  const [handData, setHandData] = useState<HandData>({
    landmarks: [],
    gesture: 'none',
    position: { x: 0.5, y: 0.5 },
    rotation: { x: 0, y: 0 }
  });
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  // 手势状态机
  useEffect(() => {
    if (handData.gesture === 'fist') {
      setState(TreeState.COLLAPSED);
    } else if (handData.gesture === 'open') {
      setState(TreeState.SCATTERED);
    } else if (handData.gesture === 'grab') {
      setState(TreeState.PHOTO_ZOOM);
    }
  }, [handData.gesture]);

  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoData[] = [];
    Array.from(files).forEach((file: File) => {
      const url = URL.createObjectURL(file);
      newPhotos.push({ id: Math.random().toString(36), url });
    });
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 30));
  };

  return (
    <div className="relative w-full h-screen bg-[#020508] overflow-hidden select-none font-sans text-white">
      {/* 3D 渲染层 */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 30], fov: 45 }} dpr={[1, 2]}>
          <color attach="background" args={['#020508']} />
          <fog attach="fog" args={['#020508', 15, 90]} />
          <TreeVisuals state={state} handData={handData} photos={photos} />
        </Canvas>
      </div>

      {/* 初始进入界面 */}
      {!isStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl transition-all duration-1000">
          <div className="text-center max-w-xl p-16 glass rounded-[4rem] border-white/5 shadow-[0_0_120px_rgba(255,204,51,0.15)]">
            <div className="mb-10 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center animate-pulse border border-yellow-500/20">
                <span className="text-4xl text-yellow-500">🎄</span>
              </div>
            </div>
            <h1 className="text-6xl font-thin tracking-[0.4em] text-white uppercase mb-6 leading-tight">
              星空 <span className="text-yellow-500 font-bold block mt-3">圣诞之境</span>
            </h1>
            <p className="text-white/40 mb-12 tracking-[0.3em] text-xs uppercase leading-loose">
              沉浸式 3D 手势交互体验<br/>由您的指尖重构节日的星辰
            </p>
            <button 
              onClick={() => setIsStarted(true)}
              className="group relative px-16 py-5 bg-yellow-500 rounded-full text-black font-bold uppercase tracking-[0.3em] text-sm hover:bg-yellow-400 transition-all active:scale-95 pointer-events-auto shadow-[0_0_30px_rgba(255,204,51,0.4)]"
            >
              开启体验
              <div className="absolute inset-0 rounded-full bg-yellow-400 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity" />
            </button>
            <div className="mt-10 text-[10px] text-white/20 tracking-[0.3em] uppercase">
              需开启摄像头权限以启用手势追踪
            </div>
          </div>
        </div>
      )}

      {/* 核心 UI 覆盖层 */}
      {isStarted && (
        <div className="absolute inset-0 pointer-events-none z-10 p-10 flex flex-col justify-between animate-in fade-in duration-1000">
          <header className="flex justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-[0.3em] text-white/90 uppercase">
                STARLIGHT <span className="text-yellow-500 font-bold">DECEMBER</span>
              </h1>
              <div className="h-[1px] w-48 bg-gradient-to-r from-yellow-500/50 to-transparent" />
              <p className="text-white/30 tracking-[0.4em] text-[10px] uppercase font-medium">
                Gesture Vision Controller v1.0
              </p>
            </div>
            
            <div className="glass px-8 py-5 rounded-3xl flex flex-col gap-3 items-end pointer-events-auto shadow-2xl border-white/5">
               <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">系统状态</span>
                    <span className="text-xs font-mono text-yellow-500 tracking-tighter">
                      {handData.landmarks.length > 0 ? `检测到手势: ${handData.gesture.toUpperCase()}` : '等待感应中...'}
                    </span>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${handData.landmarks.length > 0 ? 'bg-yellow-500 animate-pulse shadow-[0_0_15px_#ffcc33]' : 'bg-red-500/50'}`} />
               </div>
               <div className="h-[1px] w-full bg-white/5" />
               <div className="grid grid-cols-3 gap-4 text-[9px] text-white/30 uppercase tracking-[0.2em] text-center">
                  <div>握拳: 聚合</div>
                  <div>张开: 散落</div>
                  <div>抓取: 放大</div>
               </div>
            </div>
          </header>

          <footer className="flex justify-between items-end">
            <div className="flex flex-col gap-6 pointer-events-auto">
              <div className="glass p-8 rounded-[2.5rem] max-w-sm shadow-2xl border-white/5">
                <h2 className="text-xs font-bold text-yellow-500 uppercase tracking-[0.3em] mb-4">回忆星云 / Photo Cloud</h2>
                <p className="text-[10px] text-white/40 mb-6 leading-relaxed uppercase tracking-[0.2em]">
                  上传您的照片，它们将化作环绕圣诞树的永恒星光。
                </p>
                <label className="group block w-full relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-[10px] text-white/40
                      file:mr-5 file:py-3 file:px-8
                      file:rounded-full file:border-0
                      file:text-[10px] file:font-bold
                      file:bg-white/10 file:text-yellow-500
                      hover:file:bg-white/20 cursor-pointer transition-all"
                  />
                </label>
              </div>
              
              <div className="flex gap-3">
                 {(['COLLAPSED', 'SCATTERED', 'PHOTO_ZOOM'] as TreeState[]).map((s) => (
                   <button
                     key={s}
                     onClick={() => setState(s)}
                     className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] transition-all border ${
                       state === s 
                       ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_25px_rgba(255,204,51,0.4)]' 
                       : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60'
                     }`}
                   >
                     {s === 'COLLAPSED' ? '经典形态' : s === 'SCATTERED' ? '星尘散落' : '聚焦时刻'}
                   </button>
                 ))}
              </div>
            </div>

            <div className="text-right space-y-2 opacity-30 group hover:opacity-100 transition-opacity">
              <div className="text-[9px] text-white font-mono tracking-[0.4em] uppercase">
                Created by Celestial Engineer
              </div>
              <div className="text-[8px] text-yellow-500 font-mono tracking-[0.2em] uppercase">
                Three.js + MediaPipe Vision Engine
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* 手势追踪视频源 */}
      <HandTracker onHandUpdate={handleHandUpdate} active={isStarted} />
    </div>
  );
};

export default App;
