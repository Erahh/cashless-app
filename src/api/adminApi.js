import { supabase } from "./supabase";
import { API_BASE_URL } from "../config/api";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("No session token. Please login again.");
  return token;
}

export async function fetchPendingVerifications() {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/admin/verifications/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load pending verifications");
  return json.items || [];
}

export async function fetchVerificationFiles(requestId) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/admin/verifications/${requestId}/files`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load verification files");
  return json.items || [];
}

export async function approveVerification(requestId, notes = null) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/admin/verifications/${requestId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Approve failed");
  return json;
}

export async function rejectVerification(requestId, reason) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/admin/verifications/${requestId}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Reject failed");
  return json;
}

export async function adminGetUnpaidSettlements() {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/admin/settlements/unpaid`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load settlements");
  return json; // { ok, total, items }
}

export async function adminMarkSettlementPaid(settlementId, notes = "") {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/admin/settlements/${settlementId}/mark-paid`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notes }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to mark paid");
  return json;
}