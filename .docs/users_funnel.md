# User Conversion Funnel Analytics - KISS Implementation

**Goal**: Track unconverted users (generated but not paid/minted) with usernames for Farcaster cast targeting.

**Date**: 2025-11-17
**Status**: Ready to implement
**Principle**: KISS - Database-level logic, minimal code changes

---

## Overview

Instead of creating a new table, we leverage existing tables (`unminted_geoplets` + `payment_tracking`) with a PostgreSQL VIEW to automatically calculate unconverted users at the database level.

**Key Insight**: `unminted_geoplets` contains ALL users who interacted. Subtract `payment_tracking` to get unconverted users.

---

## 1. Database Changes

### A. Add Columns to `unminted_geoplets`

```sql
-- Add username and cast tracking
ALTER TABLE unminted_geoplets
ADD COLUMN username TEXT,
ADD COLUMN cast_sent BOOLEAN DEFAULT FALSE;

-- Index for performance
CREATE INDEX idx_cast_sent ON unminted_geoplets(cast_sent);
```

**New Schema:**
```typescript
interface UnmintedGeoplet {
  id: string;
  fid: number;
  image_data: string;      // Existing
  created_at: string;      // Existing
  username: string;        // NEW - for cast targeting (@username)
  cast_sent: boolean;      // NEW - track if already casted to
}
```

### B. Create VIEW for Unconverted Users

```sql
CREATE VIEW unconverted_users AS
SELECT
  u.fid,
  u.username,
  u.image_data,
  u.created_at as generated_at,
  u.cast_sent
FROM unminted_geoplets u
LEFT JOIN payment_tracking p ON u.fid = p.fid
WHERE p.fid IS NULL        -- User has NOT paid/minted
ORDER BY u.created_at DESC;
```

**What this VIEW does:**
- Automatically filters users who generated but didn't pay
- Updates in real-time (no manual refresh)
- Supabase treats it like a regular table
- Includes username, image_data, and cast_sent flag

---

## 2. Code Changes

### A. Update TypeScript Interface

**File**: `lib/supabase.ts`

```typescript
export interface UnmintedGeoplet {
  id: string;
  fid: number;
  image_data: string;
  created_at: string;
  username: string;        // ADD
  cast_sent: boolean;      // ADD
}
```

### B. Capture Username on Generation

**File**: `app/api/save-generation/route.ts`

```typescript
// Get username from Farcaster SDK context
const context = await sdk.context;
const fid = context.user.fid;
const username = context.user.username;  // ADD THIS

// Store in database
await supabaseAdmin
  .from('unminted_geoplets')
  .upsert({
    fid: fid,
    image_data: imageData,
    username: username,    // ADD THIS
    created_at: new Date().toISOString()
  }, {
    onConflict: 'fid'
  });
```

### C. Create Analytics API Endpoint

**File**: `app/api/analytics/unconverted/route.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    // Query the VIEW - database handles all filtering
    const { data, error } = await supabaseAdmin
      .from('unconverted_users')
      .select('*')
      .eq('cast_sent', false)  // Optional: filter by cast status
      .order('generated_at', { ascending: false });

    if (error) throw error;

    // Generate tag string for easy copy-paste
    const tagString = data?.map(u => `@${u.username}`).join(' ') || '';

    return NextResponse.json({
      success: true,
      users: data,
      count: data?.length || 0,
      tag_string: tagString
    });

  } catch (error) {
    console.error('[ANALYTICS] Error fetching unconverted users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unconverted users' },
      { status: 500 }
    );
  }
}
```

---

## 3. Usage

### Get Unconverted Users for Cast Targeting

```bash
# API call
curl http://localhost:3000/api/analytics/unconverted
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "fid": 123,
      "username": "alice",
      "image_data": "data:image/png;base64,...",
      "generated_at": "2025-11-15T10:00:00Z",
      "cast_sent": false
    },
    {
      "fid": 456,
      "username": "bob",
      "image_data": "data:image/png;base64,...",
      "generated_at": "2025-11-16T14:30:00Z",
      "cast_sent": false
    }
  ],
  "count": 2,
  "tag_string": "@alice @bob"
}
```

### Mark Users as Casted (Future Admin Dashboard)

```typescript
// After sending cast
await supabaseAdmin
  .from('unminted_geoplets')
  .update({ cast_sent: true })
  .in('fid', [123, 456]);
```

---

## 4. Admin Dashboard (Future Implementation)

When ready to build the admin dashboard, you'll have:

**Features:**
- ✅ List of unconverted users with image previews
- ✅ Filter by cast status (not casted / already casted)
- ✅ Select users and compose cast message
- ✅ Auto-generate tag string (@alice @bob)
- ✅ Send cast and mark as `cast_sent = true`

**API endpoint already ready**: `/api/analytics/unconverted`

---

## 5. Benefits of This Approach

| Benefit | How |
|---------|-----|
| **KISS Principle** | No new tables, database handles logic via VIEW |
| **Real-time** | VIEW updates automatically, no cron jobs |
| **Performance** | Indexed JOIN on FID, PostgreSQL optimized |
| **Minimal Code** | 2 file edits + 1 new endpoint = ~30 lines total |
| **Extensible** | Easy to add cast_sent_at, cast_count later if needed |
| **Professional** | Normalized schema, single source of truth |

---

## 6. Files Summary

### Files to Modify (2):
1. `lib/supabase.ts` - Add username/cast_sent to interface
2. `app/api/save-generation/route.ts` - Capture username from SDK

### Files to Create (1):
1. `app/api/analytics/unconverted/route.ts` - Query unconverted users

### Database Changes (2):
1. `ALTER TABLE` - Add username and cast_sent columns
2. `CREATE VIEW` - unconverted_users view

---

## 7. Future Enhancements (When Needed)

**Phase 2 (if needed later):**
- Add `cast_sent_at` timestamp to track when cast was sent
- Add `cast_count` to track multiple follow-up casts
- Add "re-cast after N days" logic for persistent unconverted users
- Build full admin dashboard UI with filters and analytics

**For now**: Keep it simple, build the fundamental.

---

## KISS Compliance ✅

- ✅ No over-engineering (no premature timestamps/counters)
- ✅ No new tables (leverage existing schema)
- ✅ Database-level logic (VIEW)
- ✅ Minimal code changes (30 lines total)
- ✅ Professional best practice (indexed, normalized)
- ✅ Secure (Supabase admin client, no SQL injection)
