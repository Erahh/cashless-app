# Backend Fix: Verification Submit Error

## Error Message
```
submit failed: there is no unique or exclusion constraint matching the ON conflict specification
```

## Problem
Your backend endpoint `/verification/submit` is using `ON CONFLICT` in a PostgreSQL query, but the column specified in the conflict target doesn't have a unique constraint or unique index.

## Solution Options

### Option 1: Add Unique Constraint (Recommended)
If you want to prevent duplicate verification requests per user, add a unique constraint:

```sql
-- In your Supabase SQL Editor or migration
ALTER TABLE verification_requests 
ADD CONSTRAINT unique_user_verification 
UNIQUE (commuter_id);
```

Or if you want to allow multiple requests but only one active:
```sql
-- Unique constraint on user_id + status where status = 'pending'
CREATE UNIQUE INDEX unique_pending_verification 
ON verification_requests (commuter_id) 
WHERE status = 'pending';
```

### Option 2: Change Backend Logic (Alternative)
Instead of using `ON CONFLICT`, check if a record exists first:

```javascript
// In your backend /verification/submit route
const { data: existing } = await supabase
  .from('verification_requests')
  .select('id')
  .eq('commuter_id', userId)
  .single();

if (existing) {
  // Update existing record
  const { error } = await supabase
    .from('verification_requests')
    .update({
      passenger_type,
      id_front_path,
      id_back_path,
      status: 'pending',
      submitted_at: new Date().toISOString()
    })
    .eq('commuter_id', userId);
} else {
  // Insert new record
  const { error } = await supabase
    .from('verification_requests')
    .insert({
      commuter_id: userId,
      passenger_type,
      id_front_path,
      id_back_path,
      status: 'pending'
    });
}
```

### Option 3: Remove ON CONFLICT (Simplest)
If you want to allow multiple verification requests, just use a regular INSERT:

```javascript
const { error } = await supabase
  .from('verification_requests')
  .insert({
    commuter_id: userId,
    passenger_type,
    id_front_path,
    id_back_path,
    status: 'pending'
  });
```

## Expected Backend Endpoint Structure

Your `/verification/submit` endpoint should:
1. Extract `userId` from the Bearer token (Supabase JWT)
2. Receive: `{ passenger_type, id_front_path, id_back_path }`
3. Insert/update the `verification_requests` table
4. Return success response

## Testing
After fixing, test the endpoint:
```bash
POST https://cashless-backend.onrender.com/verification/submit
Headers:
  Authorization: Bearer <supabase_access_token>
  Content-Type: application/json
Body:
{
  "passenger_type": "student",
  "id_front_path": "user_id/student_front_1234567890.jpg",
  "id_back_path": "user_id/student_back_1234567890.jpg"
}
```
