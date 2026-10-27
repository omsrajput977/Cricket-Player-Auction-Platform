import express from 'express';
import {
  createPlayer,
  bulkImportPlayers,
  getTournamentPlayers,
  getPlayerById,
  updatePlayer,
} from '../controllers/playerController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/tournament/:tournamentId', getTournamentPlayers);
router.get('/:id', getPlayerById);

// Admin-protected routes
router.post('/', authenticate, requireAdmin, createPlayer);
router.post('/bulk', authenticate, requireAdmin, bulkImportPlayers);
router.patch('/:id', authenticate, requireAdmin, updatePlayer);

export default router;
