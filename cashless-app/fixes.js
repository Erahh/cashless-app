const fs = require('fs');

function applyCache(file, cacheVarName, dataStateVar, loadingCheckContent, dataSetContent) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Skip if already applied
    if (content.includes("let " + cacheVarName + " = ")) {
        console.log("Skipping " + file);
        return;
    }

    // 1. Add module variable
    // Fix: We need to also add CACHED_RECENT for HomeScreen
    if (file.includes('HomeScreen')) {
        content = content.replace(/export default function[^{]+{/, "let " + cacheVarName + " = null;\nlet CACHED_RECENT = [];\n\n$&");
    } else {
        content = content.replace(/export default function[^{]+{/, "let " + cacheVarName + " = null;\n\n$&");
    }

    // 2. Initial useState value
    if (file.includes('TransactionsScreen.jsx') && !file.includes('Operator')) {
        content = content.replace(/let CACHED_TX = null;/, "let CACHED_TX = [];");
        content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(" + cacheVarName + ".length === 0);");
        content = content.replace(/const \[items, setItems\] = useState\(\[\]\);/, "const [items, setItems] = useState(" + cacheVarName + ");");
    } else {
        content = content.replace(/const \[loading, setLoading\] = useState\(true\);/, "const [loading, setLoading] = useState(!" + cacheVarName + ");");
        content = content.replace(new RegExp("const \\\[" + dataStateVar + ", set" + dataStateVar[0].toUpperCase() + dataStateVar.slice(1) + "\\\] = useState\\\([^)]+\\\);"), "const [" + dataStateVar + ", set" + dataStateVar[0].toUpperCase() + dataStateVar.slice(1) + "] = useState(" + cacheVarName + ");");
    }
    
    if (file.includes('HomeScreen')) {
        content = content.replace(/const \[recent, setRecent\] = useState\(\[\]\);/, "const [recent, setRecent] = useState(CACHED_RECENT);");
    }

    // 3. loading check logic
    if (loadingCheckContent) {
        if (file.includes('HomeScreen')) {
            content = content.replace(/if \(!status \|\| !silent\) setLoading\(true\);/, "if (!CACHED_STATUS || !silent) setLoading(true);");
        } else if (file.includes('TransactionsScreen.jsx') && !file.includes('Operator')) {
            content = content.replace(/if \(!silent \|\| items\.length === 0\) setLoading\(true\);/, "if (!silent || CACHED_TX.length === 0) setLoading(true);");
        } else if (file.includes('BalanceScreen')) {
            content = content.replace(/if \(!silent \|\| !wallet\) setLoading\(true\);/, "if (!silent || !CACHED_WALLET) setLoading(true);");
        } else if (file.includes('Operator')) {
            content = content.replace(/if \(!silent\) setLoading\(true\);/, "if (!silent || !" + cacheVarName + ") setLoading(true);");
        }
    }

    // 4. Update cache assigning
    if (dataSetContent) {
        if (file.includes('HomeScreen')) {
            content = content.replace(/setStatus\(json\);/, "setStatus(json);\n      " + cacheVarName + " = json;");
            content = content.replace(/setRecent\(txJson\?\.items \|\| \[\]\);/, "setRecent(txJson?.items || []);\n            CACHED_RECENT = txJson?.items || [];");
        } else if (file.includes('TransactionsScreen') && !file.includes('Operator')) {
            content = content.replace(/setItems\(json\?\.items \|\| \[\]\);/, "setItems(json?.items || []);\n      " + cacheVarName + " = json?.items || [];");
        } else if (file.includes('BalanceScreen')) {
            content = content.replace(/setWallet\(json\);/, "setWallet(json);\n      " + cacheVarName + " = json;");
        } else if (file.includes('Operator')) {
            content = content.replace(/setData\(json\);/, "setData(json);\n      " + cacheVarName + " = json;");
        }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated " + file);
}

applyCache('src/screens/common/HomeScreen.jsx', 'CACHED_STATUS', 'status', true, true);
applyCache('src/screens/commuter/BalanceScreen.jsx', 'CACHED_WALLET', 'wallet', true, true);
applyCache('src/screens/commuter/TransactionsScreen.jsx', 'CACHED_TX', 'items', true, true);
applyCache('src/screens/operator/OperatorEarningsScreen.jsx', 'CACHED_EARNINGS', 'data', true, true);
applyCache('src/screens/operator/OperatorTransactionsScreen.jsx', 'CACHED_OP_TX', 'data', true, true);
