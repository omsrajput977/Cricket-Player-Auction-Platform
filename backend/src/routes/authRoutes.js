import express from 'express';
import {
  registerAdmin,
  login,
  getMe,
  googleLogin,
  getGoogleConfig,
  getGoogleAuthUrl,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/google/config', getGoogleConfig);
router.get('/google/url', getGoogleAuthUrl);
router.get('/me', authenticate, getMe);

export default router;
