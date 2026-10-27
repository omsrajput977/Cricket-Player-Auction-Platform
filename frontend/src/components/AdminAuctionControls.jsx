import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  Gavel,
  XCircle,
  UserPlus,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const AdminAuctionControls = ({
  tournamentId,
  activePlayer,
  currentHighestBid,
  currentBidderTeamId,
  players,
  timerRunning,
  status,
  onRefresh,
}) => {
  const { socket } = useSocket();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter approved upcoming players
  const upcomingPlayers = (players || []).filter(
    (p) => p.status === 'APPROVED' || p.status === 'UPCOMING'
  );

  const showError = (msg) => {
    setAdminError(msg);
    setTimeout(() => setAdminError(null), 4000);
  };

  const handleLoadPlayer = () => {
    if (!selectedPlayerId || !socket) return;
    setAdminError(null);
    socket.emit('ADMIN_LOAD_PLAYER', {
      tournamentId,
      playerId: selectedPlayerId,
    });
    setSelectedPlayerId('');
  };

  const handleStartBidding = () => {
    if (!socket) return;
    setAdminError(null);
    socket.emit('ADMIN_START_BIDDING', { tournamentId });
  };

  const handlePauseTimer = () => {
    if (!socket) return;
    socket.emit('ADMIN_PAUSE_TIMER', { tournamentId });
  };

  const handleResumeTimer = () => {
    if (!socket) return;
    socket.emit('ADMIN_RESUME_TIMER', { tournamentId });
  };

  const handleConfirmSold = () => {
    if (!socket) return;

    if (!activePlayer || !currentBidderTeamId || currentHighestBid === 0) {
      showError('No bids placed. Please use "Mark Unsold" instead.');
      return;
    }

    setActionLoading(true);
    socket.emit('ADMIN_CONFIRM_SOLD', { tournamentId });

    // Confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setTimeout(() => setActionLoading(false), 1500);
  };

  const handleMarkUnsold = () => {
    if (!socket || !activePlayer) return;
    setActionLoading(true);
    socket.emit('ADMIN_MARK_UNSOLD', { tournamentId });
    setTimeout(() => setActionLoading(false), 1500);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-cricket-gold/30 bg-stadium-card/90">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stadium-border/60 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cricket-gold/20 flex items-center justify-center text-cricket-gold border border-cricket-gold/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Auctioneer Command Console</h3>
            <p className="text-xs text-slate-400">Exclusive organizer controls to push players and adjudicate sales</p>
          </div>
        </div>

        {status && (
          <span className="self-start sm:self-auto text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-cricket-gold border border-cricket-gold/30">
            Podium State: {status}
          </span>
        )}
      </div>

      {adminError && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs font-semibold text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{adminError}</span>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-6 items-end">
        {/* Push Next Player Drawer */}
        <div className="md:col-span-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Select Player to Push to Podium ({upcomingPlayers.length} in Queue)
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="flex-1 bg-stadium-surface border border-stadium-border text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cricket-cyan"
            >
              <option value="">-- Choose next player --</option>
              {upcomingPlayers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.role.replace(/_/g, ' ')}) — Base: {p.basePrice?.toLocaleString()} pts
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadPlayer}
              disabled={!selectedPlayerId}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-cricket-cyan hover:bg-cyan-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Push</span>
            </button>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Timer Orchestration
          </label>
          <div className="flex gap-2">
            {!timerRunning ? (
              <button
                onClick={status === 'PAUSED' ? handleResumeTimer : handleStartBidding}
                disabled={!activePlayer}
                className="flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{status === 'PAUSED' ? 'Resume Timer' : 'Start Timer (20s)'}</span>
              </button>
            ) : (
              <button
                onClick={handlePauseTimer}
                className="flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1.5"
              >
                <Pause className="w-4 h-4 fill-slate-950" />
                <span>Pause Timer</span>
              </button>
            )}
          </div>
        </div>

        {/* Finalize Hammer Actions */}
        <div className="md:col-span-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Auction Adjudication
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleConfirmSold}
              disabled={actionLoading || !activePlayer || !currentBidderTeamId}
              className="py-2.5 px-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
            >
              <Gavel className="w-4 h-4" />
              <span>Confirm SOLD</span>
            </button>

            <button
              onClick={handleMarkUnsold}
              disabled={actionLoading || !activePlayer}
              className="py-2.5 px-3 rounded-xl font-extrabold text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Mark UNSOLD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
