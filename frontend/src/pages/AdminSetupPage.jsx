import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import {
  Trophy,
  Shield,
  Users,
  UserPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  X,
  Trash2,
  ExternalLink,
  FileCheck,
  Phone,
  ShieldAlert,
  XCircle,
  Search,
  Play,
  Pause,
  Zap,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { UnsoldRecallDrawer } from '../components/UnsoldRecallDrawer';

export const AdminSetupPage = ({ activeTournament, setActiveTournament, setActiveView, onTournamentCreated }) => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });
  const [approvalSettings, setApprovalSettings] = useState({});
  const [previewProofModal, setPreviewProofModal] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState({});
  const [showLiveModal, setShowLiveModal] = useState(false);

  // Tournament creation form
  const [tournamentForm, setTournamentForm] = useState({
    name: 'Inter-College Premier League',
    edition: '2026',
    startingPurse: 10000000,
    minSquadSize: 11,
    maxSquadSize: 16,
    minBasePrice: 20000,
  });

  // Team creation form
  const [teamForm, setTeamForm] = useState({
    name: '',
    shortName: '',
    brandColor: '#06B6D4',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  // Player creation form
  const [playerForm, setPlayerForm] = useState({
    name: '',
    rollNumber: '',
    department: 'Computer Science',
    year: '3rd Year',
    role: 'TOP_ORDER_BATTER',
    battingStyle: 'RIGHT_HAND',
    bowlingStyle: 'NONE',
    basePrice: 50000,
    categorySet: 'SET_1',
  });

  const notify = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: null, message: null }), 5000);
  };

  const loadTournamentData = async () => {
    if (!activeTournament) return;
    try {
      const [teamsRes, playersRes] = await Promise.all([
        apiRequest(`/teams/tournament/${activeTournament._id}`),
        apiRequest(`/players/tournament/${activeTournament._id}`),
      ]);
      if (teamsRes.success) setTeams(teamsRes.data);
      if (playersRes.success) setPlayers(playersRes.data);
    } catch (err) {
      console.error('Failed to load tournament data:', err);
    }
  };

  useEffect(() => {
    loadTournamentData();
  }, [activeTournament]);

  // Create Tournament
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/tournaments', {
        method: 'POST',
        body: {
          name: tournamentForm.name,
          edition: tournamentForm.edition,
          settings: {
            startingPurse: Number(tournamentForm.startingPurse),
            minSquadSize: Number(tournamentForm.minSquadSize),
            maxSquadSize: Number(tournamentForm.maxSquadSize),
            minBasePrice: Number(tournamentForm.minBasePrice),
          },
        },
      });

      if (res.success) {
        notify('success', `Tournament "${res.data.name}" created!`);
        if (setActiveTournament) setActiveTournament(res.data);
        if (onTournamentCreated) onTournamentCreated(res.data);
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch status to LIVE_AUCTION or PAUSED
  const handleToggleLiveStatus = async () => {
    if (!activeTournament) return;
    try {
      const newStatus = activeTournament.status === 'LIVE_AUCTION' ? 'PAUSED' : 'LIVE_AUCTION';
      const res = await apiRequest(`/tournaments/${activeTournament._id}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      if (res.success) {
        setActiveTournament(res.data);
        if (newStatus === 'LIVE_AUCTION') {
          notify('success', `🟢 Tournament is now LIVE! Bidding arena opened.`);
          setShowLiveModal(true);
        } else {
          notify('info', `⏸ Tournament auction paused. Bidding frozen on all screens.`);
        }
      }
    } catch (err) {
      notify('error', err.message);
    }
  };

  // Create Franchise & Owner
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!activeTournament) {
      notify('error', 'Select or create a tournament first.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tournamentId: activeTournament._id,
        name: teamForm.name,
        shortName: teamForm.shortName,
        brandColor: teamForm.brandColor,
        owner: teamForm.ownerEmail
          ? {
              name: teamForm.ownerName || `${teamForm.name} Owner`,
              email: teamForm.ownerEmail,
              password: teamForm.ownerPassword || 'owner123',
            }
          : null,
      };

      const res = await apiRequest('/teams', {
        method: 'POST',
        body: payload,
      });

      if (res.success) {
        notify('success', `Team ${res.data.team.name} created!`);
        setTeamForm({
          name: '',
          shortName: '',
          brandColor: '#06B6D4',
          ownerName: '',
          ownerEmail: '',
          ownerPassword: '',
        });
        loadTournamentData();
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add Single Player
  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!activeTournament) return;

    setLoading(true);
    try {
      const res = await apiRequest('/players', {
        method: 'POST',
        body: {
          ...playerForm,
          tournamentId: activeTournament._id,
          basePrice: Number(playerForm.basePrice),
        },
      });

      if (res.success) {
        notify('success', `Player ${res.data.name} added to roster!`);
        setPlayerForm({
          ...playerForm,
          name: '',
          rollNumber: '',
        });
        loadTournamentData();
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fast Seed 10 College Players
  const handleSeedMockPlayers = async () => {
    if (!activeTournament) return;
    setLoading(true);

    const mockPlayers = [
      { name: 'Aarav Sharma', rollNumber: 'CS23-01', department: 'Computer Science', year: '3rd Year', role: 'TOP_ORDER_BATTER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'NONE', basePrice: 100000, categorySet: 'MARQUEE', stats: { matchesPlayed: 14, runsScored: 520, battingAverage: 47.2, strikeRate: 154 } },
      { name: 'Rohan Verma', rollNumber: 'ME22-15', department: 'Mechanical', year: '4th Year', role: 'PACE_BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', basePrice: 80000, categorySet: 'MARQUEE', stats: { matchesPlayed: 18, wicketsTaken: 26, bowlingEconomy: 6.8 } },
      { name: 'Kunal Patel', rollNumber: 'EC24-08', department: 'Electronics', year: '2nd Year', role: 'ALL_ROUNDER', battingStyle: 'LEFT_HAND', bowlingStyle: 'RIGHT_ARM_SPIN', basePrice: 120000, categorySet: 'MARQUEE', stats: { matchesPlayed: 20, runsScored: 410, wicketsTaken: 19 } },
      { name: 'Aditya Rao', rollNumber: 'IT23-42', department: 'Information Tech', year: '3rd Year', role: 'WICKETKEEPER_BATTER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'NONE', basePrice: 50000, categorySet: 'SET_1', stats: { matchesPlayed: 12, runsScored: 310, strikeRate: 142 } },
      { name: 'Varun Nair', rollNumber: 'CV22-19', department: 'Civil', year: '4th Year', role: 'SPIN_BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'LEFT_ARM_SPIN', basePrice: 40000, categorySet: 'SET_1', stats: { matchesPlayed: 15, wicketsTaken: 21, bowlingEconomy: 6.2 } },
      { name: 'Siddharth Iyer', rollNumber: 'CS24-33', department: 'Computer Science', year: '2nd Year', role: 'MIDDLE_ORDER_BATTER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'NONE', basePrice: 30000, categorySet: 'SET_1', stats: { matchesPlayed: 10, runsScored: 240, battingAverage: 34.2 } },
      { name: 'Devendra Malik', rollNumber: 'EE23-11', department: 'Electrical', year: '3rd Year', role: 'PACE_BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'LEFT_ARM_FAST', basePrice: 60000, categorySet: 'SET_1', stats: { matchesPlayed: 14, wicketsTaken: 18, bowlingEconomy: 7.4 } },
      { name: 'Pranav Joshi', rollNumber: 'ME24-22', department: 'Mechanical', year: '2nd Year', role: 'ALL_ROUNDER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', basePrice: 50000, categorySet: 'SET_2', stats: { matchesPlayed: 11, runsScored: 190, wicketsTaken: 12 } },
      { name: 'Tanishq Roy', rollNumber: 'BT23-04', department: 'Biotech', year: '3rd Year', role: 'TOP_ORDER_BATTER', battingStyle: 'LEFT_HAND', bowlingStyle: 'NONE', basePrice: 30000, categorySet: 'SET_2', stats: { matchesPlayed: 9, runsScored: 215, strikeRate: 138 } },
      { name: 'Ishaan Gupta', rollNumber: 'IT22-55', department: 'Information Tech', year: '4th Year', role: 'SPIN_BOWLER', battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_SPIN', basePrice: 20000, categorySet: 'SET_2', stats: { matchesPlayed: 8, wicketsTaken: 11, bowlingEconomy: 6.5 } },
    ];

    try {
      const res = await apiRequest('/players/bulk', {
        method: 'POST',
        body: {
          tournamentId: activeTournament._id,
          players: mockPlayers,
        },
      });

      if (res.success) {
        notify('success', `Added ${mockPlayers.length} sample college cricket players!`);
        loadTournamentData();
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve a pending student nomination
  const handleApproveNomination = async (player) => {
    setLoading(true);
    const custom = approvalSettings[player._id] || {};
    try {
      const res = await apiRequest(`/players/${player._id}/approve`, {
        method: 'PATCH',
        body: {
          basePrice: custom.basePrice !== undefined ? Number(custom.basePrice) : player.basePrice,
          categorySet: custom.categorySet || player.categorySet || 'SET_1',
          auctionRound: 'ROUND_1',
        },
      });
      if (res.success) {
        notify('success', res.message);
        loadTournamentData();
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reject a student nomination
  const handleRejectNomination = async (playerId) => {
    const reason = rejectReasonInput[playerId] || 'Physical ID proof unverified / invalid enrollment';
    setLoading(true);
    try {
      const res = await apiRequest(`/players/${playerId}/reject`, {
        method: 'PATCH',
        body: { rejectionReason: reason },
      });
      if (res.success) {
        notify('success', res.message);
        loadTournamentData();
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Permanently purge a spam player
  const handlePurgePlayer = async (playerId, playerName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${playerName}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/players/${playerId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        notify('success', res.message);
        loadTournamentData();
      }
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingNominations = players.filter((p) => p.status === 'PENDING_APPROVAL');
  const rosterPlayers = players.filter((p) => p.status !== 'PENDING_APPROVAL');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Alert banner */}
      {feedback.message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl text-sm font-semibold border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header & Status Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-stadium-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-cricket-gold" />
            <h1 className="text-2xl font-black text-white">Organizer Setup Console</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Active: <strong className="text-white">{activeTournament ? activeTournament.name : 'No Tournament Selected'}</strong>
          </p>
        </div>

        {activeTournament && (
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider flex items-center gap-1.5 ${
                activeTournament.status === 'LIVE_AUCTION'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse-fast'
                  : activeTournament.status === 'PAUSED'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeTournament.status === 'LIVE_AUCTION'
                    ? 'bg-emerald-400'
                    : activeTournament.status === 'PAUSED'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
              {activeTournament.status === 'LIVE_AUCTION' ? '● LIVE AUCTION' : activeTournament.status}
            </span>

            {/* Quick jump to live stage if live */}
            {activeTournament.status === 'LIVE_AUCTION' && (
              <button
                type="button"
                onClick={() => setActiveView && setActiveView('live-room')}
                className="px-4 py-2.5 rounded-xl font-extrabold text-xs bg-cricket-cyan/20 text-cricket-cyan border border-cricket-cyan/40 hover:bg-cricket-cyan/30 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Enter Live Stage</span>
              </button>
            )}

            <button
              onClick={handleToggleLiveStatus}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                activeTournament.status === 'LIVE_AUCTION'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-emerald-500/25'
              }`}
            >
              {activeTournament.status === 'LIVE_AUCTION' ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Live Auction</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Activate LIVE_AUCTION Mode</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Live Auction Activated Modal */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/50 max-w-lg w-full bg-gradient-to-b from-stadium-card to-stadium-dark shadow-2xl shadow-emerald-950/60 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-8 h-8 fill-current animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Tournament Status: LIVE
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {activeTournament?.name} is Officially Live!
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                All franchise teams and spectator feeds are now synchronized in real-time. Live bidding is enabled on the arena podium!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setShowLiveModal(false);
                  if (setActiveView) setActiveView('live-room');
                }}
                className="flex-1 py-3.5 px-5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Launch Live Stage Arena</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                onClick={() => setShowLiveModal(false)}
                className="py-3.5 px-5 rounded-xl font-bold text-sm bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                Stay in Setup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Tournament Configuration */}
        <div className="glass-panel rounded-2xl p-6 border border-stadium-border/60">
          <div className="flex items-center gap-2 pb-3 border-b border-stadium-border/60 mb-5">
            <Trophy className="w-5 h-5 text-cricket-cyan" />
            <h2 className="font-extrabold text-lg text-white">Create New Tournament</h2>
          </div>

          <form onSubmit={handleCreateTournament} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tournament Name</label>
                <input
                  type="text"
                  required
                  value={tournamentForm.name}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cricket-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Edition / Year</label>
                <input
                  type="text"
                  required
                  value={tournamentForm.edition}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, edition: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cricket-cyan"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Purse (pts)</label>
                <input
                  type="number"
                  value={tournamentForm.startingPurse}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, startingPurse: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-2.5 py-2 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Min Squad</label>
                <input
                  type="number"
                  value={tournamentForm.minSquadSize}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, minSquadSize: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-2.5 py-2 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Max Squad</label>
                <input
                  type="number"
                  value={tournamentForm.maxSquadSize}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, maxSquadSize: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-2.5 py-2 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Min Base</label>
                <input
                  type="number"
                  value={tournamentForm.minBasePrice}
                  onChange={(e) => setTournamentForm({ ...tournamentForm, minBasePrice: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-2.5 py-2 text-white text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-cricket-cyan hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-950"
            >
              Initialize Tournament
            </button>
          </form>
        </div>

        {/* Create Franchise Team + Owner */}
        <div className="glass-panel rounded-2xl p-6 border border-stadium-border/60">
          <div className="flex items-center gap-2 pb-3 border-b border-stadium-border/60 mb-5">
            <Shield className="w-5 h-5 text-cricket-gold" />
            <h2 className="font-extrabold text-lg text-white">Add Participating Franchise</h2>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai Kings"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cricket-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Short Name</label>
                <input
                  type="text"
                  required
                  placeholder="CSK"
                  value={teamForm.shortName}
                  onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm uppercase focus:outline-none focus:border-cricket-cyan"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={teamForm.brandColor}
                    onChange={(e) => setTeamForm({ ...teamForm, brandColor: e.target.value })}
                    className="w-10 h-9 rounded-lg bg-transparent cursor-pointer border border-stadium-border"
                  />
                  <span className="font-mono text-xs text-slate-300">{teamForm.brandColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Owner Name</label>
                <input
                  type="text"
                  placeholder="Team Captain / Owner"
                  value={teamForm.ownerName}
                  onChange={(e) => setTeamForm({ ...teamForm, ownerName: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Owner Login Email</label>
                <input
                  type="email"
                  placeholder="owner@csk.com"
                  value={teamForm.ownerEmail}
                  onChange={(e) => setTeamForm({ ...teamForm, ownerEmail: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Owner Password</label>
                <input
                  type="password"
                  placeholder="owner123"
                  value={teamForm.ownerPassword}
                  onChange={(e) => setTeamForm({ ...teamForm, ownerPassword: e.target.value })}
                  className="w-full bg-stadium-surface border border-stadium-border rounded-xl px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !activeTournament}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-cricket-gold hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-950 disabled:opacity-50"
            >
              Create Team & Owner Login
            </button>
          </form>
        </div>
      </div>

      {/* Round 2 Accelerated: Unsold Recall Drawer */}
      {activeTournament && (
        <UnsoldRecallDrawer
          tournamentId={activeTournament._id}
          players={players}
          onRecalled={loadTournamentData}
        />
      )}

      {/* Student Nominations Verification Queue (Anti-Spam Gatekeeper) */}
      <div className="glass-panel rounded-2xl p-6 border border-cricket-gold/40 bg-stadium-card/70 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stadium-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cricket-gold/20 flex items-center justify-center text-cricket-gold border border-cricket-gold/40">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-white">Student Nominations Verification Queue</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cricket-gold text-slate-950">
                  {pendingNominations.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Review student identity proofs to filter out fake or spam submissions before they enter the auction.
              </p>
            </div>
          </div>
        </div>

        {pendingNominations.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs bg-stadium-surface/40 rounded-xl border border-stadium-border/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
            <span>All student nominations have been reviewed! Zero pending submissions.</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingNominations.map((p) => {
              const custom = approvalSettings[p._id] || {};
              const currentCategory = custom.categorySet || p.categorySet || 'SET_1';
              const currentBase = custom.basePrice !== undefined ? custom.basePrice : p.basePrice;

              return (
                <div
                  key={p._id}
                  className="p-4 rounded-xl bg-stadium-surface/60 border border-stadium-border hover:border-cricket-gold/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Student Details & Proof Thumbnails */}
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                    {/* Photos */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Avatar */}
                      <div
                        onClick={() => p.photo?.url && setPreviewProofModal({ title: `${p.name} - Profile Photo`, url: p.photo.url })}
                        className={`w-14 h-14 rounded-xl overflow-hidden border border-stadium-border bg-stadium-dark flex items-center justify-center ${
                          p.photo?.url ? 'cursor-pointer hover:border-cricket-cyan' : ''
                        }`}
                        title="Click to view full photo"
                      >
                        {p.photo?.url ? (
                          <img src={p.photo.url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserPlus className="w-6 h-6 text-slate-500" />
                        )}
                      </div>

                      {/* ID Card Proof Thumbnail */}
                      <div
                        onClick={() =>
                          p.idCardProof?.url &&
                          setPreviewProofModal({ title: `${p.name} - College ID Card Proof`, url: p.idCardProof.url })
                        }
                        className={`w-14 h-14 rounded-xl overflow-hidden border flex flex-col items-center justify-center text-center p-1 ${
                          p.idCardProof?.url
                            ? 'border-cricket-gold/60 bg-cricket-gold/10 cursor-pointer hover:scale-105 transition-transform'
                            : 'border-slate-800 bg-slate-900/50'
                        }`}
                        title={p.idCardProof?.url ? 'Click to inspect Student ID Card Proof' : 'No ID Card Attached'}
                      >
                        {p.idCardProof?.url ? (
                          <img src={p.idCardProof.url} alt="ID Card Proof" className="w-full h-full object-cover rounded" />
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold uppercase leading-tight">No ID Proof</span>
                        )}
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-white text-base truncate">{p.name}</h4>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-cricket-cyan border border-slate-700 font-bold">
                          {p.rollNumber}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-stadium-dark text-slate-300 font-medium">
                          {p.department} • {p.year}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="text-emerald-400 font-semibold">{p.role.replace(/_/g, ' ')}</span>
                        {p.contactNumber && (
                          <span className="flex items-center gap-1 text-slate-400 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {p.contactNumber}
                          </span>
                        )}
                        <span>
                          Stats: <strong>{p.stats?.matchesPlayed || 0}</strong> matches, <strong>{p.stats?.runsScored || 0}</strong> runs, <strong>{p.stats?.wicketsTaken || 0}</strong> wkts
                        </span>
                      </div>

                      {p.idCardProof?.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofModal({ title: `${p.name} - College ID Card Proof`, url: p.idCardProof.url })}
                          className="mt-1 text-[11px] font-bold text-cricket-gold hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect Student ID Card Proof</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pricing / Category Adjustment & Moderation Actions */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stadium-border/60">
                    <div className="w-28">
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Category</label>
                      <select
                        value={currentCategory}
                        onChange={(e) =>
                          setApprovalSettings({
                            ...approvalSettings,
                            [p._id]: { ...custom, categorySet: e.target.value },
                          })
                        }
                        className="w-full bg-stadium-card border border-stadium-border rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="MARQUEE">Marquee</option>
                        <option value="SET_1">Set 1</option>
                        <option value="SET_2">Set 2</option>
                        <option value="SET_3">Set 3</option>
                      </select>
                    </div>

                    <div className="w-28">
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Base Price</label>
                      <input
                        type="number"
                        value={currentBase}
                        onChange={(e) =>
                          setApprovalSettings({
                            ...approvalSettings,
                            [p._id]: { ...custom, basePrice: e.target.value },
                          })
                        }
                        className="w-full bg-stadium-card border border-stadium-border rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-3.5">
                      <button
                        onClick={() => handleApproveNomination(p)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-md shadow-emerald-950 transition-all disabled:opacity-50"
                        title="Approve student and enlist into auction pool"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleRejectNomination(p._id)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all disabled:opacity-50"
                        title="Reject nomination (fake proof / invalid details)"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handlePurgePlayer(p._id, p.name)}
                        disabled={loading}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-stadium-border transition-all"
                        title="Permanently purge record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Players Section & Bulk Seed */}
      <div className="glass-panel rounded-2xl p-6 border border-stadium-border/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stadium-border/60 mb-6">

          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="font-extrabold text-lg text-white">
              Approved Auction Roster ({rosterPlayers.length} Enlisted)
            </h2>
          </div>

          <button
            onClick={handleSeedMockPlayers}
            disabled={loading || !activeTournament}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 text-white shadow-md shadow-purple-950 disabled:opacity-50 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>⚡ Seed 10 College Cricket Stars</span>
          </button>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleCreatePlayer} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 bg-stadium-card/80 p-4 rounded-xl border border-stadium-border/60">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Virat Kumar"
              value={playerForm.name}
              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
              className="w-full bg-stadium-surface border border-stadium-border rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Roll Number</label>
            <input
              type="text"
              required
              placeholder="CS23-99"
              value={playerForm.rollNumber}
              onChange={(e) => setPlayerForm({ ...playerForm, rollNumber: e.target.value })}
              className="w-full bg-stadium-surface border border-stadium-border rounded-lg px-2.5 py-1.5 text-xs text-white uppercase"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Role</label>
            <select
              value={playerForm.role}
              onChange={(e) => setPlayerForm({ ...playerForm, role: e.target.value })}
              className="w-full bg-stadium-surface border border-stadium-border rounded-lg px-2 py-1.5 text-xs text-white"
            >
              <option value="TOP_ORDER_BATTER">Top-Order Batter</option>
              <option value="MIDDLE_ORDER_BATTER">Middle-Order Batter</option>
              <option value="WICKETKEEPER_BATTER">Wicketkeeper-Batter</option>
              <option value="PACE_BOWLER">Pace Bowler</option>
              <option value="SPIN_BOWLER">Spin Bowler</option>
              <option value="ALL_ROUNDER">All-Rounder</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Base Price</label>
            <input
              type="number"
              value={playerForm.basePrice}
              onChange={(e) => setPlayerForm({ ...playerForm, basePrice: e.target.value })}
              className="w-full bg-stadium-surface border border-stadium-border rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !activeTournament}
              className="w-full py-2 rounded-lg font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all"
            >
              + Add Player
            </button>
          </div>
        </form>

        {/* Players List Table */}
        <div className="overflow-x-auto rounded-xl border border-stadium-border/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-stadium-surface text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Player</th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Role</th>
                <th className="p-3">Base Price</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sold Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stadium-border/60">
              {rosterPlayers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    No approved players in roster yet. Use the quick form, seed college stars, or approve student nominations above.
                  </td>
                </tr>
              ) : (
                rosterPlayers.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      {p.photo?.url ? (
                        <img src={p.photo.url} alt={p.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <span>{p.name}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{p.rollNumber}</td>
                    <td className="p-3 text-cricket-cyan">{p.role.replace(/_/g, ' ')}</td>
                    <td className="p-3 font-mono font-bold text-white">{p.basePrice?.toLocaleString()} pts</td>
                    <td className="p-3 font-semibold text-slate-400">{p.categorySet}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'SOLD'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.status === 'UNSOLD'
                            ? 'bg-rose-500/20 text-rose-400'
                            : p.status === 'ON_PODIUM'
                            ? 'bg-cricket-gold/20 text-cricket-gold'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-900/30 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                        title={p.status === 'REJECTED' ? p.rejectionReason : ''}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {p.status === 'SOLD' && p.soldTo ? (
                        <span className="font-bold text-emerald-400">
                          {p.soldTo.name || 'Team'} ({p.soldPrice?.toLocaleString()} pts)
                        </span>
                      ) : p.status === 'REJECTED' ? (
                        <span className="text-[10px] text-rose-400 truncate block max-w-[120px]" title={p.rejectionReason}>
                          {p.rejectionReason || 'Rejected'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {p.status !== 'SOLD' && (
                        <button
                          onClick={() => handlePurgePlayer(p._id, p.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Purge player record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Proof Lightbox Modal */}
      {previewProofModal && (
        <div
          onClick={() => setPreviewProofModal(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-glow max-w-2xl w-full rounded-2xl p-6 border border-cricket-gold/40 bg-stadium-card/95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stadium-border">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cricket-gold" />
                <h3 className="font-extrabold text-white text-base">{previewProofModal.title}</h3>
              </div>
              <button
                onClick={() => setPreviewProofModal(null)}
                className="p-1.5 rounded-lg bg-stadium-surface hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto flex items-center justify-center rounded-xl bg-black/60 p-2 border border-stadium-border">
              <img
                src={previewProofModal.url}
                alt="Proof Preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <a
                href={previewProofModal.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-stadium-surface hover:bg-slate-700 text-slate-200 border border-stadium-border"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
              <button
                onClick={() => setPreviewProofModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-cricket-cyan hover:bg-cyan-400 text-slate-950"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
