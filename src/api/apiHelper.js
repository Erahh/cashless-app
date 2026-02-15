import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

// Your Render backend URL
const RENDER_API_URL = "https://cashless-backend.onrender.com";

export async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session?.access_token || null;
}

export async function renderApiRequest(path, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated. Please login first.");

  // Read device token for single-device enforcement
  let deviceToken = null;
  try {
    deviceToken = await AsyncStorage.getItem("device_token");
  } catch { /* ignore */ }

  const url = path.startsWith("http") ? path : `${RENDER_API_URL}${path}`;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Attach device token if available
  if (deviceToken) {
    headers["X-Device-Token"] = deviceToken;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  // ✅ Detect session_expired (logged in on another device)
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error === "session_expired") {
      // Clear local device token and trigger global logout
      await AsyncStorage.removeItem("device_token");
      DeviceEventEmitter.emit("SESSION_EXPIRED", errorData.message);
      throw new Error(errorData.message || "Session expired. Logged in on another device.");
    }
    throw new Error(errorData.error || errorData.message || `API request failed: ${response.status}`);
  }

  // ✅ Better error parsing (supports {error} or {message})
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `API request failed: ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

// ✅ Health check (no auth)
export async function checkHealth() {
  const res = await fetch(`${RENDER_API_URL}/health`);
  return res.json();
}

// ✅ Set MPIN (correct route)
export async function setMpinOnRender(mpin, confirmMpin) {
  return renderApiRequest("/mpin/set", {
    method: "POST",
    body: JSON.stringify({
      mpin,
      confirm_mpin: confirmMpin,
    }),
  });
}

// ✅ Verify MPIN (optional for unlock)
export async function verifyMpinOnRender(mpin) {
  return renderApiRequest("/mpin/verify", {
    method: "POST",
    body: JSON.stringify({ mpin }),
  });
}

// ✅ Generic API helper (used by Friends Map screens)
export async function api(path, options = {}) {
  return renderApiRequest(path, options);
}
