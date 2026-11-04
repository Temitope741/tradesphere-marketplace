// Seeders/createAdmin.js
//
// Creates (or updates) the ONE admin account for this marketplace.
// The email and password come from your backend/.env file, which is never
// committed to GitHub — so only you ever see them.
//
// Add these two lines to backend/.env first:
//   ADMIN_EMAIL=you@example.com
//   ADMIN_PASSWORD=a-long-strong-password
//
// Then run (from the backend folder):
//   node Seeders/createAdmin.js
//
// This script does NOT delete anything (unlike seed.js).

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User.model');

dotenv.config();

const run = async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env first.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('❌ ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // select('+password') because the model hides it by default
  let admin = await User.findOne({ email }).select('+password');

  if (admin) {
    admin.role = 'admin';
    admin.isActive = true;
    admin.password = password; // re-hashed automatically on save
    await admin.save();
    console.log(`✅ Existing account ${email} is now an admin (password updated).`);
  } else {
    await User.create({
      fullName: 'Platform Admin',
      email,
      password,
      role: 'admin',
      isEmailVerified: true
    });
    console.log(`✅ Admin account created for ${email}.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});