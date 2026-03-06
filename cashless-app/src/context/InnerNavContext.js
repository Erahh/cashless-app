import React, { createContext, useContext, useRef, useCallback, useState } from "react";

const InnerNavContext = createContext({ navRef: { current: null }, activeRoute: "Home", setActiveRoute: () => { } });

export function InnerNavProvider({ children }) {
    const navRef = useRef(null);
    const [activeRoute, setActiveRoute] = useState("Home");

    return (
        <InnerNavContext.Provider value={{ navRef, activeRoute, setActiveRoute }}>
            {children}
        </InnerNavContext.Provider>
    );
}

export function useInnerNav() {
    return useContext(InnerNavContext);
}
