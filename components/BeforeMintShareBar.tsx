"use client";

import Image from "next/image";
import { useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { SHARE_CONFIG } from "@/lib/share-config";
import { appUrl } from "@/lib/config";

interface BeforeMintShareBarProps {
  fid?: number | null;
  variant?: "fixed" | "inline";
}

export function BeforeMintShareBar({
  fid,
  variant = "inline",
}: BeforeMintShareBarProps) {
  // Share main site URL with OG metadata
  const shareUrl = appUrl;

  // Farcaster share
  const handleShareFarcaster = useCallback(async () => {
    try {
      await sdk.actions.composeCast({
        text: SHARE_CONFIG.beforeMint.farcaster,
        embeds: [shareUrl],
      });

      haptics.success();
      toast.success("Share window opened!");
    } catch (error) {
      console.error("Share error:", error);
      haptics.error();
      toast.error("Failed to share to Farcaster");
    }
  }, [shareUrl]);

  // X/Twitter share
  const handleShareX = useCallback(() => {
    const text = SHARE_CONFIG.beforeMint.twitter;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(shareUrl)}`;

    const newWindow = window.open(twitterUrl, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
    haptics.tap();
  }, [shareUrl]);

  const containerClasses =
    variant === "fixed"
      ? "fixed bottom-16 left-0 right-0 z-40 pb-safe"
      : "w-full";

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-center gap-4 px-2 pt-4">
        {/* Farcaster Share Icon */}
        <button
          type="button"
          onClick={handleShareFarcaster}
          className="w-8 h-8 rounded-full bg-[#6a3cff] hover:bg-[#c7a9fd] transition-colors flex items-center justify-center"
          aria-label="Share to Farcaster"
          title="Share to Farcaster"
        >
          <div className="rounded-full overflow-hidden flex items-center justify-center">
            <Image
              src="/farcaster_logo.jpg"
              alt="Farcaster"
              width={36}
              height={36}
            />
          </div>
        </button>

        {/* X/Twitter Share Icon */}
        <button
          type="button"
          onClick={handleShareX}
          className="w-8 h-8 rounded-full bg-black hover:bg-gray-800 transition-colors flex items-center justify-center"
          aria-label="Share on X"
          title="Share on X"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 1200 1227"
            fill="none"
            className="text-white"
          >
            <path
              d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
