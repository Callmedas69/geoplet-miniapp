"use client";

/**
 * TopSection Component
 *
 * Simplified top section with centered logo
 * - Logo: Centered at top
 * - Taglines: Brief description
 */

import localfont from "next/font/local";

const spriteGraffity = localfont({
  src: "../public/font/SpriteGraffiti-Shadow.otf",
  display: "swap",
});

export function TopSection() {
  return (
    <div
      id="top-section"
      className="flex flex-col items-center px-4 pt-8 shrink-0"
    >
      {/* Logo - Centered */}
      <h1 className={`pb-2 text-7xl ${spriteGraffity.className}`}>GEOPLET</h1>
      <p className={`italic text-sm`}>where geo meets warplets</p>
      <p className={`italic text-sm`}>a fusion of art, code, and value.</p>
    </div>
  );
}
