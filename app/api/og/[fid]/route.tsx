import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { GEOPLET_CONFIG } from "@/lib/contracts";
import { readFileSync } from "fs";
import path from "path";

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

// Fetch Geoplet image, convert WebP to PNG, then base64 encode
async function getGeopletImageAsBase64PNG(fid: string): Promise<string | null> {
  try {
    const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/getNFTMetadata`;
    const params = new URLSearchParams({
      contractAddress: GEOPLET_CONFIG.address,
      tokenId: fid,
      refreshCache: "false",
    });

    const metadataResponse = await fetch(`${baseUrl}?${params}`);
    const metadata = await metadataResponse.json();

    const imageUrl = metadata.image?.cachedUrl || metadata.image?.originalUrl;

    if (!imageUrl) return null;

    console.log("[OG] Fetching Geoplet image from:", imageUrl);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("[OG] Failed to fetch image:", imageResponse.status);
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const originalType = imageResponse.headers.get("content-type") || "unknown";

    console.log(
      "[OG] Original image type:",
      originalType,
      "Size:",
      imageBuffer.byteLength,
      "bytes"
    );

    // Import sharp dynamically to convert WebP/any format to PNG
    const sharp = (await import("sharp")).default;

    // Convert to PNG using Sharp (ensures @vercel/og compatibility)
    const pngBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(500, 500, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 90 })
      .toBuffer();

    // Convert PNG to base64
    const base64 = pngBuffer.toString("base64");

    console.log(
      "[OG] Converted to PNG base64. Size:",
      pngBuffer.length,
      "bytes"
    );

    return `data:image/png;base64,${base64}`;
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

    // Fetch Geoplet image, convert to PNG, then base64 encode
    const geopletImageDataURL = await getGeopletImageAsBase64PNG(fid);

    if (!geopletImageDataURL) {
      return new Response("Geoplet not found", { status: 404 });
    }

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
          {/* Left: Geoplet Image - Proxied and converted to PNG */}
          <div
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={geopletImageDataURL}
              alt="Geoplet"
              width="350"
              height="350"
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
              paddingRight: "60px",
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
              Powered by $GEOPLET, integrated with onchain.fi (X402 Aggregator).
              Produced by GeoArt.Studio — where creativity lives fully on-chain.
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
          // Immutable cache for NFT images (following Farcaster miniapp-img pattern)
          "Cache-Control":
            "public, max-age=31536000, s-maxage=31536000, immutable",
        },
      }
    );
  } catch (error) {
    console.error("[OG Image] Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
