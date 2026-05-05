import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db, doc, setDoc, onSnapshot, updateDoc, collection, serverTimestamp, increment, handleFirestoreError, OperationType, getDoc } from './firebase';
import { CELEBRITIES, GRID_SIZE, TOTAL_TILES, REVEAL_INTERVAL_MS } from './constants';
import { LogIn, LogOut, Trophy, Users, Play, Send, Plus, Hash, RefreshCw } from 'lucide-react';
import Fuse from 'fuse.js';
import confetti from 'canvas-confetti';

// --- Components ---

function Auth({ user }: { user: User | null }) {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (user) {
    return (
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
        <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-white/40" />
        <span className="text-sm font-medium text-white hidden sm:inline">{user.displayName}</span>
        <button onClick={handleLogout} className="text-white/60 hover:text-white transition-colors cursor-pointer">
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-white/90 transition-all active:scale-95 cursor-pointer shadow-lg"
    >
      <LogIn size={20} />
      Login with Google
    </button>
  );
}

function Lobby({ user, onJoinRoom }: { user: User, onJoinRoom: (roomId: string) => void }) {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, 'rooms', newRoomId);
    
    try {
      await setDoc(roomRef, {
        status: 'waiting',
        hostId: user.uid,
        createdAt: serverTimestamp(),
        revealProgress: 0,
      });
      onJoinRoom(newRoomId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms/' + newRoomId);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    
    setLoading(true);
    const code = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', code);
    
    try {
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        onJoinRoom(code);
      } else {
        alert("Room not found!");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'rooms/' + code);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto space-y-8 p-8 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-white tracking-tight">Mosaic Guess</h2>
        <p className="text-zinc-400">Multiplayer Celebrity Reveal Quiz</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-500 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(79,70,229,0.3)]"
        >
          <Plus size={24} />
          Create New Room
        </button>

        <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-4 text-zinc-500 uppercase text-xs font-bold tracking-widest">or join existing</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={joinRoom} className="space-y-4">
          <div className="relative">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="ENTER ROOM CODE"
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-mono text-xl tracking-[0.2em] focus:outline-none focus:border-indigo-500/50 transition-colors uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !roomCode}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

function Game({ id, user }: { id: string, user: User }) {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [guess, setGuess] = useState('');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [winnerData, setWinnerData] = useState<{ name: string; celebrity: string; imageUrl: string } | null>(null);
  const revealTimerRef = useRef<any>(null);

  useEffect(() => {
    // Room listener
    const unsubRoom = onSnapshot(doc(db, 'rooms', id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        
        // Handle reveal logic on host side
        if (data.status === 'playing' && data.hostId === user.uid) {
           if (!revealTimerRef.current) {
             startRevealLoop(id, data.hiddenPieces || []);
           }
        } else {
           stopRevealLoop();
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'rooms/' + id));

    // Player join/update
    const playerRef = doc(db, 'rooms', id, 'players', user.uid);
    setDoc(playerRef, {
      displayName: user.displayName,
      score: 0,
      photoURL: user.photoURL,
      joinedAt: serverTimestamp(),
      isReady: false,
    }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'rooms/' + id + '/players/' + user.uid));

    const unsubPlayers = onSnapshot(collection(db, 'rooms', id, 'players'), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      stopRevealLoop();
    };
  }, [id, user.uid, user.displayName, user.photoURL]);

  useEffect(() => {
    // Sync revealed indices
    const hiddenArr = room?.hiddenPieces || [];
    const all = Array.from({ length: TOTAL_TILES }, (_, i) => i);
    const hiddenSet = new Set(hiddenArr);
    const revealed = all.filter(i => !hiddenSet.has(i));
    setRevealedIndices(new Set(revealed));
    
    // Handle winner data transition
    if (room?.winner && !winnerData) {
      if (room.winner === 'nobody') {
        setWinnerData({ name: "No one", celebrity: room.currentCelebrity, imageUrl: room.imageUrl });
      } else {
        const winner = players.find(p => p.id === room.winner);
        if (winner) {
          setWinnerData({ name: winner.displayName, celebrity: room.currentCelebrity, imageUrl: room.imageUrl });
          if (room.winner === user.uid) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          }
        }
      }
    } else if (!room?.winner) {
      setWinnerData(null);
    }
  }, [room?.hiddenPieces, room?.winner, room?.currentCelebrity, room?.imageUrl, players, user.uid, winnerData]);

  const startRevealLoop = (roomId: string, initialHidden: number[]) => {
    stopRevealLoop(); // Always clear previous loop before starting
    let currentHidden = [...initialHidden];
    revealTimerRef.current = setInterval(async () => {
      if (currentHidden.length === 0) {
        stopRevealLoop();
        return;
      }
      
      const toRevealCount = Math.max(2, Math.floor(TOTAL_TILES / 30)); 
      const toReveal: number[] = [];
      for(let i=0; i<toRevealCount && currentHidden.length > 0; i++) {
        const idx = Math.floor(Math.random() * currentHidden.length);
        toReveal.push(currentHidden.splice(idx, 1)[0]);
      }

      await updateDoc(doc(db, 'rooms', roomId), {
        hiddenPieces: currentHidden,
        revealProgress: ((TOTAL_TILES - currentHidden.length) / TOTAL_TILES) * 100
      }).catch(() => stopRevealLoop());
    }, REVEAL_INTERVAL_MS);
  };

  const stopRevealLoop = () => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const startNextRound = async () => {
    if (room.hostId !== user.uid) return;
    
    const celeb = CELEBRITIES[Math.floor(Math.random() * CELEBRITIES.length)];
    const hidden = Array.from({ length: TOTAL_TILES }, (_, i) => i);
    
    await updateDoc(doc(db, 'rooms', id), {
      status: 'playing',
      currentCelebrity: celeb.name,
      imageUrl: celeb.imageUrl,
      hiddenPieces: hidden,
      revealProgress: 0,
      winner: null,
      lastRevealAt: serverTimestamp()
    });
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || room.status !== 'playing' || room.winner) return;

    const fuse = new Fuse([room.currentCelebrity], { threshold: 0.4 });
    const result = fuse.search(guess.trim());

    if (result.length > 0) {
      setGuess('');
      await updateDoc(doc(db, 'rooms', id), {
        winner: user.uid,
        status: 'waiting',
        hiddenPieces: [] // Reveal everything on win
      });
      await updateDoc(doc(db, 'rooms', id, 'players', user.uid), {
        score: increment(1)
      });
    } else {
      setGuess('');
    }
  };

  if (!room) return null;

  return (
    <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 sm:p-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Users size={16} /> Players
            </h3>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase">#{id}</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[300px] lg:max-h-none overflow-y-auto">
            {players.sort((a, b) => b.score - a.score).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={p.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/20" />
                    {p.id === room.hostId && <div className="absolute -top-1 -right-1 bg-amber-500 w-3 h-3 rounded-full border-2 border-zinc-900" title="Host" />}
                  </div>
                  <span className={`text-sm font-medium ${p.id === user.uid ? 'text-indigo-400' : 'text-zinc-300'}`}>
                    {p.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500/50" />
                  <span className="text-white font-bold">{p.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {room.hostId === user.uid && room.status !== 'playing' && (
          <button
            onClick={startNextRound}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Play size={20} fill="currentColor" />
            {room.status === 'waiting' ? (room.winner ? 'Next Celebrity' : 'Start Round') : 'Next Celebrity'}
          </button>
        )}

        {room.hostId === user.uid && room.status === 'playing' && (
          <button
            onClick={async () => {
              await updateDoc(doc(db, 'rooms', id), {
                status: 'waiting',
                winner: 'nobody',
                hiddenPieces: [] // Reveal everything on skip
              });
            }}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <RefreshCw size={20} />
            Skip / Reveal
          </button>
        )}
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="relative aspect-square sm:aspect-video w-full bg-zinc-950 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
          {room.imageUrl ? (
            <>
              <img src={room.imageUrl} alt="Celebrity" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 grid grid-cols-12 grid-rows-12">
                {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                  <div key={i} className="w-full h-full relative">
                    <AnimatePresence>
                      {!revealedIndices.has(i) && (
                        <motion.div
                          initial={false}
                          exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="absolute inset-0 bg-zinc-900 border-[0.5px] border-white/5"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
              <RefreshCw size={48} className="animate-spin-slow opacity-20" />
              <p className="font-medium">Waiting for host to start...</p>
            </div>
          )}

          <AnimatePresence>
            {winnerData && (
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
                        {winnerData.name === user.displayName ? "YOU GUESSED IT!" : `${winnerData.name} GUESSED IT!`}
                      </h4>
                      <p className="text-xl font-bold text-amber-400">
                        It's {winnerData.celebrity}
                      </p>
                    </div>

                    {room.hostId === user.uid && (
                      <button
                        onClick={startNextRound}
                        className="w-full bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-tight hover:bg-zinc-200 transition-all cursor-pointer shadow-xl active:scale-95"
                      >
                        Next Round
                      </button>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
          <form onSubmit={handleGuess} className="flex gap-3">
            <input
              type="text"
              disabled={room.status !== 'playing' || !!room.winner}
              placeholder={room.status === 'playing' ? "Who is this celebrity?" : "Wait for round to start..."}
              className="flex-grow bg-black/40 border border-white/10 rounded-xl px-6 py-4 text-white font-medium focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
            />
            <button
              type="submit"
              disabled={room.status !== 'playing' || !!room.winner || !guess.trim()}
              className="bg-indigo-600 text-white p-4 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-20 disabled:grayscale cursor-pointer active:scale-95"
            >
              <Send size={24} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
