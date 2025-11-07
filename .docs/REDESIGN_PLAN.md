# Geoplet Layout Redesign + Unminted Storage Implementation Plan

## Overview
This plan covers the complete redesign of the Geoplet layout (removing header, reorganizing UI) and implementing persistent storage for unminted generated Geoplets using Supabase.

---

## Database Schema

### Table: `unminted_geoplet`
```sql
- id (Primary Key, UUID)
- fid (BigInt) - Farcaster ID
- image_data (TEXT) - Base64 image string (exact data for minting)
- created_at (Timestamp)
```

**Note:** No separate storage bucket needed. Base64 stored directly in database to ensure exact same data is used for minting (no conversion issues).

**Size Estimate:** ~500KB per row
**Free Tier Capacity:** 500MB = ~1000 unminted generations

---

## Implementation Phases

### Phase 1: Supabase Setup (Infrastructure)
1. ~~Create Supabase project & get credentials~~ ✅ Already done
2. Create table `unminted_geoplet` with fields: id, fid, image_data (TEXT), created_at
   - Use Supabase dashboard SQL editor or migration
3. ~~Add environment variables~~ ✅ Already configured in .env.local:
   - `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

### Phase 2: Storage Integration (Backend)
4. Install Supabase client: `npm install @supabase/supabase-js`
5. Create utility: `lib/supabase.ts` (Supabase client config)
6. Create API route: `app/api/save-generation/route.ts`
   - **Security validations:**
     - Validate image size (<24KB for contract compliance)
     - Validate base64 format (must start with "data:image/webp;base64,")
     - Verify FID ownership before save
     - Rate limit: 10 requests/min per FID
   - Save base64 string directly to database `image_data` column
   - Handle duplicate FID (UPSERT: INSERT or UPDATE existing row)
7. Create API route: `app/api/get-generation/route.ts`
   - Retrieve unminted generation by FID
   - Return base64 string from `image_data` column
   - Verify FID ownership before load
8. Create API route: `app/api/delete-generation/route.ts`
   - Cleanup after successful mint
   - Delete row from database by FID
   - Verify FID ownership before delete

---

### Phase 3: Layout Redesign - Remove Header
9. Delete `components/Header.tsx`
10. Update `app/layout.tsx` - remove Header component import/usage
11. Adjust main layout padding (remove header spacing)

---

### Phase 4: New Top Section (Logo + Icons)
12. Create `components/TopSection.tsx`:
    - Centered "GEOPLET" logo (SchoolBell font)
    - Left side: Wallet icon button
    - Right side: Share icons (Farcaster + X)
    - Responsive design
13. Add TopSection to `app/page.tsx` above HeroSection

---

### Phase 5: Wallet Modal
14. Create `components/WalletModal.tsx`:
    - shadcn Dialog component
    - Display wallet address with copy button
    - Show USDC balance
    - Display FID info (if available)
    - Disconnect button
    - Match design system (similar to SuccessModal)
15. Wire wallet icon button in TopSection to open modal

---

### Phase 6: Update HeroSection
16. Modify `components/HeroSection.tsx`:
    - Remove share buttons (moved to TopSection)
    - Remove stats section (moved to TopSection or removed)
    - Keep narrative/description text only
    - Make display area larger and more prominent
    - Add loading state for auto-generation

---

### Phase 7: Auto-Generation Feature
17. Update `app/page.tsx`:
    - Add useEffect hook to trigger generation after:
      - Wallet connection AND
      - Warplet data loads
    - Flow: Show Warplet first → Auto-generate → Display Geoplet
    - Save generated base64 to Supabase via save-generation API
    - On page load, check for existing unminted generation by FID via get-generation API
    - If found, restore base64 and display it
    - Handle loading/error states gracefully
    - **Contract ABI verification:**
      - Verify stored base64 matches exact format expected by contract
      - Reference: `GeopletABI.ts` - `mintGeoplet(voucher, base64ImageData, signature)`
      - Ensure no modifications to base64 during storage/retrieval

---

### Phase 8: Split Buttons
18. Create `components/RegenerateButton.tsx`:
    - Display: "REGENERATE ($3)"
    - State: Disabled until first auto-generation completes
    - Integrate x402 payment for $3
    - On payment success:
      - Call generation API (OpenAI)
      - Save new base64 to Supabase via save-generation API (UPSERT replaces previous)
      - Update UI with new image
    - Handle loading/error states

19. Create `components/MintButton.tsx`:
    - Display: "MINT ($2)"
    - State: Enabled when generated image exists
    - Integrate x402 payment for $2
    - On payment success:
      - Fetch base64 from state (already loaded from Supabase)
      - Execute mint transaction with exact base64
      - Delete from Supabase via delete-generation API (cleanup)
      - Show success modal
    - Handle loading/error states

20. Update `app/page.tsx`:
    - Replace `GenerateMintButton` with split buttons
    - Place buttons side-by-side below display area
    - Maintain proper spacing

---

### Phase 9: Integration & Cleanup
21. Update generation flow to save/load from Supabase:
    - After generation → Save base64 to DB via save-generation API
    - On page load → Check DB for FID → Load base64 if exists
    - After mint → Delete from DB via delete-generation API
22. Test complete flow:
    - Auto-generation → Save base64 to Supabase
    - Regenerate → UPSERT new base64 in Supabase
    - Mint → Use exact base64 → Delete from Supabase
    - Verify base64 integrity (before/after storage matches exactly)
23. Update bottom nav padding if needed (adjust for removed header)
24. Verify responsive behavior on mobile devices
25. Add proper error handling and user feedback (toasts)

---

## Technical Implementation Notes

### Image Storage Flow (Base64 in Database)
```
1. Generate base64 image from OpenAI API
2. Save base64 string directly to Supabase database (image_data column)
3. On display: Use base64 string as <img src={base64} />
4. On mint: Use exact same base64 string from database
```

**Why Base64 in Database vs File Storage:**
- ✅ Exact same data for minting (no conversion/re-encoding)
- ✅ Simpler implementation (no file upload/download)
- ✅ Faster retrieval (single DB query vs file fetch)
- ✅ Guaranteed data integrity
- ⚠️ Larger DB size (~500KB per row vs URL reference)
- ✅ Acceptable for MVP (~1000 unminted generations on free tier)

### Data Flow
```
AUTO-GENERATION:
User connects wallet → Load Warplet data → Show Warplet
→ Auto-generate (OpenAI) → base64 → Save to Supabase DB → Display Geoplet

REGENERATE:
User clicks Regenerate → Pay $3 (x402) → Generate new image (OpenAI)
→ base64 → UPSERT to Supabase DB (replace FID row) → Display new Geoplet

MINT:
User clicks Mint → Pay $2 (x402) → Get signature → Fetch base64 from state
→ mintGeoplet(voucher, base64, signature) → Delete from Supabase → Success modal

PAGE LOAD:
User returns → Check Supabase DB for FID → If exists, fetch base64 → Display
```

**Critical:** Base64 string must remain UNCHANGED from generation to minting. No re-encoding, no compression, no format conversion.

### Reusable Logic
- Reuse x402 payment integration from existing `GenerateMintButton.tsx`
- Leverage existing hooks: `useWarplets()`, `useGeoplet()`, `useUSDCBalance()`
- Maintain existing EIP-712 signature flow for minting
- Keep toast notification patterns minimal

### Error Handling
- Network failures during upload
- Supabase storage quota exceeded
- Generation API failures
- Payment verification failures
- Cleanup failures after mint

### Accessibility
- Maintain ARIA labels on all interactive elements
- Keyboard navigation for modal
- Screen reader support
- Focus management in wallet modal

---

## Design Decisions

### Why Supabase Database over localStorage?
- Persistent across devices and browser clears
- Accessible from any device user logs in from
- Centralized (enables future features like gallery)
- Professional architecture
- Guaranteed data integrity for minting
- Free tier supports ~1000 unminted generations (sufficient for MVP)

### Why Split Buttons?
- Clear user decision points
- Aligns with KISS principle
- Better control over regeneration
- Separate payment flows are clearer

### Why Auto-Generation?
- Demonstrates product value immediately
- Reduces friction
- Engages users faster
- Shows what they'll get before payment

---

## Cost Analysis

### Supabase Free Tier
- Database: 500MB = ~1000 unminted generations (at 500KB per base64 row)
- Bandwidth: 5GB/month (sufficient for MVP)
- API calls: Unlimited
- No separate storage bucket needed

### When to Upgrade
- Database: After ~900 unminted generations (90% of 500MB capacity)
- At scale: Can implement cleanup (auto-delete generations >30 days old)
- Cost: $25/month for Pro tier (8GB database, 100GB bandwidth)

---

## Success Metrics

### MVP Launch (Week 1-2)
- [ ] Supabase infrastructure set up
- [ ] Image storage working
- [ ] Layout redesigned (header removed, new top section)
- [ ] Wallet modal functional
- [ ] Auto-generation working
- [ ] Split buttons functional
- [ ] End-to-end flow tested

### Post-Launch (Month 1)
- Track: Generation → Mint conversion rate
- Track: Average regenerations per user
- Track: Storage usage
- Monitor: Error rates
- Gather: User feedback on new layout

---

## Rollback Plan

If issues arise:
1. Keep old `GenerateMintButton.tsx` in codebase (commented out)
2. Can quickly revert to old layout by restoring Header
3. Supabase is additive - doesn't break existing flow
4. Can disable auto-generation with feature flag

---

## Future Enhancements (Post-MVP)

### Phase 10 (Optional - Future)
- Add `wallet_address` field to support multiple wallets per FID
- Add `regeneration_count` tracking
- Build public gallery page
- Add social features (likes, views)
- Implement analytics dashboard

---

## Timeline Estimate

- **Phase 1 (Supabase Setup):** 30 minutes
- **Phase 2 (Storage Integration):** 2-3 hours
- **Phase 3-4 (Layout Redesign):** 1-2 hours
- **Phase 5 (Wallet Modal):** 1 hour
- **Phase 6 (HeroSection Update):** 30 minutes
- **Phase 7 (Auto-Generation):** 2 hours
- **Phase 8 (Split Buttons):** 3-4 hours
- **Phase 9 (Testing & Polish):** 2-3 hours

**Total: 12-16 hours of development time**

---

## Dependencies

### NPM Packages to Install
```bash
npm install @supabase/supabase-js
```

### Environment Variables Needed
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc... # For server-side operations
```

### External Services
- Supabase account (free tier)
- Existing: OpenAI API (already configured)
- Existing: Onchain.fi x402 protocol (already configured)

---

## Notes

- This redesign maintains all existing functionality while improving UX
- Follows KISS principle - minimal complexity, maximum value
- Storage infrastructure enables future features (gallery, analytics)
- No breaking changes to contract or blockchain logic
- Backward compatible - existing users unaffected
