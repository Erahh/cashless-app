const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, 'src/screens/HomeScreen.jsx');
let content = fs.readFileSync(homePath, 'utf8');

// 1. Imports
if (!content.includes('useTheme')) {
    content = content.replace(
        /import \{ fetchNotifications \} from "\.\.\/api\/notificationsApi";/,
        'import { fetchNotifications } from "../api/notificationsApi";\nimport { useTheme } from "../context/ThemeContext";'
    );
}

// 2. Add useTheme inside HomeScreen
if (!content.includes('const { theme, isDarkMode } = useTheme();')) {
    content = content.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        'const { theme, isDarkMode } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);\n  const [loading, setLoading] = useState(true);'
    );
}

// 3. Add useTheme inside ActionCard (if not already)
if (!content.includes('const { theme } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);')) {
    content = content.replace(
        /function ActionCard\(\{ icon, title, subtitle, onPress \}\) \{/,
        'function ActionCard({ icon, title, subtitle, onPress }) {\n  const { theme } = useTheme();\n  const styles = React.useMemo(() => createStyles(theme), [theme]);'
    );
}

// 4. Update hardcoded colors in render
content = content.replace(/color="rgba\(255,255,255,0\.7\)"/g, 'color={theme.textSecondary}');
content = content.replace(/color="rgba\(255,255,255,0\.75\)"/g, 'color={theme.textSecondary}');
content = content.replace(/color="rgba\(255,255,255,0\.45\)"/g, 'color={theme.textMuted}');
content = content.replace(/color="#fff"/g, 'color={theme.text}');
content = content.replace(/color="#0B0E14"/g, 'color={theme.isDark ? "#0B0E14" : "#ffffff"}');

// 5. Refactor StyleSheet to use theme
content = content.replace(/const styles = StyleSheet\.create\(\{/g, 'const createStyles = (theme) => StyleSheet.create({');

// Background / Layout
content = content.replace(/backgroundColor: "#0B0E14"/g, 'backgroundColor: theme.background');
content = content.replace(/color: "#0B0E14"/g, 'color: theme.isDark ? "#0B0E14" : "#ffffff"');

// Cards & Borders
content = content.replace(/backgroundColor: "#2D2519"/g, 'backgroundColor: theme.cardAlt');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.06\)"/g, 'backgroundColor: theme.card');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.10\)"/g, 'backgroundColor: theme.border'); // Using border color for icon box bg
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.08\)"/g, 'backgroundColor: theme.border');
content = content.replace(/borderColor: "rgba\(255,255,255,0\.12\)"/g, 'borderColor: theme.border');
content = content.replace(/borderColor: "rgba\(255,255,255,0\.10\)"/g, 'borderColor: theme.border');
content = content.replace(/borderColor: "rgba\(255,255,255,0\.05\)"/g, 'borderColor: theme.border');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.12\)"/g, 'backgroundColor: theme.border');
content = content.replace(/backgroundColor: "rgba\(255,255,255,0\.8\)"/g, 'backgroundColor: theme.isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.15)"');

// Text
content = content.replace(/color: "#fff"/g, 'color: theme.text');
content = content.replace(/color: "rgba\(255,255,255,0\.85\)"/g, 'color: theme.text');
content = content.replace(/color: "rgba\(255,255,255,0\.75\)"/g, 'color: theme.textSecondary');
content = content.replace(/color: "rgba\(255,255,255,0\.7\)"/g, 'color: theme.textSecondary');
content = content.replace(/color: "rgba\(255,255,255,0\.65\)"/g, 'color: theme.textSecondary');
content = content.replace(/color: "rgba\(255,255,255,0\.55\)"/g, 'color: theme.textMuted');
content = content.replace(/color: "rgba\(255,255,255,0\.45\)"/g, 'color: theme.textMuted');
content = content.replace(/color: "rgba\(255,255,255,0\.4\)"/g, 'color: theme.textMuted');
content = content.replace(/color: "rgba\(255,255,255,0\.35\)"/g, 'color: theme.textMuted');

// Accents (Colors)
content = content.replace(/backgroundColor: "rgba\(255, 211, 106, 0\.10\)"/g, 'backgroundColor: theme.warningBg');
content = content.replace(/borderColor: "rgba\(255, 211, 106, 0\.25\)"/g, 'borderColor: ' + (content.includes('warning') ? 'theme.warningBg' : 'theme.border'));
content = content.replace(/color: "#FFD36A"/g, 'color: theme.warning');
content = content.replace(/backgroundColor: "#FFD36A"/g, 'backgroundColor: theme.warning');
content = content.replace(/borderColor: "rgba\(255, 211, 106, 0\.28\)"/g, 'borderColor: "rgba(255, 152, 0, 0.28)"');
content = content.replace(/backgroundColor: "rgba\(255, 211, 106, 0\.12\)"/g, 'backgroundColor: theme.warningBg');

content = content.replace(/color: "#7CFF9B"/g, 'color: theme.success');
content = content.replace(/backgroundColor: "#7CFF9B"/g, 'backgroundColor: theme.success');
content = content.replace(/color: "#FF8A8A"/g, 'color: theme.danger');
content = content.replace(/color: "#FF7A7A"/g, 'color: theme.danger');
content = content.replace(/backgroundColor: "#FF7A7A"/g, 'backgroundColor: theme.danger');

// Specific to HomeScreen: walletCard properties
content = content.replace(/borderColor: "rgba\(255,211,106,0\.2\)"/g, 'borderColor: ' + (content.includes('warning') ? 'theme.warningBg' : '"rgba(255, 152, 0, 0.2)"'));
content = content.replace(/backgroundColor: "#FF9650"/g, 'backgroundColor: theme.accentWarm');
content = content.replace(/backgroundColor: "rgba\(59, 153, 255, 0\.12\)"/g, 'backgroundColor: theme.isDark ? "rgba(59, 153, 255, 0.12)" : "rgba(59, 153, 255, 0.2)"'); // Notification Bell Bg

// Friends Map Card
content = content.replace(/backgroundColor: "rgba\(76, 175, 80, 0\.08\)"/g, 'backgroundColor: theme.successBg');
content = content.replace(/borderColor: "rgba\(76, 175, 80, 0\.25\)"/g, 'borderColor: "rgba(76, 175, 80, 0.25)"');
content = content.replace(/backgroundColor: "rgba\(76, 175, 80, 0\.15\)"/g, 'backgroundColor: "rgba(76, 175, 80, 0.15)"');

fs.writeFileSync(homePath, content);
console.log('HomeScreen updated successfully!');
