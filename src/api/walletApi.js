import { supabase } from "./supabase";
import { API_BASE_URL } from "../config/api";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("No session token. Please login again.");
  return token;
}

export async function fetchWallet() {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load wallet");
  return json;
}

export async function demoTopUp(amount) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/wallet/topup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Top up failed");
  return json;
}
