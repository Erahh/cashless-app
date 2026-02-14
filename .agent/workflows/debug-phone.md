---
description: Debug phone number lookup issue
---

# Debug Phone Number Lookup

Run this to check how phone numbers are stored in the database:

```bash
cd c:\Users\janri\OneDrive\Desktop\cashless-backend
node debug_phone_lookup.js
```

This will show:
1. Whether the phone number exists in any format
2. What format it's stored in
3. All phone numbers in the database (first 20)
