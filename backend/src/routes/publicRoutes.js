import express from 'express';
import { registerPublicPlayer, lookupPlayerByRoll } from '../controllers/publicController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const nominationUpload = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idCardProof', maxCount: 1 },
]);

// Route allows multi-user registrations across campus Wi-Fi without IP lockouts;
// Security is enforced via unique Roll Number, unique Phone, and compulsory physical Student ID proof.
router.post('/players/register', nominationUpload, registerPublicPlayer);
router.get('/players/lookup', lookupPlayerByRoll);

export default router;
