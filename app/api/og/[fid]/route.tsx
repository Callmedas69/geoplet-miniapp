import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { GEOPLET_CONFIG } from "@/lib/contracts";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Fetch Farcaster username from FID
async function getFarcasterUsername(fid: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          api_key: process.env.NEYNAR_API_KEY || "",
        },
      }
    );
    const data = await response.json();
    return data.users?.[0]?.username || `fid:${fid}`;
  } catch (error) {
    console.error("Failed to fetch username:", error);
    return `fid:${fid}`;
  }
}

// Fetch minted Geoplet image from Alchemy
async function getGeopletImage(fid: string): Promise<string | null> {
  try {
    const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/getNFTMetadata`;
    const params = new URLSearchParams({
      contractAddress: GEOPLET_CONFIG.address,
      tokenId: fid,
      refreshCache: "false",
    });

    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();

    return data.image?.cachedUrl || data.image?.originalUrl || null;
  } catch (error) {
    console.error("Failed to fetch Geoplet image:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Fetch data in parallel
    const [username, geopletImage] = await Promise.all([
      getFarcasterUsername(fid),
      getGeopletImage(fid),
    ]);

    // If no minted Geoplet found, return 404
    if (!geopletImage) {
      return new Response("Geoplet not found", { status: 404 });
    }

    // Load custom fonts
    const spriteGraffitiFont = fetch(
      new URL("../../../../public/font/SpriteGraffiti-Shadow.otf", import.meta.url)
    ).then((res) => res.arrayBuffer());

    const schoolbellFont = fetch(
      new URL("../../../../public/font/Schoolbell-Regular.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer());

    const [spriteGraffitiFontData, schoolbellFontData] = await Promise.all([
      spriteGraffitiFont,
      schoolbellFont,
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "row",
            backgroundColor: "#f3daa1",
            padding: "40px",
          }}
        >
          {/* Left: Geoplet Image */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={geopletImage}
              alt="Geoplet"
              width={500}
              height={500}
              style={{
                borderRadius: "20px",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Right: Text Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: "40px",
            }}
          >
            {/* Logo */}
            <div
              style={{
                fontFamily: "SpriteGraffiti",
                fontSize: "80px",
                color: "#000",
                marginBottom: "20px",
                display: "flex",
              }}
            >
              GEOPLET
            </div>

            {/* Tagline */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "24px",
                color: "#000",
                marginBottom: "10px",
                fontStyle: "italic",
                display: "flex",
              }}
            >
              geofying...
            </div>

            {/* Description */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "18px",
                color: "#000",
                marginBottom: "40px",
                lineHeight: 1.4,
                display: "flex",
              }}
            >
              When geometric art meets Warplet — A fusion of form and frequency.
            </div>

            {/* Minted By */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "20px",
                color: "#333",
                display: "flex",
              }}
            >
              Minted by @{username}
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
            style: "normal",
          },
          {
            name: "Schoolbell",
            data: schoolbellFontData,
            style: "normal",
          },
        ],
      }
    );
  } catch (error) {
    console.error("[OG Image] Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
