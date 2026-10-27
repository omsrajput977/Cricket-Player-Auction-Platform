import { Mutex } from 'async-mutex';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import BidHistory from '../models/BidHistory.js';

/**
 * Calculates next required bid amount
 * RULE: First bid on a player equals basePrice. Subsequent bids use dynamic slabs.
 */
export function getNextBid(currentBid, basePrice) {
  if (!currentBid || currentBid === 0) {
    return Number(basePrice);
  }

  const bid = Number(currentBid);
  if (bid < 100000) {
    return bid + 10000; // +10k slab
  } else if (bid < 500000) {
    return bid + 25000; // +25k slab
  } else if (bid < 2000000) {
    return bid + 50000; // +50k slab
  } else {
    return bid + 100000; // +100k slab
  }
}

/**
 * Validates purse reserve & squad capacity in server memory
 * RULE: (remainingPurse - bidAmount) >= max(0, minSquad - (squad + 1)) * minBasePrice
 */
export function validateBidRules({
  teamCache,
  bidAmount,
  minSquadSize,
  maxSquadSize,
  minBasePrice,
}) {
  if (!teamCache) {
    return { allowed: false, reason: 'Team data not found in cache.' };
  }

  if (teamCache.squadCount >= maxSquadSize) {
    return { allowed: false, reason: 'Squad full. Maximum player limit reached.' };
  }

  const slotsStillNeeded = Math.max(0, minSquadSize - (teamCache.squadCount + 1));
  const reserve = slotsStillNeeded * minBasePrice;
  const remainingAfterBid = teamCache.remainingPurse - bidAmount;

  if (remainingAfterBid < reserve) {
    return {
      allowed: false,
      reason: `Purse reserve breach. Remaining purse must retain at least ${reserve.toLocaleString()} pts for ${slotsStillNeeded} mandatory squad slots.`,
    };
  }

  return { allowed: true };
}

/**
 * Registry of tournament engines keyed by tournamentId
 */
const tournamentEngines = new Map();

export class TournamentEngine {
  constructor(tournamentId) {
    this.tournamentId = tournamentId.toString();
    this.mutex = new Mutex();
    this.teamsCache = new Map(); // teamId -> { id, name, shortName, brandColor, remainingPurse, totalPurse, squadCount }
    this.tournamentSettings = {
      startingPurse: 10000000,
      minSquadSize: 11,
      maxSquadSize: 16,
      minBasePrice: 20000,
      timerDurationSeconds: 20,
      antiSnipingSeconds: 15,
    };
    this.session = {
      activePlayer: null, // Full player object
      currentHighestBid: 0,
      currentBidderTeamId: null,
      currentBidderUserId: null,
      status: 'IDLE', // 'IDLE' | 'INTRODUCING' | 'BIDDING' | 'PAUSED' | 'PAUSED_EXPIRED'
      endsAt: 0,
      remainingMs: 0,
      timerRunning: false,
      timerTimeout: null,
      isFinalizing: false, // Critical race-condition guard
      snapshotVersion: 0, // Incremented per bid
    };
  }

  /**
   * Hydrates teams cache, settings, and resurrects active session snapshot on server restart
   */
  async hydrate(io = null) {
    const tournament = await Tournament.findById(this.tournamentId);
    if (!tournament) throw new Error(`Tournament ${this.tournamentId} not found`);

    this.tournamentSettings = {
      ...this.tournamentSettings,
      ...tournament.settings.toObject(),
    };

    const teams = await Team.find({ tournamentId: this.tournamentId });
    this.teamsCache.clear();
    for (const t of teams) {
      this.teamsCache.set(t._id.toString(), {
        id: t._id.toString(),
        name: t.name,
        shortName: t.shortName,
        brandColor: t.brandColor,
        remainingPurse: t.remainingPurse,
        totalPurse: t.totalPurse,
        squadCount: t.squad.length,
      });
    }

    console.log(`⚡ Hydrated memory cache for tournament ${this.tournamentId} with ${teams.length} teams.`);

    // Server Restart Recovery: Rehydrate activeAuctionSession snapshot if podium was active
    const savedSession = tournament.activeAuctionSession;
    if (savedSession && savedSession.activePlayerId) {
      try {
        const player = await Player.findById(savedSession.activePlayerId);
        if (player && player.status === 'ON_PODIUM') {
          this.session.activePlayer = player;
          this.session.currentHighestBid = savedSession.currentHighestBid || 0;
          this.session.currentBidderTeamId = savedSession.currentBidderTeamId ? savedSession.currentBidderTeamId.toString() : null;
          this.session.currentBidderUserId = savedSession.currentBidderUserId ? savedSession.currentBidderUserId.toString() : null;
          this.session.snapshotVersion = savedSession.snapshotVersion || 0;

          const now = Date.now();
          if (savedSession.status === 'BIDDING' && savedSession.endsAt > now) {
            // Timer was running when server restarted; resume with remaining time
            const remainingSec = Math.max(1, Math.ceil((savedSession.endsAt - now) / 1000));
            this.session.endsAt = savedSession.endsAt;
            this.session.remainingMs = savedSession.endsAt - now;
            this.session.timerRunning = true;
            this.session.status = 'BIDDING';

            if (io) {
              this.startTimer(remainingSec, io);
            }
          } else if (savedSession.status === 'BIDDING' && savedSession.endsAt <= now) {
            // Timer expired while server was offline; set to PAUSED_EXPIRED awaiting admin action
            this.session.status = 'PAUSED_EXPIRED';
            this.session.endsAt = 0;
            this.session.remainingMs = 0;
            this.session.timerRunning = false;
          } else {
            this.session.status = savedSession.status || 'INTRODUCING';
            this.session.timerRunning = false;
          }

          console.log(`🔄 [RECOVERY] Successfully resurrected active podium for player "${player.name}" (Bid: ${this.session.currentHighestBid} pts, State: ${this.session.status})`);
        }
      } catch (recoveryErr) {
        console.error('⚠️ Failed to rehydrate active auction session:', recoveryErr.message);
      }
    }
  }

  /**
   * Resets and starts single countdown timer
   */
  startTimer(durationSeconds, io) {
    this.clearTimerTimeout();

    const durationMs = durationSeconds * 1000;
    this.session.endsAt = Date.now() + durationMs;
    this.session.remainingMs = durationMs;
    this.session.timerRunning = true;
    this.session.status = 'BIDDING';

    io.to(this.tournamentId).emit('TIMER_SYNC', {
      endsAt: this.session.endsAt,
      serverNow: Date.now(),
      durationSeconds,
      status: 'BIDDING',
    });

    this.session.timerTimeout = setTimeout(async () => {
      await this.mutex.runExclusive(async () => {
        if (!this.session.timerRunning) return;

        this.session.timerRunning = false;
        this.session.status = 'PAUSED_EXPIRED';
        this.session.remainingMs = 0;

        console.log(`⏱️ Timer expired for tournament ${this.tournamentId}. Awaiting Admin action.`);

        io.to(this.tournamentId).emit('TIMER_EXPIRED', {
          tournamentId: this.tournamentId,
          playerId: this.session.activePlayer ? this.session.activePlayer._id : null,
          highestBid: this.session.currentHighestBid,
          bidderTeamId: this.session.currentBidderTeamId,
          status: 'PAUSED_EXPIRED',
        });
      });
    }, durationMs);
  }

  /**
   * Pauses running timer and stores remainingMs
   */
  pauseTimer(io) {
    if (!this.session.timerRunning) return;

    this.clearTimerTimeout();
    this.session.remainingMs = Math.max(0, this.session.endsAt - Date.now());
    this.session.timerRunning = false;
    this.session.status = 'PAUSED';

    io.to(this.tournamentId).emit('TIMER_PAUSED', {
      remainingMs: this.session.remainingMs,
      serverNow: Date.now(),
      status: 'PAUSED',
    });
  }

  /**
   * Resumes paused timer using remainingMs
   */
  resumeTimer(io) {
    if (this.session.timerRunning || this.session.remainingMs <= 0) return;

    const remainingSec = Math.max(1, Math.ceil(this.session.remainingMs / 1000));
    this.startTimer(remainingSec, io);
  }

  clearTimerTimeout() {
    if (this.session.timerTimeout) {
      clearTimeout(this.session.timerTimeout);
      this.session.timerTimeout = null;
    }
  }

  /**
   * Asynchronously persists lightweight snapshot with version check
   */
  async persistSnapshot() {
    const version = this.session.snapshotVersion;
    try {
      await Tournament.updateOne(
        {
          _id: this.tournamentId,
          'activeAuctionSession.snapshotVersion': { $lte: version },
        },
        {
          $set: {
            'activeAuctionSession.activePlayerId': this.session.activePlayer ? this.session.activePlayer._id : null,
            'activeAuctionSession.currentHighestBid': this.session.currentHighestBid,
            'activeAuctionSession.currentBidderTeamId': this.session.currentBidderTeamId,
            'activeAuctionSession.currentBidderUserId': this.session.currentBidderUserId,
            'activeAuctionSession.endsAt': this.session.endsAt,
            'activeAuctionSession.status': this.session.status,
            'activeAuctionSession.snapshotVersion': version,
          },
        }
      );
    } catch (err) {
      console.error('Async snapshot persist failed:', err.message);
    }
  }

  /**
   * Gets clean snapshot for client room sync
   */
  getSnapshot() {
    return {
      activePlayer: this.session.activePlayer,
      currentHighestBid: this.session.currentHighestBid,
      currentBidderTeamId: this.session.currentBidderTeamId,
      status: this.session.status,
      endsAt: this.session.endsAt,
      serverNow: Date.now(),
      timerRunning: this.session.timerRunning,
      remainingMs: this.session.remainingMs,
      teams: Array.from(this.teamsCache.values()),
      nextBidAmount: this.session.activePlayer
        ? getNextBid(this.session.currentHighestBid, this.session.activePlayer.basePrice)
        : 0,
    };
  }
}

/**
 * Get or create tournament engine singleton
 */
export const getTournamentEngine = async (tournamentId, io = null) => {
  const idStr = tournamentId.toString();
  if (!tournamentEngines.has(idStr)) {
    const engine = new TournamentEngine(idStr);
    await engine.hydrate(io);
    tournamentEngines.set(idStr, engine);
  }
  return tournamentEngines.get(idStr);
};

