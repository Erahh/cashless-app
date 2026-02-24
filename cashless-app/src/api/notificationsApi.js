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

/**
 * Register an Expo push token with the backend.
 * Call this on app launch (after login) so the server knows where to send notifications.
 */
export async function registerPushToken(pushToken) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/notifications/register-push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: pushToken }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to register push token");
  return json;
}

/**
 * Unregister a push token (e.g., on logout).
 */
export async function unregisterPushToken(pushToken) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/notifications/unregister-push`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: pushToken }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to unregister push token");
  return json;
}

/**
 * Delete a single notification.
 */
export async function deleteNotification(id) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to delete notification");
  return json;
}

/**
 * Clear all notifications.
 */
export async function clearNotifications() {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/notifications/clear`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to clear notifications");
  return json;
}
