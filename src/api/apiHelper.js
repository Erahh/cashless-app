import { supabase } from "./supabase";

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

  const url = path.startsWith("http") ? path : `${RENDER_API_URL}${path}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body,
  });

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
