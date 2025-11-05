"use client";

/**
 * MintButton Component
 *
 * Handles minting of generated Geoplet ($2 USDC)
 * - Enabled when generated image exists
 * - Integrates x402 payment (reuses existing pattern from GenerateMintButton)
 * - Deletes from Supabase after successful mint
 * - Shows success modal
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useWarplets } from "@/hooks/useWarplets";
import { useGeoplet } from "@/hooks/useGeoplet";
import { usePayment, type MintSignatureResponse } from "@/hooks/usePayment";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { validateImageSize, checkFidMinted } from "@/lib/generators";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { TokenUSDC } from "@web3icons/react";

type ButtonState =
  | "idle"
  | "insufficient_usdc"
  | "paying"
  | "minting"
  | "success"
  | "already_minted";

interface MintButtonProps {
  disabled?: boolean;
  generatedImage: string | null;
  onSuccess: (txHash: string, tokenId: string) => void;
  onDeleteFromSupabase: () => Promise<boolean>;
}

export function MintButton({
  disabled = false,
  generatedImage,
  onSuccess,
  onDeleteFromSupabase,
}: MintButtonProps) {
  const { nft, fid } = useWarplets();
  const { mintNFT, isLoading: isMinting, isSuccess, txHash } = useGeoplet();
  const { requestMintSignature } = usePayment();
  const { hasEnoughUSDC, balance, mintPrice } = useUSDCBalance();

  const [state, setState] = useState<ButtonState>("idle");
  const [signatureData, setSignatureData] = useState<MintSignatureResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const successCalledRef = useRef(false);

  // Check FID and USDC balance on mount
  useEffect(() => {
    async function checkInitialState() {
      if (!fid) return;

      const minted = await checkFidMinted(fid.toString());
      if (minted) {
        setState("already_minted");
        return;
      }

      if (!hasEnoughUSDC) {
        setState("insufficient_usdc");
      } else {
        setState("idle");
      }
    }
    checkInitialState();
  }, [fid, hasEnoughUSDC]);

  // Handle mint success
  useEffect(() => {
    if (isSuccess && txHash && nft && !successCalledRef.current) {
      successCalledRef.current = true;

      // Delete from Supabase
      onDeleteFromSupabase().catch(console.error);

      // Call success callback
      onSuccess(txHash, nft.tokenId);
      toast.success("Geoplet NFT minted successfully!");
      haptics.success();
      setState("success");
    }
  }, [isSuccess, txHash, nft, onSuccess, onDeleteFromSupabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleMint = useCallback(async () => {
    if (!fid || !generatedImage) {
      toast.error("No image to mint");
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // Validate image size
      const validation = validateImageSize(generatedImage);
      if (!validation.valid) {
        haptics.error();
        toast.error(validation.error || "Image validation failed");
        return;
      }

      // Step 1: Payment
      setState("paying");
      const signature = await requestMintSignature(fid.toString());

      if (abortControllerRef.current.signal.aborted) return;

      setSignatureData(signature);

      // Step 2: Mint
      setState("minting");
      await mintNFT(signature, generatedImage);

      // Success handled in useEffect
    } catch (error) {
      console.error("Mint error:", error);

      if (abortControllerRef.current?.signal.aborted) return;

      const errorMessage = error instanceof Error ? error.message : "Failed to mint";

      // Handle specific errors
      if (errorMessage.toLowerCase().includes("already minted")) {
        setState("already_minted");
      } else if (errorMessage.toLowerCase().includes("signature expired")) {
        setState("idle");
        setSignatureData(null);
      } else if (errorMessage.toLowerCase().includes("rejected")) {
        setState("idle");
      } else {
        setState("idle");
      }

      haptics.error();
      toast.error(errorMessage);
    }
  }, [fid, generatedImage, requestMintSignature, mintNFT]);

  // Button content
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
      case "paying":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Initiating x402...
          </>
        );
      case "minting":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Delivering Geoplet...
          </>
        );
      case "success":
        return "Minted!";
      case "already_minted":
        return "Already Minted";
      default:
        return (
          <>
            <Sparkles className="w-5 h-5" />
            MINT ($2)
          </>
        );
    }
  };

  const isLoading = state === "paying" || state === "minting";
  const isDisabled =
    disabled ||
    !generatedImage ||
    isLoading ||
    state === "success" ||
    state === "already_minted";

  return (
    <Button
      onClick={handleMint}
      disabled={isDisabled}
      className="w-full max-w-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      size="lg"
      aria-label="Mint Geoplet for $2"
    >
      {getButtonContent()}
    </Button>
  );
}
