    app\api\og\[fid]\route.tsx

    ## Issue (FIXED)

    ### on farcaster
    1. shareText appear
    2. shard embeded card appeared
    3. But showing no Geoplet (BLANK IMAGE)

    ### on twitter / x
    1. shareText appear
    2. showing https://geoplet.geoart.studio/share/2240
    3. no og image (BLANK IMAGE)
    4. instead showing https://geoplet.geoart.studio/share/2240 , only show link https://geoplet.geoart.studio

    ## Root Cause
    - Alchemy returns NFT image as DATA URI (inline base64), not external URL
    - Code was trying to proxy a data URI through same-origin proxy
    - @vercel/og ImageResponse CANNOT load same-origin URLs during rendering
    - Error: "Can't load image... Unsupported image type: unknown"

    ## Solution (Following @vercel/og Official Best Practices)
    Refactored `app/api/og/[fid]/route.tsx` to use Buffer approach:
    1. Detect data URI format: `imageUrl.startsWith("data:")`
    2. Extract base64 from data URI: `imageUrl.split(",")[1]`
    3. Decode to Buffer: `Buffer.from(base64Data, "base64")`
    4. Convert to PNG using Sharp (ensures compatibility)
    5. Convert Buffer to base64 data URI: `data:image/png;base64,${buffer.toString("base64")}`
    6. Pass data URI to ImageResponse `<img src>` tag (NO network I/O, NO proxy URL)

    ## Result
    - ✅ OG endpoint returns 200 OK with image/png
    - ✅ Data URI detection working: "Image is data URI, decoding base64..."
    - ✅ Buffer conversion successful: PNG ~55KB
    - ✅ OG image generation successful: 1200x630 PNG (156KB)
    - ✅ Follows KISS principle and official @vercel/og documentation
    - ✅ Image preview now displays correctly in share cards