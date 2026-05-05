import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { User, auth, googleProvider, signInWithPopup, signOut } from '../../firebase';

interface AuthProps {
  user: User | null;
}

export function Auth({ user }: AuthProps) {
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
