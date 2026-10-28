import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { User, Flame, Clock, AlertTriangle, ArrowUpRight, Award, Zap, Pause } from 'lucide-react';

export const ActivePodium = ({
  tournamentId,
  activePlayer,
  currentHighestBid,
  currentBidderTeamId,
  teams,
  endsAt,
  status,
  timerRunning,
  nextBidAmount,
}) => {
  const { user, isTeamOwner } = useAuth();
  const { socket, getTrueServerTime } = useSocket();

  const [remainingSec, setRemainingSec] = useState(0);
  const [bidError, setBidError] = useState(null);
  const [biddingLoading, setBiddingLoading] = useState(false);

  // High precision timer synchronized with serverNow clock offset
  useEffect(() => {
    if (!endsAt || !timerRunning) {
      setRemainingSec(0);
      return;
    }

    const updateTimer = () => {
      const now = getTrueServerTime();
      const diffMs = Math.max(0, endsAt - now);
      const seconds = Math.ceil(diffMs / 1000);
      setRemainingSec(seconds);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [endsAt, timerRunning, getTrueServerTime]);

  // Listen for socket bid rejections
  useEffect(() => {
    if (!socket) return;

    const handleRejected = (data) => {
      setBidError(data.reason || 'Bid rejected by auction server.');
      setBiddingLoading(false);
      setTimeout(() => setBidError(null), 4000);
    };

    const handleAccepted = () => {
      setBidError(null);
      setBiddingLoading(false);
    };

    socket.on('BID_REJECTED', handleRejected);
    socket.on('BID_ACCEPTED', handleAccepted);

    return () => {
      socket.off('BID_REJECTED', handleRejected);
      socket.off('BID_ACCEPTED', handleAccepted);
    };
  }, [socket]);

  // Find leading team and user's team object
  const myTeamId = (user?.team?._id || user?.team?.id || user?.teamId)?.toString();
  const leadingTeam = teams?.find((t) => (t._id || t.id)?.toString() === currentBidderTeamId?.toString());
  const userTeam = teams?.find((t) => (t._id || t.id)?.toString() === myTeamId);

  // Check if current team already holds highest bid
  const isUserTeamLeading = Boolean(myTeamId && currentBidderTeamId && myTeamId === currentBidderTeamId.toString());

  // Handle One-Click Bid Action
  const handlePlaceBid = () => {
    if (!socket || !isTeamOwner || biddingLoading || isUserTeamLeading) return;

    if (status !== 'BIDDING' || !timerRunning || remainingSec === 0) {
      setBidError('Bidding has not started yet. Please wait for the auctioneer to start the timer.');
      setTimeout(() => setBidError(null), 3500);
      return;
    }

    setBidError(null);
    setBiddingLoading(true);

    // Stale Bid Protection: send expectedAmount
    socket.emit('PLACE_BID', {
      tournamentId,
      expectedAmount: nextBidAmount,
    });
  };

  if (!activePlayer) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[460px] border border-stadium-border/60">
        <div className="w-20 h-20 rounded-full bg-stadium-surface/80 flex items-center justify-center mb-4 border border-stadium-border text-slate-500">
          <User className="w-10 h-10 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-bold text-slate-300 mb-1">Podium Is Empty</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          The auction master will introduce the next player onto the podium shortly. Stand by with your team purse!
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold text-cricket-cyan bg-cricket-cyan/10 px-3 py-1.5 rounded-full border border-cricket-cyan/20">
          <Zap className="w-3.5 h-3.5" />
          <span>Real-time Socket Connected & Ready</span>
        </div>
      </div>
    );
  }

  // Timer Color logic
  let timerBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let timerText = `${remainingSec}s`;
  if (remainingSec <= 5 && remainingSec > 0) {
    timerBadgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse-fast';
    timerText = `${remainingSec}s (Going Twice!)`;
  } else if (remainingSec <= 10 && remainingSec > 5) {
    timerBadgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    timerText = `${remainingSec}s (Going Once)`;
  } else if (remainingSec === 0 && status === 'PAUSED_EXPIRED') {
    timerBadgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    timerText = 'HAMMER DOWN';
  } else if (status === 'INTRODUCING') {
    timerBadgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    timerText = 'Introducing Player';
  }

  return (
    <div className="glass-panel-glow rounded-2xl overflow-hidden border border-stadium-border/80 flex flex-col justify-between">
      {/* Top Banner: Set Category & Timer */}
      <div className="bg-stadium-surface/60 border-b border-stadium-border/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-cricket-cyan/20 text-cricket-cyan border border-cricket-cyan/40">
            {activePlayer.categorySet || 'SET 1'}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Base: <span className="text-white font-bold">{activePlayer.basePrice?.toLocaleString()} pts</span>
          </span>
        </div>

        {/* Server-Synced Countdown Timer */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-bold tabular-nums ${timerBadgeColor}`}>
          <Clock className="w-4 h-4" />
          <span>{timerText}</span>
        </div>
      </div>

      {/* Main Player Display */}
      <div className="p-6 lg:p-8 grid md:grid-cols-12 gap-6 items-center">
        {/* Player Avatar */}
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-cricket-cyan/40 bg-stadium-dark shadow-2xl shadow-cyan-900/20 flex items-center justify-center">
            {activePlayer.photo?.url ? (
              <img
                src={activePlayer.photo.url}
                alt={activePlayer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <User className="w-20 h-20 stroke-[1.2] text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                  {activePlayer.rollNumber}
                </span>
              </div>
            )}
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-cricket-gold border border-cricket-gold/30">
              {activePlayer.auctionRound || 'ROUND 1'}
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="text-xs font-semibold text-slate-400">
              {activePlayer.department} • {activePlayer.year}
            </span>
          </div>
        </div>

        {/* Player Details & Career Stats */}
        <div className="md:col-span-8 flex flex-col justify-center">
          <div className="mb-2">
            <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-slate-800 text-cricket-cyan border border-slate-700">
              {activePlayer.role.replace(/_/g, ' ')}
            </span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
            {activePlayer.name}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-6">
            <span>Bat: <strong className="text-slate-200">{activePlayer.battingStyle?.replace(/_/g, ' ')}</strong></span>
            <span>•</span>
            <span>Bowl: <strong className="text-slate-200">{activePlayer.bowlingStyle?.replace(/_/g, ' ')}</strong></span>
            <span>•</span>
            <span>Roll: <strong className="text-slate-200">{activePlayer.rollNumber}</strong></span>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-stadium-card/90 border border-stadium-border/80 p-3 rounded-xl text-center">
            <div className="border-r border-stadium-border/60 last:border-none">
              <div className="text-[10px] uppercase font-bold text-slate-400">Matches</div>
              <div className="text-base font-extrabold text-white tabular-nums">{activePlayer.stats?.matchesPlayed || 0}</div>
            </div>
            <div className="border-r border-stadium-border/60 last:border-none">
              <div className="text-[10px] uppercase font-bold text-slate-400">Runs</div>
              <div className="text-base font-extrabold text-white tabular-nums">{activePlayer.stats?.runsScored || 0}</div>
            </div>
            <div className="border-r border-stadium-border/60 last:border-none">
              <div className="text-[10px] uppercase font-bold text-slate-400">Avg</div>
              <div className="text-base font-extrabold text-white tabular-nums">{activePlayer.stats?.battingAverage || 0}</div>
            </div>
            <div className="border-r border-stadium-border/60 last:border-none">
              <div className="text-[10px] uppercase font-bold text-slate-400">SR</div>
              <div className="text-base font-extrabold text-white tabular-nums">{activePlayer.stats?.strikeRate || 0}</div>
            </div>
            <div className="border-r border-stadium-border/60 last:border-none">
              <div className="text-[10px] uppercase font-bold text-slate-400">Wickets</div>
              <div className="text-base font-extrabold text-white tabular-nums">{activePlayer.stats?.wicketsTaken || 0}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Econ</div>
              <div className="text-base font-extrabold text-white tabular-nums">{activePlayer.stats?.bowlingEconomy || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Bidding Status Bar & One-Click CTA */}
      <div className="bg-gradient-to-r from-stadium-card via-stadium-surface to-stadium-card border-t border-stadium-border/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Highest Leading Bid */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-xl bg-cricket-gold/10 border border-cricket-gold/30 flex items-center justify-center text-cricket-gold">
            <Flame className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Highest Bid</span>
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tabular-nums">
              {currentHighestBid > 0 ? (
                <span>{currentHighestBid.toLocaleString()} <span className="text-xs text-cricket-gold font-sans font-bold">PTS</span></span>
              ) : (
                <span className="text-slate-500 font-sans text-xl">Opening Base: {activePlayer.basePrice?.toLocaleString()} pts</span>
              )}
            </div>
            {leadingTeam ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: leadingTeam.brandColor || '#06B6D4' }}
                ></span>
                <span className="text-xs font-bold text-slate-200">
                  {leadingTeam.name} ({leadingTeam.shortName})
                </span>
                {isUserTeamLeading && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    YOUR TEAM
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 font-medium">Awaiting opening bid from franchises</span>
            )}
          </div>
        </div>

        {/* Bid Error Toast */}
        {bidError && (
          <div className="w-full md:w-auto flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{bidError}</span>
          </div>
        )}

        {/* Dynamic One-Click Bid Button */}
        <div className="w-full md:w-auto">
          {isTeamOwner ? (
            <button
              onClick={handlePlaceBid}
              disabled={
                biddingLoading ||
                isUserTeamLeading ||
                status !== 'BIDDING' ||
                !timerRunning ||
                remainingSec === 0
              }
              className={`w-full md:w-auto px-8 py-4 rounded-xl font-extrabold text-base flex items-center justify-center gap-3 shadow-xl transition-all ${
                isUserTeamLeading
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-not-allowed'
                  : status === 'INTRODUCING'
                  ? 'bg-slate-800/90 text-amber-300/90 border border-amber-500/40 cursor-not-allowed shadow-none'
                  : status === 'PAUSED'
                  ? 'bg-slate-800/90 text-amber-400 border border-amber-500/40 cursor-not-allowed shadow-none'
                  : status !== 'BIDDING' || !timerRunning || remainingSec === 0
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-cricket-cyan via-emerald-400 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-cyan-500/25 cursor-pointer'
              }`}
            >
              {isUserTeamLeading ? (
                <>
                  <Award className="w-5 h-5 text-emerald-400" />
                  <span>YOUR TEAM LEADS</span>
                </>
              ) : status === 'INTRODUCING' ? (
                <>
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span>AWAITING TIMER START</span>
                </>
              ) : status === 'PAUSED' ? (
                <>
                  <Pause className="w-5 h-5 text-amber-400" />
                  <span>TIMER PAUSED</span>
                </>
              ) : status !== 'BIDDING' || !timerRunning || remainingSec === 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span>BIDDING CLOSED</span>
                </>
              ) : (
                <>
                  <span>BID {nextBidAmount?.toLocaleString()} PTS</span>
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          ) : (
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block">Spectator / Read-Only Mode</span>
              <span className="text-[11px] text-slate-500">Sign in as a franchise owner to place live bids.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
