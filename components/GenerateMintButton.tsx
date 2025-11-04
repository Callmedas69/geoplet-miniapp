//components/GenerateMintButton.tsx

/**
 * GenerateMintButton - Pay First Flow (REFACTORED)
 *
 * Correct Flow: Pay → Generate → Mint → Success
 *
 * 1. User pays $2 USDC (via x402 wallet prompt)
 * 2. Backend verifies payment → returns mint signature
 * 3. Generate geometric image (already paid for)
 * 4. Mint NFT with pre-authorized signature
 * 5. Success!
 *
 * REFACTOR IMPROVEMENTS:
 * - Removed emoji dependencies → Plain text labels
 * - Added ARIA labels and accessibility
 * - Error code handling instead of string matching
 * - AbortController for cleanup
 * - Error boundary wrapper
 * - useCallback memoization
 * - Responsive breakpoints
 * - Semantic loading indicators
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
import { PaymentModal } from "./PaymentModal";
import { ErrorBoundary, ButtonErrorFallback } from "./ErrorBoundary";
import {
  isAPIError,
  AppError,
  PaymentErrorCode,
  MintErrorCode,
  getErrorMessage,
  type APIError,
} from "@/types/errors";

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
  const {
    requestMintSignature,
    status: paymentStatus,
    error: paymentError,
    reset: resetPayment
  } = usePayment();
  const { hasEnoughUSDC, balance, mintPrice } = useUSDCBalance();

  const [state, setState] = useState<ButtonState>("idle");
  const [signatureData, setSignatureData] =
    useState<MintSignatureResponse | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  // Update state based on minting status
  useEffect(() => {
    if (isMinting) {
      setState("minting");
    } else if (isSuccess && txHash) {
      setState("success");
      if (nft) {
        onSuccess(txHash, nft.tokenId);
      }
    }
  }, [isMinting, isSuccess, txHash, nft, onSuccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (showPaymentModal) {
        setShowPaymentModal(false);
      }
    };
  }, [showPaymentModal]);

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
      setShowPaymentModal(true);

      // Manual x402 payment flow
      const signature = await requestMintSignature(fid.toString());

      // Check if aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setSignatureData(signature);
      setState("paid");
      setShowPaymentModal(false);
      toast.success("Payment verified! Now let's create your art.");
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
          toast.error(`Insufficient USDC. You have $${balance}, need $${mintPrice}`);
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

      setShowPaymentModal(false);
      haptics.error();
    }
  }, [fid, requestMintSignature, balance, mintPrice]);

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
      toast.success("Artwork created! Ready to mint.");
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
  }, [nft, onGenerate]);

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
      toast.success("Minting transaction submitted!");
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
          errorMessage = "Your Farcaster ID has already been used to mint a Geoplet";
          setState("already_minted");
        } else if (msg.includes("signature expired")) {
          errorMessage = "Payment signature expired (5 min limit). Please pay again.";
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
   * Handle Button Click - Route to correct step
   */
  const handleClick = useCallback(async () => {
    switch (state) {
      case "idle":
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
        await handleGenerate();
        break;
      case "ready_to_mint":
        await handleMint();
        break;
      default:
        break;
    }
  }, [state, handlePayment, handleGenerate, handleMint]);

  /**
   * Get Button Text based on current state
   * Plain text labels (no emojis)
   */
  const getButtonText = useCallback(() => {
    switch (state) {
      case "idle":
        return `Pay ${mintPrice} USDC`;
      case "insufficient_usdc":
        return `Get USDC (need ${mintPrice}, have ${balance})`;
      case "paying":
        return (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Processing Payment...</span>
          </span>
        );
      case "paid":
        return "Generate Artwork";
      case "generating":
        return (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Creating Image...</span>
          </span>
        );
      case "ready_to_mint":
        return "Mint NFT";
      case "minting":
        return (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Minting...</span>
          </span>
        );
      case "success":
        return "Minted Successfully";
      case "already_minted":
        return "Already Minted";
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
        return `Pay ${mintPrice} USDC to mint your Geoplet NFT`;
      case "insufficient_usdc":
        return `Get USDC - You need ${mintPrice} but only have ${balance}`;
      case "paying":
        return "Processing payment, please wait";
      case "paid":
        return "Generate your Geoplet artwork";
      case "generating":
        return "Creating your Geoplet image, please wait";
      case "ready_to_mint":
        return "Mint your Geoplet NFT to the blockchain";
      case "minting":
        return "Minting your NFT, please wait for blockchain confirmation";
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
    <>
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={getAriaLabel()}
        aria-busy={isProcessing()}
        aria-disabled={isDisabled}
        aria-live="polite"
        className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto bg-white text-black hover:bg-gray-100 font-semibold text-base sm:text-lg touch-target haptic-press disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        {getButtonText()}
      </Button>

      <PaymentModal
        isOpen={showPaymentModal}
        status={paymentStatus}
        amount={mintPrice}
        error={paymentError}
        onCancel={() => {
          setShowPaymentModal(false);
          setState("idle");
          resetPayment();
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }}
      />
    </>
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
