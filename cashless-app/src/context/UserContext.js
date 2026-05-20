import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import logger from '../utils/logger';
import { supabase } from '../api/supabase';
import { API_BASE_URL } from '../config/api';
import { fetchNotifications } from '../api/notificationsApi';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [account, setAccount] = useState(null);
    const [roles, setRoles] = useState({ is_commuter: true, is_operator: false, is_admin: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUserData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!session) {
                setUser(null);
                setProfile(null);
                setWallet(null);
                setAccount(null);
                setLoading(false);
                return;
            }

            const token = session.access_token;
            setUser(session.user);

            // Fetch consolidated status from backend
            const response = await fetch(`${API_BASE_URL}/me/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to fetch user status');
            }

            const data = await response.json();

            setProfile(data.profile);
            setAccount(data.account);
            setWallet({ balance: data.account?.balance || 0 });
            setRoles(data.roles || { is_commuter: true, is_operator: false, is_admin: false });

            // Fetch recent notifications
            try {
                const notifs = await fetchNotifications(20);
                setNotifications(notifs || []);
                // Simple unread count logic (could be improved)
                setUnreadCount(notifs?.filter(n => !n.read_at).length || 0);
            } catch (nErr) {
                console.warn('Failed to fetch notifications in context:', nErr);
            }

        } catch (err) {
            logger.error('Error in UserContext:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        refreshUserData();

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                refreshUserData(true);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setWallet(null);
                setAccount(null);
                setRoles({ is_commuter: true, is_operator: false, is_admin: false });
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [refreshUserData]);

    const value = {
        user,
        profile,
        wallet,
        account,
        roles,
        loading,
        error,
        notifications,
        unreadCount,
        refreshUserData,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
