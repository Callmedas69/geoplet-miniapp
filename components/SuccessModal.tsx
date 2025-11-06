"use client";

/**
 * SuccessModal Component
 *
 * Displays success message after NFT mint with share options
 *
 * FEATURES:
 * - Lucide icons for visual feedback
 * - Touch-target classes (44x44px minimum)
 * - Loading states for async actions
 * - Responsive font sizing
 * - KISS principle: Simple, secure, maintainable
 */

import Image from "next/image";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
  Loader2,
} from "lucide-react";
import { shareToFarcaster } from "@/lib/generators";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { GEOPLET_CONFIG } from "@/lib/contracts";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  txHash: string | null;
  tokenId: string | null;
}

export function SuccessModal({
  isOpen,
  onClose,
  image,
  txHash,
  tokenId,
}: SuccessModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleCopyTxHash = useCallback(async () => {
    if (!txHash) return;

    try {
      await navigator.clipboard.writeText(txHash);
      setIsCopied(true);
      haptics.success();
      toast.success("Transaction hash copied!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      haptics.error();
      toast.error("Failed to copy");
    }
  }, [txHash]);

  const handleShareFarcaster = useCallback(async () => {
    if (!image || !tokenId || isSharing) return;

    try {
      setIsSharing(true);
      await shareToFarcaster(image, tokenId);
      haptics.success();
    } catch (error) {
      console.error("Share error:", error);
      haptics.error();
      toast.error("Failed to share to Farcaster");
    } finally {
      setIsSharing(false);
    }
  }, [image, tokenId, isSharing]);

  const handleXShare = useCallback(() => {
    if (!tokenId) return;

    const text = `Just minted my Geoplet NFT #${tokenId}! 🎨`;
    const url = `https://geoplet.geoart.studio`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(url)}`;

    window.open(twitterUrl, "_blank");
    haptics.tap();
  }, [tokenId]);

  // Explorer URL (Base Mainnet)
  const baseScanUrl = txHash
    ? `${GEOPLET_CONFIG.explorers.basescan}/tx/${txHash}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="bg-black/95 border-white/20 text-white max-w-sm sm:max-w-md"
        aria-describedby="success-description"
      >
        <DialogHeader>
          <DialogTitle
            className="text-xl sm:text-2xl font-bold text-center flex items-center justify-center gap-2"
            aria-live="polite"
          >
            <CheckCircle2
              className="w-6 h-6 text-green-500"
              aria-hidden="true"
            />
            Geofying Successfully
          </DialogTitle>
        </DialogHeader>

        <div id="success-description" className="space-y-4 sm:space-y-6">
          {/* NFT Preview */}
          {image && (
            <div
              className="relative aspect-square w-full bg-white/5 rounded-xl border border-white/10 overflow-hidden"
              role="img"
              aria-label={`Geoplet NFT #${tokenId}`}
            >
              <Image
                src={image}
                alt={`Geoplet NFT #${tokenId}`}
                fill
                className="object-contain p-2 sm:p-4"
              />
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div
              className="bg-white/5 rounded-lg border border-white/10 p-4 space-y-2"
              role="region"
              aria-labelledby="transaction-info"
            >
              <p
                id="transaction-info"
                className="text-xs text-gray-400 uppercase tracking-wide"
              >
                Tx Hash
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs sm:text-sm text-white/80 font-mono truncate">
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTxHash}
                  className="text-xs touch-target"
                  aria-label={isCopied ? "Copied" : "Copy transaction hash"}
                  aria-live="polite"
                >
                  {isCopied ? (
                    <>
                      <CheckCircle2
                        className="w-3 h-3 mr-1"
                        aria-hidden="true"
                      />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              {baseScanUrl && (
                <a
                  href={baseScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                  aria-label="View on BaseScan"
                >
                  explorer
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  <span className="sr-only">(opens in new window)</span>
                </a>
              )}
            </div>
          )}

          {/* Token ID */}
          {tokenId && (
            <div
              className="text-center"
              role="region"
              aria-label="Token ID information"
            >
              <p className="text-xs sm:text-sm text-gray-400">Token ID</p>
              <p className="text-lg sm:text-xl font-bold text-white">
                #{tokenId}
              </p>
            </div>
          )}

          {/* Share to Farcaster */}
          <Button
            onClick={handleShareFarcaster}
            disabled={isSharing || !image || !tokenId}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white touch-target"
            aria-label="Share to Farcaster"
            aria-disabled={isSharing || !image || !tokenId}
            aria-busy={isSharing}
          >
            {isSharing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
                <span>Sharing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span>Share to Farcaster</span>
              </span>
            )}
          </Button>

          {/* Share to X (Twitter) */}
          <Button
            onClick={handleXShare}
            disabled={!tokenId}
            className="w-full bg-black hover:bg-black/80 text-white touch-target"
            aria-label="Share on X (Twitter)"
            aria-disabled={!tokenId}
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 1200 1227"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                  fill="currentColor"
                />
              </svg>
              <span>Share on X</span>
            </span>
          </Button>

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white touch-target"
            aria-label="Close modal"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
