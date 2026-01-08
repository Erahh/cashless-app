export function normalizePHPhone(phone) {
    if (!phone) return "";
  
    let p = phone.trim();
  
    // remove spaces & dashes
    p = p.replace(/\s|-/g, "");
  
    // already correct
    if (p.startsWith("+63")) return p;
  
    // 09XXXXXXXXX → +639XXXXXXXX
    if (p.startsWith("09")) return "+63" + p.slice(1);
  
    // 9XXXXXXXXX → +639XXXXXXXX
    if (/^9\d{9}$/.test(p)) return "+63" + p;
  
    // fallback (will fail safely)
    return p;
  }
  