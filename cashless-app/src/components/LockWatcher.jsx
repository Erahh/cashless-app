import { useEffect, useRef, useContext } from "react";
import { AppState } from "react-native";
import { AppLockContext } from "../context/AppLockContext";

export default function LockWatcher() {
    const { setLocked, lockSuppressed } = useContext(AppLockContext);
    const appState = useRef(AppState.currentState);
    const lockTimer = useRef(null);

    useEffect(() => {
        const sub = AppState.addEventListener("change", (next) => {
            // Clear any pending lock timer when app returns or changes state
            if (lockTimer.current) {
                clearTimeout(lockTimer.current);
                lockTimer.current = null;
            }

            // when app leaves active -> lock it after a short grace period
            // UNLESS lock is suppressed (e.g. camera is open)
            if (appState.current === "active" && next.match(/inactive|background/)) {
                if (!lockSuppressed) {
                    // 3 second grace period for minor interruptions
                    lockTimer.current = setTimeout(() => {
                        setLocked(true);
                        lockTimer.current = null;
                    }, 3000);
                }
            }

            appState.current = next;
        });

        return () => {
            sub.remove();
            if (lockTimer.current) clearTimeout(lockTimer.current);
        };
    }, [setLocked, lockSuppressed]);

    return null;
}
