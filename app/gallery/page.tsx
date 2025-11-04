"use client";

/**
 * Gallery Page
 *
 * Dedicated page for browsing Geoplet NFTs
 * - Two tabs: "All" (entire collection) and "My NFTs" (user's NFTs)
 * - Mobile-safe layout with bottom navigation
 * - Header managed by layout
 */

import { GallerySection } from "@/components/GallerySection";

export default function GalleryPage() {
  return (
    <main className="flex-1 flex flex-col px-4 pb-20">
      <GallerySection />
    </main>
  );
}
