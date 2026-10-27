import Team from '../models/Team.js';
import Tournament from '../models/Tournament.js';
import User from '../models/User.js';

/**
 * Create a Team (Admin Only)
 * Can optionally create and bind a Team Owner user account in the same call
 * POST /api/teams
 */
export const createTeam = async (req, res, next) => {
  try {
    const { tournamentId, name, shortName, logoUrl, brandColor, totalPurse, owner } = req.body;

    if (!tournamentId || !name || !shortName) {
      return res.status(400).json({
        success: false,
        message: 'Tournament ID, team name, and short name are required.',
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    const purse = totalPurse !== undefined ? totalPurse : tournament.settings.startingPurse;

    // Create Team
    const team = await Team.create({
      tournamentId,
      name,
      shortName: shortName.toUpperCase(),
      logoUrl: logoUrl || '',
      brandColor: brandColor || '#E11D48',
      totalPurse: purse,
      remainingPurse: purse,
    });

    let ownerAccount = null;

    // Optional: Auto-create Team Owner user credentials
    if (owner && owner.email && owner.password) {
      const existingUser = await User.findOne({ email: owner.email.toLowerCase() });
      if (existingUser) {
        // Bind existing user if not already attached to a team
        existingUser.teamId = team._id;
        existingUser.role = 'TEAM_OWNER';
        await existingUser.save();
        team.ownerId = existingUser._id;
        await team.save();
        ownerAccount = { id: existingUser._id, email: existingUser.email };
      } else {
        const newUser = await User.create({
          name: owner.name || `${name} Owner`,
          email: owner.email.toLowerCase(),
          password: owner.password,
          role: 'TEAM_OWNER',
          teamId: team._id,
        });
        team.ownerId = newUser._id;
        await team.save();
        ownerAccount = { id: newUser._id, email: newUser.email };
      }
    }

    res.status(201).json({
      success: true,
      message: 'Team created successfully.',
      data: {
        team,
        owner: ownerAccount,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A team with this name or short name already exists in this tournament.',
      });
    }
    next(error);
  }
};

/**
 * Get all teams in a tournament
 * GET /api/teams/tournament/:tournamentId
 */
export const getTournamentTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ tournamentId: req.params.tournamentId })
      .populate('ownerId', 'name email')
      .populate({
        path: 'squad.player',
        select: 'name role basePrice soldPrice rollNumber department photo',
      })
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single team by ID
 * GET /api/teams/:id
 */
export const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate({
        path: 'squad.player',
        select: 'name role basePrice soldPrice rollNumber department year photo stats',
      });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Team Purse
 * PATCH /api/teams/:id/purse
 * RULE ENFORCEMENT: Block manual purse edits while tournament status is LIVE_AUCTION to prevent cache divergence
 */
export const updateTeamPurse = async (req, res, next) => {
  try {
    const { remainingPurse, totalPurse } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found.',
      });
    }

    const tournament = await Tournament.findById(team.tournamentId);
    if (tournament && tournament.status === 'LIVE_AUCTION') {
      return res.status(400).json({
        success: false,
        message: 'Forbidden: Cannot edit team purse while tournament is in LIVE_AUCTION. State is managed by the in-memory auction engine.',
      });
    }

    if (totalPurse !== undefined) team.totalPurse = totalPurse;
    if (remainingPurse !== undefined) team.remainingPurse = remainingPurse;

    await team.save();

    res.status(200).json({
      success: true,
      message: 'Team purse updated successfully.',
      data: team,
    });
  } catch (error) {
    next(error);
  }
};
