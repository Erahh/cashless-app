import React, { createContext, useState } from "react";

export const AppLockContext = createContext();

export function AppLockProvider({ children }) {
  const [locked, setLocked] = useState(false);

  return (
    <AppLockContext.Provider value={{ locked, setLocked }}>
      {children}
    </AppLockContext.Provider>
  );
}
