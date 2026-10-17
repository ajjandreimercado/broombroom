/// <reference types="node" />
import { raw } from './db.ts';
import { users } from './auth.ts';

const blankAddress = { street: '', barangay: '', city: '', province: '', region: '', postalCode: '', country: 'Philippines' };

// First start only (no accounts yet): one admin from ADMIN_EMAIL / ADMIN_PASSWORD. Everything else (agents, listings,
// money accounts) is entered through the admin console; clients sign up on the site.
export const seedIfEmpty = async () => {
  if ((await raw('users').countDocuments({})) > 0) return;
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12)
    throw new Error('First start: set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to create the admin account.');
  await users.create({
    id: 'admin-01', email, role: 'admin', name: 'Administrator', password, phone: '', address: blankAddress,
    savedVehicleIds: [], recentlyViewedIds: [], memberSince: new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
  });
  console.log(`Created the admin account ${email}. Change its password after the first sign-in.`);
};
