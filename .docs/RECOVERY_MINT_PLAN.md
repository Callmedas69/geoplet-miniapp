# RECOVERY_MINT_PLAN.md

## Overview

This document outlines the implementation plan to fix the double DataURI prefix bug identified in RECOVERY_MINT_FIX.md. The plan follows KISS principles and implements the three-part fix recommended in the original document.

---

## Files Identified for Fixes

### 🔴 Critical Files (Require Changes)

1. **app/page.tsx** - Primary bug source (lines 155-157)
2. **components/MintPaidButton.tsx** - Affected recovery component
3. **lib/generators.ts** - Validation function needs enhancement

### ✅ Files Already Correct (No Changes)

- `app/api/save-generation/route.ts` - Correctly stores raw base64
- `app/api/get-generation/route.ts` - Correctly returns raw base64
- `components/MintButton.tsx` - Uses fresh images, no issues

---

## Root Cause Analysis

### Bug Flow Identified

```
1. ✅ Supabase Storage: Stores raw base64 (CORRECT)
2. ✅ API Retrieval: Returns raw base64 (CORRECT)
3. ❌ app/page.tsx:155-157: Adds prefix "data:image/png;base64," (BUG INTRODUCED)
4. ❌ MintPaidButton: Receives already-prefixed image, doesn't sanitize
5. ❌ Result: Double prefix -> "data:image/webp;base64,data:image/png;base64,XXX"
```

### Why It Only Happens in Recovery Flow

- **Normal Flow (MintButton):** Uses image directly from generation API → Clean base64 → Works
- **Recovery Flow (MintPaidButton):** Fetches from Supabase → page.tsx adds prefix → Double prefix bug

---

## Implementation Plan (3-Part Fix)

### Part 1: Fix Primary Bug Source (app/page.tsx)

**File:** `app/page.tsx`
**Lines:** 155-157

**Current Code:**
```typescript
const dataUri = savedImage.startsWith("data:")
  ? savedImage
  : `data:image/png;base64,${savedImage}`;
```

**Fix Strategy:**
- Create sanitization utility function `sanitizeImageData()`
- Always clean and normalize image data from Supabase
- Ensure single, consistent prefix format
- Add validation to prevent double-prefix

**Expected Outcome:**
- Image from Supabase is properly formatted
- No double-prefix possibility
- Consistent format: `data:image/webp;base64,{clean_base64}`

---

### Part 2: Bulletproof MintPaidButton Recovery

**File:** `components/MintPaidButton.tsx`
**Lines:** 127, 217

**Current Issue:**
- Trusts incoming `generatedImage` prop without sanitization
- No defense against malformed image data

**Fix Strategy:**
Implement robust image sanitization before minting:

1. **Strip existing prefixes** (handle both single and double-prefix cases)
2. **Extract clean base64** (remove whitespace, quotes, escape sequences)
3. **Validate base64 format** (ensure valid characters only)
4. **Apply single correct prefix:** `data:image/webp;base64,{clean_base64}`
5. **Add logging** for debugging (image length, preview of first 50 chars)

**Implementation:**
```typescript
// New utility function
function sanitizeImageForMint(imageData: string): string {
  // 1. Strip all prefixes (handle double-prefix case)
  let cleanBase64 = imageData;

  // Remove all data URI prefixes
  while (cleanBase64.includes('data:image/')) {
    cleanBase64 = cleanBase64.split(',').pop() || '';
  }

  // 2. Clean whitespace and quotes
  cleanBase64 = cleanBase64.trim().replace(/['"]/g, '');

  // 3. Validate base64
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
    throw new Error('Invalid base64 format after sanitization');
  }

  // 4. Apply single correct prefix
  return `data:image/webp;base64,${cleanBase64}`;
}

// Use in MintPaidButton before minting
const sanitizedImage = sanitizeImageForMint(generatedImage);
```

**Expected Outcome:**
- All retry mints use clean, validated images
- No double-prefix corruption possible
- Production-safe recovery flow

---

### Part 3: Update validateImageSize Function

**File:** `lib/generators.ts`
**Function:** `validateImageSize` (lines 98-125)

**Current Implementation:**
```typescript
const base64Data = imageData.includes(',')
  ? imageData.split(',')[1]
  : imageData;
```

**Issue:**
- Handles single prefix correctly
- Does NOT handle double-prefix: `data:image/webp;base64,data:image/png;base64,XXX`
- Would extract wrong portion in double-prefix case

**Fix Strategy:**
- Auto-clean all prefixes before size calculation
- Use same sanitization logic as Part 2
- Ensure consistent base64 extraction

**Implementation:**
```typescript
export function validateImageSize(imageData: string): {
  isValid: boolean;
  size: number;
  maxSize: number
} {
  const MAX_SIZE = 24000; // 24KB limit

  // Extract clean base64 (handle multiple prefixes)
  let cleanBase64 = imageData;
  while (cleanBase64.includes('data:image/')) {
    cleanBase64 = cleanBase64.split(',').pop() || '';
  }
  cleanBase64 = cleanBase64.trim();

  const size = cleanBase64.length;

  return {
    isValid: size <= MAX_SIZE,
    size,
    maxSize: MAX_SIZE
  };
}
```

**Expected Outcome:**
- Accurate size validation regardless of prefix format
- Prevents size miscalculations
- Consistent with contract validation

---

## Implementation Steps

### Step 1: Create Utility Function (lib/generators.ts)
1. Add `sanitizeImageData()` utility function
2. Update `validateImageSize()` to use sanitization
3. Export for reuse in components

### Step 2: Fix app/page.tsx
1. Import `sanitizeImageData()` utility
2. Replace lines 155-157 with sanitization call
3. Test recovery flow loads clean images

### Step 3: Update MintPaidButton.tsx
1. Import `sanitizeImageData()` utility
2. Sanitize image before `validateImageSize()` call (line 127)
3. Sanitize image before `mintNFT()` call (line 217)
4. Add console.log for debugging (image length + preview)

### Step 4: Testing
1. Test normal mint flow (should still work)
2. Test recovery mint flow with Supabase image
3. Verify no double-prefix in minted NFTs
4. Check OpenSea/marketplace rendering
5. Validate contract storage (SSTORE2 pointer)

---

## Expected Final Image Format

All code paths must enforce:

```
data:image/webp;base64,{RAW_BASE64_BYTES}
```

**Rules:**
- One prefix only
- No leading/trailing quotes
- No nested prefixes
- No whitespace or escape characters
- Valid base64 characters only: `[A-Za-z0-9+/=]`

---

## Success Criteria

After implementation:

✅ All retry mints produce valid, renderable images
✅ OpenSea displays images reliably
✅ Alchemy/wallets display images correctly
✅ No double-prefix corruption in any flow
✅ Supabase data remains canonical (raw base64)
✅ Recovery system is production-safe
✅ Image size validation is accurate

---

## Optional Future Enhancements

1. **Supabase Cleanup Script**
   - Scan existing unminted_geoplets table
   - Sanitize any malformed image_data entries
   - Ensure all stored images are raw base64

2. **Pre-Mint Metadata Validator**
   - Test tokenURI construction before minting
   - Validate image field is readable
   - Catch corruption before blockchain write

3. **Post-Mint QA Worker**
   - Verify SSTORE2 image storage after mint
   - Check image renders in test environment
   - Alert on any corruption detected

---

## Risk Assessment

**Low Risk Changes:**
- Utility function creation (new code, no breaking changes)
- validateImageSize update (defensive enhancement)

**Medium Risk Changes:**
- app/page.tsx prefix logic (affects recovery flow)
- MintPaidButton sanitization (critical path change)

**Mitigation:**
- Test thoroughly on testnet first
- Keep backups of current working code
- Monitor first few recovery mints closely
- Have rollback plan ready

---

## Timeline Estimate

- **Part 1 (Utility + validateImageSize):** 30 minutes
- **Part 2 (app/page.tsx fix):** 15 minutes
- **Part 3 (MintPaidButton update):** 30 minutes
- **Testing:** 1-2 hours
- **Total:** ~2.5-3 hours

---

**End of RECOVERY_MINT_PLAN.md**
