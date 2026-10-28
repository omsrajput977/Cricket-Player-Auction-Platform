import express from 'express';
import {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournamentSettings,
  updateTournamentStatus,
} from '../controllers/tournamentController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuthenticate, getTournaments);
router.get('/:id', optionalAuthenticate, getTournamentById);

// Admin-protected endpoints
router.post('/', authenticate, requireAdmin, createTournament);
router.patch('/:id/settings', authenticate, requireAdmin, updateTournamentSettings);
router.patch('/:id/status', authenticate, requireAdmin, updateTournamentStatus);

export default router;
