import { supabase, supabaseConfigured } from './supabaseClient.js';

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(value));

// Contact phone (not used for login). Accepts 09XXXXXXXXX or +639XXXXXXXXX, stores 09XXXXXXXXX.
export function normalizePhonePH(input) {
  const digits = String(input ?? '').replace(/[\s-]/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^\+639\d{9}$/.test(digits)) return '0' + digits.slice(3);
  if (/^639\d{9}$/.test(digits)) return '0' + digits.slice(2);
  return null;
}

function friendlyError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (error?.status === 429 || msg.includes('rate limit') || msg.includes('seconds')) return 'Too many requests. Please wait a minute and try again.';
  if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) return 'That code is wrong or has expired. Request a new one.';
  if (msg.includes('not authorized') || msg.includes('smtp') || msg.includes('sending')) return 'The email could not be sent. Email sending may not be set up yet.';
  return error?.message || 'Something went wrong. Please try again.';
}

function requireClient() {
  if (!supabaseConfigured) throw new Error('Supabase is not configured. Check your .env file.');
}

export async function sendOtp(emailInput) {
  requireClient();
  if (!isValidEmail(emailInput)) throw new Error('Enter a valid email address.');
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizeEmail(emailInput),
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(friendlyError(error));
}

export async function verifyOtp(emailInput, code) {
  requireClient();
  if (!isValidEmail(emailInput)) throw new Error('Enter a valid email address.');
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(emailInput),
    token: String(code).trim(),
    type: 'email',
  });
  if (error) throw new Error(friendlyError(error));
  return data.user;
}

export async function getSessionUser() {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signOutCustomer() {
  if (supabaseConfigured) await supabase.auth.signOut();
}