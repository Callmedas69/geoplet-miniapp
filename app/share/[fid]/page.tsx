import { Metadata } from "next";
import SharePageClient from "./SharePageClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://geoplet.geoart.studio";

interface SharePageProps {
  params: Promise<{ fid: string }>;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  try {
    const { fid } = await params;

    return {
      title: "Geoplet - Minted NFT",
      description: `Check out Geoplet #${fid}! A fusion of geometric art and Warplet.`,
      openGraph: {
        title: "Geoplet - Minted NFT",
        description: `Check out Geoplet #${fid}!`,
        images: [`${appUrl}/api/og/${fid}`],
      },
      twitter: {
        card: "summary_large_image",
        title: "Geoplet - Minted NFT",
        description: `Check out Geoplet #${fid}!`,
        images: [`${appUrl}/api/og/${fid}`],
      },
      other: {
        "fc:miniapp": JSON.stringify({
          version: "1",
          imageUrl: `${appUrl}/api/og/${fid}`,
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Share Metadata] Error:", errorMessage);

    return {
      title: "Geoplet",
      description: "A fusion of geometric art and Warplet.",
    };
  }
}

export default function SharePage({ params }: SharePageProps) {
  return <SharePageClient params={params} />;
}
