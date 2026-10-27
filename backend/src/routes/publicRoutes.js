import express from 'express';
import { registerPublicPlayer, lookupPlayerByRoll } from '../controllers/publicController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/players/register', upload.single('photo'), registerPublicPlayer);
router.get('/players/lookup', lookupPlayerByRoll);

export default router;
