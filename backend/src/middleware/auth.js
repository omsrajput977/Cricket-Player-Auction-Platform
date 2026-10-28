import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Authentication Middleware for REST Endpoints
 * Verifies Bearer JWT and attaches req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Bearer token missing.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: ' + (error.message || 'Token verification failed'),
    });
  }
};

/**
 * Optional Authentication Middleware
 * Decodes Bearer JWT if provided, but allows unauthenticated requests
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      req.user = decoded; // { id, email, role, teamId }
    } else {
      req.user = null;
    }
  } catch (err) {
    // If token expired/invalid, treat as unauthenticated
    req.user = null;
  }
  next();
};

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] role.`,
      });
    }
    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireTeamOwner = requireRole('TEAM_OWNER');
