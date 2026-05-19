import React, { useState, useRef, useEffect } from "react";
import {
    View,
    TextInput,
    Animated,
    StyleSheet,
    Easing,
    Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const normalizeKeyboardType = (keyboardType) => {
    if (Platform.OS === "ios") return keyboardType;
    if (keyboardType === "number-pad") return "numeric";
    return keyboardType;
};

const FloatingLabelInput = ({
    label,
    value,
    onChangeText,
    secureTextEntry,
    keyboardType = "default",
    autoCapitalize = "none",
    bgColor,
    style,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const { theme } = useTheme();
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: isFocused || value ? 1 : 0,
            duration: 200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    // Dynamic color logic based on state
    const getActiveColor = () => {
        if (props.error) return theme.danger;
        if (value && value.length > 0) return theme.success;
        return theme.accent;
    };

    const activeColor = getActiveColor();

    const labelStyle = {
        position: "absolute",
        left: 14,
        top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, -10], // Moves from center to sitting on the border
        }),
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [theme.textMuted, activeColor],
        }),
        backgroundColor: bgColor || theme.background, // Match the parent background to mask the border
        paddingHorizontal: 6,
        zIndex: 1,
        fontWeight: "700",
    };

    return (
        <View style={[styles.container, style]}>
            <Animated.Text pointerEvents="none" style={labelStyle}>
                {label}
            </Animated.Text>
            <View
                style={[
                    styles.inputContainer,
                    {
                        borderColor: isFocused || (value && value.length > 0) || props.error ? activeColor : theme.border,
                        backgroundColor: bgColor || theme.background,
                    },
                ]}
            >

                <TextInput
                    {...props}
                    style={[styles.input, { color: theme.text }]}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChangeText={onChangeText}
                    value={value}
                    secureTextEntry={secureTextEntry}
                    keyboardType={normalizeKeyboardType(keyboardType)}
                    inputMode={keyboardType === "number-pad" ? "numeric" : props.inputMode}
                    autoCapitalize={autoCapitalize}
                    placeholder="" // We use the floating label instead of placeholder
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: 14,
        height: 56,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: "700",
        paddingVertical: 10,
    },
});

export default FloatingLabelInput;
