import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../api/supabase";
import { hasMpin } from "../api/mpinLocal";

export const AppLockContext = createContext();

export function AppLockProvider({ children }) {
  const [locked, setLocked] = useState(false);
  const [lockSuppressed, setLockSuppressed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        // ✅ No session => never lock
        if (!session?.user?.id) {
          if (alive) setLocked(false);
          return;
        }

        const userId = session.user.id;
        const [{ data: account }, { data: profile }] = await Promise.all([
          supabase
            .from("commuter_accounts")
            .select("account_active, pin_set")
            .eq("commuter_id", userId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id")
            .eq("id", userId)
            .maybeSingle(),
        ]);

        const accountReady = !!profile?.id && !!account?.account_active && !!account?.pin_set;

        // ✅ Only lock completed accounts; unfinished registrations must not hit MPINUnlock
        const isPinSet = accountReady ? await hasMpin() : false;

        if (alive) setLocked(isPinSet);
      } catch (e) {
        if (alive) setLocked(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppLockContext.Provider value={{ locked, setLocked, lockSuppressed, setLockSuppressed }}>
      {children}
    </AppLockContext.Provider>
  );
}
