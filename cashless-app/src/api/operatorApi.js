import { API_BASE_URL } from "../config/api";
import { supabase } from "./supabase";

export async function getOperatorQR() {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error("No session");

    const res = await fetch(`${API_BASE_URL}/operator/qr`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(json?.error || `Failed (HTTP ${res.status})`);
    return json;
}
