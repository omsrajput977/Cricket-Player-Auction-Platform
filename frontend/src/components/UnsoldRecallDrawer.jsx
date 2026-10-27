import React, { useState } from 'react';
import { apiRequest } from '../utils/api';
import { RotateCcw, CheckSquare, Square, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

export const UnsoldRecallDrawer = ({ tournamentId, players, onRecalled }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const unsoldPlayers = (players || []).filter((p) => p.status === 'UNSOLD');

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === unsoldPlayers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unsoldPlayers.map((p) => p._id));
    }
  };

  const handleRecall = async () => {
    if (!tournamentId || unsoldPlayers.length === 0) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await apiRequest('/players/recall-unsold', {
        method: 'POST',
        body: {
          tournamentId,
          playerIds: selectedIds.length > 0 ? selectedIds : unsoldPlayers.map((p) => p._id),
          discountPercent: Number(discountPercent),
        },
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setSelectedIds([]);
        if (onRecalled) onRecalled();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (unsoldPlayers.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-stadium-border/60 text-center text-xs text-slate-500">
        No unsold players currently recorded. If players go unsold during the auction, they will appear here for Round 2 Accelerated recall.
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-cricket-purple/40 bg-stadium-card/90 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stadium-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Round 2 Accelerated: Unsold Recall</h3>
            <p className="text-xs text-slate-400">Re-queue unsold players into an accelerated round with optional discounted base prices</p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
          {unsoldPlayers.length} Unsold Players Available
        </span>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-stadium-surface/40 p-3 rounded-xl border border-stadium-border/60">
        <button
          onClick={selectAll}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
        >
          {selectedIds.length === unsoldPlayers.length ? (
            <CheckSquare className="w-4 h-4 text-purple-400" />
          ) : (
            <Square className="w-4 h-4 text-slate-500" />
          )}
          <span>{selectedIds.length === unsoldPlayers.length ? 'Deselect All' : 'Select All Unsold'}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold">Base Price Discount:</span>
            <select
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="bg-stadium-card border border-stadium-border text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-400"
            >
              <option value="0">0% (Keep Original)</option>
              <option value="15">15% Discount</option>
              <option value="25">25% Discount</option>
              <option value="40">40% Discount</option>
            </select>
          </div>

          <button
            onClick={handleRecall}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 text-white shadow-md shadow-purple-950 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>
              Recall {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'All Unsold'} to Round 2
            </span>
          </button>
        </div>
      </div>

      {/* Unsold Table */}
      <div className="overflow-x-auto rounded-xl border border-stadium-border/60 max-h-64 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-stadium-surface text-slate-400 uppercase font-bold text-[10px] tracking-wider sticky top-0">
            <tr>
              <th className="p-3 w-10">Select</th>
              <th className="p-3">Player</th>
              <th className="p-3">Roll No</th>
              <th className="p-3">Role</th>
              <th className="p-3">Original Base</th>
              <th className="p-3">Discounted Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stadium-border/60">
            {unsoldPlayers.map((p) => {
              const isSelected = selectedIds.includes(p._id);
              const disc = Number(discountPercent);
              const discountedPrice =
                disc > 0 ? Math.max(20000, Math.round(p.basePrice * (1 - disc / 100))) : p.basePrice;

              return (
                <tr
                  key={p._id}
                  onClick={() => toggleSelect(p._id)}
                  className={`hover:bg-slate-800/60 cursor-pointer ${
                    isSelected ? 'bg-purple-900/10' : ''
                  }`}
                >
                  <td className="p-3">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </td>
                  <td className="p-3 font-bold text-white">{p.name}</td>
                  <td className="p-3 font-mono text-slate-400">{p.rollNumber}</td>
                  <td className="p-3 text-cricket-cyan">{p.role.replace(/_/g, ' ')}</td>
                  <td className="p-3 font-mono text-slate-400">{p.basePrice?.toLocaleString()} pts</td>
                  <td className="p-3 font-mono font-bold text-cricket-gold">
                    {discountedPrice.toLocaleString()} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
