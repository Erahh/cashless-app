# 🔧 Step-by-Step: Fix Verification Submit Backend

## The Problem
Your backend is using `ON CONFLICT` but the database table doesn't have a unique constraint.

## ✅ Solution: Choose One Approach

### **Option A: Fix Database (Recommended - 2 minutes)**

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Step 1: Check if table exists and see its structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'verification_requests';

-- Step 2: Add unique constraint (prevents duplicate verifications per user)
-- Replace 'commuter_id' with your actual user ID column name if different
ALTER TABLE verification_requests 
ADD CONSTRAINT unique_user_verification 
UNIQUE (commuter_id);

-- If the constraint already exists, you'll get an error - that's okay!
-- If you get "column does not exist", check what your user ID column is called
```

**Then your backend can use:**
```javascript
await supabase
  .from('verification_requests')
  .upsert({
    commuter_id: userId,
    passenger_type,
    id_front_path,
    id_back_path,
    status: 'pending'
  }, {
    onConflict: 'commuter_id'
  });
```

---

### **Option B: Fix Backend Code (No DB changes - 5 minutes)**

Update your `/verification/submit` route in your Render backend:

```javascript
// Replace your current upsert logic with this:
router.post('/verification/submit', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT token
    const { passenger_type, id_front_path, id_back_path } = req.body;

    // Check if verification already exists
    const { data: existing } = await supabaseService
      .from('verification_requests')
      .select('id')
      .eq('commuter_id', userId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabaseService
        .from('verification_requests')
        .update({
          passenger_type,
          id_front_path,
          id_back_path,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .eq('commuter_id', userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
    } else {
      // Insert new record
      const { error } = await supabaseService
        .from('verification_requests')
        .insert({
          commuter_id: userId,
          passenger_type,
          id_front_path,
          id_back_path,
          status: 'pending'
        });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    return res.json({ 
      ok: true, 
      message: 'Verification submitted successfully' 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
```

---

## 🧪 Test After Fixing

1. **Test in your app:**
   - Go to Passenger Type → Select Student/Senior
   - Upload ID front and back
   - Click Submit
   - Should see "Submitted ✅" instead of error

2. **Or test with curl:**
```bash
curl -X POST https://cashless-backend.onrender.com/verification/submit \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "passenger_type": "student",
    "id_front_path": "test/front.jpg",
    "id_back_path": "test/back.jpg"
  }'
```

---

## 📋 Quick Checklist

- [ ] Choose Option A (database) or Option B (code)
- [ ] Make the change
- [ ] Deploy to Render (if you changed code)
- [ ] Test in app
- [ ] Verify it works ✅

---

## ❓ Still Having Issues?

**Check your table name:**
- Is it `verification_requests` or something else?
- Check in Supabase Dashboard → Table Editor

**Check your column names:**
- Is it `commuter_id` or `user_id`?
- Run: `SELECT * FROM verification_requests LIMIT 1;` to see structure

**Check backend logs:**
- Go to Render Dashboard → Your Service → Logs
- Look for the exact error message
