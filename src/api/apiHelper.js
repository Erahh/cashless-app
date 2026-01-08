import { supabase } from "./supabase";

/**
 * Get the current access token from Supabase session
 * Use this before making API calls to your Render backend
 */
export async function getAccessToken() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error getting session:", error);
      return null;
    }

    const accessToken = data?.session?.access_token;
    
    if (!accessToken) {
      console.warn("No access token found. User may not be logged in.");
      return null;
    }

    return accessToken;
  } catch (error) {
    console.error("Failed to get access token:", error);
    return null;
  }
}

/**
 * Make an authenticated API request to your Render backend
 * @param {string} url - Full URL to your Render API endpoint
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise} - Response from the API
 */
export async function renderApiRequest(url, options = {}) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Not authenticated. Please login first.");
  }

  const defaultOptions = {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(errorData.message || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Example usage functions for common API calls
 */

// Your Render backend URL
const RENDER_API_URL = "https://cashless-backend.onrender.com";

/**
 * Health check endpoint (no auth required)
 */
export async function checkHealth() {
  const response = await fetch(`${RENDER_API_URL}/health`);
  return response.json();
}

/**
 * Submit basic info after OTP verification
 * @param {string} fullName - User's full name
 * @param {string} email - User's email (optional)
 */
export async function submitBasicInfo(fullName, email = "") {
  return renderApiRequest(`${RENDER_API_URL}/auth/basic-info`, {
    method: "POST",
    body: JSON.stringify({
      full_name: fullName,
      email: email,
    }),
  });
}

/**
 * Set MPIN on Render backend
 * @param {string} mpin - 6-digit MPIN
 * @param {string} confirmMpin - Confirmation MPIN (must match)
 */
export async function setMpinOnRender(mpin, confirmMpin) {
  return renderApiRequest(`${RENDER_API_URL}/auth/set-mpin`, {
    method: "POST",
    body: JSON.stringify({ 
      mpin: mpin,
      confirm_mpin: confirmMpin 
    }),
  });
}
