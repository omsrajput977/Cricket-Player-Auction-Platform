import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { X, Shield, Wallet, Users, Award, User } from 'lucide-react';

export const TeamRosterModal = ({ team, onClose }) => {
  const [squadDetails, setSquadDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  const teamId = team?._id || team?.id;

  useEffect(() => {
    if (!teamId) return;

    const fetchSquad = async () => {
      try {
        const res = await apiRequest(`/teams/${teamId}`);
        if (res.success && res.data) {
          setSquadDetails(res.data.squad || []);
        }
      } catch (err) {
        console.error('Failed to load team squad:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSquad();
  }, [teamId]);

  if (!team) return null;

  const totalSpent = (team.totalPurse || 10000000) - (team.remainingPurse || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel-glow w-full max-w-2xl rounded-2xl border border-stadium-border overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div
          className="p-6 border-b border-stadium-border/80 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${team.brandColor || '#E11D48'}22 0%, rgba(17, 24, 39, 0.95) 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: team.brandColor || '#E11D48' }}
            ></span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">{team.name}</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {team.shortName}
                </span>
              </div>
              <p className="text-xs text-slate-400">Franchise Squad Roster & Purchases</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stadium-surface hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-3 gap-4 bg-stadium-surface/40 p-4 border-b border-stadium-border/60 text-center text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining Purse</span>
            <span className="font-mono font-extrabold text-white text-sm tabular-nums">
              {team.remainingPurse?.toLocaleString()} <span className="text-[10px] text-slate-400">pts</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spent</span>
            <span className="font-mono font-extrabold text-cricket-gold text-sm tabular-nums">
              {totalSpent.toLocaleString()} <span className="text-[10px] text-slate-400">pts</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Squad Count</span>
            <span className="font-extrabold text-emerald-400 text-sm">
              {squadDetails.length} Players
            </span>
          </div>
        </div>

        {/* Squad List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading squad players...</div>
          ) : squadDetails.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No players purchased yet by this franchise.
            </div>
          ) : (
            squadDetails.map((item, idx) => {
              const player = item.player || {};
              return (
                <div
                  key={player._id || idx}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-stadium-card/80 border border-stadium-border/80 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stadium-surface flex items-center justify-center border border-stadium-border text-slate-400 shrink-0">
                      {player.photo?.url ? (
                        <img
                          src={player.photo.url}
                          alt={player.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">{player.name}</div>
                      <div className="text-[11px] text-cricket-cyan font-semibold">
                        {player.role ? player.role.replace(/_/g, ' ') : 'Cricket Player'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-cricket-gold tabular-nums">
                      {item.soldPrice?.toLocaleString()} pts
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.purchasedAt || Date.now()).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
