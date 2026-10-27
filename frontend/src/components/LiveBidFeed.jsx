import React, { useRef, useEffect } from 'react';
import { History, TrendingUp } from 'lucide-react';

export const LiveBidFeed = ({ recentBids, activePlayer }) => {
  const feedEndRef = useRef(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentBids]);

  return (
    <div className="glass-panel rounded-2xl p-4 lg:p-5 border border-stadium-border/60 flex flex-col h-full max-h-[700px]">
      <div className="flex items-center justify-between pb-3 border-b border-stadium-border/60 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cricket-gold" />
          <h3 className="font-extrabold text-white text-base tracking-tight">Live Activity Feed</h3>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-stadium-surface px-2.5 py-0.5 rounded-full border border-stadium-border">
          {recentBids?.length || 0} Bids
        </span>
      </div>

      <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
        {!activePlayer ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Awaiting next player on podium.
          </div>
        ) : !recentBids || recentBids.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No bids placed for <strong className="text-slate-300">{activePlayer.name}</strong> yet.
          </div>
        ) : (
          recentBids.map((bid, idx) => {
            const team = bid.teamId || {};
            const timeStr = bid.timestamp ? new Date(bid.timestamp).toLocaleTimeString() : 'Just now';
            const isHighest = idx === 0;

            return (
              <div
                key={bid._id || idx}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isHighest
                    ? 'bg-cricket-gold/10 border-cricket-gold/40 shadow-md shadow-gold-950/20'
                    : 'bg-stadium-card/60 border-stadium-border/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.brandColor || '#F59E0B' }}
                  ></span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-white truncate">
                        {team.shortName || team.name || 'Team'}
                      </span>
                      {isHighest && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cricket-gold text-slate-950">
                          LEADING
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums">{timeStr}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1 font-mono font-bold text-sm text-white tabular-nums">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{bid.bidAmount?.toLocaleString()}</span>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Points</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
};
