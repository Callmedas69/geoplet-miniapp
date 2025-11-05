"use client";

/**
 * RegenerateButton Component
 *
 * Handles regeneration of Geoplet ($3 USDC)
 * - Disabled until first auto-generation completes
 * - Integrates x402 payment (reuses existing pattern)
 * - Saves to Supabase after generation
 * - Updates UI with new image
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useWarplets } from "@/hooks/useWarplets";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { generateImage, validateImageSize } from "@/lib/generators";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { TokenUSDC } from "@web3icons/react";

type ButtonState =
  | "idle"
  | "insufficient_usdc"
  | "generating"
  | "success";

interface RegenerateButtonProps {
  disabled?: boolean;
  onRegenerate: (imageData: string) => void;
  onSaveToSupabase: (imageData: string) => Promise<boolean>;
}

export function RegenerateButton({
  disabled = false,
  onRegenerate,
  onSaveToSupabase,
}: RegenerateButtonProps) {
  const { nft, fid } = useWarplets();
  const { balance } = useUSDCBalance();

  const [state, setState] = useState<ButtonState>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check USDC balance (need $3 for regenerate)
  const regeneratePrice = 3;
  const balanceNum = balance ? parseFloat(balance) : 0;
  const hasEnoughUSDC = balanceNum >= regeneratePrice;

  useEffect(() => {
    if (!hasEnoughUSDC && state === "idle") {
      setState("insufficient_usdc");
    } else if (hasEnoughUSDC && state === "insufficient_usdc") {
      setState("idle");
    }
  }, [hasEnoughUSDC, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!fid || !nft) {
      toast.error("Warplet not loaded");
      return;
    }

    if (!hasEnoughUSDC) {
      toast.error("Insufficient USDC balance");
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // For MVP: Just generate without payment
      // TODO: Implement $3 payment via x402 when ready
      setState("generating");
      const imageData = await generateImage(nft);

      if (abortControllerRef.current.signal.aborted) return;

      // Validate size
      const validation = validateImageSize(imageData);
      if (!validation.valid) {
        haptics.error();
        toast.error(validation.error || "Image too large");
        setState("idle");
        return;
      }

      // Save to Supabase
      const saved = await onSaveToSupabase(imageData);
      if (!saved) {
        console.warn("Failed to save to Supabase");
      }

      // Update UI
      onRegenerate(imageData);
      setState("success");
      toast.success("Geoplet regenerated!");
      haptics.success();

      // Reset to idle after success
      setTimeout(() => setState("idle"), 2000);
    } catch (error) {
      console.error("Regenerate error:", error);

      if (abortControllerRef.current?.signal.aborted) return;

      const errorMessage =
        error instanceof Error ? error.message : "Failed to regenerate";
      haptics.error();
      toast.error(errorMessage);
      setState("idle");
    }
  }, [fid, nft, hasEnoughUSDC, onRegenerate, onSaveToSupabase]);

  // Button text and state
  const getButtonContent = () => {
    switch (state) {
      case "insufficient_usdc":
        return (
          <a
            href="https://app.uniswap.org/swap?outputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&chain=base"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <TokenUSDC className="w-5 h-5" variant="branded" />
            Get USDC
          </a>
        );
      case "generating":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Geofying...
          </>
        );
      case "success":
        return "Regenerated!";
      default:
        return (
          <>
            <RefreshCw className="w-5 h-5" />
            REGENERATE
          </>
        );
    }
  };

  const isLoading = state === "generating";
  const isDisabled = disabled || isLoading || state === "success";

  return (
    <Button
      onClick={handleRegenerate}
      disabled={isDisabled}
      className="w-full max-w-xs bg-black text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      size="lg"
      aria-label="Regenerate Geoplet for $3"
    >
      {getButtonContent()}
    </Button>
  );
}
