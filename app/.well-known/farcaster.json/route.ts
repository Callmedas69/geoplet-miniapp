import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const appName = process.env.NEXT_PUBLIC_APP_NAME as string;
  const ownerAddress = process.env.NEXT_PUBLIC_BASE_OWNER_ADDRESS as string;

  const manifest = {
    "accountAssociation": {
      "header": "eyJmaWQiOjIyNDIwLCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4ZGM0MWQ2REE2QmIyRDAyYjE5MzE2QjJiZkZGMENCYjQyNjA2NDg0ZCJ9",
      "payload": "eyJkb21haW4iOiJiMjNmNmI2MDRhMzgubmdyb2stZnJlZS5hcHAifQ",
      "signature": "7H6ioMCKjjc7g55X4nGqfvJjDsGPocm71Jr5VZMgKpofv8U5nZSh2KkH27pULsuOdnI3KmMBWjVqZgfKH+IBBxw="
    },
    baseBuilder: {
      ownerAddress: ownerAddress
    },
    miniapp: {
      version: "1",
      name: appName,
      homeUrl: appUrl,
      iconUrl: `${appUrl}/icon.png`,
      splashImageUrl: `${appUrl}/splash.webp`,
      splashBackgroundColor: "#f3daa1",
      webhookUrl: `${appUrl}/api/webhook`,
      subtitle: "GeoFy your Warplets",
      description: "Geoplet: when geometric art meets Warplets",
      screenshotUrls: [
        `${appUrl}/og-image.png`
      ],
      primaryCategory: "social",
      tags: ["nft", "art", "geoplets", "base", "erc721"],
      heroImageUrl: `${appUrl}/og-image.png`,
      tagline: "GeoFy your Warplets",
      ogTitle: "Geoplet - Geometric Warplets",
      ogDescription: "Geoplet: when geometric art meets Warplets",
      ogImageUrl: `${appUrl}/og-image.png`,
      noindex: true
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
