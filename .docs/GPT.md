Perfect — here’s a **production-ready proxy route** that automatically converts any image (including WebP, SVG, GIF, etc.) into a safe **PNG**, compatible with `@vercel/og` and Edge OG generation.

---

## 🧱 File: `/app/api/image-proxy/route.ts`

> 🧩 This version uses **`sharp`** for image conversion.
> It must run in a **Node.js runtime** (not Edge), because `sharp` relies on native libs.

```ts
// app/api/image-proxy/route.ts
import sharp from "sharp";

export const runtime = "nodejs"; // ✅ must be Node, not Edge

/**
 * Universal Image Proxy + Converter
 * Converts all formats (WebP, SVG, etc.) into PNG
 * Ensures compatibility with @vercel/og renderer
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");
    if (!imageUrl) {
      return new Response("Missing image URL", { status: 400 });
    }

    // 1️⃣ Fetch the external image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return new Response("Failed to fetch image", { status: 502 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2️⃣ Convert to PNG (Sharp handles WebP, SVG, JPEG, etc.)
    const pngBuffer = await sharp(buffer)
      .resize(800, 800, { fit: "inside" }) // optional: limit size for OGs
      .png()
      .toBuffer();

    // 3️⃣ Return clean PNG response
    return new Response(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400", // 1 day cache
      },
    });
  } catch (error) {
    console.error("[Image Proxy] Error:", error);
    return new Response("Failed to process image", { status: 500 });
  }
}
```

---

## ⚙️ Usage in Your OG Route

Update your image rendering to use the proxy URL:

```tsx
const geopletImageUrl = await getGeopletImageUrl(fid);

const proxiedImage = `${process.env.NEXT_PUBLIC_BASE_URL}/api/image-proxy?url=${encodeURIComponent(
  geopletImageUrl
)}`;

return new ImageResponse(
  (
    <div style={{ display: "flex", backgroundColor: "#f3daa1", padding: "40px" }}>
      <img
        src={proxiedImage}
        alt="Geoplet"
        width="500"
        height="500"
        style={{ borderRadius: "20px", objectFit: "contain" }}
      />
      <div style={{ paddingLeft: "40px" }}>
        <div style={{ fontSize: "80px", fontWeight: "bold" }}>GEOPLET</div>
        <div style={{ fontSize: "24px", fontStyle: "italic" }}>geofying...</div>
      </div>
    </div>
  ),
  { width: 1200, height: 630 }
);
```

---

## 🧩 Why This Works

✅ Converts any NFT image (WebP, GIF, SVG, etc.) to PNG
✅ Guarantees `Content-Type: image/png` for the OG renderer
✅ Avoids `u2 is not iterable` and other decoding errors
✅ Caches results automatically (24 h, tunable)
✅ Handles both Alchemy + Seadn + IPFS sources

---

## 🧠 Optional Improvements

* **Add caching in Vercel Edge Config or Supabase** to prevent repeated conversions.
* **Add timeout** to avoid long fetches:

  ```ts
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(imageUrl, { signal: controller.signal });
  clearTimeout(timeout);
  ```
* **Add watermark or frame** (GeoArt branding) directly in `sharp()` pipeline later on.

---

Would you like me to extend this version to **auto-detect `.webp` or `.svg` only** (so it skips conversion for safe PNG/JPEG and only processes problematic ones)? That can make your Edge route even faster.
