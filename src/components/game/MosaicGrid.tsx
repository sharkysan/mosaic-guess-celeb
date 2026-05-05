import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { TOTAL_TILES } from '../../constants';

interface MosaicGridProps {
  imageUrl?: string;
  imgLoaded: boolean;
  setImgLoaded: (loaded: boolean) => void;
  revealedIndices: Set<number>;
  onImageError?: () => void;
}

export function MosaicGrid({ imageUrl, imgLoaded, setImgLoaded, revealedIndices, onImageError }: MosaicGridProps) {
  if (!imageUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-6">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
          <div className="bg-indigo-600/20 p-6 rounded-full">
            <RefreshCw size={48} className="text-white/20" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-white italic uppercase tracking-widest opacity-30">Waiting for Start</p>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-tighter mt-1">Host must pick a celebrity to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <img 
        src={imageUrl} 
        alt="Celebrity" 
        className={`w-full h-full object-cover transition-all duration-1000 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} 
        onLoad={() => setImgLoaded(true)}
        onError={() => {
          console.error("Image failed to load:", imageUrl);
          if (onImageError) onImageError();
        }}
        referrerPolicy="no-referrer"
      />
      
      {/* Centered Focus Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] opacity-60" />
      
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
           <RefreshCw className="animate-spin text-indigo-500/50" size={40} />
        </div>
      )}

      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none">
        {Array.from({ length: TOTAL_TILES }).map((_, i) => (
          <div key={i} className="w-full h-full relative">
            <AnimatePresence>
              {!revealedIndices.has(i) && (
                <motion.div
                  initial={false}
                  exit={{ 
                    opacity: 0, 
                    scale: 1.2, 
                    filter: 'blur(8px)',
                    zIndex: 10
                  }}
                  transition={{ 
                    duration: 0.8, 
                    ease: [0.43, 0.13, 0.23, 0.96] 
                  }}
                  className="absolute inset-0 bg-zinc-950 border-[0.25px] border-white/5"
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
