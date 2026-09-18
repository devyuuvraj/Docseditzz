import prisma from './prisma.js';

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('[db] Neon PostgreSQL connected successfully');
  } catch (err) {
    console.error('[db] PostgreSQL connection error:', err.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('[db] PostgreSQL disconnected');
  } catch (err) {
    console.error('[db] PostgreSQL disconnect error:', err.message);
  }
};

export default connectDB;