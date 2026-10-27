import React, { useState } from 'react';
import { Search, Trophy, User, CheckCircle2, AlertCircle, Clock, Award, XCircle } from 'lucide-react';

export const PublicLookupPage = ({ tournaments, activeTournament, setActiveTournament }) => {
  const [rollNumber, setRollNumber] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;

    if (!activeTournament?._id) {
      setError('Please select a tournament.');
      return;
    }

    setLoading(true);
    setError(null);
    setPlayerData(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/public/players/lookup?tournamentId=${activeTournament._id}&rollNumber=${encodeURIComponent(
          rollNumber.trim()
        )}`
      );
      const res = await response.json();

      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Player not found');
      }

      setPlayerData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-3 shadow-xl shadow-cyan-500/20 mb-3">
          <Search className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Player Status Lookup
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Check your registration status, verification state, and live auction outcome using your Roll Number
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="glass-panel p-6 rounded-2xl border border-stadium-border/80">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Tournament Picker */}
          {tournaments && tournaments.length > 0 && (
            <div className="flex items-center justify-between text-xs pb-3 border-b border-stadium-border/60">
              <span className="text-slate-400 font-bold uppercase">Tournament:</span>
              <select
                value={activeTournament?._id || ''}
                onChange={(e) => {
                  const t = tournaments.find((x) => x._id === e.target.value);
                  if (t) setActiveTournament(t);
                }}
                className="bg-stadium-surface border border-stadium-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cricket-cyan"
              >
                {tournaments.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.edition})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="Enter College Roll Number (e.g. CS23-01)"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full bg-stadium-surface border border-stadium-border text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-cricket-cyan uppercase font-mono tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl font-extrabold text-xs bg-cricket-cyan hover:bg-cyan-400 text-slate-950 transition-all shadow-md shadow-cyan-950 shrink-0 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Lookup Status'}
            </button>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/40 text-center animate-fadeIn">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="font-extrabold text-white text-base">Not Found</h3>
          <p className="text-xs text-rose-300 mt-1 max-w-sm mx-auto">{error}</p>
        </div>
      )}

      {/* Result Card */}
      {playerData && (
        <div className="glass-panel-glow rounded-2xl overflow-hidden border border-stadium-border animate-fadeIn">
          {/* Top Status Header */}
          <div className="bg-stadium-surface/80 p-4 border-b border-stadium-border flex items-center justify-between gap-4">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              Roll No: <strong className="text-white">{playerData.rollNumber}</strong>
            </span>

            {/* Dynamic Status Badges */}
            {playerData.status === 'PENDING_APPROVAL' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Clock className="w-3.5 h-3.5" />
                <span>PENDING ORGANIZER APPROVAL</span>
              </span>
            )}
            {playerData.status === 'APPROVED' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-cricket-cyan/20 text-cricket-cyan border border-cricket-cyan/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>APPROVED FOR LIVE PODIUM</span>
              </span>
            )}
            {playerData.status === 'ON_PODIUM' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-cricket-gold/20 text-cricket-gold border border-cricket-gold/40 animate-pulse">
                <span>⚡ CURRENTLY ON PODIUM!</span>
              </span>
            )}
            {playerData.status === 'SOLD' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Award className="w-3.5 h-3.5" />
                <span>SOLD TO {playerData.soldTo?.shortName || playerData.soldTo?.name}</span>
              </span>
            )}
            {playerData.status === 'UNSOLD' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <XCircle className="w-3.5 h-3.5" />
                <span>UNSOLD (ROUND 2 ELIGIBLE)</span>
              </span>
            )}
            {playerData.status === 'REJECTED' && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <XCircle className="w-3.5 h-3.5" />
                <span>NOMINATION REJECTED</span>
              </span>
            )}
          </div>

          {playerData.status === 'REJECTED' && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Verification Decision:</strong> {playerData.rejectionReason || 'Nomination unverified by tournament committee.'}
              </span>
            </div>
          )}

          {/* Profile Details */}
          <div className="p-6 sm:p-8 grid sm:grid-cols-12 gap-6 items-center">
            {/* Avatar */}
            <div className="sm:col-span-4 flex flex-col items-center">
              <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-stadium-border bg-stadium-dark flex items-center justify-center">
                {playerData.photoUrl ? (
                  <img
                    src={playerData.photoUrl}
                    alt={playerData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-slate-500" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="sm:col-span-8 space-y-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-800 text-cricket-cyan mb-1">
                  {playerData.role?.replace(/_/g, ' ')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{playerData.name}</h2>
                <p className="text-xs text-slate-400">
                  {playerData.department} • {playerData.year}
                </p>
              </div>

              {/* Sold Box */}
              {playerData.status === 'SOLD' && playerData.soldTo && (
                <div
                  className="p-4 rounded-xl border flex items-center justify-between"
                  style={{
                    backgroundColor: `${playerData.soldTo.brandColor || '#10B981'}15`,
                    borderColor: `${playerData.soldTo.brandColor || '#10B981'}50`,
                  }}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Purchased By</span>
                    <span className="font-extrabold text-white text-base">{playerData.soldTo.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Winning Bid</span>
                    <span className="font-mono font-extrabold text-cricket-gold text-base">
                      {playerData.soldPrice?.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-2 bg-stadium-surface/40 p-3 rounded-xl border border-stadium-border text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Matches</span>
                  <span className="font-bold text-white tabular-nums">{playerData.stats?.matchesPlayed || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Runs</span>
                  <span className="font-bold text-white tabular-nums">{playerData.stats?.runsScored || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Wickets</span>
                  <span className="font-bold text-white tabular-nums">{playerData.stats?.wicketsTaken || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Base</span>
                  <span className="font-bold text-cricket-cyan font-mono tabular-nums">
                    {playerData.basePrice?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
