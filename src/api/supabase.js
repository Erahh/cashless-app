import { createClient } from "@supabase/supabase-js";

// IMPORTANT: Use your ANON KEY (public key), NOT the secret key!
// Secret keys should NEVER be exposed in client-side code.
// Get your anon key from: Supabase Dashboard > Settings > API > anon/public key
const SUPABASE_URL = "https://ugvwzuphiznynamcsamh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVndnd6dXBoaXpueW5hbWNzYW1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjYxMjMsImV4cCI6MjA4MzI0MjEyM30.Cyzw_cztDDLiLIZ4OVGXSJOwo77cwalfysLlBQX72JY"; // ⚠️ Replace with your anon key!

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
