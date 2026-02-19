import { useEffect, useRef, useContext } from "react";
import { AppState } from "react-native";
import { AppLockContext } from "../context/AppLockContext";

export default function LockWatcher() {
    const { setLocked } = useContext(AppLockContext);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (next) => {
            // when app leaves active -> lock it
            if (appState.current === "active" && next.match(/inactive|background/)) {
                setLocked(true);
            }
            appState.current = next;
        });

        return () => sub.remove();
    }, [setLocked]);

    return null;
}
