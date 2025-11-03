import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
        url: `${appUrl}/og-image.png`,
        width: 3000,
        height: 2000,
        alt: `${appName} - Geofying`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: "GeoPlet: when geometric art meet Warplets",
    images: [`${appUrl}/og-image.png`],
    creator: "@geoartstudio",
    site: "@geoartstudio",
  },
  other: {
    // Farcaster Mini App metadata
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: `${appUrl}/og-image.png`,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
