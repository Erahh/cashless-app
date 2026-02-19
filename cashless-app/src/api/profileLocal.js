import * as SecureStore from "expo-secure-store";

const KEY_PROFILE = "profile_basic_v1";

export async function saveBasicProfile({ full_name, email }) {
  await SecureStore.setItemAsync(KEY_PROFILE, JSON.stringify({ full_name, email: email || null }));
}

export async function getBasicProfile() {
  const raw = await SecureStore.getItemAsync(KEY_PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function clearBasicProfile() {
  await SecureStore.deleteItemAsync(KEY_PROFILE);
}
