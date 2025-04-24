// database.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const dbURI = process.env.DATABASE_URL || '';
    await mongoose.connect(dbURI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('Database connection failed', err);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
