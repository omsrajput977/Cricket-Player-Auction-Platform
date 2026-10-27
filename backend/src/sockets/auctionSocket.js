import mongoose from 'mongoose';
import { verifyToken } from '../utils/token.js';
import { getTournamentEngine, getNextBid, validateBidRules } from '../services/auctionEngine.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Tournament from '../models/Tournament.js';
import BidHistory from '../models/BidHistory.js';
import User from '../models/User.js';

export const registerAuctionSocketHandlers = (io) => {
  // Socket JWT Authentication Middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const decoded = verifyToken(token);
        let extractedTeamId = null;
        if (decoded.teamId) {
          if (typeof decoded.teamId === 'object' && decoded.teamId._id) {
            extractedTeamId = decoded.teamId._id.toString();
          } else if (typeof decoded.teamId === 'string') {
            const match = decoded.teamId.match(/[a-fA-F0-9]{24}/);
            extractedTeamId = match ? match[0] : decoded.teamId;
          } else {
            extractedTeamId = String(decoded.teamId);
          }
        }

        socket.data.user = {
          id: decoded.id,
          role: decoded.role,
          teamId: extractedTeamId,
        };
      } else {
        // Unauthenticated spectator
        socket.data.user = {
          id: null,
          role: 'SPECTATOR',
          teamId: null,
        };
      }
      next();
    } catch (err) {
      // Allow connection as SPECTATOR if token is invalid or expired
      socket.data.user = {
        id: null,
        role: 'SPECTATOR',
        teamId: null,
      };
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (Role: ${socket.data.user.role}, Team: ${socket.data.user.teamId})`);

    /**
     * JOIN_AUCTION_ROOM
     * Joins tournament room and sends initial state snapshot
     */
    socket.on('JOIN_AUCTION_ROOM', async ({ tournamentId }) => {
      try {
        if (!tournamentId) return;

        socket.join(tournamentId.toString());
        const engine = await getTournamentEngine(tournamentId);
        if (engine.teamsCache.size === 0) {
          await engine.hydrate();
        }
        const snapshot = engine.getSnapshot();

        // Fetch recent bids for active player
        let recentBids = [];
        if (engine.session.activePlayer) {
          recentBids = await BidHistory.find({
            tournamentId,
            playerId: engine.session.activePlayer._id,
          })
            .sort({ timestamp: -1 })
            .limit(20)
            .populate('teamId', 'name shortName brandColor');
        }

        socket.emit('ROOM_STATE_SYNC', {
          ...snapshot,
          recentBids,
        });
      } catch (err) {
        console.error('JOIN_AUCTION_ROOM error:', err.message);
        socket.emit('ERROR', { message: 'Failed to join auction room.' });
      }
    });

    /**
     * ADMIN_LOAD_PLAYER
     * Pushes a player to the podium (Admin Only)
     */
    socket.on('ADMIN_LOAD_PLAYER', async ({ tournamentId, playerId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);

        await engine.mutex.runExclusive(async () => {
          if (engine.session.isFinalizing) {
            return socket.emit('ERROR', { message: 'A sale is currently being finalized.' });
          }

          const player = await Player.findOne({ _id: playerId, tournamentId });
          if (!player) {
            return socket.emit('ERROR', { message: 'Player not found in this tournament.' });
          }

          engine.clearTimerTimeout();

          // 1. Revert previous podium player(s) back to APPROVED so they return to the selection queue
          await Player.updateMany(
            { tournamentId, status: 'ON_PODIUM', _id: { $ne: player._id } },
            { $set: { status: 'APPROVED' } }
          );

          engine.session.activePlayer = player;
          engine.session.currentHighestBid = 0;
          engine.session.currentBidderTeamId = null;
          engine.session.currentBidderUserId = null;
          engine.session.status = 'INTRODUCING';
          engine.session.endsAt = 0;
          engine.session.remainingMs = 0;
          engine.session.timerRunning = false;
          engine.session.snapshotVersion += 1;

          // Update new player status
          player.status = 'ON_PODIUM';
          await player.save();

          await engine.persistSnapshot();

          io.to(tournamentId).emit('PLAYER_ON_PODIUM', {
            player,
            basePrice: player.basePrice,
            nextBidAmount: player.basePrice,
            status: 'INTRODUCING',
          });
        });
      } catch (err) {
        console.error('ADMIN_LOAD_PLAYER error:', err.message);
        socket.emit('ERROR', { message: err.message });
      }
    });

    /**
     * ADMIN_UNLOAD_PODIUM
     * Returns the active player from the podium back to the selection queue ('APPROVED')
     * without marking them as UNSOLD or SOLD.
     */
    socket.on('ADMIN_UNLOAD_PODIUM', async ({ tournamentId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);

        await engine.mutex.runExclusive(async () => {
          const session = engine.session;
          if (!session.activePlayer) {
            return socket.emit('ERROR', { message: 'No player on the podium to return.' });
          }

          if (session.isFinalizing) return;

          engine.clearTimerTimeout();

          const activePlayerId = session.activePlayer._id;
          const nextVersion = session.snapshotVersion + 1;

          // Revert active player (and any orphan ON_PODIUM players) back to APPROVED
          const revertedPlayer = await Player.findByIdAndUpdate(
            activePlayerId,
            { status: 'APPROVED' },
            { new: true }
          );

          await Player.updateMany(
            { tournamentId, status: 'ON_PODIUM' },
            { $set: { status: 'APPROVED' } }
          );

          // Clear Tournament snapshot in DB
          await Tournament.findByIdAndUpdate(tournamentId, {
            $set: {
              'activeAuctionSession.activePlayerId': null,
              'activeAuctionSession.currentHighestBid': 0,
              'activeAuctionSession.currentBidderTeamId': null,
              'activeAuctionSession.currentBidderUserId': null,
              'activeAuctionSession.endsAt': 0,
              'activeAuctionSession.status': 'IDLE',
              'activeAuctionSession.snapshotVersion': nextVersion,
            },
          });

          // Reset In-Memory Session
          session.activePlayer = null;
          session.currentHighestBid = 0;
          session.currentBidderTeamId = null;
          session.currentBidderUserId = null;
          session.endsAt = 0;
          session.remainingMs = 0;
          session.timerRunning = false;
          session.status = 'IDLE';
          session.snapshotVersion = nextVersion;

          console.log(`↩️ PODIUM UNLOADED: ${revertedPlayer?.name} returned to available auction queue.`);

          io.to(tournamentId).emit('PLAYER_RETURNED_TO_QUEUE', {
            player: revertedPlayer,
          });
        });
      } catch (err) {
        console.error('ADMIN_UNLOAD_PODIUM error:', err.message);
        socket.emit('ERROR', { message: err.message });
      }
    });

    /**
     * ADMIN_START_BIDDING
     * Starts the auction timer for the active player (Admin Only)
     */
    socket.on('ADMIN_START_BIDDING', async ({ tournamentId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);

        await engine.mutex.runExclusive(async () => {
          if (!engine.session.activePlayer) {
            return socket.emit('ERROR', { message: 'No player on the podium.' });
          }

          const duration = engine.tournamentSettings.timerDurationSeconds || 20;
          engine.startTimer(duration, io);

          await engine.persistSnapshot();

          io.to(tournamentId).emit('BIDDING_STARTED', {
            playerId: engine.session.activePlayer._id,
            durationSeconds: duration,
            endsAt: engine.session.endsAt,
            serverNow: Date.now(),
          });
        });
      } catch (err) {
        console.error('ADMIN_START_BIDDING error:', err.message);
        socket.emit('ERROR', { message: err.message });
      }
    });

    /**
     * ADMIN_PAUSE_TIMER
     */
    socket.on('ADMIN_PAUSE_TIMER', async ({ tournamentId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);
        await engine.mutex.runExclusive(async () => {
          engine.pauseTimer(io);
          await engine.persistSnapshot();
        });
      } catch (err) {
        socket.emit('ERROR', { message: err.message });
      }
    });

    /**
     * ADMIN_RESUME_TIMER
     */
    socket.on('ADMIN_RESUME_TIMER', async ({ tournamentId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);
        await engine.mutex.runExclusive(async () => {
          engine.resumeTimer(io);
          await engine.persistSnapshot();
        });
      } catch (err) {
        socket.emit('ERROR', { message: err.message });
      }
    });

    /**
     * ADMIN_FALLBACK_BID
     * Admin places a bid on behalf of a team whose campus Wi-Fi dropped
     */
    socket.on('ADMIN_FALLBACK_BID', async ({ tournamentId, targetTeamId }) => {
      try {
        if (!tournamentId || !targetTeamId) return;

        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required for fallback bidding.' });
        }

        const engine = await getTournamentEngine(tournamentId, io);

        await engine.mutex.runExclusive(async () => {
          const session = engine.session;

          if (session.isFinalizing) {
            return socket.emit('ERROR', { message: 'Player sale is currently being finalized.' });
          }

          if (!session.activePlayer || (session.status !== 'BIDDING' && session.status !== 'INTRODUCING')) {
            return socket.emit('ERROR', { message: 'Bidding is not currently active for this player.' });
          }

          if (session.timerRunning && Date.now() >= session.endsAt) {
            return socket.emit('ERROR', { message: 'Bidding time has expired.' });
          }

          const targetTeamStr = targetTeamId.toString();
          if (session.currentBidderTeamId === targetTeamStr) {
            return socket.emit('ERROR', { message: 'This franchise already holds the highest bid.' });
          }

          let teamCache = engine.teamsCache.get(targetTeamStr);
          if (!teamCache) {
            teamCache = await engine.ensureTeamCached(targetTeamStr);
          }
          if (!teamCache) {
            return socket.emit('ERROR', { message: 'Target team not found in tournament cache.' });
          }

          const nextBid = getNextBid(session.currentHighestBid, session.activePlayer.basePrice);

          // Validate Purse & Reserve using In-Memory Cache
          const validation = validateBidRules({
            teamCache,
            bidAmount: nextBid,
            minSquadSize: engine.tournamentSettings.minSquadSize,
            maxSquadSize: engine.tournamentSettings.maxSquadSize,
            minBasePrice: engine.tournamentSettings.minBasePrice,
          });

          if (!validation.allowed) {
            return socket.emit('ERROR', { message: `Fallback bid failed: ${validation.reason}` });
          }

          // Accept Fallback Bid
          session.currentHighestBid = nextBid;
          session.currentBidderTeamId = targetTeamStr;
          session.currentBidderUserId = socket.data.user.id;
          session.snapshotVersion += 1;

          // Anti-Sniping Timer Reset
          const remainingSec = Math.max(0, Math.floor((session.endsAt - Date.now()) / 1000));
          const antiSnipingDuration = engine.tournamentSettings.antiSnipingSeconds || 15;
          const newDuration = Math.max(remainingSec, antiSnipingDuration);

          engine.startTimer(newDuration, io);

          const nextNextBid = getNextBid(nextBid, session.activePlayer.basePrice);

          console.log(`📡 [FALLBACK BID] Admin placed fallback bid of ${nextBid.toLocaleString()} pts for ${teamCache.name}`);

          io.to(tournamentId).emit('BID_ACCEPTED', {
            playerId: session.activePlayer._id,
            teamId: targetTeamStr,
            teamName: teamCache.name,
            teamShortName: teamCache.shortName,
            teamBrandColor: teamCache.brandColor,
            bidAmount: nextBid,
            nextBidAmount: nextNextBid,
            endsAt: session.endsAt,
            serverNow: Date.now(),
            timestamp: new Date().toISOString(),
            isFallbackBid: true,
          });

          queueMicrotask(async () => {
            await engine.persistSnapshot();
            try {
              await BidHistory.create({
                tournamentId,
                playerId: session.activePlayer._id,
                teamId: targetTeamStr,
                bidAmount: nextBid,
                placedBy: socket.data.user.id,
                bidType: 'ADMIN_FALLBACK_BID',
                isWinningBid: false,
              });
            } catch (err) {
              console.error('Async Fallback BidHistory logging failed:', err.message);
            }
          });
        });
      } catch (err) {
        console.error('ADMIN_FALLBACK_BID error:', err.message);
        socket.emit('ERROR', { message: 'Internal error processing fallback bid.' });
      }
    });

    /**
     * PLACE_BID
     * Team Owner places an incremental bid
     */
    socket.on('PLACE_BID', async ({ tournamentId, expectedAmount }) => {
      try {
        if (!tournamentId) return;

        const engine = await getTournamentEngine(tournamentId);

        await engine.mutex.runExclusive(async () => {
          const session = engine.session;

          // 1. Guard: Finalization in progress
          if (session.isFinalizing) {
            return socket.emit('BID_REJECTED', {
              reason: 'Player sale is currently being finalized.',
            });
          }

          // 2. Guard: Active player exists & in bidding state
          if (!session.activePlayer || (session.status !== 'BIDDING' && session.status !== 'INTRODUCING')) {
            return socket.emit('BID_REJECTED', {
              reason: 'Bidding is not currently active for this player.',
            });
          }

          // 3. Guard: Strict Time Boundary
          if (session.timerRunning && Date.now() >= session.endsAt) {
            return socket.emit('BID_REJECTED', {
              reason: 'Bidding time has expired.',
            });
          }

          // 4. Socket Security: Derive teamId strictly from verified JWT
          let teamId = socket.data.user.teamId;
          if (!teamId && socket.data.user.id) {
            const dbUser = await User.findById(socket.data.user.id);
            if (dbUser && dbUser.teamId) {
              teamId = dbUser.teamId.toString();
              socket.data.user.teamId = teamId;
            }
          }

          if (!teamId) {
            return socket.emit('BID_REJECTED', {
              reason: 'User is not associated with an authorized franchise.',
            });
          }

          const teamIdStr = teamId.toString();

          // 5. Guard: Prevent self-bumping
          if (session.currentBidderTeamId === teamIdStr) {
            return socket.emit('BID_REJECTED', {
              reason: 'Your team already holds the highest bid.',
            });
          }

          // 6. Calculate required next bid amount
          const nextBid = getNextBid(session.currentHighestBid, session.activePlayer.basePrice);

          // 7. Stale Bid Protection: Compare with expectedAmount
          if (expectedAmount !== undefined && Number(expectedAmount) !== nextBid) {
            return socket.emit('BID_REJECTED', {
              reason: 'Price changed, try again.',
              expectedAmount,
              currentRequired: nextBid,
            });
          }

          // 8. Validate Purse & Reserve using In-Memory Cache (Lazy fallback if missing)
          let teamCache = engine.teamsCache.get(teamIdStr);
          if (!teamCache) {
            teamCache = await engine.ensureTeamCached(teamIdStr);
          }

          const validation = validateBidRules({
            teamCache,
            bidAmount: nextBid,
            minSquadSize: engine.tournamentSettings.minSquadSize,
            maxSquadSize: engine.tournamentSettings.maxSquadSize,
            minBasePrice: engine.tournamentSettings.minBasePrice,
          });

          if (!validation.allowed) {
            return socket.emit('BID_REJECTED', {
              reason: validation.reason,
            });
          }

          // 9. Accept Bid: Update in-memory authoritative state
          session.currentHighestBid = nextBid;
          session.currentBidderTeamId = teamIdStr;
          session.currentBidderUserId = socket.data.user.id;
          session.snapshotVersion += 1;

          // 10. Anti-Sniping Timer Reset
          const remainingSec = Math.max(0, Math.floor((session.endsAt - Date.now()) / 1000));
          const antiSnipingDuration = engine.tournamentSettings.antiSnipingSeconds || 15;
          const newDuration = Math.max(remainingSec, antiSnipingDuration);

          engine.startTimer(newDuration, io);

          const nextNextBid = getNextBid(nextBid, session.activePlayer.basePrice);

          // 11. Broadcast accepted bid to room
          io.to(tournamentId).emit('BID_ACCEPTED', {
            playerId: session.activePlayer._id,
            teamId: teamIdStr,
            teamName: teamCache.name,
            teamShortName: teamCache.shortName,
            teamBrandColor: teamCache.brandColor,
            bidAmount: nextBid,
            nextBidAmount: nextNextBid,
            endsAt: session.endsAt,
            serverNow: Date.now(),
            timestamp: new Date().toISOString(),
          });

          // 12. Asynchronously persist lightweight snapshot & BidHistory audit record
          queueMicrotask(async () => {
            await engine.persistSnapshot();
            try {
              await BidHistory.create({
                tournamentId,
                playerId: session.activePlayer._id,
                teamId: teamIdStr,
                bidAmount: nextBid,
                placedBy: socket.data.user.id,
                bidType: 'OWNER_BID',
                isWinningBid: false,
              });
            } catch (err) {
              console.error('Async BidHistory logging failed:', err.message);
            }
          });
        });
      } catch (err) {
        console.error('PLACE_BID error:', err.message);
        socket.emit('BID_REJECTED', { reason: 'Internal error processing bid.' });
      }
    });

    /**
     * ADMIN_CONFIRM_SOLD
     * Finalizes player sale inside unified mutex using MongoDB ACID transaction
     */
    socket.on('ADMIN_CONFIRM_SOLD', async ({ tournamentId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);

        await engine.mutex.runExclusive(async () => {
          const session = engine.session;

          if (session.isFinalizing) return;

          // Graceful Error Handling: If 0 bids, guide admin to Mark Unsold
          if (!session.activePlayer || !session.currentBidderTeamId || session.currentHighestBid === 0) {
            return socket.emit('ERROR', {
              message: 'No bids placed. Please use "Mark Unsold" for this player.',
            });
          }

          session.isFinalizing = true;
          engine.clearTimerTimeout();

          const activePlayerId = session.activePlayer._id;
          const winningTeamId = session.currentBidderTeamId;
          const finalPrice = session.currentHighestBid;
          const nextVersion = session.snapshotVersion + 1;

          const dbSession = await mongoose.startSession();
          let finalTeam;
          let finalPlayer;

          try {
            await dbSession.withTransaction(async () => {
              // 1. Atomically debit team's purse and append to squad
              finalTeam = await Team.findOneAndUpdate(
                {
                  _id: winningTeamId,
                  remainingPurse: { $gte: finalPrice },
                },
                {
                  $inc: { remainingPurse: -finalPrice },
                  $push: {
                    squad: {
                      player: activePlayerId,
                      soldPrice: finalPrice,
                      purchasedAt: new Date(),
                    },
                  },
                },
                { session: dbSession, new: true }
              );

              if (!finalTeam) {
                throw new Error('Transaction aborted: Team has insufficient remaining purse.');
              }

              // 2. Mark Player as SOLD
              finalPlayer = await Player.findByIdAndUpdate(
                activePlayerId,
                {
                  status: 'SOLD',
                  soldTo: winningTeamId,
                  soldPrice: finalPrice,
                },
                { session: dbSession, new: true }
              );

              // 3. Duplicate Bid Audit Fix: Update isWinningBid: true on existing final accepted bid
              await BidHistory.findOneAndUpdate(
                {
                  tournamentId,
                  playerId: activePlayerId,
                  teamId: winningTeamId,
                  bidAmount: finalPrice,
                },
                { $set: { isWinningBid: true } },
                { session: dbSession, sort: { timestamp: -1 } }
              );

              // 4. Snapshot Versioning & Clearing directly inside transaction
              await Tournament.findByIdAndUpdate(
                tournamentId,
                {
                  $set: {
                    'activeAuctionSession.activePlayerId': null,
                    'activeAuctionSession.currentHighestBid': 0,
                    'activeAuctionSession.currentBidderTeamId': null,
                    'activeAuctionSession.currentBidderUserId': null,
                    'activeAuctionSession.endsAt': 0,
                    'activeAuctionSession.status': 'IDLE',
                    'activeAuctionSession.snapshotVersion': nextVersion,
                  },
                },
                { session: dbSession }
              );
            });
          } finally {
            await dbSession.endSession();
          }

          // Update In-Memory Teams Cache
          const winningTeamStr = winningTeamId.toString();
          let cachedTeam = engine.teamsCache.get(winningTeamStr);
          if (!cachedTeam) {
            cachedTeam = await engine.ensureTeamCached(winningTeamStr);
          }
          if (cachedTeam) {
            cachedTeam.remainingPurse -= finalPrice;
            cachedTeam.squadCount += 1;
          }

          // Reset In-Memory Session
          session.activePlayer = null;
          session.currentHighestBid = 0;
          session.currentBidderTeamId = null;
          session.currentBidderUserId = null;
          session.endsAt = 0;
          session.remainingMs = 0;
          session.timerRunning = false;
          session.status = 'IDLE';
          session.snapshotVersion = nextVersion;
          session.isFinalizing = false;

          console.log(`🔨 SOLD: ${finalPlayer.name} to ${finalTeam.name} for ${finalPrice.toLocaleString()} pts.`);

          io.to(tournamentId).emit('PLAYER_SOLD', {
            player: finalPlayer,
            team: {
              id: finalTeam._id,
              name: finalTeam.name,
              shortName: finalTeam.shortName,
              brandColor: finalTeam.brandColor,
            },
            finalPrice,
            updatedPurse: cachedTeam ? cachedTeam.remainingPurse : finalTeam.remainingPurse,
            squadCount: cachedTeam ? cachedTeam.squadCount : finalTeam.squad.length,
          });

          // Broadcast updated teams purse leaderboard
          io.to(tournamentId).emit('TEAMS_UPDATED', Array.from(engine.teamsCache.values()));
        });
      } catch (err) {
        console.error('ADMIN_CONFIRM_SOLD error:', err.message);
        socket.emit('ERROR', { message: 'Failed to finalize sale: ' + err.message });
      }
    });

    /**
     * ADMIN_MARK_UNSOLD
     * Marks player as unsold and clears podium
     */
    socket.on('ADMIN_MARK_UNSOLD', async ({ tournamentId }) => {
      try {
        if (socket.data.user.role !== 'ADMIN') {
          return socket.emit('ERROR', { message: 'Forbidden: Admin role required.' });
        }

        const engine = await getTournamentEngine(tournamentId);

        await engine.mutex.runExclusive(async () => {
          const session = engine.session;
          if (!session.activePlayer) {
            return socket.emit('ERROR', { message: 'No player on the podium.' });
          }

          session.isFinalizing = true;
          engine.clearTimerTimeout();

          const activePlayerId = session.activePlayer._id;
          const nextVersion = session.snapshotVersion + 1;

          // Update player in DB
          const unsoldPlayer = await Player.findByIdAndUpdate(
            activePlayerId,
            { status: 'UNSOLD' },
            { new: true }
          );

          // Clear Tournament snapshot in DB
          await Tournament.findByIdAndUpdate(tournamentId, {
            $set: {
              'activeAuctionSession.activePlayerId': null,
              'activeAuctionSession.currentHighestBid': 0,
              'activeAuctionSession.currentBidderTeamId': null,
              'activeAuctionSession.currentBidderUserId': null,
              'activeAuctionSession.endsAt': 0,
              'activeAuctionSession.status': 'IDLE',
              'activeAuctionSession.snapshotVersion': nextVersion,
            },
          });

          // Reset In-Memory Session
          session.activePlayer = null;
          session.currentHighestBid = 0;
          session.currentBidderTeamId = null;
          session.currentBidderUserId = null;
          session.endsAt = 0;
          session.remainingMs = 0;
          session.timerRunning = false;
          session.status = 'IDLE';
          session.snapshotVersion = nextVersion;
          session.isFinalizing = false;

          console.log(`❌ UNSOLD: ${unsoldPlayer.name} marked as UNSOLD.`);

          io.to(tournamentId).emit('PLAYER_UNSOLD', {
            player: unsoldPlayer,
          });
        });
      } catch (err) {
        console.error('ADMIN_MARK_UNSOLD error:', err.message);
        socket.emit('ERROR', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};
