import { createClient } from "@supabase/supabase-js";

// IMPORTANT: Use your ANON KEY (public key), NOT the secret key!
// Secret keys should NEVER be exposed in client-side code.
// Get your anon key from: Supabase Dashboard > Settings > API > anon/public key
const SUPABASE_URL = "https://ugvwzuphiznynamcsamh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JZYqd-xJJDUK0NV-OUsZlw_BR7uumIW"; // ⚠️ Replace with your anon key!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
