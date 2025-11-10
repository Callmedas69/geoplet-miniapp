import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appUrl, appName } from "@/lib/config";

export const metadata: Metadata = {
  title: `${appName} - Discover Geometric Art`,
  description: "GeoPlet: when geometric art meet Warplets",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: `${appName} - Geofying`,
    description: "Transform your Warplets into geometric NFT art on Base",
    url: `${appUrl}/embed`,
    siteName: appName,
    images: [
      {
        url: `${appUrl}/embed-1200x800.webp`,
        width: 1200,
        height: 800,
        alt: `${appName} - Create & mint geometric NFTs`,
        type: "image/webp",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} - Geofying`,
    description: "Transform your Warplets into geometric NFT art on Base",
    images: [`${appUrl}/embed-1200x800.webp`],
    creator: "@geoart_studio",
    site: "geoplet.geoart.studio",
  },
  other: {
    // Farcaster Mini App metadata
    // Reference: https://docs.farcaster.xyz/developers/frames/specification
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${appUrl}/embed-1200x800.webp`,
      button: {
        title: "Geofying",
        action: {
          type: "launch_frame",
          name: "Geoplet",
          url: appUrl,
          splashImageUrl: `${appUrl}/splash.webp`,
          splashBackgroundColor: "#f3daa1",
        },
      },
    }),
  },
};

export default function EmbedPage() {
  // Server-side redirect - instant, no client JS, no UI flash
  // Social media crawlers get metadata before redirect executes
  redirect("/");
}
