"use client";

import Image from "next/image";
import { useCallback } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { ExternalLink, Share2 } from "lucide-react";
import { sdk } from "@farcaster/miniapp-sdk";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { GEOPLET_CONFIG } from "@/lib/contracts";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  txHash: string | null;
  tokenId: string | null;
  fid?: number | null; // Farcaster ID - equals Geoplet tokenId (1:1 mapping)
}

export function SuccessModal({
  isOpen,
  onClose,
  image,
  txHash,
  tokenId,
  fid,
}: SuccessModalProps) {
  // Farcaster share with dynamic OG embed
  const handleShareFarcaster = useCallback(async () => {
    if (!fid) return;

    try {
      const shareUrl = `${window.location.origin}/share/${fid}`;

      await sdk.actions.composeCast({
        text: "Just minted my Geoplet! 🎨",
        embeds: [shareUrl],
      });

      haptics.success();
      toast.success("Shared to Farcaster!");
    } catch (error) {
      console.error("Share error:", error);
      haptics.error();
      toast.error("Failed to share to Farcaster");
    }
  }, [fid]);

  // X/Twitter share with dynamic OG embed
  const handleShareX = useCallback(() => {
    if (!fid) return;

    const shareUrl = `${window.location.origin}/share/${fid}`;
    const text = `Just minted my Geoplet! 🎨`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(shareUrl)}`;

    const newWindow = window.open(twitterUrl, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
    haptics.tap();
  }, [fid]);

  const baseScanUrl = txHash
    ? `${GEOPLET_CONFIG.explorers.basescan}/tx/${txHash}`
    : null;

  // NFT marketplace links (using FID as tokenId since they're 1:1)
  const nftTokenId = fid || tokenId;
  const openSeaUrl = nftTokenId
    ? `https://opensea.io/assets/base/${GEOPLET_CONFIG.address}/${nftTokenId}`
    : null;
  const onchainCheckerUrl = nftTokenId
    ? `https://onchainchecker.xyz/collection/base/${GEOPLET_CONFIG.address}/${nftTokenId}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-white/20 text-amber-950 max-w-sm sm:max-w-md">
        <div className="space-y-4 sm:space-y-6">
          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Minted! 🎉
            </h2>
          </div>

          {/* NFT Preview */}
          {image && (
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={image}
                alt={`Geoplet NFT #${tokenId}`}
                fill
                className="object-contain rounded-xl"
              />
            </div>
          )}

          {/* NFT Links Row */}
          <div className="flex items-center justify-center gap-4 px-2 text-xs">
            {baseScanUrl && (
              <a
                href={baseScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
              >
                <span>BaseScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {openSeaUrl && (
              <a
                href={openSeaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
              >
                <span>OpenSea</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onchainCheckerUrl && (
              <a
                href={onchainCheckerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
              >
                <span>OnChain</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Share Buttons - Only 2 Icons */}
          <div className="flex items-center justify-center gap-4 px-2">
            {/* Farcaster Share Icon */}
            <button
              type="button"
              onClick={handleShareFarcaster}
              disabled={!fid}
              className="touch-target p-3 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Share to Farcaster"
              title="Share to Farcaster"
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>

            {/* X/Twitter Share Icon */}
            <button
              type="button"
              onClick={handleShareX}
              disabled={!fid}
              className="touch-target p-3 rounded-full bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Share on X"
              title="Share on X"
            >
              <svg
                width="24"
                height="24"
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
      </DialogContent>
    </Dialog>
  );
}
