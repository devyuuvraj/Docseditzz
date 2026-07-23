/**
 * Creates (or promotes) an admin account.
 * Usage: npm run seed:admin -- admin@docseditz.com StrongPass123 "Admin Name"
 */
import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';

const [email = 'admin@docseditz.com', password = 'Admin@12345', name = 'Administrator'] =
  process.argv.slice(2);

const run = async () => {
  await mongoose.connect(config.mongoUri);
  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.isVerified = true;
    user.isActive = true;
    if (password) user.password = password;
    await user.save();
    console.log(`Promoted existing user ${email} to admin`);
  } else {
    user = await User.create({ name, email, password, role: 'admin', isVerified: true });
    await Subscription.create({ user: user._id, plan: 'free' });
    console.log(`Created admin ${email} (password: ${password})`);
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
