import mongoose from 'mongoose';

const bidHistorySchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
      index: true,
    },
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'Player ID is required'],
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
      index: true,
    },
    bidAmount: {
      type: Number,
      required: [true, 'Bid amount is required'],
    },
    bidType: {
      type: String,
      enum: ['OWNER_BID', 'ADMIN_FALLBACK_BID'],
      default: 'OWNER_BID',
    },
    placedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID who placed the bid is required'],
      index: true,
    },
    isWinningBid: {
      type: Boolean,
      default: false,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for timeline & active feed retrieval
bidHistorySchema.index({ playerId: 1, timestamp: -1 });
bidHistorySchema.index({ tournamentId: 1, timestamp: -1 });
bidHistorySchema.index({ playerId: 1, isWinningBid: 1 });

export default mongoose.model('BidHistory', bidHistorySchema);
