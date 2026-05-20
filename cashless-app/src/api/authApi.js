import { supabase } from "./supabase";
import { normalizePHPhone } from "../utils/phone";
import logger from '../utils/logger';

// SEND OTP
export async function sendOtp(rawPhone) {
  const phone = normalizePHPhone(rawPhone);

  if (!phone.startsWith("+63")) {
    throw new Error("Invalid Philippine phone number");
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    logger.error("OTP SEND ERROR:", error.message);
    throw error;
  }

  return true;
}

// VERIFY OTP
export async function verifyOtp(rawPhone, otp) {
  const phone = normalizePHPhone(rawPhone);

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: "sms",
  });

  if (error) {
    logger.error("OTP VERIFY ERROR:", error.message);
    throw error;
  }

  return data; // contains session + user
}
