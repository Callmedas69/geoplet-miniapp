"use client";

/**
 * RegenerateButton Component
 *
 * Handles regeneration of Geoplet ($0.90 USDC)
 * - Disabled until first auto-generation completes
 * - Integrates x402 payment (reuses existing pattern)
 * - Saves to Supabase after generation
 * - Updates UI with new image
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Button } from "./ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useWarplets } from "@/hooks/useWarplets";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { generatePaymentHeader } from "@/lib/payment-header";
import { validateImageSize } from "@/lib/generators";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { TokenUSDC } from "@web3icons/react";
import { RotatingText } from "./RotatingText";
import { PAYMENT_CONFIG } from "@/lib/payment-config";
import type { PaymentRequired402Response } from "@/types/x402";
import { gsap } from "gsap";

type ButtonState =
  | "idle"
  | "insufficient_usdc"
  | "paying"
  | "generating"
  | "success";

interface RegenerateButtonProps {
  disabled?: boolean;
  onRegenerate: (imageData: string) => void;
  onSaveToSupabase: (imageData: string) => Promise<boolean>;
}

// Use empty string for relative paths in client-side fetch
// This ensures same-origin requests with all headers preserved (including X-Payment)
const API_BASE_URL = "";
const USDC_ADDRESS = process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS as `0x${string}`;
const CHAIN_ID = 8453; // Base Mainnet

export function RegenerateButton({
  disabled = false,
  onRegenerate,
  onSaveToSupabase,
}: RegenerateButtonProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { nft, fid } = useWarplets();
  const { balance } = useUSDCBalance();

  const [state, setState] = useState<ButtonState>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Button hover/press animation
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handlePointerDown = () =>
      gsap.to(button, { scale: 0.95, duration: 0.1 });
    const handlePointerUp = () => gsap.to(button, { scale: 1, duration: 0.15 });

    button.addEventListener("pointerdown", handlePointerDown);
    button.addEventListener("pointerup", handlePointerUp);
    button.addEventListener("pointerleave", handlePointerUp);

    return () => {
      button.removeEventListener("pointerdown", handlePointerDown);
      button.removeEventListener("pointerup", handlePointerUp);
      button.removeEventListener("pointerleave", handlePointerUp);
    };
  }, []);

  // Check USDC balance (need $0.9 for regenerate)
  const regeneratePrice = parseFloat(PAYMENT_CONFIG.REGENERATE.price);
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
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      setState("idle");
    };
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!fid || !nft || !address || !isConnected) {
      toast.error("Warplet not loaded or wallet not connected");
      return;
    }

    if (!walletClient?.account) {
      toast.error("Wallet client not available");
      return;
    }

    if (!hasEnoughUSDC) {
      toast.error("Insufficient USDC balance");
      return;
    }

    if (!USDC_ADDRESS) {
      toast.error("USDC address not configured");
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // SIMPLIFIED: Removed frontend precheck (KISS principle)
      // Backend will check before settlement (redundant frontend check removed)
      setState("paying");
      console.log(`[x402 Regenerate] Step 1: Requesting payment terms...`);
      const initialResponse = await fetch(
        `${API_BASE_URL}/api/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: nft.imageUrl,
            tokenId: nft.tokenId,
            name: nft.name,
            fid: fid.toString(), // Add FID for generation check
          }),
        }
      );

      // Step 2: Expect 402 Payment Required
      if (initialResponse.status !== 402) {
        throw new Error(`Unexpected status: ${initialResponse.status}`);
      }

      const paymentTermsData =
        (await initialResponse.json()) as PaymentRequired402Response;
      console.log(`[x402 Regenerate] Step 2: Received 402 Payment Required`);

      if (!paymentTermsData.accepts?.[0]) {
        throw new Error("Invalid payment terms received");
      }

      const terms = paymentTermsData.accepts[0];

      // Step 3: Generate payment header with EIP-3009 signature
      console.log(`[x402 Regenerate] Step 3: Generating payment header...`);

      const paymentHeader = await generatePaymentHeader(walletClient, {
        from: address,
        to: terms.payTo as `0x${string}`,
        value: PAYMENT_CONFIG.REGENERATE.priceAtomic,
        validAfter: "0",
        usdcAddress: USDC_ADDRESS,
        chainId: CHAIN_ID,
      });

      if (abortControllerRef.current.signal.aborted) return;

      // Step 4: Retry request with X-Payment header
      console.log(`[x402 Regenerate] Step 4: Retrying with payment header...`);
      setState("generating");

      const paymentResponse = await fetch(
        `${API_BASE_URL}/api/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Payment": paymentHeader,
          },
          body: JSON.stringify({
            imageUrl: nft.imageUrl,
            tokenId: nft.tokenId,
            name: nft.name,
          }),
        }
      );

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const result = await paymentResponse.json();
      const imageData = result.imageData;

      if (abortControllerRef.current.signal.aborted) return;

      console.log(`[x402 Regenerate] Payment verified and image generated!`);

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
      successTimeoutRef.current = setTimeout(() => setState("idle"), 2000);
    } catch (error) {
      console.error("Regenerate error:", error);

      if (abortControllerRef.current?.signal.aborted) return;

      const errorMessage =
        error instanceof Error ? error.message : "Failed to regenerate";

      // Handle user rejection
      if (
        errorMessage.toLowerCase().includes("user rejected") ||
        errorMessage.toLowerCase().includes("user denied") ||
        errorMessage.toLowerCase().includes("user cancelled")
      ) {
        toast.error("Payment cancelled");
      } else {
        toast.error(errorMessage);
      }

      haptics.error();
      setState("idle");
    }
  }, [
    fid,
    nft,
    address,
    isConnected,
    walletClient,
    hasEnoughUSDC,
    onRegenerate,
    onSaveToSupabase,
  ]);

  // Button text and state
  const getButtonContent = () => {
    switch (state) {
      case "insufficient_usdc":
        return (
          <p className="flex items-center gap-2">
            <TokenUSDC className="w-5 h-5" variant="branded" />
            Insufficient Fund
          </p>
        );
      case "paying":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <RotatingText
              messages={[
                "Initiating x402...",
                "Verifying payment...",
                "Processing USDC...",
              ]}
              interval={1500}
            />
          </>
        );
      case "generating":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <RotatingText
              messages={[
                "Summoning geometric harmony...",
                "Aligning Bauhaus angles...",
                "Wobbling pixels on-chain...",
                "Infusing Base energy...",
                "Balancing Suprematist chaos...",
                "Painting the blockchain...",
              ]}
              interval={2000}
            />
          </>
        );
      case "success":
        return "Regenerated!";
      default:
        return (
          <>
            <RefreshCw className="w-5 h-5" />
            Regenerate (${PAYMENT_CONFIG.REGENERATE.price})
          </>
        );
    }
  };

  const isLoading = state === "paying" || state === "generating";
  const isDisabled = disabled || isLoading || state === "success";

  return (
    <Button
      ref={buttonRef}
      onClick={handleRegenerate}
      disabled={isDisabled}
      className="w-full bg-black text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      size="lg"
      aria-label={`Regenerate Geoplet for $${PAYMENT_CONFIG.REGENERATE.price}`}
    >
      {getButtonContent()}
    </Button>
  );
}
