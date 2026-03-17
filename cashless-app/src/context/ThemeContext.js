import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@app_theme_preference';

export const lightTheme = {
    isDark: false,
    background: '#F8F9FA', // Clean off-white
    card: '#FFFFFF', // Pure white for cards
    cardAlt: '#F1F3F5',
    border: 'rgba(0, 0, 0, 0.05)',
    text: '#121417',
    textSecondary: '#495057',
    textMuted: '#ADB5BD',
    accent: '#F7E353', // Keep the vibrant yellow
    accentWarm: '#FAB005',
    primary: '#121417',
    success: '#2FB344',
    successBg: 'rgba(47, 179, 68, 0.1)',
    danger: '#D63939',
    dangerBg: 'rgba(214, 57, 57, 0.1)',
    warning: '#F7E353',
    warningBg: 'rgba(247, 227, 83, 0.12)',
    bottomNavBg: '#FFFFFF',
    iconUnfocused: '#868E96',
};

export const darkTheme = {
    isDark: true,
    background: '#0B0E14',
    card: 'rgba(255,255,255,0.06)',
    cardAlt: '#2D2519', // Used for wallet card
    border: 'rgba(255,255,255,0.10)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.65)',
    textMuted: 'rgba(255,255,255,0.45)',
    accent: '#F7E353', // Vibrant Yellow
    accentWarm: '#FF9650',
    primary: '#FFFFFF',
    success: '#7CFF9B',
    successBg: 'rgba(124,255,155,0.15)',
    danger: '#FF7A7A',
    dangerBg: 'rgba(255,122,122,0.15)',
    warning: '#F7E353',
    warningBg: 'rgba(247, 227, 83, 0.15)',
    bottomNavBg: 'rgba(11,14,20,0.96)',
    iconUnfocused: 'rgba(255,255,255,0.70)',
};

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark as per existing app
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load saved theme preference
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme !== null) {
                    setIsDarkMode(savedTheme === 'dark');
                } else {
                    // If no preference is saved, use dark mode for existing users
                    setIsDarkMode(true);
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme ? 'dark' : 'light');
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    };

    const theme = isDarkMode ? darkTheme : lightTheme;

    if (!isLoaded) return null; // Prevent UI flicker while loading preference

    return (
        <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
