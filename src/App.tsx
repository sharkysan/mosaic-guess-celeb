import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth, onAuthStateChanged, User } from './firebase';
import { Hash } from 'lucide-react';
import { Auth } from './components/auth/Auth';
import { Lobby } from './components/game/Lobby';
import { Game } from './components/game/Game';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
  }, []);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 text-white">
      <header className="p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent fixed top-0 w-full z-30">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setRoomId(null)}>
          <div className="bg-indigo-600 p-2 rounded-xl rotate-3 shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <Hash className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase sm:block hidden">Mosaic Quiz</h1>
        </div>
        <Auth user={user} />
      </header>

      <main className="pt-24 min-h-screen flex flex-col items-center justify-center relative z-10">
        {!user ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 p-12"
          >
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full" />
              <div className="bg-zinc-900 aspect-square w-32 flex items-center justify-center rounded-[2rem] border border-white/10 shadow-2xl rotate-6 mb-8 mx-auto">
                 <Hash size={64} className="text-indigo-500" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-black italic uppercase tracking-tighter sm:text-7xl">
                Guess the <span className="text-indigo-500">Famous</span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-md mx-auto">
                Join a room, watch the mosaic reveal, and be the first to identify the celebrity.
              </p>
            </div>
            <Auth user={null} />
          </motion.div>
        ) : !roomId ? (
          <Lobby user={user} onJoinRoom={setRoomId} />
        ) : (
          <Game id={roomId} user={user} />
        )}
      </main>

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
