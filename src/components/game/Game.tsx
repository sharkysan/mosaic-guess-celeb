import React, { useState, useEffect, useRef } from 'react';
import { Play, Send, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, db, doc, onSnapshot, updateDoc, collection, setDoc, serverTimestamp, increment, handleFirestoreError, OperationType } from '../../firebase';
import { CELEBRITIES, TOTAL_TILES, REVEAL_INTERVAL_MS } from '../../constants';
import Fuse from 'fuse.js';
import confetti from 'canvas-confetti';
import { Leaderboard } from './Leaderboard';
import { MosaicGrid } from './MosaicGrid';
import { WinnerOverlay } from './WinnerOverlay';
import { generateCelebrityHint } from '../../services/geminiService';
import { Sparkles, Info } from 'lucide-react';

interface GameProps {
  id: string;
  user: User;
}

export function Game({ id, user }: GameProps) {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [guess, setGuess] = useState('');
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [winnerData, setWinnerData] = useState<{ name: string; celebrity: string; imageUrl: string } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imgFetchError, setImgFetchError] = useState(false);
  const revealTimerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (room?.status === 'playing' && !room?.winner) {
      inputRef.current?.focus();
      setImgFetchError(false);
    }
  }, [room?.status, room?.winner, room?.currentCelebrity]);

  useEffect(() => {
    const unsubRoom = onSnapshot(doc(db, 'rooms', id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom(data);
        
        if (data.status === 'playing' && data.hostId === user.uid && !data.winner) {
           if (!revealTimerRef.current) {
             startRevealLoop(id, data.hiddenPieces || []);
           }
        } else {
           stopRevealLoop();
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'rooms/' + id));

    const playerRef = doc(db, 'rooms', id, 'players', user.uid);
    setDoc(playerRef, {
      displayName: user.displayName,
      score: 0,
      photoURL: user.photoURL,
      joinedAt: serverTimestamp(),
      isReady: true,
    }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'rooms/' + id + '/players/' + user.uid));

    const unsubPlayers = onSnapshot(collection(db, 'rooms', id, 'players'), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      stopRevealLoop();
    };
  }, [id, user.uid]);

  useEffect(() => {
    setImgLoaded(false);
  }, [room?.imageUrl]);

  useEffect(() => {
    const hiddenArr = room?.hiddenPieces || [];
    const all = Array.from({ length: TOTAL_TILES }, (_, i) => i);
    const hiddenSet = new Set(hiddenArr.map(Number));
    const revealed = all.filter(i => !hiddenSet.has(i));
    setRevealedIndices(new Set(revealed));
    
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
    stopRevealLoop();
    let currentHidden = [...initialHidden];
    if (currentHidden.length === 0) return;

    revealTimerRef.current = setInterval(async () => {
      if (currentHidden.length === 0) {
        stopRevealLoop();
        return;
      }
      
      const toRevealCount = Math.max(2, Math.floor(TOTAL_TILES / 40)); 
      const toReveal: number[] = [];
      
      // Pick random tiles from the entire list
      for(let i=0; i<toRevealCount && currentHidden.length > 0; i++) {
        const idx = Math.floor(Math.random() * currentHidden.length);
        toReveal.push(currentHidden.splice(idx, 1)[0]);
      }

      await updateDoc(doc(db, 'rooms', roomId), {
        hiddenPieces: currentHidden,
        revealProgress: ((TOTAL_TILES - currentHidden.length) / TOTAL_TILES) * 100
      }).catch(stopRevealLoop);
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
    
    setWinnerData(null);
    
    // Optimistically update room state immediately to start round
    await updateDoc(doc(db, 'rooms', id), {
      status: 'playing',
      currentCelebrity: celeb.name,
      imageUrl: celeb.imageUrl,
      currentHint: "Thinking of a hint...",
      hiddenPieces: hidden,
      revealProgress: 0,
      winner: null,
      lastRevealAt: serverTimestamp()
    });

    // Generate hint in background and update
    const hint = await generateCelebrityHint(celeb.name);
    await updateDoc(doc(db, 'rooms', id), {
      currentHint: hint
    });
  };

  const skipRound = async () => {
    if (room.hostId !== user.uid) return;
    await updateDoc(doc(db, 'rooms', id), {
      status: 'waiting',
      winner: 'nobody',
      hiddenPieces: [] 
    });
  };

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || room.status !== 'playing' || room.winner) return;

    const fuse = new Fuse([room.currentCelebrity], { 
      threshold: 0.4,
      location: 0,
      distance: 100,
      minMatchCharLength: 2
    });
    const result = fuse.search(guess.trim());

    if (result.length > 0) {
      const g = guess;
      setGuess('');
      await updateDoc(doc(db, 'rooms', id), {
        winner: user.uid,
        status: 'waiting',
        hiddenPieces: []
      });
      await updateDoc(doc(db, 'rooms', id, 'players', user.uid), {
        score: increment(1),
        lastGuess: g
      });
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      setGuess('');
    }
  };

  if (!room) return null;

  return (
    <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 p-4 sm:p-8">
      <div className="lg:col-span-1 space-y-6">
        <Leaderboard id={id} players={players} hostId={room.hostId} currentUserId={user.uid} />

        <div className="space-y-3">
          {room.hostId === user.uid && room.status !== 'playing' && (
            <button
              onClick={startNextRound}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-black uppercase py-4 rounded-2xl hover:bg-zinc-200 transition-all cursor-pointer shadow-xl active:scale-95"
            >
              <Play size={22} fill="currentColor" />
              {room.status === 'waiting' && !room.winner ? 'Start Game' : 'Next Celebrity'}
            </button>
          )}

          {room.hostId === user.uid && room.status === 'playing' && (
            <button
              onClick={skipRound}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-all cursor-pointer border border-white/5 shadow-inner"
            >
              <RefreshCw size={20} />
              Skip & Reveal
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="relative aspect-square sm:aspect-video w-full bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
          <MosaicGrid 
            imageUrl={room.imageUrl}
            imgLoaded={imgLoaded}
            setImgLoaded={setImgLoaded}
            revealedIndices={revealedIndices}
            onImageError={() => {
              if (room.hostId === user.uid) {
                console.log("Host detected image error, skipping...");
                skipRound();
              }
            }}
          />

          <AnimatePresence>
            <WinnerOverlay 
              winnerData={winnerData}
              currentUserId={user.uid}
              currentUserDisplayName={user.displayName}
              isHost={room.hostId === user.uid}
              onNextRound={startNextRound}
            />
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {room.status === 'playing' && room.currentHint && (
            <motion.div
              key={room.currentHint}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-sm"
            >
              <div className="bg-indigo-600/20 p-2 rounded-xl text-indigo-400 shrink-0">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">AI Hint</p>
                <p className="text-lg font-medium text-white/90 leading-relaxed italic">
                  "{room.currentHint}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl"
        >
          <form onSubmit={handleGuess} className="flex gap-3">
            <input
              ref={inputRef}
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
        </motion.div>
      </div>
    </div>
  );
}
