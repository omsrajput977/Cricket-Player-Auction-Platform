import jwt from 'jsonwebtoken';

/**
 * Generate JWT token with user claims
 * @param {Object} user - User document
 * @returns {string} Signed JWT token
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'cricauction_super_secret_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  let teamIdStr = null;
  if (user.teamId) {
    if (typeof user.teamId === 'object' && user.teamId._id) {
      teamIdStr = user.teamId._id.toString();
    } else {
      const raw = user.teamId.toString();
      const match = raw.match(/[a-fA-F0-9]{24}/);
      teamIdStr = match ? match[0] : raw;
    }
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      teamId: teamIdStr,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Verify JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'cricauction_super_secret_jwt_key_2026';
  return jwt.verify(token, secret);
};
