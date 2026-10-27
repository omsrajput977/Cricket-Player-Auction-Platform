import express from 'express';
import { registerPublicPlayer, lookupPlayerByRoll } from '../controllers/publicController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// In-Memory IP Rate Limiter to stop script spam (Max 5 nominations per IP per 15 minutes)
const ipSubmissionMap = new Map();

const nominationRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxSubmissions = 5;

  const record = ipSubmissionMap.get(ip);
  if (!record || now > record.resetTime) {
    ipSubmissionMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxSubmissions) {
    return res.status(429).json({
      success: false,
      message: 'Too many nominations submitted from your network. Please wait 15 minutes before submitting again.',
    });
  }

  record.count += 1;
  next();
};

const nominationUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idCardProof', maxCount: 1 },
]);

router.post('/players/register', nominationRateLimiter, nominationUpload, registerPublicPlayer);
router.get('/players/lookup', lookupPlayerByRoll);

export default router;
