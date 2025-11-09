import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const appName = process.env.NEXT_PUBLIC_APP_NAME as string;
  const ownerAddress = process.env.NEXT_PUBLIC_BASE_OWNER_ADDRESS as string;

  const manifest = {
    "accountAssociation": {
      "header": "eyJmaWQiOjIyNDIwLCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4NmU1RDE3NGQ3MjYxOUFFNDUxMzE2OThhZjMwREYxZDc3M0UwZENCMyJ9",
      "payload": "eyJkb21haW4iOiJnZW9wbGV0Lmdlb2FydC5zdHVkaW8ifQ",
      "signature": "xlNoFAc3t/QVMJDGg6CGZPY3OeeH+q8hmSj4g/IKBwQe5yHjod7CPhZt6G6J8cklP07DekpQjlBVEcvb4Yc6MRw="  
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
        `${appUrl}/embed-1200x800.webp`
      ],
      primaryCategory: "social",
      tags: ["nft", "art", "geoplets", "base", "erc721"],
      heroImageUrl: `${appUrl}/og-hero-1200x630.png`,
      tagline: "GeoFy your Warplets",
      ogTitle: "Geoplet - Geometric Warplets",
      ogDescription: "Geoplet: when geometric art meets Warplets",
      ogImageUrl: `${appUrl}/og-hero-1200x630.png`,
      noindex: false
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
