import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { GEOPLET_CONFIG } from "@/lib/contracts";
import { getNFTById, transformRaribleItem, GEOPLET_ADDRESS } from "@/lib/rarible";
import { readFileSync } from "fs";
import path from "path";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { GeopletsABI } from "@/abi/GeopletsABI";

// Use Node.js runtime (not Edge) to support Buffer, readFileSync, and image processing
// Following Farcaster miniapp-img official pattern
export const dynamic = "force-dynamic";

// Load custom fonts (Farcaster pattern from miniapp-img)
const spriteGraffitiFontData = readFileSync(
  path.join(process.cwd(), "public/font/SpriteGraffiti-Shadow.otf")
);
const schoolbellFontData = readFileSync(
  path.join(process.cwd(), "public/font/Schoolbell-Regular.ttf")
);

// Create viem public client for Base mainnet (contract fallback)
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Decode base64 tokenURI from contract to extract image
 * Browser-compatible (uses atob for server-side, Buffer for Node.js)
 */
function decodeTokenURI(tokenURIString: string): string | null {
  try {
    // Contract returns: "data:application/json;base64,eyJ..."
    if (!tokenURIString.includes("data:application/json;base64,")) {
      return null;
    }

    const base64String = tokenURIString.split("data:application/json;base64,")[1];
    if (!base64String) return null;

    // Decode base64 (Node.js Buffer for server-side)
    const jsonString = Buffer.from(base64String, 'base64').toString('utf-8');
    const metadata = JSON.parse(jsonString);

    return metadata.image || null;
  } catch (error) {
    console.error("[OG] Failed to decode tokenURI:", error);
    return null;
  }
}

// Fetch and convert Geoplet image to PNG Buffer (KISS: no proxy, direct processing)
async function getGeopletImageBuffer(fid: string): Promise<Buffer | null> {
  try {
    // 1. Fetch NFT metadata from Rarible API
    console.log("[OG] Fetching NFT metadata from Rarible for FID:", fid);
    const data = await getNFTById(GEOPLET_ADDRESS, fid);
    const nft = transformRaribleItem(data);

    let imageUrl = nft.image;

    // Contract fallback: If Rarible has no image, read from contract
    if (!imageUrl || imageUrl.trim() === '') {
      console.log("[OG] ⚠️ No image in Rarible metadata for FID:", fid, "- attempting contract fallback...");

      try {
        const tokenURI = await publicClient.readContract({
          address: GEOPLET_CONFIG.address as `0x${string}`,
          abi: GeopletsABI,
          functionName: 'tokenURI',
          args: [BigInt(fid)],
        }) as string;

        if (tokenURI) {
          const decodedImage = decodeTokenURI(tokenURI);
          if (decodedImage) {
            imageUrl = decodedImage;
            console.log("[OG] ✅ Token #" + fid + " fetched from contract:", imageUrl.substring(0, 50) + "...");
          }
        }
      } catch (contractError) {
        console.error("[OG] Failed to read tokenURI for FID:", fid, contractError);
      }

      // Final check after contract fallback attempt
      if (!imageUrl || imageUrl.trim() === '') {
        console.log("[OG] ❌ No image available from Rarible or contract for FID:", fid);
        return null;
      }
    } else {
      console.log("[OG] Found Geoplet image from Rarible:", imageUrl.substring(0, 100) + "...");
    }

    // 2. Handle data URI (inline base64) vs external URL
    let imageBuffer: Buffer;

    if (imageUrl.startsWith("data:")) {
      // Data URI - extract base64 and decode directly
      console.log("[OG] Image is data URI, decoding base64...");
      console.log("[OG] Original format:", imageUrl.substring(0, 100) + "...");

      // Strip ALL data URI prefixes (defensive against double-prefix bug)
      // Same logic as sanitizeImageData() from lib/generators.ts
      let cleanBase64 = imageUrl;
      while (cleanBase64.includes('data:image/')) {
        const parts = cleanBase64.split(',');
        parts.shift(); // Remove prefix part
        cleanBase64 = parts.join(',');
      }

      // Clean whitespace, quotes, and escape sequences
      cleanBase64 = cleanBase64.trim().replace(/['"\\]/g, '');

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        console.error("[OG] Invalid base64 format after sanitization:", cleanBase64.substring(0, 50) + "...");
        return null;
      }

      if (cleanBase64.length === 0) {
        console.error("[OG] No valid base64 data found after sanitization");
        return null;
      }

      console.log("[OG] Sanitized base64 length:", cleanBase64.length, "chars");
      imageBuffer = Buffer.from(cleanBase64, "base64");
    } else {
      // External URL - fetch it
      console.log("[OG] Image is external URL, fetching...");
      const imageResponse = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Geoplet-OG-Generator/1.0",
        },
      });

      if (!imageResponse.ok) {
        console.error("[OG] Failed to fetch image:", imageResponse.status);
        return null;
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    console.log("[OG] Image buffer size:", imageBuffer.length, "bytes");

    // Security: Validate image size before processing (prevent DoS)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      console.warn("[OG] Image too large:", imageBuffer.length, "bytes (max:", MAX_IMAGE_SIZE, ")");
      return null; // Fallback to static image
    }

    // 3. Convert to PNG using Sharp (ensures @vercel/og compatibility)
    const sharp = (await import("sharp")).default;

    // Get metadata to validate dimensions before processing
    const metadata = await sharp(imageBuffer).metadata();
    const MAX_DIMENSION = 4096; // Max width or height in pixels

    if (metadata.width && metadata.width > MAX_DIMENSION) {
      console.warn("[OG] Image width too large:", metadata.width, "px (max:", MAX_DIMENSION, ")");
      return null;
    }

    if (metadata.height && metadata.height > MAX_DIMENSION) {
      console.warn("[OG] Image height too large:", metadata.height, "px (max:", MAX_DIMENSION, ")");
      return null;
    }

    const pngBuffer = await sharp(imageBuffer)
      .resize(500, 500, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 90 })
      .toBuffer();

    console.log("[OG] Converted to PNG. Size:", pngBuffer.length, "bytes");

    return pngBuffer;
  } catch (error) {
    console.error("[OG] Failed to process Geoplet image:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Fetch and convert Geoplet image to PNG Buffer (official @vercel/og best practice)
    const geopletImageBuffer = await getGeopletImageBuffer(fid);

    if (!geopletImageBuffer) {
      console.log("[OG] Geoplet not found, serving static fallback image");

      // Fallback: Serve existing static embed image
      const fallbackPath = path.join(process.cwd(), 'public/embed-1200x800.webp');
      const fallbackBuffer = readFileSync(fallbackPath);

      return new Response(fallbackBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Convert Buffer to base64 data URI for ImageResponse <img> tag
    const geopletImageDataURI = `data:image/png;base64,${geopletImageBuffer.toString("base64")}`;

    console.log("[OG] Generating OG image for FID:", fid);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            backgroundColor: "#f3daa1",
            padding: "100px",
          }}
        >
          {/* Left: Geoplet Image - Base64 Data URI (converted from PNG Buffer) */}
          <div
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={geopletImageDataURI}
              alt="Geoplet"
              width="300"
              height="300"
              style={{
                borderRadius: "24px",
                objectFit: "contain",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
              }}
            />
          </div>

          {/* Right: Text Content */}
          <div
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingRight: "80px",
            }}
          >
            {/* Logo - Using SpriteGraffiti font */}
            <div
              style={{
                fontFamily: "SpriteGraffiti",
                fontSize: "120px",
                color: "#451a03",
                marginBottom: "2px",
                fontWeight: "bold",
              }}
            >
              GEOPLET
            </div>

            {/* Tagline - Using Schoolbell font */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "48px",
                color: "#451a03",
                marginBottom: "10px",
                fontStyle: "italic",
              }}
            >
              geofying...
            </div>

            {/* Description - Using Schoolbell font with full text */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "22px",
                color: "#451a03",
                lineHeight: "1.4",
              }}
            >
              When Geometric Art meets Warplet — a fusion of form and frequency.
              Powered by $GEOPLET, integrated with onchain.fi (x402 Aggregator).
              Produced by @GeoArt.Studio — where creativity lives fully
              on-chain.
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "SpriteGraffiti",
            data: spriteGraffitiFontData,
            weight: 400,
            style: "normal",
          },
          {
            name: "Schoolbell",
            data: schoolbellFontData,
            weight: 400,
            style: "normal",
          },
        ],
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[OG Image] Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
