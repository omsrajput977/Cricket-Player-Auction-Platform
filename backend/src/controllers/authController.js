import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { generateToken } from '../utils/token.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Register Admin Account (Organizer)
 * POST /api/auth/register-admin
 */
export const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, adminSecretKey } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const expectedKey = process.env.ADMIN_REGISTRATION_KEY || 'CRIC_ADMIN_2026';
    if (!adminSecretKey || adminSecretKey.trim() !== expectedKey.trim()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid Organizer Security Passcode. Only authorized tournament heads may register an admin account.',
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

/**
 * Google Sign-In verification for Spectators/Students
 * POST /api/auth/google
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { credential, token: incomingToken, email: testEmail, name: testName, avatar: testAvatar } = req.body;

    let email = null;
    let name = null;
    let avatar = null;

    const rawToken = credential || incomingToken;

    if (rawToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: rawToken,
          audience: process.env.GOOGLE_CLIENT_ID || undefined,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
        avatar = payload.picture || null;
      } catch (verifyError) {
        // Fallback for dev/unconfigured audience: inspect JWT payload
        console.warn('Google verifyIdToken note:', verifyError.message);
        const parts = rawToken.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (decoded && decoded.email) {
            email = decoded.email;
            name = decoded.name || decoded.email.split('@')[0];
            avatar = decoded.picture || null;
          }
        }
        if (!email) {
          return res.status(401).json({
            success: false,
            message: 'Invalid Google token: ' + verifyError.message,
          });
        }
      }
    } else if (testEmail) {
      // Direct mock/dev spectator login to easily test isolated college email domains
      email = testEmail.toLowerCase().trim();
      name = testName || email.split('@')[0];
      avatar = testAvatar || null;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Google credential or student email is required.',
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Unable to extract email from Google credential.',
      });
    }

    email = email.toLowerCase().trim();

    // Find or create User with SPECTATOR role and GOOGLE authProvider
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        role: 'SPECTATOR',
        authProvider: 'GOOGLE',
        avatar: avatar || null,
      });
    } else {
      if (avatar && !user.avatar) {
        user.avatar = avatar;
        await user.save();
      }
    }

    // Issue platform JWT with role SPECTATOR and user's email
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          authProvider: user.authProvider,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
