import express from 'express';
import {
  createTeam,
  getTournamentTeams,
  getTeamById,
  updateTeamPurse,
} from '../controllers/teamController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/tournament/:tournamentId', getTournamentTeams);
router.get('/:id', getTeamById);

// Admin-protected team management
router.post('/', authenticate, requireAdmin, createTeam);
router.patch('/:id/purse', authenticate, requireAdmin, updateTeamPurse);

export default router;
