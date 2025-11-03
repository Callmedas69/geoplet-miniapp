'use client';

import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { shareToFarcaster } from '@/lib/generators';
import { useState } from 'react';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { GEOPLET_CONFIG } from '@/lib/contracts';

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

  const handleCopyTxHash = async () => {
    if (!txHash) return;

    try {
      await navigator.clipboard.writeText(txHash);
      setIsCopied(true);
      haptics.success();
      toast.success('Transaction hash copied!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      haptics.error();
      toast.error('Failed to copy');
    }
  };

  const handleShareFarcaster = async () => {
    if (!image || !tokenId) return;

    try {
      await shareToFarcaster(image, tokenId);
    } catch (error) {
      console.error('Share error:', error);
      haptics.error();
      toast.error('Failed to share to Farcaster');
    }
  };

  // Explorer URLs (Base Mainnet)
  const openSeaUrl = tokenId
    ? `${GEOPLET_CONFIG.explorers.opensea}/${GEOPLET_CONFIG.address}/${tokenId}`
    : '';

  const baseScanUrl = txHash
    ? `${GEOPLET_CONFIG.explorers.basescan}/tx/${txHash}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 NFT Minted Successfully!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* NFT Preview */}
          {image && (
            <div className="relative aspect-square w-full bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <Image
                src={image}
                alt="Minted Geoplet NFT"
                fill
                className="object-contain p-4"
              />
            </div>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <div className="bg-white/5 rounded-lg border border-white/10 p-4 space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Transaction Hash
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs text-white/80 font-mono truncate">
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTxHash}
                  className="text-xs"
                >
                  {isCopied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
              {baseScanUrl && (
                <a
                  href={baseScanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline block"
                >
                  View on BaseScan →
                </a>
              )}
            </div>
          )}

          {/* Token ID */}
          {tokenId && (
            <div className="text-center">
              <p className="text-sm text-gray-400">Token ID</p>
              <p className="text-xl font-bold text-white">#{tokenId}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShareFarcaster}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              🚀 Share to Farcaster
            </Button>

            {openSeaUrl && (
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                asChild
              >
                <a
                  href={openSeaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on OpenSea
                </a>
              </Button>
            )}
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
