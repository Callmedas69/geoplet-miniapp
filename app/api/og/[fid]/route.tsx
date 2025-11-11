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

// Get Geoplet image URL via proxy (KISS: use URL instead of base64)
async function getGeopletImageProxyURL(fid: string): Promise<string | null> {
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

    if (!imageUrl) {
      console.log("[OG] No image found in Alchemy metadata");
      return null;
    }

    console.log("[OG] Found Geoplet image:", imageUrl);

    // Use image proxy to convert to PNG (avoids base64 overhead)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoplet.geoart.studio";
    const proxyUrl = `${appUrl}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

    console.log("[OG] Using proxy URL:", proxyUrl);

    return proxyUrl;
  } catch (error) {
    console.error("[OG] Failed to get Geoplet image URL:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Get Geoplet image URL via proxy (KISS: use URL instead of base64)
    const geopletImageURL = await getGeopletImageProxyURL(fid);

    if (!geopletImageURL) {
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
          {/* Left: Geoplet Image - Via proxy URL (no base64) */}
          <div
            style={{
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={geopletImageURL}
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
