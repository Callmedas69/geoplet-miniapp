"use client";

/**
 * TopSection Component
 *
 * Simplified top section with centered logo and share buttons below
 * - Logo: Centered at top
 * - Share buttons: Farcaster + X (conditional, centered below logo)
 */

import localfont from "next/font/local";

const spriteGraffity = localfont({
  src: "../public/font/SpriteGraffiti-Shadow.otf",
  display: "swap",
});

interface TopSectionProps {
  onFarcasterShare?: () => void;
  onXShare?: () => void;
}

export function TopSection({ onFarcasterShare, onXShare }: TopSectionProps) {
  const showShareButtons = onFarcasterShare || onXShare;

  return (
    <div
      id="top-section"
      className="flex flex-col items-center px-4 pt-8 shrink-0"
    >
      {/* Logo - Centered */}
      <h1 className={`text-7xl leading-none ${spriteGraffity.className}`}>
        GEOPLET
      </h1>
      <p className="italic text-sm">where geo meets warplets</p>
      <p className="italic text-sm">a fusion of art, code, and value.</p>

      {/* Share Icons - Below Logo (Conditional) */}
      {showShareButtons && (
        <div className="flex items-center gap-3">
          {/* Farcaster Icon */}
          {onFarcasterShare && (
            <button
              onClick={onFarcasterShare}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Share on Farcaster"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 1000 1000"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-black"
              >
                <path
                  d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"
                  fill="currentColor"
                />
                <path
                  d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"
                  fill="currentColor"
                />
                <path
                  d="M871.111 253.333L842.222 351.111H817.778V746.667C830.051 746.667 840 756.616 840 768.889V795.556H844.444C856.717 795.556 866.667 805.505 866.667 817.778V844.445H617.778V817.778C617.778 805.505 627.727 795.556 640 795.556H644.444V768.889C644.444 756.616 654.394 746.667 666.667 746.667H693.333V253.333H871.111Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}

          {/* X (Twitter) Icon */}
          {onXShare && (
            <button
              onClick={onXShare}
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              aria-label="Share on X"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 1200 1227"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-black"
              >
                <path
                  d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
