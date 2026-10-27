import User from '../models/User.js';
import Team from '../models/Team.js';
import { generateToken } from '../utils/token.js';

/**
 * Register Admin Account (Organizer)
 * POST /api/auth/register-admin
 */
export const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'ADMIN',
    });

    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login (Admin or Team Owner)
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate({
      path: 'teamId',
      select: 'name shortName logoUrl brandColor totalPurse remainingPurse squad tournamentId',
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);
    const resolvedTeamId = user.teamId
      ? (user.teamId._id ? user.teamId._id.toString() : user.teamId.toString())
      : null;

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          teamId: resolvedTeamId,
          team: user.teamId || null,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'teamId',
      select: 'name shortName logoUrl brandColor totalPurse remainingPurse squad tournamentId',
    });

    const resolvedTeamId = user.teamId
      ? (user.teamId._id ? user.teamId._id.toString() : user.teamId.toString())
      : null;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          teamId: resolvedTeamId,
          team: user.teamId || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
