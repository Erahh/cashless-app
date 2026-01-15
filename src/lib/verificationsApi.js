import { supabase } from "../api/supabase";

export async function approveRejectVerification({ requestId, nextStatus, note }) {
  // Map UI action → enum values
  const s = String(nextStatus || "").toLowerCase();
  const dbStatus =
    s === "approved" ? "verified" :
    s === "verified" ? "verified" :
    s === "rejected" ? "rejected" :
    s === "pending" ? "pending" :
    "unverified";

  const { data: authRes } = await supabase.auth.getUser();
  const adminId = authRes?.user?.id || null;

  // 1) Update the verification request row
  const payload = {
    status: dbStatus,
    remarks: note || null,
    reviewed_at: new Date().toISOString(),
  };
  if (adminId) payload.reviewed_by = adminId;

  const { error } = await supabase
    .from("verification_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) throw error;

  // 2) Read request to know which commuter to update + what type
  const { data: req, error: reqErr } = await supabase
    .from("verification_requests")
    .select("commuter_id, requested_type, passenger_type")
    .eq("id", requestId)
    .single();

  if (reqErr) throw reqErr;

  const verifiedType = req.requested_type || req.passenger_type || null;

  // 3) Update commuter profile eligibility (single source of truth)
  if (dbStatus === "verified") {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        is_verified: true,
        verified_type: verifiedType,
        verified_at: new Date().toISOString(),
        verified_by: adminId,
      })
      .eq("id", req.commuter_id);

    if (pErr) throw pErr;
  }

  if (dbStatus === "rejected") {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        is_verified: false,
        verified_type: null,
        verified_at: null,
        verified_by: adminId,
      })
      .eq("id", req.commuter_id);

    if (pErr) throw pErr;
  }
}
