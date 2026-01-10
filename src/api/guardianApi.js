import { supabase } from "./supabase";
import { API_BASE_URL } from "../config/api";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("No session token. Please login again.");
  return token;
}

export async function requestGuardianLink(commuter_phone, relationship) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/guardian/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ commuter_phone, relationship }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to send request");
  return json;
}

export async function fetchMyGuardianData() {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/guardian/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load guardian data");
  return json;
}

export async function approveGuardianRequest(id) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/guardian/requests/${id}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to approve request");
  return json;
}

export async function rejectGuardianRequest(id) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/guardian/requests/${id}/reject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to reject request");
  return json;
}
