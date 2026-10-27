import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';

/**
 * Create a Player (Admin Only)
 * POST /api/players
 */
export const createPlayer = async (req, res, next) => {
  try {
    const {
      tournamentId,
      name,
      rollNumber,
      department,
      year,
      contactNumber,
      photo,
      role,
      battingStyle,
      bowlingStyle,
      stats,
      basePrice,
      categorySet,
      auctionRound,
      status,
    } = req.body;

    if (!tournamentId || !name || !rollNumber || !department || !year || !role) {
      return res.status(400).json({
        success: false,
        message: 'TournamentId, name, rollNumber, department, year, and role are required.',
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    const player = await Player.create({
      tournamentId,
      name,
      rollNumber: rollNumber.toUpperCase(),
      department,
      year,
      contactNumber: contactNumber || '',
      photo: photo || { url: '', publicId: '' }, // Optional photo
      role,
      battingStyle: battingStyle || 'RIGHT_HAND',
      bowlingStyle: bowlingStyle || 'NONE',
      stats: stats || {},
      basePrice: basePrice !== undefined ? basePrice : tournament.settings.minBasePrice,
      categorySet: categorySet || 'SET_1',
      auctionRound: auctionRound || 'ROUND_1',
      status: status || 'APPROVED',
    });

    res.status(201).json({
      success: true,
      message: 'Player created successfully.',
      data: player,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A player with this roll number already exists in this tournament.',
      });
    }
    next(error);
  }
};

/**
 * Bulk Import Players (Admin Only)
 * POST /api/players/bulk
 */
export const bulkImportPlayers = async (req, res, next) => {
  try {
    const { tournamentId, players } = req.body;

    if (!tournamentId || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'TournamentId and a non-empty array of players are required.',
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    const formattedPlayers = players.map((p) => ({
      tournamentId,
      name: p.name,
      rollNumber: (p.rollNumber || '').toUpperCase(),
      department: p.department || 'General',
      year: p.year || '1st Year',
      contactNumber: p.contactNumber || '',
      photo: p.photo || { url: '', publicId: '' },
      role: p.role || 'ALL_ROUNDER',
      battingStyle: p.battingStyle || 'RIGHT_HAND',
      bowlingStyle: p.bowlingStyle || 'NONE',
      stats: p.stats || {},
      basePrice: p.basePrice || tournament.settings.minBasePrice,
      categorySet: p.categorySet || 'SET_1',
      auctionRound: p.auctionRound || 'ROUND_1',
      status: p.status || 'APPROVED',
    }));

    const inserted = await Player.insertMany(formattedPlayers, { ordered: false });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} players.`,
      count: inserted.length,
      data: inserted,
    });
  } catch (error) {
    // If partial duplicate occurred
    if (error.insertedDocs) {
      return res.status(207).json({
        success: true,
        message: `Partially imported ${error.insertedDocs.length} players. Some duplicates were skipped.`,
        count: error.insertedDocs.length,
      });
    }
    next(error);
  }
};

/**
 * Get Tournament Players with filtering
 * GET /api/players/tournament/:tournamentId
 */
export const getTournamentPlayers = async (req, res, next) => {
  try {
    const { status, role, categorySet, auctionRound } = req.query;
    const filter = { tournamentId: req.params.tournamentId };

    if (status) filter.status = status;
    if (role) filter.role = role;
    if (categorySet) filter.categorySet = categorySet;
    if (auctionRound) filter.auctionRound = auctionRound;

    const players = await Player.find(filter)
      .populate('soldTo', 'name shortName brandColor')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Player
 * GET /api/players/:id
 */
export const getPlayerById = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id).populate('soldTo', 'name shortName brandColor logoUrl');
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Player Details (Admin Only)
 * PATCH /api/players/:id
 */
export const updatePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found.',
      });
    }

    if (player.status === 'SOLD') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a player who is already marked as SOLD.',
      });
    }

    const updatableFields = [
      'name',
      'department',
      'year',
      'contactNumber',
      'role',
      'battingStyle',
      'bowlingStyle',
      'stats',
      'basePrice',
      'categorySet',
      'auctionRound',
      'status',
      'photo',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        player[field] = req.body[field];
      }
    });

    await player.save();

    res.status(200).json({
      success: true,
      message: 'Player updated successfully.',
      data: player,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recall Unsold Players into Round 2 Accelerated (Admin Only)
 * POST /api/players/recall-unsold
 */
export const recallUnsoldPlayers = async (req, res, next) => {
  try {
    const { tournamentId, playerIds, discountPercent } = req.body;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        message: 'TournamentId is required.',
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    const query = {
      tournamentId,
      status: 'UNSOLD',
    };

    if (Array.isArray(playerIds) && playerIds.length > 0) {
      query._id = { $in: playerIds };
    }

    const unsoldPlayers = await Player.find(query);

    if (unsoldPlayers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unsold players match the criteria to recall.',
        count: 0,
        data: [],
      });
    }

    const minBase = tournament.settings.minBasePrice || 20000;
    const discount = Number(discountPercent) || 0;

    const bulkOps = unsoldPlayers.map((player) => {
      let newBasePrice = player.basePrice;
      if (discount > 0) {
        newBasePrice = Math.max(minBase, Math.round(player.basePrice * (1 - discount / 100)));
      }

      return {
        updateOne: {
          filter: { _id: player._id },
          update: {
            $set: {
              status: 'APPROVED',
              auctionRound: 'ROUND_2_ACCELERATED',
              basePrice: newBasePrice,
            },
          },
        },
      };
    });

    await Player.bulkWrite(bulkOps);

    // Switch tournament currentRound to ROUND_2_ACCELERATED
    tournament.currentRound = 'ROUND_2_ACCELERATED';
    await tournament.save();

    const recalled = await Player.find(query._id ? { _id: { $in: playerIds } } : { tournamentId, auctionRound: 'ROUND_2_ACCELERATED' });

    console.log(`🔄 [ROUND 2] Recalled ${recalled.length} unsold players into ROUND_2_ACCELERATED (Discount: ${discount}%)`);

    res.status(200).json({
      success: true,
      message: `Successfully recalled ${recalled.length} players into Round 2 Accelerated!`,
      count: recalled.length,
      data: recalled,
    });
  } catch (error) {
    next(error);
  }
};

