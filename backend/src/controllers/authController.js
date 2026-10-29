import fs from 'fs';
import path from 'path';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Tournament from '../models/Tournament.js';
import { generateToken } from '../utils/token.js';
import { isDomainAllowed } from '../utils/domain.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory OTP store for verified school emails (email -> { code, expiresAt })
const otpStore = new Map();

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
 * Get Google OAuth Public Configuration
 * GET /api/auth/google/config
 */
export const getGoogleConfig = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || null;
  res.status(200).json({
    success: true,
    data: {
      clientId,
      isConfigured: !!clientId,
    },
  });
};

/**
 * Generate Google OAuth2 Authorization URL
 * GET /api/auth/google/url
 */
export const getGoogleAuthUrl = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({
      success: false,
      message: 'GOOGLE_CLIENT_ID is not configured in backend environment variables.',
    });
  }

  const redirectUri =
    req.query.redirectUri ||
    `${req.protocol}://${req.get('host')}/auth/callback`;

  const oauth2Client = new OAuth2Client(
    clientId,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });

  res.status(200).json({
    success: true,
    data: {
      url,
      clientId,
    },
  });
};

/**
 * Google Sign-In verification for Spectators/Students
 * POST /api/auth/google
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { credential, token: incomingToken, code, redirectUri } = req.body;

    let email = null;
    let name = null;
    let avatar = null;
    let emailVerified = false;

    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Flow 1: Authorization Code Flow (from Google redirect or popup)
    if (code) {
      if (!clientId) {
        return res.status(500).json({
          success: false,
          message: 'GOOGLE_CLIENT_ID is not configured on the server.',
        });
      }

      const client = new OAuth2Client(
        clientId,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri || 'postmessage'
      );

      const { tokens } = await client.getToken(code);
      if (!tokens || !tokens.id_token) {
        return res.status(401).json({
          success: false,
          message: 'Failed to retrieve tokens from Google OAuth exchange.',
        });
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      email = payload?.email;
      name = payload?.name || (payload?.email ? payload.email.split('@')[0] : 'Student');
      avatar = payload?.picture || null;
      emailVerified = payload?.email_verified === true;
    }
    // Flow 2: Google Identity Services ID Token (from Google One-Tap / popup)
    else if (credential || incomingToken) {
      const rawToken = credential || incomingToken;
      const client = new OAuth2Client(clientId);

      const ticket = await client.verifyIdToken({
        idToken: rawToken,
        audience: clientId || undefined,
      });
      const payload = ticket.getPayload();
      email = payload?.email;
      name = payload?.name || (payload?.email ? payload.email.split('@')[0] : 'Student');
      avatar = payload?.picture || null;
      emailVerified = payload?.email_verified === true;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Google authorization code or verified credential is required.',
      });
    }

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Unable to extract verified email from Google authentication.',
      });
    }

    if (!emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'This Google account email has not been verified by Google.',
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
    console.error('Google authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Google authentication failed: ' + (error.message || 'Invalid token or code'),
    });
  }
};

/**
 * Send / Generate Verification Passcode for School Email
 * POST /api/auth/school-email/send-code
 */
export const sendSchoolEmailCode = async (req, res, next) => {
  try {
    const { email, tournamentId } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid school email address is required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify against tournament allowed domain if specified
    if (tournamentId) {
      const tournament = await Tournament.findById(tournamentId).select('name allowedEmailDomain');
      if (tournament?.allowedEmailDomain) {
        if (!isDomainAllowed(cleanEmail, tournament.allowedEmailDomain)) {
          return res.status(403).json({
            success: false,
            message: `Access denied. "${tournament.name}" is restricted to students with ${tournament.allowedEmailDomain} email domain.`,
            allowedEmailDomain: tournament.allowedEmailDomain,
          });
        }
      }
    }

    // Generate random 6-digit passcode
    const code = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(cleanEmail, {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    });

    console.log(`🔑 Verification Passcode for ${cleanEmail}: [ ${code} ]`);

    res.status(200).json({
      success: true,
      message: `Verification code generated for ${cleanEmail}.`,
      verificationCode: code,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify School Email Passcode
 * POST /api/auth/school-email/verify-code
 */
export const verifySchoolEmailCode = async (req, res, next) => {
  try {
    const { email, code, name } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit verification code are required.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const entry = otpStore.get(cleanEmail);

    if (!entry) {
      return res.status(400).json({
        success: false,
        message: 'No verification code was requested for this email, or it has expired.',
      });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if (entry.code.trim() !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again.',
      });
    }

    // Code verified! Remove from store
    otpStore.delete(cleanEmail);

    // Find or create User with SPECTATOR role
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'SPECTATOR',
        authProvider: 'LOCAL',
      });
    }

    // Issue platform JWT
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'School email successfully verified!',
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save Google OAuth Client ID to server environment
 * POST /api/auth/google/config
 */
export const saveGoogleConfig = async (req, res, next) => {
  try {
    const { clientId, clientSecret } = req.body;

    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Google Client ID. It must end with .apps.googleusercontent.com',
      });
    }

    process.env.GOOGLE_CLIENT_ID = clientId.trim();
    if (clientSecret) process.env.GOOGLE_CLIENT_SECRET = clientSecret.trim();

    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('GOOGLE_CLIENT_ID=')) {
          content = content.replace(/GOOGLE_CLIENT_ID=.*/g, `GOOGLE_CLIENT_ID=${clientId.trim()}`);
        } else {
          content += `\nGOOGLE_CLIENT_ID=${clientId.trim()}\n`;
        }
        if (clientSecret) {
          if (content.includes('GOOGLE_CLIENT_SECRET=')) {
            content = content.replace(/GOOGLE_CLIENT_SECRET=.*/g, `GOOGLE_CLIENT_SECRET=${clientSecret.trim()}`);
          } else {
            content += `GOOGLE_CLIENT_SECRET=${clientSecret.trim()}\n`;
          }
        }
        fs.writeFileSync(envPath, content, 'utf8');
      }
    } catch (e) {
      console.warn('Could not update .env file:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Google Client ID updated successfully.',
      data: { clientId: process.env.GOOGLE_CLIENT_ID },
    });
  } catch (error) {
    next(error);
  }
};
