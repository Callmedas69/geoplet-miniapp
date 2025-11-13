"use client";

/**
 * MintButton Component
 *
 * Handles minting of generated Geoplet ($1 USDC)
 * - Enabled when generated image exists
 * - Integrates x402 payment verification
 * - Shows success modal
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
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
import { RotatingText } from "./RotatingText";
import { PAYMENT_CONFIG } from "@/lib/payment-config";
import { useContractSimulation } from "@/hooks/useContractSimulation";
import { gsap } from "gsap";

type ButtonState =
  | "idle"
  | "insufficient_usdc"
  | "checking_eligibility"
  | "paying"
  | "simulating"
  | "settling"
  | "minting"
  | "success"
  | "already_minted";

interface MintButtonProps {
  disabled?: boolean;
  generatedImage: string | null;
  onSuccess: (txHash: string, tokenId: string) => void;
}

export function MintButton({
  disabled = false,
  generatedImage,
  onSuccess,
}: MintButtonProps) {
  const { address } = useAccount();
  const { nft, fid } = useWarplets();
  const { mintNFT, isLoading: isMinting, isSuccess, txHash } = useGeoplet();
  const { requestMintSignature } = usePayment(PAYMENT_CONFIG.MINT);
  const {
    hasEnoughUSDC,
    balance,
    mintPrice,
    isLoading: isBalanceLoading,
  } = useUSDCBalance();
  const { checkEligibility, simulateMint } = useContractSimulation();

  const [state, setState] = useState<ButtonState>("idle");
  const [isCheckingMintStatus, setIsCheckingMintStatus] = useState(false);
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

  // Check FID and USDC balance on mount
  useEffect(() => {
    async function checkInitialState() {
      if (!fid) return;

      setIsCheckingMintStatus(true);
      const minted = await checkFidMinted(fid.toString());
      setIsCheckingMintStatus(false);

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
        console.error("[MINT] Failed to update payment tracking:", err);
        // Don't block success - mint succeeded
      });

      // Call success callback with FID (which equals Geoplet tokenId in 1:1 mapping)
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
    // Immediately disable button to prevent double-click
    setState("checking_eligibility");

    if (!fid || !generatedImage) {
      toast.error("No image to mint");
      setState("idle");
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // Validate image size
      const validation = validateImageSize(generatedImage);
      if (!validation.valid) {
        haptics.error();
        toast.error(validation.error || "Image validation failed");
        setState("idle");
        return;
      }

      // Step 0: Pre-flight eligibility check (BEFORE payment)
      console.log("[MINT] Step 0: Checking eligibility before payment", {
        fid,
      });

      const eligibilityResult = await checkEligibility(
        fid.toString(),
        generatedImage
      );

      if (!eligibilityResult.success) {
        throw new Error(eligibilityResult.error || "Eligibility check failed");
      }

      console.log("[MINT] ✅ Eligibility check passed");

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Step 1: Payment (verify only, no settlement yet - per LOG.md)
      console.log("[MINT] Step 1: Starting payment verification", {
        fid,
        address,
      });
      setState("paying");
      const signature = await requestMintSignature(fid.toString());

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // ✅ DEFENSIVE VALIDATION: Verify signature structure
      console.log("[MINT] Signature received", {
        hasSignature: !!signature,
        hasVoucher: !!signature?.voucher,
        hasSignatureField: !!signature?.signature,
        hasPaymentHeader: !!signature?.paymentHeader,
        voucherTo: signature?.voucher?.to,
        voucherFid: signature?.voucher?.fid,
      });

      if (
        !signature ||
        !signature.voucher ||
        !signature.signature ||
        !signature.paymentHeader
      ) {
        throw new Error(
          "Payment verification succeeded but incomplete response received. Please contact support."
        );
      }

      setSignatureData(signature);

      // Step 2: Parallel checks (per LOG.md)
      console.log("[MINT] Step 2: Running parallel simulation + verification");
      setState("simulating");

      const simulationResult = await simulateMint(
        signature.voucher,
        generatedImage,
        signature.signature
      );

      if (!simulationResult.success) {
        throw new Error(simulationResult.error || "Contract simulation failed");
      }

      console.log("[MINT] ✅ Simulation passed");

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Step 3: Settle payment (per LOG.md)
      console.log("[MINT] Step 3: Settling payment onchain");
      setState("settling");

      const settleResponse = await fetch("/api/settle-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: fid.toString(),
          paymentHeader: signature.paymentHeader,
          userAddress: signature.voucher.to,
        }),
      });

      const settleData = await settleResponse.json();

      if (!settleResponse.ok || !settleData.success) {
        throw new Error(settleData.error || "Payment settlement failed");
      }

      console.log("[MINT] ✅ Payment settled:", settleData.txHash);

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Step 4: Execute mint transaction
      console.log("[MINT] Step 4: Executing mint transaction", {
        hasSignature: !!signature,
        imageSize: generatedImage.length,
      });
      setState("minting");
      await mintNFT(signature, generatedImage);

      // Success handled in useEffect
    } catch (error) {
      console.error("Mint error:", error);

      if (abortControllerRef.current?.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to mint";

      // Handle specific errors
      if (errorMessage.toLowerCase().includes("minted")) {
        setState("already_minted");
      } else if (errorMessage.toLowerCase().includes("signature expired")) {
        setState("idle");
        setSignatureData(null);
      } else if (errorMessage.toLowerCase().includes("rejected")) {
        setState("idle");
        setSignatureData(null);
      } else {
        setState("idle");
        setSignatureData(null);
      }

      haptics.error();
      toast.error(errorMessage);
    }
  }, [
    fid,
    generatedImage,
    checkEligibility,
    requestMintSignature,
    simulateMint,
    mintNFT,
    address,
  ]);

  // Button content
  const getButtonContent = () => {
    switch (state) {
      case "insufficient_usdc":
        return (
          <p className="flex items-center gap-2">
            <TokenUSDC className="w-5 h-5" variant="branded" />
            Insufficient Fund
          </p>
        );
      case "checking_eligibility":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <RotatingText
              messages={[
                "Checking eligibility...",
                "Verifying FID status...",
                "Validating image...",
              ]}
              interval={1500}
            />
          </>
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
      case "simulating":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <RotatingText
              messages={[
                "Simulating contract...",
                "Checking eligibility...",
                "Validating transaction...",
              ]}
              interval={1500}
            />
          </>
        );
      case "settling":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <RotatingText
              messages={[
                "Settling payment...",
                "Transferring USDC...",
                "Confirming onchain...",
              ]}
              interval={1500}
            />
          </>
        );
      case "minting":
        return (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <RotatingText
              messages={[
                "Minting on Base...",
                "Writing to blockchain...",
                "Immortalizing art...",
                "Delivering Geoplet...",
              ]}
              interval={1500}
            />
          </>
        );
      case "success":
        return "Minted!";
      case "already_minted":
        return "Minted";
      default:
        return (
          <>
            <Sparkles className="w-5 h-5" />
            MINT (${PAYMENT_CONFIG.MINT.price})
          </>
        );
    }
  };

  // Check if all required data is available
  const hasRequiredData = !!fid && !!address && !!generatedImage;

  const isLoading =
    state === "checking_eligibility" ||
    state === "paying" ||
    state === "simulating" ||
    state === "settling" ||
    state === "minting";
  const isDisabled =
    disabled ||
    !hasRequiredData ||
    isBalanceLoading ||
    isCheckingMintStatus ||
    isLoading ||
    state === "success" ||
    state === "already_minted" ||
    state === "insufficient_usdc";

  return (
    <Button
      ref={buttonRef}
      onClick={handleMint}
      disabled={isDisabled}
      className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      size="lg"
      aria-label={`Mint Geoplet for $${PAYMENT_CONFIG.MINT.price}`}
    >
      {getButtonContent()}
    </Button>
  );
}
