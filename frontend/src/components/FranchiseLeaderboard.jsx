import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Wallet } from 'lucide-react';

export const FranchiseLeaderboard = ({ teams, tournamentSettings }) => {
  const { user } = useAuth();
  const maxSquad = tournamentSettings?.maxSquadSize || 16;
  const userTeamId = user?.team?._id || user?.team?.id || user?.teamId;

  const sortedTeams = [...(teams || [])].sort((a, b) => b.remainingPurse - a.remainingPurse);

  return (
    <div className="glass-panel rounded-2xl p-4 lg:p-5 border border-stadium-border/60 flex flex-col h-full max-h-[700px]">
      <div className="flex items-center justify-between pb-3 border-b border-stadium-border/60 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cricket-cyan" />
          <h3 className="font-extrabold text-white text-base tracking-tight">Franchise Leaderboard</h3>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-stadium-surface px-2.5 py-0.5 rounded-full border border-stadium-border">
          {sortedTeams.length} Teams
        </span>
      </div>

      <div className="overflow-y-auto space-y-3 pr-1 flex-1">
        {sortedTeams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No teams created yet. Organizer can add franchises in Admin Console.
          </div>
        ) : (
          sortedTeams.map((team, idx) => {
            const teamId = team._id || team.id;
            const isMyTeam = teamId === userTeamId;
            const squadCount = team.squadCount !== undefined ? team.squadCount : (team.squad ? team.squad.length : 0);
            const totalPurse = team.totalPurse || 10000000;
            const remainingPurse = team.remainingPurse || 0;
            const spentPercent = Math.min(100, Math.round(((totalPurse - remainingPurse) / totalPurse) * 100));

            return (
              <div
                key={teamId}
                className={`p-3.5 rounded-xl border transition-all ${
                  isMyTeam
                    ? 'bg-cricket-cyan/10 border-cricket-cyan/40 shadow-lg shadow-cyan-950/30'
                    : 'bg-stadium-card/80 border-stadium-border/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: team.brandColor || '#E11D48' }}
                    ></span>
                    <span className="font-extrabold text-sm text-white truncate">
                      {team.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {team.shortName}
                    </span>
                  </div>

                  {isMyTeam && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cricket-cyan text-slate-950">
                      YOU
                    </span>
                  )}
                </div>

                {/* Purse & Squad Stats */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Wallet className="w-3.5 h-3.5 text-cricket-gold" />
                    <span className="font-mono font-bold text-white tabular-nums text-xs">
                      {remainingPurse.toLocaleString()} <span className="text-[10px] text-slate-400">pts</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Users className="w-3.5 h-3.5 text-cricket-cyan" />
                    <span className="font-bold text-slate-200">
                      {squadCount} / {maxSquad}
                    </span>
                  </div>
                </div>

                {/* Purse Spent Progress Bar */}
                <div className="w-full h-1.5 bg-stadium-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cricket-cyan rounded-full transition-all duration-500"
                    style={{ width: `${100 - spentPercent}%` }}
                    title={`Remaining Purse: ${100 - spentPercent}%`}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
