import React, { useState } from 'react';
import { Plus, Hash } from 'lucide-react';
import { User, db, doc, setDoc, getDoc, serverTimestamp, handleFirestoreError, OperationType } from '../../firebase';

interface LobbyProps {
  user: User;
  onJoinRoom: (roomId: string) => void;
}

export function Lobby({ user, onJoinRoom }: LobbyProps) {
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
