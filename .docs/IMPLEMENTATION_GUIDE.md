# User Funnel Analytics - Implementation Guide

## 🎯 What Was Implemented

A KISS-compliant user conversion funnel analytics system that tracks unconverted users (generated but not paid/minted) with usernames for Farcaster cast targeting.

**Implementation Date**: 2025-11-17

---

## ✅ Completed Changes

### 1. Database Schema Updates

**File**: `.docs/migration_unconverted_users.sql`

Added username tracking to existing table:
- `username` TEXT column
- `cast_sent` BOOLEAN column (default FALSE)
- Index on `cast_sent` for performance

Created database VIEW:
- `unconverted_users` - Automatically filters users who generated but didn't pay
- Real-time updates (no manual refresh needed)
- Joins `unminted_geoplets` with `payment_tracking`

### 2. TypeScript Interfaces

**File**: `lib/supabase.ts`

Updated interfaces:
```typescript
export interface UnmintedGeoplet {
  id: string;
  fid: number;
  image_data: string;
  created_at: string;
  username: string;        // NEW
  cast_sent: boolean;      // NEW
}

export interface UnconvertedUser {
  fid: number;
  username: string;
  image_data: string;
  generated_at: string;
  cast_sent: boolean;
}
```

### 3. Backend API Updates

**File**: `app/api/save-generation/route.ts`

- Added `username` parameter to request body
- Added validation for username
- Updated database upsert to include username

### 4. Frontend Updates

**File**: `hooks/useWarplets.ts`

- Extracts username from Farcaster SDK context (`context.user.username`)
- Returns username alongside fid
- Handles cleanup on disconnect

**File**: `hooks/useGenerationStorage.ts`

- Updated `saveGeneration` function signature to accept username
- Sends username to API alongside fid and image_data
- Added validation for username

**File**: `app/page.tsx`

- Destructures username from useWarplets hook
- Passes username to saveGeneration call
- Fallback to `fid-${fid}` if username unavailable

### 5. Analytics API Endpoint

**File**: `app/api/analytics/unconverted/route.ts` (NEW)

Features:
- Queries `unconverted_users` VIEW
- Optional filter by `cast_sent` status
- Returns user list with image_data for admin dashboard
- Generates `tag_string` for easy copy-paste into casts

---

## 🚀 Next Steps (Manual Actions Required)

### Step 1: Run Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `.docs/migration_unconverted_users.sql`
3. Execute the SQL script
4. Verify:
   ```sql
   -- Check new columns exist
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'unminted_geoplets';

   -- Check VIEW was created
   SELECT COUNT(*) FROM unconverted_users;
   ```

**Expected Output**:
- `unminted_geoplets` now has `username` and `cast_sent` columns
- `unconverted_users` VIEW returns count (may be 0 if no existing data)

### Step 2: Test the Implementation

#### 2a. Test Username Capture

1. Start development server:
   ```bash
   npm run dev
   ```

2. Access the app via Farcaster
3. Generate a Geoplet
4. Check Supabase `unminted_geoplets` table:
   ```sql
   SELECT fid, username, cast_sent, created_at
   FROM unminted_geoplets
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Result**: New record with `username` populated

#### 2b. Test Analytics API

Test in browser or curl:
```bash
# Get all unconverted users
curl http://localhost:3000/api/analytics/unconverted

# Get only users not yet casted to
curl http://localhost:3000/api/analytics/unconverted?cast_sent=false

# Get users already casted to
curl http://localhost:3000/api/analytics/unconverted?cast_sent=true
```

**Expected Response**:
```json
{
  "success": true,
  "users": [
    {
      "fid": 123,
      "username": "alice",
      "image_data": "base64...",
      "generated_at": "2025-11-17T10:00:00Z",
      "cast_sent": false
    }
  ],
  "count": 1,
  "tag_string": "@alice"
}
```

#### 2c. Test the VIEW Logic

Verify VIEW correctly filters unconverted users:
```sql
-- Manually check: Users in unminted_geoplets but NOT in payment_tracking
SELECT u.fid, u.username, u.cast_sent
FROM unminted_geoplets u
LEFT JOIN payment_tracking p ON u.fid = p.fid
WHERE p.fid IS NULL;
```

Should match results from `/api/analytics/unconverted`

### Step 3: Backfill Existing Data (Optional)

If you have existing users in `unminted_geoplets` without usernames:

**Option A**: Let them regenerate (KISS approach)
- Next time they visit, username will be captured

**Option B**: Manual backfill via API
- Use Neynar API or Farcaster Hub to fetch usernames by FID
- Update records manually

Example backfill script (if needed):
```typescript
// scripts/backfill-usernames.ts
const { data: users } = await supabase
  .from('unminted_geoplets')
  .select('fid')
  .is('username', null);

for (const user of users) {
  const username = await fetchUsernameFromFarcaster(user.fid);
  await supabase
    .from('unminted_geoplets')
    .update({ username })
    .eq('fid', user.fid);
}
```

---

## 📖 Usage Guide

### For Development

**Get unconverted users for cast targeting:**
```bash
curl http://localhost:3000/api/analytics/unconverted?cast_sent=false
```

Copy the `tag_string` from response and use in Farcaster cast:
```
Hey @alice @bob! Complete your Geoplet mint 🎨✨
```

**Mark users as casted (after sending cast):**
```typescript
await supabaseAdmin
  .from('unminted_geoplets')
  .update({ cast_sent: true })
  .in('fid', [123, 456]);
```

### For Production

**API Endpoint**: `https://your-domain.com/api/analytics/unconverted`

**Query Parameters**:
- `cast_sent=false` - Only users not yet casted to
- `cast_sent=true` - Only users already casted to
- No parameter - All unconverted users

---

## 🔍 Troubleshooting

### Issue: API returns empty array

**Check**:
1. Database migration ran successfully
2. VIEW was created: `SELECT * FROM unconverted_users;`
3. Users exist in `unminted_geoplets` table
4. No users exist in `payment_tracking` table (for testing)

### Issue: Username is null in database

**Check**:
1. Frontend is sending username to API
2. Check browser console for validation errors
3. Verify SDK context provides username: `console.log(context.user)`

### Issue: VIEW not updating in real-time

**Solution**: VIEWs update automatically, but if seeing stale data:
```sql
-- Force refresh (shouldn't be needed for regular VIEWs)
SELECT * FROM unconverted_users;
```

If using MATERIALIZED VIEW (not recommended):
```sql
REFRESH MATERIALIZED VIEW unconverted_users;
```

---

## 📊 Database Architecture

```
unminted_geoplets (TABLE)
├── fid (PK)
├── image_data
├── username      ← NEW
├── cast_sent     ← NEW
└── created_at

payment_tracking (TABLE)
├── fid (PK)
├── status
├── settlement_tx_hash
└── ...

unconverted_users (VIEW)
├── Automatically JOINs above tables
├── Filters WHERE payment_tracking.fid IS NULL
└── Returns: fid, username, image_data, generated_at, cast_sent
```

---

## 🎯 Future Enhancements (When Needed)

As mentioned in the plan, these are **deferred** for KISS:

1. **Cast tracking timestamps**:
   ```sql
   ALTER TABLE unminted_geoplets
   ADD COLUMN cast_sent_at TIMESTAMP NULL;
   ```

2. **Multi-cast tracking**:
   ```sql
   ALTER TABLE unminted_geoplets
   ADD COLUMN cast_count INTEGER DEFAULT 0;
   ```

3. **Admin Dashboard UI**:
   - Build interface to view unconverted users
   - Preview images
   - Compose and send casts
   - Mark as `cast_sent = true`

---

## ✅ Implementation Checklist

- [x] Update database schema (add columns)
- [x] Create `unconverted_users` VIEW
- [x] Update TypeScript interfaces
- [x] Update save-generation API
- [x] Update frontend hooks
- [x] Create analytics API endpoint
- [ ] **Run database migration in Supabase**
- [ ] **Test username capture**
- [ ] **Test analytics API**
- [ ] **Verify VIEW filtering**
- [ ] (Optional) Backfill existing usernames

---

## 📞 Support

**Documentation**:
- Plan: `.docs/users_funnel.md`
- Migration SQL: `.docs/migration_unconverted_users.sql`

**Key Files**:
- Backend API: `app/api/analytics/unconverted/route.ts`
- Frontend Hook: `hooks/useWarplets.ts`
- Types: `lib/supabase.ts`
