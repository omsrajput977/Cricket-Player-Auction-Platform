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
  Flag,
  CheckCircle2,
} from 'lucide-react';

export const AdminAuctionControls = ({
  tournamentId,
  tournamentStatus,
  onToggleLiveStatus,
  activePlayer,
  currentHighestBid,
  currentBidderTeamId,
  teams,
  players,
  timerRunning,
  remainingMs = 0,
  status,
  onRefresh,
}) => {
  const { socket } = useSocket();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedFallbackTeamId, setSelectedFallbackTeamId] = useState('');
  const [adminError, setAdminError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const handleFinishTournament = () => {
    if (!socket || !tournamentId) return;
    setActionLoading(true);
    socket.emit('ADMIN_FINISH_TOURNAMENT', { tournamentId });
    setShowFinishConfirm(false);
    setTimeout(() => setActionLoading(false), 800);
  };

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

  const handleUnloadPodium = () => {
    if (!socket || !activePlayer) return;
    setAdminError(null);
    socket.emit('ADMIN_UNLOAD_PODIUM', { tournamentId });
  };

  const handleFallbackBid = () => {
    if (!socket || !selectedFallbackTeamId || !activePlayer) return;
    if (status !== 'BIDDING' || !timerRunning) {
      showError('Cannot place fallback bid: bidding timer has not been started yet.');
      return;
    }
    setActionLoading(true);
    socket.emit('ADMIN_FALLBACK_BID', {
      tournamentId,
      targetTeamId: selectedFallbackTeamId,
    });
    setTimeout(() => setActionLoading(false), 800);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-cricket-gold/30 bg-stadium-card/90 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stadium-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cricket-gold/20 flex items-center justify-center text-cricket-gold border border-cricket-gold/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Auctioneer Command Console</h3>
            <p className="text-xs text-slate-400">Exclusive organizer controls to push players, adjudicate sales, and place fallback bids</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tournamentStatus && (
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                tournamentStatus === 'LIVE_AUCTION'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : tournamentStatus === 'PAUSED'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : tournamentStatus === 'COMPLETED'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Tournament: {tournamentStatus}
            </span>
          )}
          {status && (
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-cricket-gold border border-cricket-gold/30">
              Podium: {status}
            </span>
          )}

          {/* Finish Tournament Auction Action */}
          {tournamentStatus !== 'COMPLETED' ? (
            <button
              type="button"
              onClick={() => setShowFinishConfirm(true)}
              disabled={actionLoading}
              className="px-3 py-1 rounded-full font-bold text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Conclude and finish tournament auction"
            >
              <Flag className="w-3.5 h-3.5 text-rose-400" />
              <span>Finish Tournament</span>
            </button>
          ) : (
            <span className="px-3 py-1 rounded-full font-bold text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Auction Completed</span>
            </span>
          )}
        </div>
      </div>

      {adminError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs font-semibold text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{adminError}</span>
        </div>
      )}

      {/* Row 1: Podium & Timer Orchestration */}
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
              title="Push player to podium (returns any previous player to the queue)"
            >
              <UserPlus className="w-4 h-4" />
              <span>Push</span>
            </button>
            {activePlayer && (
              <button
                onClick={handleUnloadPodium}
                className="px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 shrink-0"
                title="Unload current player and return them back to the selection queue"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Unload</span>
              </button>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Timer Orchestration
          </label>
          <div className="flex gap-2">
            {tournamentStatus === 'PAUSED' ? (
              <button
                disabled
                className="flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs bg-slate-800/90 text-amber-400 border border-amber-500/40 cursor-not-allowed opacity-80 shadow-none transition-all flex items-center justify-center gap-1.5"
                title="Tournament auction is paused by admin. Resume auction to operate timer."
              >
                <Pause className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Paused</span>
              </button>
            ) : !timerRunning ? (
              <button
                onClick={status === 'PAUSED' ? handleResumeTimer : handleStartBidding}
                disabled={!activePlayer}
                className="flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>
                  {status === 'PAUSED'
                    ? `Resume Timer ${remainingMs > 0 ? `(${Math.ceil(remainingMs / 1000)}s)` : ''}`
                    : 'Start Timer (20s)'}
                </span>
              </button>
            ) : (
              <button
                onClick={handlePauseTimer}
                className="flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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

      {/* Row 2: Fallback Bidding Console (Campus Wi-Fi Disconnect Protection) */}
      <div className="pt-4 border-t border-stadium-border/60 bg-stadium-surface/40 p-4 rounded-xl border border-stadium-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cricket-gold animate-ping"></span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-cricket-gold">
                Admin Fallback Bid (Wi-Fi Disconnect Failover)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Place a verified incremental bid on behalf of a franchise whose campus connection dropped
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedFallbackTeamId}
              onChange={(e) => setSelectedFallbackTeamId(e.target.value)}
              disabled={!activePlayer}
              className="bg-stadium-card border border-stadium-border text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cricket-gold flex-1 sm:w-64"
            >
              <option value="">-- Select disconnected team --</option>
              {(teams || []).map((t) => {
                const teamId = t._id || t.id;
                const isLeading = teamId === currentBidderTeamId;
                return (
                  <option key={teamId} value={teamId} disabled={isLeading}>
                    {t.name} ({t.shortName}) — Purse: {t.remainingPurse?.toLocaleString()} pts {isLeading ? '(Leading)' : ''}
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleFallbackBid}
              disabled={
                actionLoading ||
                !selectedFallbackTeamId ||
                !activePlayer ||
                selectedFallbackTeamId === currentBidderTeamId ||
                status !== 'BIDDING' ||
                !timerRunning
              }
              className="px-4 py-2.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-cricket-gold to-amber-500 hover:brightness-110 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-amber-950/40"
            >
              ⚡ Force Fallback Bid
            </button>
          </div>
        </div>
      </div>

      {/* Finish Tournament Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-7 rounded-2xl max-w-md w-full border border-rose-500/40 shadow-2xl space-y-4 animate-fade-in bg-stadium-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">Finish Tournament Auction?</h4>
                <p className="text-xs text-slate-400">Finalize squads and conclude bidding</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to officially finish this tournament auction? This will clear the active podium, stop any running timer, lock bidding for all teams, and mark the tournament status as <strong className="text-purple-400 font-mono">COMPLETED</strong>.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinishTournament}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-rose-500 to-red-600 text-white hover:brightness-110 shadow-lg shadow-rose-950/40 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Concluding...' : 'Yes, Finish Auction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



