import sharp from "sharp";
import { NextRequest } from "next/server";

// Node.js runtime (required for Sharp)
export const dynamic = "force-dynamic";

/**
 * Universal Image Proxy + Converter
 * Converts all formats (WebP, SVG, GIF, etc.) into PNG
 * Ensures compatibility with @vercel/og renderer
 *
 * Based on Farcaster miniapp-img pattern and GPT.md recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return new Response("Missing image URL parameter", { status: 400 });
    }

    // Security: Validate image source is from trusted CDNs
    const allowedDomains = [
      "nft-cdn.alchemy.com",
      "res.cloudinary.com",
      "ipfs.raribleuserdata.com",
      "api.rarible.org",
      "imagedelivery.net",
      "ipfs.io",
      "gateway.pinata.cloud",
    ];

    const imageUrlObj = new URL(imageUrl);
    const isAllowed = allowedDomains.some((domain) =>
      imageUrlObj.hostname.includes(domain)
    );

    if (!isAllowed) {
      console.error("[Image Proxy] Invalid image source:", imageUrlObj.hostname);
      return new Response("Invalid image source", { status: 403 });
    }

    console.log("[Image Proxy] Fetching image from:", imageUrl);

    // Fetch the external image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Geoplet-Image-Proxy/1.0",
      },
    });

    if (!imageResponse.ok) {
      console.error("[Image Proxy] Failed to fetch:", imageResponse.status);
      return new Response("Failed to fetch image", { status: 502 });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(
      "[Image Proxy] Original format:",
      imageResponse.headers.get("content-type"),
      "Size:",
      buffer.length,
      "bytes"
    );

    // Convert to PNG using Sharp
    // Resize to reasonable size for OG images (max 800x800)
    const pngBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 90 })
      .toBuffer();

    console.log("[Image Proxy] Converted to PNG. Size:", pngBuffer.length, "bytes");

    // Return PNG with immutable cache headers (NFT images never change)
    return new Response(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        // Immutable cache for NFT images (following Farcaster pattern)
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[Image Proxy] Error:", error);
    return new Response("Failed to process image", {
      status: 500,
      headers: {
        "Cache-Control": "no-store", // Don't cache errors
      },
    });
  }
}
