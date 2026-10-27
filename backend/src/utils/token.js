import jwt from 'jsonwebtoken';

/**
 * Generate JWT token with user claims
 * @param {Object} user - User document
 * @returns {string} Signed JWT token
 */
export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'cricauction_super_secret_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      teamId: user.teamId ? user.teamId.toString() : null,
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
