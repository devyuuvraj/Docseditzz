/**
 * Creates (or promotes) an admin account.
 * Usage: npm run seed:admin -- admin@docseditz.com StrongPass123 "Admin Name"
 */

import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

const [
  email = 'admin@docseditz.com',
  password = 'Admin@12345',
  name = 'Administrator',
] = process.argv.slice(2);

const run = async () => {
  try {
    // Check if admin/user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Hash password manually because Prisma does not have
      // Mongoose's pre-save password hashing hook.
      const hashedPassword = await bcrypt.hash(password, 12);

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'admin',
          isVerified: true,
          isActive: true,
          password: hashedPassword,
        },
      });

      console.log(`Promoted existing user ${email} to admin`);
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);

      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'admin',
          isVerified: true,
          isActive: true,
        },
      });

      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'free',
        },
      });

      console.log(`Created admin ${email} (password: ${password})`);
    }
  } catch (err) {
    console.error('[seed:admin] Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

run();