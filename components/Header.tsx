"use client";

/**
 * Header Component
 *
 * Global header with GEOPLET branding and wallet button
 * - Appears on all pages via layout
 * - Mobile-optimized layout
 * - Consistent branding across the app
 */

import { MobileWalletButton } from "./MobileWalletButton";
import localfont from "next/font/local";

const schoolBell = localfont({
  src: "../public/font/Schoolbell-Regular.ttf",
  display: "swap",
});

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-black/8">
      <div>
        <h1
          className={`text-2xl sm:text-3xl font-semibold text-black leading-none ${schoolBell.className}`}
        >
          GEOPLET
        </h1>
        <p className="text-gray-600 text-[10px] sm:text-sm italic">
          when geo meet warplets
        </p>
      </div>
      <MobileWalletButton />
    </header>
  );
}
