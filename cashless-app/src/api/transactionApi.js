import { supabase } from "./supabase";
import { API_BASE_URL } from "../config/api";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("No session token. Please login again.");
  return token;
}

async function readJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text };
  }
}

export async function fetchTransactions(limit = 20) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/transactions?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load transactions");
  return json.items || [];
}

export async function fetchTransactionById(id) {
  const token = await getToken();

  try {
    const res = await fetch(`${API_BASE_URL}/wallet/transactions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await readJsonSafe(res);
    if (!res.ok) {
      const message = json?.error || json?.message || (json?.__raw ? "Invalid backend response" : "Failed to load ride details");
      throw new Error(message);
    }

    if (json?.result) return json.result;
    if (json?.data) return json.data;
    if (json && !json.__raw) return json;
    throw new Error("Invalid backend response");
  } catch (backendError) {
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        operator:operator_id (id, full_name, phone, role),
        vehicle:vehicle_id (plate_no, route_name)
      `)
      .eq("id", id)
      .single();

    if (data) return data;

    throw new Error(backendError?.message || error?.message || "Failed to load ride details");
  }
}
