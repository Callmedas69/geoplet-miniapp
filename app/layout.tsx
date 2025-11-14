// layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";
import { ClientLayout } from "@/components/ClientLayout";
import localfont from "next/font/local";

const schoollBell = localfont({
  src: "../public/font/Schoolbell-Regular.ttf",
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://geoplet.geoart.studio/";
const appName = process.env.NEXT_PUBLIC_APP_NAME || "Geoplet";

export const metadata: Metadata = {
  title: appName,
  description: "GeoPlet: when geometric art meet Warplets",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: appName,
    description: "GeoPlet: when geometric art meet Warplets",
    url: appUrl,
    siteName: appName,
    images: [
      {
        url: `${appUrl}/embed-1200x800.webp`,
        width: 1200,
        height: 800,
        alt: `${appName} - Geofying`,
        type: "image/webp",
      },
      {
        url: `${appUrl}/og-hero-1200x630.png`,
        width: 1200,
        height: 630,
        alt: `${appName} - Geofying`,
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: "GeoPlet: when geometric art meet Warplets",
    images: [`${appUrl}/embed-1200x800.webp`],
    creator: "@geoart_studio",
    site: "geoplet.geoart.studio",
  },
  other: {
    // Farcaster Mini App metadata
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${appUrl}/embed-1200x800.webp`,
      button: {
        title: "Geopleting",
        action: {
          type: "launch",
          // type: "open_url",
          name: "Geoplet",
          url: appUrl,
          splashImageUrl: `${appUrl}/splash.webp`,
          splashBackgroundColor: "#f3daa1",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${schoollBell.className} antialiased`}>
        <Providers>
          <ClientLayout>
            <div className="flex min-h-screen flex-col bg-[#fff3d6] mobile-safe-area text-amber-950">
              {children}
            </div>
          </ClientLayout>
        </Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "inherit",
              background: "#fff3d6",
              color: "#78350f",
              border: "1px solid rgba(120, 53, 15, 0.2)",
            },
          }}
        />
      </body>
    </html>
  );
}
