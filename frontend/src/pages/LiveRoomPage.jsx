import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiRequest } from '../utils/api';
import { ActivePodium } from '../components/ActivePodium';
import { FranchiseLeaderboard } from '../components/FranchiseLeaderboard';
import { LiveBidFeed } from '../components/LiveBidFeed';
import { AdminAuctionControls } from '../components/AdminAuctionControls';
import { TeamRosterModal } from '../components/TeamRosterModal';
import { Radio, AlertCircle, Eye, ShieldAlert, Play, Pause, Zap } from 'lucide-react';

export const LiveRoomPage = ({ activeTournament, setActiveTournament, setActiveView }) => {
  const { user, isAdmin } = useAuth();
  const { socket, connected } = useSocket();

  const [activePlayer, setActivePlayer] = useState(null);
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [currentBidderTeamId, setCurrentBidderTeamId] = useState(null);
  const [endsAt, setEndsAt] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [timerRunning, setTimerRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [nextBidAmount, setNextBidAmount] = useState(0);
  const [teams, setTeams] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [soldBanner, setSoldBanner] = useState(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);
  const [domainRestrictedError, setDomainRestrictedError] = useState(null);

  const tournamentId = activeTournament?._id;

  // Clear any domain restriction error when tournament changes
  useEffect(() => {
    setDomainRestrictedError(null);
  }, [tournamentId]);

  // Fetch full tournament players list for the Admin Queue
  const fetchTournamentPlayers = async () => {
    if (!tournamentId) return;
    try {
      const res = await apiRequest(`/players/tournament/${tournamentId}`);
      if (res.success) {
        setAllPlayers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch tournament players:', err.message);
    }
  };

  useEffect(() => {
    fetchTournamentPlayers();
  }, [tournamentId]);

  // Admin live status toggle
  const handleToggleLiveStatus = async () => {
    if (!tournamentId) return;
    try {
      const newStatus = activeTournament?.status === 'LIVE_AUCTION' ? 'PAUSED' : 'LIVE_AUCTION';
      const res = await apiRequest(`/tournaments/${tournamentId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      if (res.success && setActiveTournament) {
        setActiveTournament(res.data);
      }
    } catch (err) {
      console.error('Failed to toggle live status:', err.message);
    }
  };

  // Socket Live Bidding Subscriptions
  useEffect(() => {
    if (!socket || !tournamentId) return;

    // 1. Join Tournament Room
    socket.emit('JOIN_AUCTION_ROOM', { tournamentId });

    // 2. Full State Sync
    socket.on('ROOM_STATE_SYNC', (data) => {
      setActivePlayer(data.activePlayer || null);
      setCurrentHighestBid(data.currentHighestBid || 0);
      setCurrentBidderTeamId(data.currentBidderTeamId || null);
      setEndsAt(data.endsAt || 0);
      setStatus(data.status || 'IDLE');
      setTimerRunning(data.timerRunning || false);
      setRemainingMs(data.remainingMs || 0);
      setNextBidAmount(data.nextBidAmount || 0);
      if (data.teams) setTeams(data.teams);
      if (data.recentBids) setRecentBids(data.recentBids);
    });

    // 3. Player Loaded onto Podium
    socket.on('PLAYER_ON_PODIUM', (data) => {
      setActivePlayer(data.player);
      setCurrentHighestBid(0);
      setCurrentBidderTeamId(null);
      setStatus(data.status || 'INTRODUCING');
      setTimerRunning(false);
      setEndsAt(0);
      setRemainingMs(0);
      setNextBidAmount(data.nextBidAmount);
      setRecentBids([]);
      fetchTournamentPlayers();
    });

    // 3b. Player Returned to Queue (Unloaded from Podium)
    socket.on('PLAYER_RETURNED_TO_QUEUE', () => {
      setActivePlayer(null);
      setCurrentHighestBid(0);
      setCurrentBidderTeamId(null);
      setStatus('IDLE');
      setTimerRunning(false);
      setEndsAt(0);
      setRemainingMs(0);
      setRecentBids([]);
      fetchTournamentPlayers();
    });

    // 4. Bidding Timer Started
    socket.on('BIDDING_STARTED', (data) => {
      setStatus('BIDDING');
      setTimerRunning(true);
      setEndsAt(data.endsAt);
      setRemainingMs(0);
    });

    // 5. Timer Synchronizations
    socket.on('TIMER_SYNC', (data) => {
      setEndsAt(data.endsAt);
      setStatus(data.status || 'BIDDING');
      setTimerRunning(true);
      setRemainingMs(0);
    });

    socket.on('TIMER_PAUSED', (data) => {
      setStatus('PAUSED');
      setTimerRunning(false);
      if (data && data.remainingMs !== undefined) {
        setRemainingMs(data.remainingMs);
      }
    });

    socket.on('TIMER_EXPIRED', (data) => {
      setStatus('PAUSED_EXPIRED');
      setTimerRunning(false);
      setRemainingMs(0);
    });

    // 6. Bid Accepted Broadcast
    socket.on('BID_ACCEPTED', (data) => {
      setCurrentHighestBid(data.bidAmount);
      setCurrentBidderTeamId(data.teamId);
      setNextBidAmount(data.nextBidAmount);
      setEndsAt(data.endsAt);
      setTimerRunning(true);
      setStatus('BIDDING');
      setRemainingMs(0);

      // Prepend to live activity feed
      setRecentBids((prev) => [
        {
          _id: Math.random().toString(),
          bidAmount: data.bidAmount,
          timestamp: data.timestamp || new Date().toISOString(),
          teamId: {
            _id: data.teamId,
            name: data.teamName,
            shortName: data.teamShortName,
            brandColor: data.teamBrandColor,
          },
        },
        ...prev,
      ]);
    });

    // 7. Player Sold Celebration Broadcast
    socket.on('PLAYER_SOLD', (data) => {
      setSoldBanner({
        playerName: data.player?.name,
        teamName: data.team?.name,
        price: data.finalPrice,
      });

      // Clear podium state
      setActivePlayer(null);
      setCurrentHighestBid(0);
      setCurrentBidderTeamId(null);
      setStatus('IDLE');
      setTimerRunning(false);
      setEndsAt(0);
      setRecentBids([]);

      fetchTournamentPlayers();

      setTimeout(() => setSoldBanner(null), 8000);
    });

    // 8. Player Unsold Broadcast
    socket.on('PLAYER_UNSOLD', (data) => {
      setActivePlayer(null);
      setCurrentHighestBid(0);
      setCurrentBidderTeamId(null);
      setStatus('IDLE');
      setTimerRunning(false);
      setEndsAt(0);
      setRecentBids([]);
      fetchTournamentPlayers();
    });

    // 9. Teams Leaderboard Update
    socket.on('TEAMS_UPDATED', (updatedTeams) => {
      setTeams(updatedTeams);
    });

    // 10. Multi-Tenant Domain Error Handling
    socket.on('ERROR', (err) => {
      if (err?.code === 'DOMAIN_RESTRICTED') {
        setDomainRestrictedError(err.message || 'Access denied: Isolated collegiate tournament.');
      }
    });

    return () => {
      socket.off('ROOM_STATE_SYNC');
      socket.off('PLAYER_ON_PODIUM');
      socket.off('PLAYER_RETURNED_TO_QUEUE');
      socket.off('BIDDING_STARTED');
      socket.off('TIMER_SYNC');
      socket.off('TIMER_PAUSED');
      socket.off('TIMER_EXPIRED');
      socket.off('BID_ACCEPTED');
      socket.off('PLAYER_SOLD');
      socket.off('PLAYER_UNSOLD');
      socket.off('TEAMS_UPDATED');
      socket.off('ERROR');
    };
  }, [socket, tournamentId]);

  if (domainRestrictedError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="glass-panel-glow p-8 rounded-2xl border border-rose-500/40 shadow-2xl shadow-rose-950/20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-4 border border-rose-500/40">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Isolated College Arena</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            {domainRestrictedError}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setActiveView('login')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cricket-cyan text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Sign In with Authorized College Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel p-8 rounded-2xl border border-stadium-border/60">
          <AlertCircle className="w-12 h-12 text-cricket-gold mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-white mb-2">No Active Tournament Found</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Please create or select a tournament in the Admin Console to launch the Live Bidding Room.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Tournament Status Alert / Mode Strip */}
      {activeTournament?.status === 'PAUSED' ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Pause className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider text-amber-300">
                  Tournament Auction is Paused
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300">
                  LIVE ARENA FROZEN
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                The organizer has paused the auction session (break/timeout). Bidding is temporarily locked for all franchises.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleToggleLiveStatus}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Live Auction</span>
            </button>
          )}
        </div>
      ) : activeTournament?.status !== 'LIVE_AUCTION' ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-700/60 text-slate-400 border border-slate-600 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider text-white">
                  Pre-Auction Stage ({activeTournament?.status || 'DRAFT'})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 border border-slate-600 text-slate-300">
                  AWAITING ACTIVATION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                The tournament has not been launched into LIVE_AUCTION mode yet. Franchise owners and spectators are in standby mode.
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveView && setActiveView('admin-setup')}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white transition-all cursor-pointer whitespace-nowrap"
              >
                Setup Console
              </button>
              <button
                onClick={handleToggleLiveStatus}
                className="px-5 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Activate Live Auction</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-fast"></span>
            <span className="font-extrabold uppercase tracking-wide text-white">LIVE AUCTION ACTIVE:</span>
            <span className="text-emerald-200/80">
              Real-time synchronized bidding arena is officially live for all franchises.
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={handleToggleLiveStatus}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Auction</span>
            </button>
          )}
        </div>
      )}

      {/* Spectator Mode Banner */}
      {!user && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-stadium-surface/70 border border-cricket-cyan/30 text-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cricket-cyan" />
            <span className="font-extrabold text-white">Public Spectator Mode:</span>
            <span className="text-slate-400">
              You are watching the live tournament auction in real-time. Click any franchise to view their squad roster!
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-cricket-cyan/20 text-cricket-cyan font-bold text-[10px]">
            READ-ONLY STREAM
          </span>
        </div>
      )}

      {/* Sold Announcement Banner */}
      {soldBanner && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 p-4 rounded-2xl text-center shadow-xl shadow-emerald-950/40 border border-emerald-400/40 animate-pulse">
          <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-200">
            🔨 SOLD TO HIGHEST BIDDER!
          </div>
          <div className="text-xl lg:text-2xl font-black text-white mt-0.5">
            {soldBanner.playerName} is officially SOLD to {soldBanner.teamName} for {soldBanner.price?.toLocaleString()} PTS!
          </div>
        </div>
      )}

      {/* Admin Command Console (Exclusive to Admin) */}
      {isAdmin && (
        <AdminAuctionControls
          tournamentId={tournamentId}
          tournamentStatus={activeTournament?.status}
          onToggleLiveStatus={handleToggleLiveStatus}
          activePlayer={activePlayer}
          currentHighestBid={currentHighestBid}
          currentBidderTeamId={currentBidderTeamId}
          teams={teams}
          players={allPlayers}
          timerRunning={timerRunning}
          remainingMs={remainingMs}
          status={status}
          onRefresh={fetchTournamentPlayers}
        />
      )}

      {/* Main 3-Column Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Franchise Leaderboard (3 cols) */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <FranchiseLeaderboard
            teams={teams}
            tournamentSettings={activeTournament.settings}
            onSelectTeam={setSelectedRosterTeam}
          />
        </div>

        {/* Center Column: Active Player Podium & Bidding CTA (6 cols) */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <ActivePodium
            tournamentId={tournamentId}
            tournamentStatus={activeTournament?.status}
            activePlayer={activePlayer}
            currentHighestBid={currentHighestBid}
            currentBidderTeamId={currentBidderTeamId}
            teams={teams}
            endsAt={endsAt}
            status={status}
            timerRunning={timerRunning}
            remainingMs={remainingMs}
            nextBidAmount={nextBidAmount}
          />
        </div>

        {/* Right Column: Live Bid Activity Feed (3 cols) */}
        <div className="lg:col-span-3 order-3">
          <LiveBidFeed
            recentBids={recentBids}
            activePlayer={activePlayer}
          />
        </div>
      </div>

      {/* Team Roster Modal */}
      {selectedRosterTeam && (
        <TeamRosterModal
          team={selectedRosterTeam}
          onClose={() => setSelectedRosterTeam(null)}
        />
      )}
    </div>
  );
};

