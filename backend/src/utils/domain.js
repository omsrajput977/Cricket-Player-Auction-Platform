/**
 * College Email Domain Normalization and Verification Utility
 */

/**
 * Normalizes an email or domain string into pure domain (lowercase, trimmed, no '@')
 * e.g., "@scaler.edu" -> "scaler.edu"
 * e.g., "rahul@scaler.edu" -> "scaler.edu"
 * e.g., "scaler.edu" -> "scaler.edu"
 */
export const normalizeDomain = (str) => {
  if (!str || typeof str !== 'string') return '';
  const trimmed = str.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed.split('@').pop().trim();
  }
  return trimmed;
};

/**
 * Formats a domain into standard "@domain.edu" format for storage/display
 */
export const formatDomain = (str) => {
  if (!str || typeof str !== 'string') return null;
  const clean = normalizeDomain(str);
  return clean ? `@${clean}` : null;
};

/**
 * Checks if a user's email matches the allowed tournament email domain
 * @param {string} userEmail - e.g. "student@scaler.edu"
 * @param {string} allowedDomain - e.g. "@scaler.edu" or "scaler.edu"
 * @returns {boolean}
 */
export const isDomainAllowed = (userEmail, allowedDomain) => {
  if (!allowedDomain || !allowedDomain.trim()) return true; // Unrestricted / public
  if (!userEmail) return false;
  const userDom = normalizeDomain(userEmail);
  const allowedDom = normalizeDomain(allowedDomain);
  return userDom === allowedDom || userDom.endsWith('.' + allowedDom);
};
