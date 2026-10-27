import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
    },
    edition: {
      type: String,
      default: '2026',
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'REGISTRATION_OPEN', 'LIVE_AUCTION', 'PAUSED', 'COMPLETED'],
      default: 'DRAFT',
    },
    currentRound: {
      type: String,
      enum: ['ROUND_1', 'ROUND_2_ACCELERATED'],
      default: 'ROUND_1',
    },
    settings: {
      startingPurse: {
        type: Number,
        required: true,
        default: 10000000, // 10,000,000 pts (100 Lakhs)
      },
      minSquadSize: {
        type: Number,
        required: true,
        default: 11,
      },
      maxSquadSize: {
        type: Number,
        required: true,
        default: 16,
      },
      minBasePrice: {
        type: Number,
        required: true,
        default: 20000, // 20,000 pts
      },
      timerDurationSeconds: {
        type: Number,
        default: 20,
      },
      antiSnipingSeconds: {
        type: Number,
        default: 15,
      },
    },
    // Lightweight persistent snapshot for instant server restart recovery
    activeAuctionSession: {
      activePlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        default: null,
      },
      currentHighestBid: {
        type: Number,
        default: 0,
      },
      currentBidderTeamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null,
      },
      currentBidderUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      endsAt: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ['IDLE', 'INTRODUCING', 'BIDDING', 'PAUSED_EXPIRED'],
        default: 'IDLE',
      },
      snapshotVersion: {
        type: Number,
        default: 0, // Incremented per bid; prevents async writes from overwriting cleared podium
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Tournament', tournamentSchema);
