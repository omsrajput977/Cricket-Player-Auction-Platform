import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    shortName: {
      type: String,
      required: [true, 'Short name is required (e.g. CSK, MI)'],
      uppercase: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    brandColor: {
      type: String,
      default: '#E11D48', // Default vibrant accent
    },
    totalPurse: {
      type: Number,
      required: [true, 'Total purse is required'],
    },
    remainingPurse: {
      type: Number,
      required: [true, 'Remaining purse is required'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    squad: [
      {
        player: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Player',
          required: true,
        },
        soldPrice: {
          type: Number,
          required: true,
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate team names inside the same tournament
teamSchema.index({ tournamentId: 1, name: 1 }, { unique: true });
teamSchema.index({ tournamentId: 1, shortName: 1 }, { unique: true });

export default mongoose.model('Team', teamSchema);
