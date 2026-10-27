import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas (Replica Set required for multi-document ACID transactions)
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Verify Replica Set support for transactions
    try {
      const adminDb = conn.connection.db.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);

      if (status && status.set) {
        console.log(`🔒 Replica Set Detected: "${status.set}" — ACID Transactions are enabled.`);
      } else {
        // In Atlas, mongodb+srv:// is always a replica set
        const isSrv = uri.startsWith('mongodb+srv://');
        if (isSrv) {
          console.log('🔒 MongoDB Atlas Cluster detected — ACID Transactions supported.');
        } else {
          console.warn('⚠️ MongoDB is not running as a Replica Set. Note: session.withTransaction() requires a replica set.');
        }
      }
    } catch {
      console.log('ℹ️ Connected to MongoDB cluster.');
    }

    // Graceful disconnect handling
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Connection Lost. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.error('💡 Hint: Please verify your MONGODB_URI in backend/.env.');
    throw error;
  }
};
