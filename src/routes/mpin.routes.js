import express from "express";
import bcrypt from "bcrypt";
import { supabaseService } from "../supabase.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const mpinRouter = express.Router();

/**
 * POST /mpin/set
 * Body: { mpin, confirm_mpin }
 * Requires: Bearer token (OTP verified session)
 */
mpinRouter.post("/set", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const mpin = String(req.body.mpin || "");
  const confirm = String(req.body.confirm_mpin || "");

  if (!/^\d{6}$/.test(mpin)) {
    return res.status(400).json({ error: "MPIN must be exactly 6 digits" });
  }
  if (mpin !== confirm) {
    return res.status(400).json({ error: "MPIN does not match" });
  }

  const pin_hash = await bcrypt.hash(mpin, 12);

  const { error: pinErr } = await supabaseService
    .from("user_pins")
    .upsert({ user_id: userId, pin_hash });

  if (pinErr) return res.status(400).json({ error: pinErr.message });

  const { error: accErr } = await supabaseService
    .from("commuter_accounts")
    .update({ pin_set: true, account_active: true })
    .eq("commuter_id", userId);

  if (accErr) return res.status(400).json({ error: accErr.message });

  return res.json({ ok: true, message: "MPIN set. Account activated." });
});

/**
 * POST /mpin/verify
 * Body: { mpin }
 * Use this if you want server-verified app unlock
 */
mpinRouter.post("/verify", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const mpin = String(req.body.mpin || "");

  if (!/^\d{6}$/.test(mpin)) {
    return res.status(400).json({ error: "Invalid MPIN format" });
  }

  const { data, error } = await supabaseService
    .from("user_pins")
    .select("pin_hash")
    .eq("user_id", userId)
    .single();

  if (error || !data?.pin_hash) {
    return res.status(400).json({ error: "MPIN not set" });
  }

  const ok = await bcrypt.compare(mpin, data.pin_hash);
  if (!ok) return res.status(401).json({ ok: false, error: "Incorrect MPIN" });

  return res.json({ ok: true });
});
