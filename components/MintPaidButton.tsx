"use client";

/**
 * MintPaidButton Component
 *
 * Handles minting for users who already paid but mint failed
 * - NO x402 payment flow (payment already settled)
 * - Fetches fresh signature from /api/get-mint-signature-paid
 * - Reuses simulation and mint logic
 * - Used for payment recovery scenarios
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";
import { useWarplets } from "@/hooks/useWarplets";
import { useGeoplet } from "@/hooks/useGeoplet";
import { useContractSimulation } from "@/hooks/useContractSimulation";
import { validateImageSize, sanitizeImageData } from "@/lib/generators";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { RotatingText } from "./RotatingText";
import { gsap } from "gsap";
import type { MintSignatureResponse } from "@/hooks/usePayment";

type ButtonState =
  | "idle"
  | "checking_eligibility"
  | "getting_signature"
  | "simulating"
  | "minting"
  | "success";

interface MintPaidButtonProps {
  disabled?: boolean;
  generatedImage: string | null;
  onSuccess: (txHash: string, tokenId: string) => void;
}

export function MintPaidButton({
  disabled = false,
  generatedImage,
  onSuccess,
}: MintPaidButtonProps) {
  const { address } = useAccount();
  const { nft, fid } = useWarplets();
  const { mintNFT, isLoading: isMinting, isSuccess, txHash } = useGeoplet();
  const { checkEligibility, simulateMint } = useContractSimulation();

  const [state, setState] = useState<ButtonState>("idle");
  const [signatureData, setSignatureData] =
    useState<MintSignatureResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const successCalledRef = useRef(false);
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

  // Handle mint success
  useEffect(() => {
    if (isSuccess && txHash && fid && !successCalledRef.current) {
      successCalledRef.current = true;

      // Update payment tracking status to 'minted' with mint tx hash
      fetch(`/api/payment-tracking/${fid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "minted",
          mint_tx_hash: txHash,
        }),
      }).catch((err) => {
        console.error("[MINT-PAID] Failed to update payment tracking:", err);
        // Don't block success - mint succeeded
      });

      onSuccess(txHash, fid.toString());
      toast.success("Geoplet NFT minted successfully!");
      haptics.success();
      setState("success");
    }
  }, [isSuccess, txHash, fid, onSuccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setSignatureData(null);
      setState("idle");
    };
  }, []);

  const handleMint = useCallback(async () => {
    setState("checking_eligibility");

    if (!fid || !generatedImage) {
      toast.error("No image to mint");
      setState("idle");
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // Sanitize image to prevent double-prefix bug
      console.log("[MINT-PAID] Sanitizing image data...");
      const sanitizedImage = sanitizeImageData(generatedImage);
      console.log("[MINT-PAID] ✅ Image sanitized", {
        originalLength: generatedImage.length,
        sanitizedLength: sanitizedImage.length,
        preview: sanitizedImage.substring(0, 50) + "...",
      });

      // Validate image size
      const validation = validateImageSize(sanitizedImage);
      if (!validation.valid) {
        haptics.error();
        toast.error(validation.error || "Image validation failed");
        setState("idle");
        return;
      }

      // Step 1: Pre-flight eligibility check
      console.log("[MINT-PAID] Step 1: Checking eligibility", { fid });

      const eligibilityResult = await checkEligibility(
        fid.toString(),
        sanitizedImage
      );

      if (!eligibilityResult.success) {
        throw new Error(eligibilityResult.error || "Eligibility check failed");
      }

      console.log("[MINT-PAID] ✅ Eligibility check passed");

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Step 2: Get fresh signature (NO x402 payment)
      console.log("[MINT-PAID] Step 2: Getting fresh signature", {
        fid,
        address,
      });
      setState("getting_signature");

      const signatureResponse = await fetch("/api/get-mint-signature-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: address,
          fid: fid.toString(),
        }),
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        throw new Error(errorData.error || "Failed to get mint signature");
      }

      const signature = await signatureResponse.json();

      console.log("[MINT-PAID] Signature received", {
        hasVoucher: !!signature.voucher,
        hasSignature: !!signature.signature,
      });

      if (!signature.voucher || !signature.signature) {
        throw new Error("Incomplete signature response");
      }

      setSignatureData(signature);

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Step 3: Simulate mint
      console.log("[MINT-PAID] Step 3: Simulating mint");
      setState("simulating");

      const simulationResult = await simulateMint(
        signature.voucher,
        sanitizedImage,
        signature.signature
      );

      if (!simulationResult.success) {
        throw new Error(simulationResult.error || "Contract simulation failed");
      }

      console.log("[MINT-PAID] ✅ Simulation passed");

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Step 4: Execute mint transaction
      console.log("[MINT-PAID] Step 4: Executing mint transaction");
      setState("minting");
      await mintNFT(signature, sanitizedImage);

      // Success handled in useEffect
    } catch (error) {
      console.error("[MINT-PAID] Mint error:", error);

      if (abortControllerRef.current?.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to mint";

      // Update payment tracking to 'failed' status
      if (fid) {
        fetch(`/api/payment-tracking/${fid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "failed" }),
        }).catch((err) => {
          console.error("[MINT-PAID] Failed to update status to failed:", err);
        });
      }

      setState("idle");
      setSignatureData(null);
      haptics.error();
      toast.error(errorMessage);
    }
  }, [fid, generatedImage, address, checkEligibility, simulateMint, mintNFT]);

  // Button content
  const getButtonContent = () => {
    switch (state) {
      case "checking_eligibility":
        return (
          <>
            <RotatingText
              messages={[
                "Checking eligibility...",
                "Verifying FID status...",
                "Validating image...",
              ]}
              interval={2000}
            />
          </>
        );
      case "getting_signature":
        return (
          <>
            <RotatingText
              messages={[
                "Generating signature...",
                "Preparing mint...",
                "Almost ready...",
              ]}
              interval={2000}
            />
          </>
        );
      case "simulating":
        return (
          <>
            <RotatingText
              messages={[
                "Simulating contract...",
                "Checking eligibility...",
                "Validating transaction...",
              ]}
              interval={2000}
            />
          </>
        );
      case "minting":
        return (
          <>
            <RotatingText
              messages={[
                "Minting on Base...",
                "Writing to blockchain...",
                "Immortalizing art...",
                "Delivering Geoplet...",
              ]}
              interval={2000}
            />
          </>
        );
      case "success":
        return "Minted!";
      default:
        return (
          <div className="text-lg flex flex-row">
            <Sparkles className="w-5 h-5" />
            MINT (paid)
          </div>
        );
    }
  };

  const hasRequiredData = !!fid && !!address && !!generatedImage;
  const isLoading =
    state === "checking_eligibility" ||
    state === "getting_signature" ||
    state === "simulating" ||
    state === "minting";
  const isDisabled =
    disabled || !hasRequiredData || isLoading || state === "success";

  return (
    <Button
      ref={buttonRef}
      onClick={handleMint}
      disabled={isDisabled}
      className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      size="lg"
      aria-label="Mint Geoplet (already paid)"
    >
      {getButtonContent()}
    </Button>
  );
}
