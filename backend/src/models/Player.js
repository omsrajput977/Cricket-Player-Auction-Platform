import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
      uppercase: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    year: {
      type: String,
      required: [true, 'Academic year is required (e.g. 3rd Year)'],
      trim: true,
    },
    contactNumber: {
      type: String,
      default: '',
      trim: true,
    },
    // Photo field is required: false to allow bulk imports with UI placeholder avatars
    photo: {
      url: {
        type: String,
        default: '',
      },
      publicId: {
        type: String,
        default: '',
      },
    },
    // Student College ID Card Proof photo to deter spam nominations
    idCardProof: {
      url: {
        type: String,
        default: '',
      },
      publicId: {
        type: String,
        default: '',
      },
    },
    role: {
      type: String,
      required: [true, 'Playing role is required'],
      enum: [
        'TOP_ORDER_BATTER',
        'MIDDLE_ORDER_BATTER',
        'WICKETKEEPER_BATTER',
        'PACE_BOWLER',
        'SPIN_BOWLER',
        'ALL_ROUNDER',
      ],
    },
    battingStyle: {
      type: String,
      enum: ['RIGHT_HAND', 'LEFT_HAND'],
      default: 'RIGHT_HAND',
    },
    bowlingStyle: {
      type: String,
      enum: [
        'RIGHT_ARM_FAST',
        'LEFT_ARM_FAST',
        'RIGHT_ARM_SPIN',
        'LEFT_ARM_SPIN',
        'NONE',
      ],
      default: 'NONE',
    },
    stats: {
      matchesPlayed: { type: Number, default: 0 },
      runsScored: { type: Number, default: 0 },
      battingAverage: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      wicketsTaken: { type: Number, default: 0 },
      bowlingEconomy: { type: Number, default: 0 },
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      default: 20000,
    },
    categorySet: {
      type: String,
      default: 'SET_1', // e.g. 'MARQUEE', 'SET_1_BAT', 'SET_2_BOWL'
      trim: true,
    },
    auctionRound: {
      type: String,
      enum: ['ROUND_1', 'ROUND_2_ACCELERATED'],
      default: 'ROUND_1',
    },
    status: {
      type: String,
      enum: [
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'ON_PODIUM',
        'SOLD',
        'UNSOLD',
      ],
      default: 'APPROVED',
      index: true,
    },
    soldTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    soldPrice: {
      type: Number,
      default: 0,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Fast compound lookup indexes
playerSchema.index({ tournamentId: 1, rollNumber: 1 }, { unique: true });
playerSchema.index({ tournamentId: 1, status: 1 });
playerSchema.index({ tournamentId: 1, auctionRound: 1, status: 1 });

export default mongoose.model('Player', playerSchema);
