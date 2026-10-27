import Tournament from '../models/Tournament.js';

/**
 * Create a new Tournament
 * POST /api/tournaments
 */
export const createTournament = async (req, res, next) => {
  try {
    const { name, edition, settings } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tournament name is required.',
      });
    }

    const tournament = await Tournament.create({
      name,
      edition: edition || '2026',
      settings: settings || {},
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully.',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tournaments
 * GET /api/tournaments
 */
export const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Tournament by ID
 * GET /api/tournaments/:id
 */
export const getTournamentById = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('activeAuctionSession.activePlayerId')
      .populate('activeAuctionSession.currentBidderTeamId', 'name shortName brandColor');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Tournament Settings
 * PATCH /api/tournaments/:id/settings
 * RULE ENFORCEMENT: Block edits while status is LIVE_AUCTION to ensure memory cache consistency
 */
export const updateTournamentSettings = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    // Cache Consistency Rule: Block edits during LIVE_AUCTION
    if (tournament.status === 'LIVE_AUCTION') {
      return res.status(400).json({
        success: false,
        message: 'Forbidden: Cannot modify tournament settings while auction is actively LIVE. Pause or complete the auction first.',
      });
    }

    const allowedSettings = [
      'startingPurse',
      'minSquadSize',
      'maxSquadSize',
      'minBasePrice',
      'timerDurationSeconds',
      'antiSnipingSeconds',
    ];

    allowedSettings.forEach((key) => {
      if (req.body[key] !== undefined) {
        tournament.settings[key] = req.body[key];
      }
    });

    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Tournament settings updated successfully.',
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Tournament Status
 * PATCH /api/tournaments/:id/status
 */
export const updateTournamentStatus = async (req, res, next) => {
  try {
    const { status, currentRound } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    if (status) tournament.status = status;
    if (currentRound) tournament.currentRound = currentRound;

    await tournament.save();

    res.status(200).json({
      success: true,
      message: `Tournament status updated to ${tournament.status}.`,
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};
