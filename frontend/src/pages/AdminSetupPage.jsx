import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { Trophy, Shield, Users, UserPlus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { UnsoldRecallDrawer } from '../components/UnsoldRecallDrawer';


export const AdminSetupPage = ({ activeTournament, setActiveTournament, onTournamentCreated }) => {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });

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

  // Switch status to LIVE_AUCTION
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
        notify('success', `Tournament status changed to ${newStatus}`);
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
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                activeTournament.status === 'LIVE_AUCTION'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse-fast'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {activeTournament.status}
            </span>
            <button
              onClick={handleToggleLiveStatus}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-lg ${
                activeTournament.status === 'LIVE_AUCTION'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-emerald-500/20'
              }`}
            >
              {activeTournament.status === 'LIVE_AUCTION' ? 'Pause Auction' : 'Activate LIVE_AUCTION Mode'}
            </button>
          </div>
        )}
      </div>

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

      {/* Players Section & Bulk Seed */}
      <div className="glass-panel rounded-2xl p-6 border border-stadium-border/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stadium-border/60 mb-6">

          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="font-extrabold text-lg text-white">
              Player Roster ({players.length} Registered)
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
              {players.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-500">
                    No players in roster. Use the quick form or click "Seed 10 College Cricket Stars".
                  </td>
                </tr>
              ) : (
                players.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{p.name}</td>
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
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {p.status === 'SOLD' && p.soldTo ? (
                        <span className="font-bold text-emerald-400">
                          {p.soldTo.name || 'Team'} ({p.soldPrice?.toLocaleString()} pts)
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
