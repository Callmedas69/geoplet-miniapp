"use client";

/**
 * WalletModal Component
 *
 * Mobile-optimized wallet info modal using shadcn Dialog
 * - USDC balance
 * - Address with copy
 * - Disconnect button
 * - Matches SuccessModal pattern for consistency
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Copy, LogOut, Wallet, Check } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { toast } from "sonner";
import { TokenUSDC } from "@web3icons/react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { balance, isLoading } = useUSDCBalance();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      toast.success("Copied!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("Disconnected");
    onClose();
  };

  const truncated = address
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-white/20 text-amber-950 max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-950">
            <Wallet className="w-5 h-5" />
            Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* USDC Balance */}
          <div className="bg-amber-50/80 border border-amber-200/40 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TokenUSDC className="w-5 h-5" variant="branded" />
                <span className="text-sm text-amber-700">USDC</span>
              </div>
              <span className="font-semibold text-amber-950">
                {isLoading
                  ? "..."
                  : balance
                  ? parseFloat(balance).toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </div>

          {/* Address with Copy */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between bg-amber-50/80 border border-amber-200/40 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors"
            aria-label="Copy wallet address"
          >
            <span className="font-mono text-sm text-amber-950">
              {truncated}
            </span>
            {isCopied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5 text-amber-700" />
            )}
          </button>

          {/* Disconnect Button */}
          <Button
            onClick={handleDisconnect}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-600 border-red-500/30 font-semibold"
            variant="outline"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
