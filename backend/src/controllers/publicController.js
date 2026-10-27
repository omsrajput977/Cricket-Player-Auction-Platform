import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * Public Player Registration
 * POST /api/public/players/register (multipart/form-data)
 */
export const registerPublicPlayer = async (req, res, next) => {
  try {
    const {
      tournamentId,
      name,
      rollNumber,
      department,
      year,
      contactNumber,
      role,
      battingStyle,
      bowlingStyle,
      basePrice,
      categorySet,
    } = req.body;

    if (!tournamentId || !name || !rollNumber || !department || !year || !role) {
      return res.status(400).json({
        success: false,
        message: 'TournamentId, name, rollNumber, department, year, and role are required.',
      });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found.',
      });
    }

    const upperRoll = rollNumber.trim().toUpperCase();

    // 1. Roll Number strict format validation (Alphanumeric with hyphens/underscores, 3-20 chars)
    if (upperRoll.length < 3 || upperRoll.length > 20 || !/^[A-Z0-9\-_]+$/.test(upperRoll)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roll number format. Must be alphanumeric (e.g., CS23-01, ME22-15).',
      });
    }

    // 2. Mobile Number format validation (10-digit Indian standard)
    const trimmedContact = (contactNumber || '').trim();
    if (trimmedContact) {
      if (!/^[6-9]\d{9}$/.test(trimmedContact)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid contact number. Must be a valid 10-digit mobile number.',
        });
      }

      // Check duplicate mobile number in this tournament to prevent one person spamming multiple accounts
      const existingPhone = await Player.findOne({ tournamentId, contactNumber: trimmedContact });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: `A player nomination has already been registered with mobile number "${trimmedContact}". Each student must register with their own phone number.`,
        });
      }
    }

    // 3. Check duplicate roll number
    const existing = await Player.findOne({ tournamentId, rollNumber: upperRoll });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A nomination with Roll Number "${upperRoll}" already exists for this tournament.`,
      });
    }

    // 4. Compulsory Student College ID Card Proof Upload
    const idCardFile = req.files?.['idCardProof']?.[0];
    if (!idCardFile) {
      return res.status(400).json({
        success: false,
        message: 'Student College ID Card photo is compulsory for tournament verification. Please upload a clear photo of your student ID card.',
      });
    }

    let idCardProofData = await uploadToCloudinary(idCardFile.buffer, {
      folder: `cricauction/proofs/${tournamentId}`,
      mimetype: idCardFile.mimetype,
    });

    // 5. Process Optional Player Photo upload via Cloudinary
    let photoData = { url: '', publicId: '' };
    const photoFile = req.files?.['photo']?.[0] || req.file;
    if (photoFile) {
      photoData = await uploadToCloudinary(photoFile.buffer, {
        folder: `cricauction/players/${tournamentId}`,
        mimetype: photoFile.mimetype,
      });
    }

    // Parse stats if provided as stringified JSON or individual fields
    let parsedStats = {};
    if (req.body.stats) {
      try {
        parsedStats = typeof req.body.stats === 'string' ? JSON.parse(req.body.stats) : req.body.stats;
      } catch {
        parsedStats = {};
      }
    } else {
      parsedStats = {
        matchesPlayed: Number(req.body.matchesPlayed) || 0,
        runsScored: Number(req.body.runsScored) || 0,
        battingAverage: Number(req.body.battingAverage) || 0,
        strikeRate: Number(req.body.strikeRate) || 0,
        wicketsTaken: Number(req.body.wicketsTaken) || 0,
        bowlingEconomy: Number(req.body.bowlingEconomy) || 0,
      };
    }

    const player = await Player.create({
      tournamentId,
      name: name.trim(),
      rollNumber: upperRoll,
      department: department.trim(),
      year: year.trim(),
      contactNumber: trimmedContact,
      photo: photoData,
      idCardProof: idCardProofData,
      role,
      battingStyle: battingStyle || 'RIGHT_HAND',
      bowlingStyle: bowlingStyle || 'NONE',
      stats: parsedStats,
      basePrice: basePrice ? Number(basePrice) : tournament.settings.minBasePrice,
      categorySet: categorySet || 'SET_1',
      auctionRound: 'ROUND_1',
      status: 'PENDING_APPROVAL', // Requires admin verification
    });

    res.status(201).json({
      success: true,
      message: 'Player nomination submitted successfully! Your application is pending organizer verification.',
      data: {
        id: player._id,
        name: player.name,
        rollNumber: player.rollNumber,
        department: player.department,
        role: player.role,
        status: player.status,
        photoUrl: player.photo?.url || '',
        idCardProofUrl: player.idCardProof?.url || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public Roll Number Lookup API
 * GET /api/public/players/lookup?tournamentId=...&rollNumber=...
 */
export const lookupPlayerByRoll = async (req, res, next) => {
  try {
    const { tournamentId, rollNumber } = req.query;

    if (!tournamentId || !rollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Both tournamentId and rollNumber query parameters are required.',
      });
    }

    const upperRoll = rollNumber.trim().toUpperCase();

    const player = await Player.findOne({
      tournamentId,
      rollNumber: upperRoll,
    }).populate('soldTo', 'name shortName brandColor logoUrl');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: `No player registration found for Roll Number "${upperRoll}" in this tournament.`,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: player._id,
        name: player.name,
        rollNumber: player.rollNumber,
        department: player.department,
        year: player.year,
        role: player.role,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        stats: player.stats,
        basePrice: player.basePrice,
        categorySet: player.categorySet,
        auctionRound: player.auctionRound,
        status: player.status,
        photoUrl: player.photo?.url || '',
        idCardProofUrl: player.idCardProof?.url || '',
        rejectionReason: player.rejectionReason || '',
        soldTo: player.soldTo || null,
        soldPrice: player.soldPrice || 0,
        registeredAt: player.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
