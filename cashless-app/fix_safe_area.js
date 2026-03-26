const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && (filepath.endsWith('.jsx') || filepath.endsWith('.js'))) {
            callback(filepath);
        }
    });
}

const srcDir = path.join(__dirname, 'src');

walk(srcDir, (filepath) => {
    let content = fs.readFileSync(filepath, 'utf8');
    if (!content.includes('SafeAreaView')) return;

    // Regex to find import from 'react-native'
    // This handles both single line and multi-line imports
    const rnImportRegex = /import\s+\{([^}]+)\}\s+from\s+["']react-native["'];?/g;
    
    let modified = false;
    let newContent = content.replace(rnImportRegex, (match, imports) => {
        if (imports.includes('SafeAreaView')) {
            modified = true;
            // Remove SafeAreaView from the list
            let newRNImports = imports.replace(/SafeAreaView\s*,?\s*/, '').trim();
            // Clean up trailing commas
            newRNImports = newRNImports.replace(/,\s*$/, '').trim();
            
            let result = '';
            if (newRNImports) {
                result = `import { ${newRNImports} } from "react-native";\n`;
            }
            
            // Check if react-native-safe-area-context is already imported
            if (content.includes('react-native-safe-area-context')) {
                // We'll handle adding it to existing import later or just assume it's there
                // Actually, let's just append it for now if not already there
                return result;
            } else {
                return `import { SafeAreaView } from "react-native-safe-area-context";\n${result}`;
            }
        }
        return match;
    });

    // If react-native-safe-area-context was not already there but we removed it from RN, and it's not in newContent yet
    if (modified && !newContent.includes('react-native-safe-area-context')) {
        newContent = `import { SafeAreaView } from "react-native-safe-area-context";\n` + newContent;
    }

    if (modified) {
        fs.writeFileSync(filepath, newContent, 'utf8');
        console.log(`Updated: ${filepath}`);
    }
});
