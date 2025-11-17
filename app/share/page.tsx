import { Metadata } from "next";
import SharePageClient from "./SharePageClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoplet.geoart.studio";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Geoplet";

export const metadata: Metadata = {
  title: `${appName} - Geometric Art Meets Warplets`,
  description: "Welcome to Geoplet, art that deploys like code, preserved forever on-chain. Geopleting your Warplets, reborn with Bauhaus harmony and Suprematist geometry.",
  openGraph: {
    title: `${appName} - Geometric Art Meets Warplets`,
    description: "Welcome to Geoplet, art that deploys like code, preserved forever on-chain.",
    images: [`${appUrl}/embed-1200x800.webp`],
  },
  twitter: {
    card: "summary_large_image",
    title: `${appName} - Geometric Art Meets Warplets`,
    description: "Welcome to Geoplet, art that deploys like code, preserved forever on-chain.",
    images: [`${appUrl}/embed-1200x800.webp`],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${appUrl}/embed-1200x800.webp`,
      button: {
        title: "Open Geoplet",
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

export default function SharePage() {
  return <SharePageClient />;
}
