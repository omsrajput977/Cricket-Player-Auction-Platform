import express from 'express';
import {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournamentSettings,
  updateTournamentStatus,
} from '../controllers/tournamentController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getTournaments);
router.get('/:id', getTournamentById);

// Admin-protected endpoints
router.post('/', authenticate, requireAdmin, createTournament);
router.patch('/:id/settings', authenticate, requireAdmin, updateTournamentSettings);
router.patch('/:id/status', authenticate, requireAdmin, updateTournamentStatus);

export default router;
