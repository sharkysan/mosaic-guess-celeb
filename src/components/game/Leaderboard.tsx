import React from 'react';
import { Users, Trophy, Hash } from 'lucide-react';

interface Player {
  id: string;
  displayName: string;
  score: number;
  photoURL: string;
  lastGuess?: string;
}

interface LeaderboardProps {
  id: string;
  players: Player[];
  hostId: string;
  currentUserId: string;
}

export function Leaderboard({ id, players, hostId, currentUserId }: LeaderboardProps) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Users size={18} /> Players
        </h3>
        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-mono font-bold tracking-tight">#{id}</span>
      </div>
      <div className="divide-y divide-white/5 max-h-[400px] lg:max-h-none overflow-y-auto">
        {players.sort((a, b) => b.score - a.score).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={p.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-white/10" />
                {p.id === hostId && <div className="absolute -top-1 -right-1 bg-amber-500 w-4 h-4 rounded-full border-4 border-zinc-900" />}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${p.id === currentUserId ? 'text-indigo-400' : 'text-zinc-200'}`}>
                  {p.displayName}
                </span>
                {p.lastGuess && <span className="text-[10px] text-zinc-500 italic truncate max-w-[100px]">"{p.lastGuess}"</span>}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-white">{p.score}</span>
                <Trophy size={14} className="text-amber-500" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
