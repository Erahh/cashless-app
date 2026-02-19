import * as SecureStore from "expo-secure-store";

const KEY_PASSENGER = "passenger_profile_v1";

export async function savePassengerProfile(data) {
  await SecureStore.setItemAsync(KEY_PASSENGER, JSON.stringify(data));
}

export async function getPassengerProfile() {
  const raw = await SecureStore.getItemAsync(KEY_PASSENGER);
  return raw ? JSON.parse(raw) : null;
}

export async function clearPassengerProfile() {
  await SecureStore.deleteItemAsync(KEY_PASSENGER);
}
