import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { readFileSync } from "fs";
import path from "path";

// Use Node.js runtime for file system access
export const dynamic = "force-dynamic";

// Load custom fonts
const spriteGraffitiFontData = readFileSync(
  path.join(process.cwd(), "public/font/SpriteGraffiti-Shadow.otf")
);
const schoolbellFontData = readFileSync(
  path.join(process.cwd(), "public/font/Schoolbell-Regular.ttf")
);

/**
 * Fetch unminted Geoplet image from Supabase
 */
async function getUnmintedGeopletImageBuffer(
  fid: string
): Promise<Buffer | null> {
  try {
    console.log("[OG-Unminted] Fetching unminted Geoplet for FID:", fid);

    // Fetch from unminted_geoplets table
    const { data, error } = await supabaseAdmin
      .from("unminted_geoplets")
      .select("image_data")
      .eq("fid", fid)
      .single();

    if (error || !data) {
      console.error("[OG-Unminted] Error fetching data:", error);
      return null;
    }

    if (!data.image_data) {
      console.log("[OG-Unminted] No image_data found for FID:", fid);
      return null;
    }

    // Clean base64 data (remove any data URI prefix if present)
    let cleanBase64 = data.image_data;

    // Strip data URI prefix if present
    if (cleanBase64.includes("data:image/")) {
      const parts = cleanBase64.split(",");
      cleanBase64 = parts[parts.length - 1];
    }

    // Clean whitespace and quotes
    cleanBase64 = cleanBase64.trim().replace(/['"\\]/g, "");

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      console.error("[OG-Unminted] Invalid base64 format");
      return null;
    }

    console.log("[OG-Unminted] Base64 data length:", cleanBase64.length);

    // Convert to buffer
    const imageBuffer = Buffer.from(cleanBase64, "base64");

    console.log(
      "[OG-Unminted] Image buffer size:",
      imageBuffer.length,
      "bytes"
    );

    // Security: Validate image size
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      console.warn(
        "[OG-Unminted] Image too large:",
        imageBuffer.length,
        "bytes"
      );
      return null;
    }

    // Convert to PNG using Sharp
    const sharp = (await import("sharp")).default;

    const metadata = await sharp(imageBuffer).metadata();
    const MAX_DIMENSION = 4096;

    if (metadata.width && metadata.width > MAX_DIMENSION) {
      console.warn(
        "[OG-Unminted] Image width too large:",
        metadata.width,
        "px"
      );
      return null;
    }

    if (metadata.height && metadata.height > MAX_DIMENSION) {
      console.warn(
        "[OG-Unminted] Image height too large:",
        metadata.height,
        "px"
      );
      return null;
    }

    const pngBuffer = await sharp(imageBuffer)
      .resize(500, 500, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 90 })
      .toBuffer();

    console.log(
      "[OG-Unminted] Converted to PNG. Size:",
      pngBuffer.length,
      "bytes"
    );

    return pngBuffer;
  } catch (error) {
    console.error("[OG-Unminted] Failed to process image:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Fetch and convert unminted Geoplet image
    const geopletImageBuffer = await getUnmintedGeopletImageBuffer(fid);

    if (!geopletImageBuffer) {
      console.log("[OG-Unminted] Geoplet not found, serving fallback");

      // Fallback to static image
      const fallbackPath = path.join(
        process.cwd(),
        "public/embed-1200x800.webp"
      );
      const fallbackBuffer = readFileSync(fallbackPath);

      return new Response(fallbackBuffer, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Convert Buffer to base64 data URI
    const geopletImageDataURI = `data:image/png;base64,${geopletImageBuffer.toString(
      "base64"
    )}`;

    console.log("[OG-Unminted] Generating OG image for FID:", fid);

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
          {/* Left: Geoplet Image */}
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
              alt="Generated Geoplet"
              width="400"
              height="400"
              style={{
                borderRadius: "24px",
                objectFit: "contain",
                border: "12px solid white",
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
            {/* Logo */}
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

            {/* Tagline */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "48px",
                color: "#451a03",
                marginBottom: "10px",
                fontStyle: "italic",
              }}
            >
              your Geoplet is patiently waiting… 😊
            </div>

            {/* Description */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "22px",
                color: "#451a03",
                lineHeight: "1.4",
                marginBottom: "30px",
              }}
            >
              When Geometric Art meets Warplet — ready to become a GeoTizen
              whenever you are. No rush, just vibes ✨
            </div>

            {/* Credit */}
            <div
              style={{
                fontFamily: "Schoolbell",
                fontSize: "16px",
                color: "#451a03",
                opacity: 0.7,
                textAlign: "right",
              }}
            >
              built by 0xd @ Geoart Studio
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
    console.error("[OG-Unminted] Error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
