import express from 'express';
import {
  registerAdmin,
  login,
  getMe,
  googleLogin,
  getGoogleConfig,
  getGoogleAuthUrl,
  saveGoogleConfig,
  sendSchoolEmailCode,
  verifySchoolEmailCode,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/google/config', getGoogleConfig);
router.post('/google/config', saveGoogleConfig);
router.get('/google/url', getGoogleAuthUrl);
router.post('/school-email/send-code', sendSchoolEmailCode);
router.post('/school-email/verify-code', verifySchoolEmailCode);
router.get('/me', authenticate, getMe);

export default router;
