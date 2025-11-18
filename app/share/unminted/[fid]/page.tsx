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
      title: "Your Geoplet is Waiting!",
      description: "Your personalized Geoplet is ready to be minted. When geometric art meets Warplet!",
      openGraph: {
        title: "Your Geoplet is Waiting!",
        description: "Your personalized Geoplet is ready to be minted",
        images: [`${appUrl}/api/og/unminted/${fid}`],
      },
      twitter: {
        card: "summary_large_image",
        title: "Your Geoplet is Waiting!",
        description: "Your personalized Geoplet is ready to be minted",
        images: [`${appUrl}/api/og/unminted/${fid}`],
      },
      other: {
        "fc:miniapp": JSON.stringify({
          version: "1",
          imageUrl: `${appUrl}/api/og/unminted/${fid}`,
          button: {
            title: "Mint Your Geoplet",
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
    console.error("[Share Unminted Metadata] Error:", errorMessage);

    return {
      title: "Geoplet",
      description: "A fusion of geometric art and Warplet.",
    };
  }
}

export default function ShareUnmintedPage({ params }: SharePageProps) {
  return <SharePageClient params={params} />;
}
