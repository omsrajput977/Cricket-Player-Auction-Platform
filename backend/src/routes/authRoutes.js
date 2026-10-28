import express from 'express';
import { registerAdmin, login, getMe, googleLogin } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);

export default router;
