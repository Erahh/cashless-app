import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../api/supabase";
import { hasMpin } from "../api/mpinLocal";

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

        // ✅ Lock based on SecureStore local check - instantaneous and works offline
        const isPinSet = await hasMpin();

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
    <AppLockContext.Provider value={{ locked, setLocked }}>
      {children}
    </AppLockContext.Provider>
  );
}
