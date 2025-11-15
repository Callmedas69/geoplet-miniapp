# RECOVERY_MINT_FIX.md

## Overview

This document summarizes the issue encountered during the Geoplet mint recovery flow, the diagnosis across multiple debugging steps, and the recommended robust fixes. The goal is to prevent image corruption during retry‑mint scenarios, especially when images are retrieved from Supabase after a failed initial mint attempt.

---

## 1. The Issue

During retry minting using `MintPaidButton`, some NFTs were successfully minted on-chain but displayed **no image** on marketplaces like OpenSea.

Symptoms:

* Thumbnail preview loads (OpenSea fallback preview works)
* Main NFT image shows “Content not available yet”
* TokenURI JSON exists normally
* Image field is present but unreadable

---

## 2. Findings

### **Root Cause Identified: Double DataURI Prefix**

The `image` field inside `tokenURI` contained a broken value:

```
"image": "data:image/webp;base64,data:image/png;base64,<ACTUAL_BYTES>"
```

This happens when:

1. Supabase stores the full Data URI (e.g. `data:image/png;base64,AAAA…`)
2. `MintPaidButton` prepends another prefix (`data:image/webp;base64,`)
3. Result becomes **double-prefixed**, breaking Base64 decoding

Marketplaces cannot decode this → image fails to render.

---

## 3. Why It Only Happens in MintPaidButton

* The normal `<MintButton>` uses image data directly from React state → always clean
* The retry `<MintPaidButton>` fetches image from Supabase
* Supabase stored value may include prefix, whitespace, or escaped JSON quotes
* Recovery flow blindly prepended a new prefix
* Contract receives corrupted Base64 → invalid SSTORE2 pointer image

---

## 4. Recommended Robust Fix (3 Parts)

### **1. Supabase Upload Logic**

Store only clean base64 bytes without any prefix.

* Remove `data:image/...;base64,` from all stored images
* Always normalize before saving
* Ensures recovered images are clean and consistent

### **2. Rewrite MintPaidButton Recovery Flow**

Implement a bulletproof image recovery system that:

* Fetches image from Supabase
* Strips any prefix if present
* Fixes double prefix cases
* Ensures final format is always:

  ```
  data:image/webp;base64,<CLEAN_BYTES>
  ```
* Logs image length + preview for debugging
* Prevents sending malformed strings to the contract

### **3. Update validateImageSize**

`validateImageSize()` must auto-clean prefixes before calculating size.

* Extract only raw base64
* Ensure consistent input format
* Avoid size miscalculations due to prefix text

---

## 5. Final Correct Image Formatting

All recovery paths must enforce:

```
data:image/webp;base64,<RAW_BASE64_BYTES>
```

Rules:

* One prefix only
* No leading/trailing quotes
* No nested prefixes
* No whitespace escapes

---

## 6. Expected Outcome

After applying these fixes:

* All retry mints will mint valid, renderable images
* OpenSea, Alchemy, and wallets display images reliably
* No corrupted Base64 during recovery
* Supabase always holds canonical data
* Recovery system becomes production-safe

---

## 7. Next Steps (Optional Enhancements)

* Add Supabase cleanup script to sanitize existing rows
* Add metadata validator to test tokenURI before minting
* Add post-mint QA worker to verify SSTORE2 image storage

---

**End of RECOVERY_MINT_FIX.md**
