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
  Star,
  Loader2,
} from "lucide-react";
import { shareToFarcaster } from "@/lib/generators";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { GEOPLET_CONFIG } from "@/lib/contracts";
import { sdk } from "@farcaster/miniapp-sdk";

// Toast message constants
const TOAST_MESSAGES = {
  COPY_SUCCESS: "Transaction hash copied!",
  COPY_ERROR: "Failed to copy",
  WARPCAST_ADDED:
    "Added to Warpcast! You can now access Geoplet from your apps.",
  WARPCAST_LATER:
    "No problem! You can add Geoplet later from your Warpcast settings.",
  WARPCAST_ERROR: "Unable to add app. Please try again later.",
  WARPCAST_FAILED: "Failed to add to Warpcast",
  FARCASTER_ERROR: "Failed to share to Farcaster",
} as const;

// Warpcast error codes
enum WarpcastErrorCode {
  REJECTED_BY_USER = "RejectedByUser",
  INVALID_MANIFEST = "InvalidDomainManifestJson",
}

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
  const [isAddingToWarpcast, setIsAddingToWarpcast] = useState(false);

  const handleCopyTxHash = useCallback(async () => {
    if (!txHash) return;

    try {
      await navigator.clipboard.writeText(txHash);
      setIsCopied(true);
      haptics.success();
      toast.success(TOAST_MESSAGES.COPY_SUCCESS);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      haptics.error();
      toast.error(TOAST_MESSAGES.COPY_ERROR);
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
      toast.error(TOAST_MESSAGES.FARCASTER_ERROR);
    } finally {
      setIsSharing(false);
    }
  }, [image, tokenId, isSharing]);

  const handleAddToWarpcast = useCallback(async () => {
    if (isAddingToWarpcast) return;

    try {
      setIsAddingToWarpcast(true);
      await sdk.actions.addMiniApp();
      haptics.success();
      toast.success(TOAST_MESSAGES.WARPCAST_ADDED);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "";

      // Handle specific error codes
      if (errorMessage === WarpcastErrorCode.REJECTED_BY_USER) {
        toast.info(TOAST_MESSAGES.WARPCAST_LATER);
        return; // User choice, no error haptic
      }

      haptics.error();
      const userMessage =
        errorMessage === WarpcastErrorCode.INVALID_MANIFEST
          ? TOAST_MESSAGES.WARPCAST_ERROR
          : TOAST_MESSAGES.WARPCAST_FAILED;
      toast.error(userMessage);

      console.error("Failed to add mini app:", error);
    } finally {
      setIsAddingToWarpcast(false);
    }
  }, [isAddingToWarpcast]);

  // Explorer URLs (Base Mainnet)
  const openSeaUrl = tokenId
    ? `${GEOPLET_CONFIG.explorers.opensea}/${GEOPLET_CONFIG.address}/${tokenId}`
    : null;

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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShareFarcaster}
              disabled={isSharing || !image || !tokenId}
              className="bg-purple-600 hover:bg-purple-700 text-white touch-target"
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
                  <span>Farcaster</span>
                </span>
              )}
            </Button>

            {openSeaUrl && (
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white touch-target"
                asChild
              >
                <a
                  href={openSeaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on OpenSea"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    <span>OpenSea</span>
                  </span>
                  <span className="sr-only">(opens in new window)</span>
                </a>
              </Button>
            )}
          </div>

          {/* Add to Warpcast Button */}
          <Button
            onClick={handleAddToWarpcast}
            disabled={isAddingToWarpcast}
            className="w-full bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold touch-target"
            aria-label="Add to Warpcast"
            aria-busy={isAddingToWarpcast}
            aria-disabled={isAddingToWarpcast}
          >
            {isAddingToWarpcast ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Adding...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Star className="w-4 h-4" aria-hidden="true" />
                <span>Add Geoplet to Warpcast</span>
              </span>
            )}
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
