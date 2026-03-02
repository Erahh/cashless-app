const fs = require('fs');
const path = require('path');

const profilePath = path.join(__dirname, 'src/screens/ProfileScreen.jsx');
let content = fs.readFileSync(profilePath, 'utf8');

// 1. Imports
if (!content.includes('useTheme')) {
    content = content.replace(
        /import \{ AppLockContext \} from "\.\.\/context\/AppLockContext";/,
        'import { AppLockContext } from "../context/AppLockContext";\nimport { useTheme } from "../context/ThemeContext";'
    );
}
if (!content.includes('Switch,')) {
    content = content.replace(
        /ScrollView,/,
        'ScrollView,\n  Switch,'
    );
}

// 2. Add useTheme inside ProfileScreen
if (!content.includes('const { theme, isDarkMode, toggleTheme } = useTheme();')) {
    content = content.replace(
        /const \{ setLocked \} = useContext\(AppLockContext\);/,
        'const { setLocked } = useContext(AppLockContext);\n  const { theme, isDarkMode, toggleTheme } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);'
    );
}

// 3. Add useTheme inside InfoRow
if (!content.includes('const { theme } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);')) {
    // Replace InfoRow definition
    content = content.replace(
        /function InfoRow\(\{ icon, label, value, valueColor \}\) \{/,
        'function InfoRow({ icon, label, value, valueColor }) {\n  const { theme } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);'
    );

    // Replace MenuItem definition
    content = content.replace(
        /function MenuItem\(\{ icon, title, onPress \}\) \{/,
        'function MenuItem({ icon, title, onPress, rightComponent }) {\n  const { theme } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);'
    );
}

// 4. Update MenuItem render
content = content.replace(
    /<Ionicons name="chevron-forward" size=\{20\} color="rgba\(255,255,255,0\.4\)" \/>/g,
    '{rightComponent || <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}'
);
// Make MenuItem icon color dynamic
content = content.replace(
    /<Ionicons name=\{icon\} size=\{20\} color="#fff" \/>/,
    '<Ionicons name={icon} size={20} color={theme.text} />'
);
// Make InfoRow icon color dynamic
content = content.replace(
    /<Ionicons name=\{icon\} size=\{18\} color="rgba\(255,255,255,0\.5\)" \/>/,
    '<Ionicons name={icon} size={18} color={theme.textMuted} />'
);

// Update some hardcoded colors in ProfileScreen render
content = content.replace(/color="#0B0E14"/g, 'color={theme.isDark ? "#0B0E14" : "#FFFFFF"}');
content = content.replace(/color="#fff"/g, 'color={theme.text}');
content = content.replace(/color="rgba\(255,255,255,0\.4\)"/g, 'color={theme.textMuted}');


// 5. Update settings menu with DarkMode slider
const newSettings = `
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="color-palette-outline"
              title="Darkmode"
              onPress={toggleTheme}
              rightComponent={
                <Switch 
                  value={isDarkMode} 
                  onValueChange={toggleTheme} 
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={theme.isDark ? "#ffffff" : "#f4f3f4"}
                />
              }
            />
`;
content = content.replace(
    /<View style=\{styles\.section\}>\s*<Text style=\{styles\.sectionTitle\}>Settings<\/Text>\s*<View style=\{styles\.menuCard\}>[\s\S]*?<\/View>\s*<\/View>/m,
    newSettings + '          </View>\n        </View>'
);

// 6. Refactor StyleSheet to use theme
content = content.replace(/const styles = StyleSheet\.create\(\{/g, 'const createStyles = (theme) => StyleSheet.create({');

// Replace all hardcoded colors with theme tokens
content = content.replace(/backgroundColor: "#0B0E14"/g, 'backgroundColor: theme.background');
content = content.replace(/color: "#0B0E14"/g, 'color: theme.isDark ? "#0B0E14" : "#fff"');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.06\)"/g, 'backgroundColor: theme.card');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.08\)"/g, 'backgroundColor: theme.card');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.10\)"/g, 'backgroundColor: theme.border');
content = content.replace(/borderColor: "rgba\(255,255,255,0\.06\)"/g, 'borderColor: theme.border');
content = content.replace(/borderColor: "rgba\(255,255,255,0\.10\)"/g, 'borderColor: theme.border');
content = content.replace(/borderColor: "rgba\(255,255,255,0\.12\)"/g, 'borderColor: theme.border');
content = content.replace(/borderBottomColor: "rgba\(255,255,255,0\.06\)"/g, 'borderBottomColor: theme.border');

content = content.replace(/color: "#fff"/g, 'color: theme.text');
content = content.replace(/color: "rgba\(255,255,255,0\.65\)"/g, 'color: theme.textSecondary');
content = content.replace(/color: "rgba\(255,255,255,0\.75\)"/g, 'color: theme.textSecondary');
content = content.replace(/color: "rgba\(255,255,255,0\.55\)"/g, 'color: theme.textSecondary');
content = content.replace(/color: "rgba\(255,255,255,0\.5\)"/g, 'color: theme.textMuted');
content = content.replace(/color: "rgba\(255,255,255,0\.45\)"/g, 'color: theme.textMuted');
content = content.replace(/color: "rgba\(255,255,255,0\.35\)"/g, 'color: theme.textMuted');
content = content.replace(/color: "rgba\(255,255,255,0\.4\)"/g, 'color: theme.textMuted');

content = content.replace(/color: "#7CFF9B"/g, 'color: theme.success');
content = content.replace(/backgroundColor: "#7CFF9B"/g, 'backgroundColor: theme.success');
content = content.replace(/borderColor: "#7CFF9B"/g, 'borderColor: theme.success');
content = content.replace(/backgroundColor: "rgba\(124,255,155,0\.15\)"/g, 'backgroundColor: theme.successBg');
content = content.replace(/backgroundColor: "rgba\(124,255,155,0\.10\)"/g, 'backgroundColor: theme.successBg');

content = content.replace(/color: "#FFD36A"/g, 'color: theme.warning');
content = content.replace(/backgroundColor: "#FFD36A"/g, 'backgroundColor: theme.warning');
content = content.replace(/borderColor: "#FFD36A"/g, 'borderColor: theme.warning');
content = content.replace(/backgroundColor: "rgba\(255, 211, 106, 0\.12\)"/g, 'backgroundColor: theme.warningBg');
content = content.replace(/backgroundColor: "rgba\(255,211,106,0\.10\)"/g, 'backgroundColor: theme.warningBg');
content = content.replace(/backgroundColor: "rgba\(255,211,106,0\.15\)"/g, 'backgroundColor: theme.warningBg');
content = content.replace(/borderColor: "rgba\(255, 211, 106, 0\.28\)"/g, 'borderColor: "rgba(255, 152, 0, 0.28)"');

content = content.replace(/color: "#FF7A7A"/g, 'color: theme.danger');
content = content.replace(/backgroundColor: "#FF7A7A"/g, 'backgroundColor: theme.danger');
content = content.replace(/borderColor: "#FF7A7A"/g, 'borderColor: theme.danger');
content = content.replace(/backgroundColor: "rgba\(255,122,122,0\.15\)"/g, 'backgroundColor: theme.dangerBg');
content = content.replace(/backgroundColor: "rgba\(255,122,122,0\.08\)"/g, 'backgroundColor: theme.dangerBg');
content = content.replace(/borderColor: "rgba\(255,122,122,0\.20\)"/g, 'borderColor: theme.dangerBg');


fs.writeFileSync(profilePath, content);
console.log('ProfileScreen updated successfully!');
