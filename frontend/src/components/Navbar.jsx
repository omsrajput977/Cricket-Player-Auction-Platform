import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Trophy, Radio, Shield, LogOut, User as UserIcon, PlusCircle } from 'lucide-react';

export const Navbar = ({ activeView, setActiveView, tournaments, activeTournament, setActiveTournament }) => {
  const { user, logout, isAdmin, isTeamOwner } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-stadium-border/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Trophy className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CRIC<span className="text-cricket-cyan">AUCTION</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse-fast' : 'bg-red-400'}`}></span>
                {connected ? 'LIVE SYNC' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Real-Time Tournament Bidding Arena</p>
          </div>
        </div>

        {/* Tournament Selector */}
        {tournaments && tournaments.length > 0 && (
          <div className="hidden md:flex items-center gap-2.5 bg-stadium-card/80 border border-stadium-border px-3 py-1.5 rounded-lg text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Tournament:</span>
            <select
              value={activeTournament?._id || ''}
              onChange={(e) => {
                const found = tournaments.find((t) => t._id === e.target.value);
                if (found) setActiveTournament(found);
              }}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              {tournaments.map((t) => (
                <option key={t._id} value={t._id} className="bg-stadium-card text-white">
                  {t.name} ({t.edition})
                </option>
              ))}
            </select>

            {activeTournament && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                  activeTournament.status === 'LIVE_AUCTION'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse-fast'
                    : activeTournament.status === 'PAUSED'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {activeTournament.status === 'LIVE_AUCTION'
                  ? '● LIVE'
                  : activeTournament.status === 'PAUSED'
                  ? '⏸ PAUSED'
                  : activeTournament.status || 'DRAFT'}
              </span>
            )}
          </div>
        )}

        {/* Navigation & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveView('live-room')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeView === 'live-room'
                ? 'bg-cricket-cyan/20 text-cricket-cyan border border-cricket-cyan/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Stage</span>
          </button>

          <button
            onClick={() => setActiveView('nominate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeView === 'nominate'
                ? 'bg-cricket-cyan/20 text-cricket-cyan border border-cricket-cyan/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Nominate</span>
          </button>

          <button
            onClick={() => setActiveView('lookup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeView === 'lookup'
                ? 'bg-cricket-cyan/20 text-cricket-cyan border border-cricket-cyan/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Roll Lookup</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveView('admin-setup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'admin-setup'
                  ? 'bg-cricket-gold/20 text-cricket-gold border border-cricket-gold/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Admin Console</span>
            </button>
          )}


          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stadium-border">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                  {isAdmin && <Shield className="w-3 h-3 text-cricket-gold" />}
                  {user.name}
                </div>
                <div className="text-[10px] uppercase font-bold text-cricket-cyan">
                  {isAdmin ? 'Tournament Admin' : user.team ? user.team.name : 'Team Owner'}
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg bg-stadium-surface hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-stadium-border transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('login')}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-cricket-cyan to-emerald-500 text-slate-950 hover:brightness-110 shadow-lg shadow-cyan-500/10 transition-all"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
