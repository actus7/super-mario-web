import React, { useRef, useState, useEffect } from 'react';
import { useGameLoop } from './hooks/useGameLoop';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants';
import { generateLevelAI } from './utils/ai';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { status, startGame, resetGame, loadLevel } = useGameLoop(canvasRef);
  
  const [scale, setScale] = useState(3);
  const [showAiModal, setShowAiModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      const s = Math.min(w / SCREEN_WIDTH, h / SCREEN_HEIGHT);
      setScale(Math.floor(s));
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    
    const levelData = await generateLevelAI(prompt);
    
    if (levelData) {
      loadLevel(levelData);
      setShowAiModal(false);
      setPrompt('');
    } else {
      setGenError("Failed to generate level. Try again.");
    }
    setIsGenerating(false);
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-zinc-900 font-['Press_Start_2P']">
      <div 
        style={{ 
          width: SCREEN_WIDTH * scale, 
          height: SCREEN_HEIGHT * scale,
          position: 'relative' 
        }}
        className="shadow-2xl bg-black overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          style={{
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
            display: 'block'
          }}
        />

        {/* MENU OVERLAY */}
        {status === 'MENU' && !showAiModal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10">
            <h1 className="text-4xl text-red-600 mb-2 drop-shadow-[2px_2px_0_rgba(255,255,255,0.5)]">SUPER MARIO</h1>
            <p className="text-xs text-gray-400 mb-8">REACT EDITION</p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={startGame}
                className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-black text-xs uppercase tracking-widest"
              >
                Play Original
              </button>
              <button 
                onClick={() => setShowAiModal(true)}
                className="px-6 py-3 border-2 border-[#5c94fc] text-[#5c94fc] hover:bg-[#5c94fc] hover:text-white text-xs uppercase tracking-widest"
              >
                ✨ Create AI Level
              </button>
            </div>
          </div>
        )}
        
        {/* GAMEOVER OVERLAY */}
        {status === 'GAMEOVER' && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10">
              <h1 className="text-3xl mb-4">GAME OVER</h1>
              <button onClick={resetGame} className="animate-pulse text-xs mt-4">PRESS R TO RESTART</button>
           </div>
        )}
        
        {/* WIN OVERLAY */}
        {status === 'WIN' && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10">
              <h1 className="text-3xl text-green-500 mb-4">COURSE CLEAR!</h1>
              <button onClick={resetGame} className="animate-pulse text-xs mt-4">PRESS R TO RESTART</button>
           </div>
        )}

        {/* AI MODAL */}
        {showAiModal && (
          <div className="absolute inset-0 bg-black/95 z-20 flex flex-col items-center justify-center p-8">
             <h2 className="text-[#5c94fc] text-xs mb-4">DESCRIBE YOUR LEVEL</h2>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g. A sky world with lots of pipes and coins..."
                className="w-full h-24 bg-zinc-800 border-2 border-white text-white text-[10px] p-4 mb-4 focus:outline-none focus:border-[#5c94fc] resize-none font-mono"
                disabled={isGenerating}
             />
             {genError && <p className="text-red-500 text-[8px] mb-4">{genError}</p>}
             
             <div className="flex gap-4">
               <button 
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-[10px]"
                  disabled={isGenerating}
               >
                 CANCEL
               </button>
               <button 
                  onClick={handleGenerate}
                  className="px-4 py-2 border border-[#5c94fc] text-[#5c94fc] hover:bg-[#5c94fc] hover:text-white text-[10px]"
                  disabled={isGenerating}
               >
                 {isGenerating ? 'GENERATING...' : 'GENERATE'}
               </button>
             </div>
          </div>
        )}

        {/* Mobile Controls Overlay */}
        <div className="absolute bottom-4 left-4 md:hidden flex gap-2 opacity-50 hover:opacity-100 z-30 pointer-events-auto">
            <button className="w-16 h-16 bg-white/20 rounded-full border-2 border-white text-white" 
               onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' })); }}
               onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' })); }}
            >←</button>
            <button className="w-16 h-16 bg-white/20 rounded-full border-2 border-white text-white"
               onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' })); }}
               onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' })); }}
            >→</button>
        </div>
        
        <div className="absolute bottom-4 right-4 md:hidden flex gap-4 opacity-50 hover:opacity-100 z-30 pointer-events-auto">
            <button className="w-16 h-16 bg-red-500/40 rounded-full border-2 border-red-500 text-white"
               onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX' })); }}
               onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX' })); }}
            >B</button>
            <button className="w-16 h-16 bg-green-500/40 rounded-full border-2 border-green-500 text-white"
               onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); }}
               onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); }}
            >A</button>
        </div>
      </div>
      
      <div className="absolute top-4 text-white/50 text-xs font-mono">
         ARROWS to Move • SPACE to Jump • X to Run/Shoot
      </div>
    </div>
  );
};

export default App;
