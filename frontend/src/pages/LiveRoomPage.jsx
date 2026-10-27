import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiRequest } from '../utils/api';
import { ActivePodium } from '../components/ActivePodium';
import { FranchiseLeaderboard } from '../components/FranchiseLeaderboard';
import { LiveBidFeed } from '../components/LiveBidFeed';
import { AdminAuctionControls } from '../components/AdminAuctionControls';
import { TeamRosterModal } from '../components/TeamRosterModal';
import { Radio, AlertCircle, Eye, ShieldAlert } from 'lucide-react';

export const LiveRoomPage = ({ activeTournament }) => {
  const { user, isAdmin } = useAuth();
  const { socket, connected } = useSocket();

  const [activePlayer, setActivePlayer] = useState(null);
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [currentBidderTeamId, setCurrentBidderTeamId] = useState(null);
  const [endsAt, setEndsAt] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [timerRunning, setTimerRunning] = useState(false);
  const [nextBidAmount, setNextBidAmount] = useState(0);
  const [teams, setTeams] = useState([]);
  const [recentBids, setRecentBids] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [soldBanner, setSoldBanner] = useState(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);

  const tournamentId = activeTournament?._id;

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
      setNextBidAmount(data.nextBidAmount);
      setRecentBids([]);
    });

    // 4. Bidding Timer Started
    socket.on('BIDDING_STARTED', (data) => {
      setStatus('BIDDING');
      setTimerRunning(true);
      setEndsAt(data.endsAt);
    });

    // 5. Timer Synchronizations
    socket.on('TIMER_SYNC', (data) => {
      setEndsAt(data.endsAt);
      setStatus(data.status || 'BIDDING');
      setTimerRunning(true);
    });

    socket.on('TIMER_PAUSED', (data) => {
      setStatus('PAUSED');
      setTimerRunning(false);
    });

    socket.on('TIMER_EXPIRED', (data) => {
      setStatus('PAUSED_EXPIRED');
      setTimerRunning(false);
    });

    // 6. Bid Accepted Broadcast
    socket.on('BID_ACCEPTED', (data) => {
      setCurrentHighestBid(data.bidAmount);
      setCurrentBidderTeamId(data.teamId);
      setNextBidAmount(data.nextBidAmount);
      setEndsAt(data.endsAt);
      setTimerRunning(true);
      setStatus('BIDDING');

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

    return () => {
      socket.off('ROOM_STATE_SYNC');
      socket.off('PLAYER_ON_PODIUM');
      socket.off('BIDDING_STARTED');
      socket.off('TIMER_SYNC');
      socket.off('TIMER_PAUSED');
      socket.off('TIMER_EXPIRED');
      socket.off('BID_ACCEPTED');
      socket.off('PLAYER_SOLD');
      socket.off('PLAYER_UNSOLD');
      socket.off('TEAMS_UPDATED');
    };
  }, [socket, tournamentId]);

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
          activePlayer={activePlayer}
          currentHighestBid={currentHighestBid}
          currentBidderTeamId={currentBidderTeamId}
          teams={teams}
          players={allPlayers}
          timerRunning={timerRunning}
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
            activePlayer={activePlayer}
            currentHighestBid={currentHighestBid}
            currentBidderTeamId={currentBidderTeamId}
            teams={teams}
            endsAt={endsAt}
            status={status}
            timerRunning={timerRunning}
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

