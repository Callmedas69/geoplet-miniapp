"use client";

/**
 * SplashScreen Component
 *
 * Full-screen splash screen with splash.webp
 * Shown during initial page load while data is being fetched
 */

import Image from "next/image";

export function SplashScreen() {
  return (
    <div
      id="splash-screen"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#f0d7a1]"
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/splash.webp"
          alt="Loading Geoplet"
          width={80}
          height={80}
          priority
        />
      </div>
    </div>
  );
}
