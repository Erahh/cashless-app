import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../api/supabase";

export const AppLockContext = createContext();

export function AppLockProvider({ children }) {
  const [locked, setLocked] = useState(false);

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

        // ✅ Lock only if pin_set is true in DB
        const { data: acc } = await supabase
          .from("commuter_accounts")
          .select("pin_set")
          .eq("commuter_id", userId)
          .maybeSingle();

        if (alive) setLocked(!!acc?.pin_set);
      } catch (e) {
        if (alive) setLocked(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <AppLockContext.Provider value={{ locked, setLocked }}>
      {children}
    </AppLockContext.Provider>
  );
}
