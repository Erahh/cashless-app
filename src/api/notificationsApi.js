import { supabase } from "./supabase";
import { API_BASE_URL } from "../config/api";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("No session token. Please login again.");
  return token;
}

export async function fetchNotifications(limit = 30) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load notifications");
  return json.items || [];
}
