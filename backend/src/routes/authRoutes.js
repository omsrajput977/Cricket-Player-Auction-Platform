import express from 'express';
import { registerAdmin, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;
