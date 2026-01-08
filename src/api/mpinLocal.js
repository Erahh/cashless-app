import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const KEY_PIN_HASH = "mpin_hash_v1";
const KEY_PIN_SET = "mpin_set_v1";

async function sha256(text) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

export async function hasMpin() {
  const v = await SecureStore.getItemAsync(KEY_PIN_SET);
  return v === "true";
}

export async function setMpin(mpin) {
  // store only hash
  const hash = await sha256(mpin);
  await SecureStore.setItemAsync(KEY_PIN_HASH, hash);
  await SecureStore.setItemAsync(KEY_PIN_SET, "true");
  return true;
}

export async function verifyMpin(mpin) {
  const savedHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
  if (!savedHash) return false;

  const hash = await sha256(mpin);
  return hash === savedHash;
}

export async function resetMpinLocal() {
  await SecureStore.deleteItemAsync(KEY_PIN_HASH);
  await SecureStore.deleteItemAsync(KEY_PIN_SET);
}
