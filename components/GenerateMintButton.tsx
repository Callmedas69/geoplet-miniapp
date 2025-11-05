//components/GenerateMintButton.tsx

/**
 * GenerateMintButton - All-in-One Flow (REFACTORED)
 *
 * ONE CLICK Flow: Pay → Generate → Mint → Success (Auto-chained)
 *
 * 1. User clicks "Pay 2 USDC" once
 * 2. Payment wallet prompt → Backend verifies → Returns signature
 * 3. Auto-generate geometric image (no user action needed)
 * 4. Auto-mint NFT (mint wallet prompt appears)
 * 5. Success modal shows!
 *
 * Progress shown in button text:
 * - "Step 1/3: Processing Payment..."
 * - "Step 2/3: Generating Art..."
 * - "Step 3/3: Minting NFT..."
 *
 * REFACTOR IMPROVEMENTS:
 * - All-in-one button (one click triggers entire flow)
 * - No PaymentModal (status shown in button)
 * - Step X/3 progress indicators
 * - Smart error recovery (retry without re-payment)
 * - Minimal toast notifications (only final success + errors)
 * - Error code handling
 * - AbortController cleanup
 * - Full accessibility (ARIA labels)
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { useWarplets } from "@/hooks/useWarplets";
import { useGeoplet } from "@/hooks/useGeoplet";
import { usePayment, type MintSignatureResponse } from "@/hooks/usePayment";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import {
  generateImage,
  validateImageSize,
  checkFidMinted,
} from "@/lib/generators";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import { ErrorBoundary, ButtonErrorFallback } from "./ErrorBoundary";
import {
  AppError,
  PaymentErrorCode,
  MintErrorCode,
  getErrorMessage,
} from "@/types/errors";
import { TokenUSDC } from "@web3icons/react";
import { PAYMENT_CONFIG } from "@/lib/payment-config";

type ButtonState =
  | "idle" // Check USDC balance
  | "insufficient_usdc" // Show "Get USDC" button
  | "paying" // User approving payment in wallet
  | "paid" // Payment complete, ready to generate
  | "generating" // Creating geometric image
  | "ready_to_mint" // Image generated, ready to mint
  | "minting" // Submitting mint transaction
  | "success" // NFT minted!
  | "already_minted"; // FID already used

interface GenerateMintButtonProps {
  generatedImage: string | null;
  onGenerate: (imageData: string) => void;
  onSuccess: (txHash: string, tokenId: string) => void;
}

/**
 * Inner component with all logic
 * Wrapped by ErrorBoundary for error handling
 */
function GenerateMintButtonInner({
  generatedImage,
  onGenerate,
  onSuccess,
}: GenerateMintButtonProps) {
  const { nft, fid } = useWarplets();
  const { mintNFT, isLoading: isMinting, isSuccess, txHash } = useGeoplet();
  const { requestMintSignature } = usePayment(PAYMENT_CONFIG.MINT);
  const { hasEnoughUSDC, balance, mintPrice } = useUSDCBalance();

  const [state, setState] = useState<ButtonState>("idle");
  const [signatureData, setSignatureData] =
    useState<MintSignatureResponse | null>(null);

  // AbortController for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check USDC balance and FID status on mount
  useEffect(() => {
    async function checkInitialState() {
      if (!fid) return;

      // Check if already minted
      const minted = await checkFidMinted(fid.toString());
      if (minted) {
        setState("already_minted");
        return;
      }

      // Check USDC balance
      if (!hasEnoughUSDC) {
        setState("insufficient_usdc");
      } else {
        setState("idle");
      }
    }
    checkInitialState();
  }, [fid, hasEnoughUSDC]);

  // Track if success callback has been called to avoid duplicates
  const successCalledRef = useRef(false);

  // Handle minting success side effects (no state updates in effect)
  // State transition to "success" is handled in handleMint completion
  useEffect(() => {
    if (isSuccess && txHash && nft && !successCalledRef.current) {
      successCalledRef.current = true;

      // Only side effects here (callbacks, toasts), no setState
      onSuccess(txHash, nft.tokenId);
      toast.success("Geoplet NFT minted successfully!");
      haptics.success();
    }
  }, [isSuccess, txHash, nft, onSuccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Step 3: Handle Mint
   * Image ready → mint NFT with pre-authorized signature
   */
  const handleMint = useCallback(async () => {
    if (!signatureData || !generatedImage) {
      toast.error("Missing signature or image data");
      return;
    }

    try {
      // Validate image size
      const validation = validateImageSize(generatedImage);
      if (!validation.valid) {
        haptics.error();
        toast.error(validation.error || "Image validation failed");
        return;
      }

      setState("minting");
      await mintNFT(signatureData, generatedImage);
      // Success state - mint completed successfully
      setState("success");
    } catch (error) {
      console.error("Mint error:", error);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Handle error codes
      if (error instanceof AppError) {
        const message = getErrorMessage(error.code, error.details);

        if (error.code === MintErrorCode.FID_ALREADY_MINTED) {
          setState("already_minted");
        } else if (
          error.code === PaymentErrorCode.SIGNATURE_EXPIRED ||
          error.code === PaymentErrorCode.INVALID_SIGNATURE
        ) {
          setState("idle");
          setSignatureData(null);
        } else if (error.code === MintErrorCode.IMAGE_TOO_LARGE) {
          setState("paid"); // Allow regenerate
        } else if (error.code === MintErrorCode.TX_REJECTED) {
          setState("ready_to_mint"); // Allow retry
        } else {
          setState("ready_to_mint");
        }

        toast.error(message);
      } else if (error instanceof Error) {
        // Fallback for non-AppError errors (during transition period)
        const msg = error.message.toLowerCase();
        let errorMessage = "Failed to mint NFT";

        if (msg.includes("fid already minted") || msg.includes("already")) {
          errorMessage =
            "Your Farcaster ID has already been used to mint a Geoplet";
          setState("already_minted");
        } else if (msg.includes("signature expired")) {
          errorMessage =
            "Payment signature expired (5 min limit). Please pay again.";
          setState("idle");
          setSignatureData(null);
        } else if (msg.includes("invalid signature")) {
          errorMessage = "Invalid payment signature. Please try again.";
          setState("idle");
          setSignatureData(null);
        } else if (msg.includes("max supply reached")) {
          errorMessage = "All Geoplets have been minted!";
        } else if (msg.includes("image too large")) {
          errorMessage = "Image is too large (max 24KB). Please regenerate.";
          setState("paid"); // Allow regenerate
        } else if (
          msg.includes("user rejected") ||
          msg.includes("user denied")
        ) {
          errorMessage = "Transaction cancelled";
          setState("ready_to_mint"); // Allow retry
        } else {
          errorMessage = error.message;
          setState("ready_to_mint");
        }

        toast.error(errorMessage);
      } else {
        toast.error("Failed to mint NFT");
        setState("ready_to_mint");
      }

      haptics.error();
    }
  }, [signatureData, generatedImage, mintNFT]);

  /**
   * Step 2: Handle Generate
   * Payment complete → generate geometric art
   */
  const handleGenerate = useCallback(async () => {
    if (!nft) {
      toast.error("Warplet not loaded");
      return;
    }

    try {
      setState("generating");
      const imageData = await generateImage(nft);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      onGenerate(imageData);
      setState("ready_to_mint");

      // Auto-chain: Proceed to mint
      await handleMint();
    } catch (error) {
      console.error("Generation error:", error);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate image";
      haptics.error();
      toast.error(errorMessage);
      setState("paid"); // Allow retry
    }
  }, [nft, onGenerate, handleMint]);

  /**
   * Step 1: Handle Payment
   * User clicks "Pay 2 USDC" → wallet prompts → payment settles → signature received
   */
  const handlePayment = useCallback(async () => {
    if (!fid) {
      toast.error("Warplet not loaded");
      return;
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      setState("paying");

      // Manual x402 payment flow
      const signature = await requestMintSignature(fid.toString());

      // Check if aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setSignatureData(signature);
      setState("paid");

      // Auto-chain: Proceed to generation
      await handleGenerate();
    } catch (error) {
      console.error("Payment error:", error);

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Handle error codes
      if (error instanceof AppError) {
        const message = getErrorMessage(error.code, error.details);

        if (error.code === PaymentErrorCode.INSUFFICIENT_FUNDS) {
          setState("insufficient_usdc");
        } else if (
          error.code === PaymentErrorCode.USER_REJECTED ||
          error.code === PaymentErrorCode.USER_CANCELLED
        ) {
          toast.info("Payment cancelled. Click again when ready.");
          setState("idle");
        } else {
          toast.error(message);
          setState("idle");
        }
      } else if (error instanceof Error) {
        // Fallback for non-AppError errors (during transition period)
        const msg = error.message.toLowerCase();

        if (msg.includes("insufficient")) {
          toast.error(`Insufficient funds.`);
          setState("insufficient_usdc");
        } else if (
          msg.includes("rejected") ||
          msg.includes("denied") ||
          msg.includes("cancel")
        ) {
          toast.info("Payment cancelled. Click again when ready.");
          setState("idle");
        } else {
          toast.error(error.message);
          setState("idle");
        }
      } else {
        toast.error("Payment failed");
        setState("idle");
      }

      haptics.error();
    }
  }, [fid, requestMintSignature, balance, mintPrice, handleGenerate]);

  /**
   * Handle Button Click - Route to correct step
   * Primary flow: "idle" triggers auto-chain (Payment → Generate → Mint)
   * Error recovery: "paid" and "ready_to_mint" allow retry without re-payment
   */
  const handleClick = useCallback(async () => {
    switch (state) {
      case "idle":
        // ONE CLICK: Start auto-chain flow (Payment → Generate → Mint)
        await handlePayment();
        break;
      case "insufficient_usdc":
        // Open Uniswap to buy USDC on Base
        window.open(
          "https://app.uniswap.org/#/swap?outputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&chain=base",
          "_blank"
        );
        break;
      case "paid":
        // ERROR RECOVERY: Generation failed, retry generation only (already paid)
        await handleGenerate();
        break;
      case "ready_to_mint":
        // ERROR RECOVERY: Mint failed, retry mint only (already generated)
        await handleMint();
        break;
      default:
        break;
    }
  }, [state, handlePayment, handleGenerate, handleMint]);

  /**
   * Get Button Text based on current state
   * Shows "Step X/3" progress for all-in-one flow
   */
  const getButtonText = useCallback(() => {
    switch (state) {
      case "idle":
        return (
          <span className="flex items-center justify-center gap-2">
            <TokenUSDC variant="branded" size="128" />{" "}
            <span className="text-xs">${mintPrice} USDC</span>
          </span>
        );
      case "insufficient_usdc":
        return `Get USDC (need ${mintPrice}, have ${balance})`;
      case "paying":
        return (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>initiate x402...</span>
          </span>
        );
      case "paid":
        return "Retry Generation";
      case "generating":
        return (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>geofying...</span>
          </span>
        );
      case "ready_to_mint":
        return "Retry Mint";
      case "minting":
        return (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>delivering geoplet...</span>
          </span>
        );
      case "success":
        return "Minted";
      case "already_minted":
        return "Minted";
      default:
        return "Pay & Mint";
    }
  }, [state, mintPrice, balance]);

  /**
   * Get ARIA label for screen readers
   */
  const getAriaLabel = useCallback(() => {
    switch (state) {
      case "idle":
        return `Pay ${mintPrice} USDC to mint your Geoplet NFT - All steps will proceed automatically`;
      case "insufficient_usdc":
        return `Get USDC - You need ${mintPrice} but only have ${balance}`;
      case "paying":
        return "Step 1 of 3: Processing payment, please wait";
      case "paid":
        return "Retry generating your Geoplet artwork";
      case "generating":
        return "Step 2 of 3: Creating your Geoplet image, please wait";
      case "ready_to_mint":
        return "Retry minting your Geoplet NFT";
      case "minting":
        return "Step 3 of 3: Minting your NFT, please wait for blockchain confirmation";
      case "success":
        return "Your Geoplet NFT has been minted successfully";
      case "already_minted":
        return "This Farcaster ID has already minted a Geoplet";
      default:
        return "Mint Geoplet NFT button";
    }
  }, [state, mintPrice, balance]);

  /**
   * Check if button is in processing state
   */
  const isProcessing = useCallback(() => {
    return ["paying", "generating", "minting"].includes(state);
  }, [state]);

  const isDisabled =
    state === "paying" ||
    state === "generating" ||
    state === "minting" ||
    state === "success" ||
    state === "already_minted" ||
    !nft;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={getAriaLabel()}
      aria-busy={isProcessing()}
      aria-disabled={isDisabled}
      aria-live="polite"
      className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto bg-white text-black hover:bg-gray-100 font-semibold text-xs sm:text-lg touch-target haptic-press disabled:opacity-50 disabled:cursor-not-allowed"
      size="lg"
    >
      {getButtonText()}
    </Button>
  );
}

/**
 * Exported component with ErrorBoundary wrapper
 */
export function GenerateMintButton(props: GenerateMintButtonProps) {
  return (
    <ErrorBoundary
      fallback={<ButtonErrorFallback />}
      onError={(error, errorInfo) => {
        console.error("GenerateMintButton error:", error, errorInfo);
        // Could send to error tracking service here
      }}
    >
      <GenerateMintButtonInner {...props} />
    </ErrorBoundary>
  );
}
