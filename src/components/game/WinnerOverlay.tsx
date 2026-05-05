import React from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';

interface WinnerData {
  name: string;
  celebrity: string;
  imageUrl: string;
}

interface WinnerOverlayProps {
  winnerData: WinnerData | null;
  currentUserId: string;
  currentUserDisplayName: string | null;
  isHost: boolean;
  onNextRound: () => void;
}

export function WinnerOverlay({ winnerData, currentUserId, currentUserDisplayName, isHost, onNextRound }: WinnerOverlayProps) {
  if (!winnerData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md p-8 z-20"
    >
      <div className="text-center space-y-6 max-w-sm w-full">
        <motion.div 
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="relative mx-auto w-48 h-48">
            <img 
              src={winnerData.imageUrl} 
              alt={winnerData.celebrity} 
              className="w-full h-full object-cover rounded-2xl shadow-2xl border-4 border-amber-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-4 -right-4 bg-amber-500 p-3 rounded-full shadow-lg">
              <Trophy size={24} className="text-black" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
              {winnerData.name === currentUserDisplayName ? "YOU GUESSED IT!" : `${winnerData.name} GUESSED IT!`}
            </h4>
            <p className="text-xl font-bold text-amber-400">
              It's {winnerData.celebrity}
            </p>
          </div>

          {isHost && (
            <button
              onClick={onNextRound}
              className="w-full bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-tight hover:bg-zinc-200 transition-all cursor-pointer shadow-xl active:scale-95"
            >
              Next Round
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
