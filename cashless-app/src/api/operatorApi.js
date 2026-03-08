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

export async function getOperatorApplicationStatus() {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error("No session");

    const res = await fetch(`${API_BASE_URL}/operator/application-status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to get status");
    return json.application;
}

export async function submitOperatorApplication(data) {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error("No session");

    const res = await fetch(`${API_BASE_URL}/operator/apply`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Submission failed");
    return json;
}
