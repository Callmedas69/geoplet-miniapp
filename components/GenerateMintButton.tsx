/**
 * GenerateMintButton - Pay First Flow
 *
 * Correct Flow: Pay → Generate → Mint → Success
 *
 * 1. User pays $2 USDC (via x402 wallet prompt)
 * 2. Backend verifies payment → returns mint signature
 * 3. Generate geometric image (already paid for)
 * 4. Mint NFT with pre-authorized signature
 * 5. Success!
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useWarplets } from '@/hooks/useWarplets';
import { useGeoplet } from '@/hooks/useGeoplet';
import { usePayment, type MintSignatureResponse } from '@/hooks/usePayment';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { generateImage, validateImageSize, checkFidMinted } from '@/lib/generators';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

type ButtonState =
  | 'idle' // Check USDC balance
  | 'insufficient_usdc' // Show "Get USDC" button
  | 'paying' // User approving payment in wallet
  | 'paid' // Payment complete, ready to generate
  | 'generating' // Creating geometric image
  | 'ready_to_mint' // Image generated, ready to mint
  | 'minting' // Submitting mint transaction
  | 'success' // NFT minted!
  | 'already_minted'; // FID already used

interface GenerateMintButtonProps {
  generatedImage: string | null;
  onGenerate: (imageData: string) => void;
  onSuccess: (txHash: string, tokenId: string) => void;
}

export function GenerateMintButton({
  generatedImage,
  onGenerate,
  onSuccess,
}: GenerateMintButtonProps) {
  const { nft, fid } = useWarplets();
  const { mintNFT, isLoading: isMinting, isSuccess, txHash } = useGeoplet();
  const { requestMintSignature, status: paymentStatus } = usePayment();
  const { hasEnoughUSDC, balance, mintPrice } = useUSDCBalance();

  const [state, setState] = useState<ButtonState>('idle');
  const [signatureData, setSignatureData] = useState<MintSignatureResponse | null>(null);

  // Check USDC balance and FID status on mount
  useEffect(() => {
    async function checkInitialState() {
      if (!fid) return;

      // Check if already minted
      const minted = await checkFidMinted(fid.toString());
      if (minted) {
        setState('already_minted');
        return;
      }

      // Check USDC balance
      if (!hasEnoughUSDC) {
        setState('insufficient_usdc');
      } else {
        setState('idle');
      }
    }
    checkInitialState();
  }, [fid, hasEnoughUSDC]);

  // Update state based on minting status
  useEffect(() => {
    if (isMinting) {
      setState('minting');
    } else if (isSuccess && txHash) {
      setState('success');
      if (nft) {
        onSuccess(txHash, nft.tokenId);
      }
    }
  }, [isMinting, isSuccess, txHash, nft, onSuccess]);

  /**
   * Step 1: Handle Payment
   * User clicks "Pay $2 USDC" → wallet prompts → payment settles → signature received
   */
  const handlePayment = async () => {
    if (!fid) {
      toast.error('Warplet not loaded');
      return;
    }

    try {
      setState('paying');
      toast.info('Please approve payment in your wallet...');

      // x402-fetch will handle the payment flow automatically
      const signature = await requestMintSignature(fid.toString());

      setSignatureData(signature);
      setState('paid');
      toast.success('Payment verified! Now let\'s create your art.');
    } catch (error) {
      console.error('Payment error:', error);

      let errorMessage = 'Payment failed';
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        if (msg.includes('insufficient')) {
          errorMessage = `Insufficient USDC. You have $${balance}, need $${mintPrice}`;
          setState('insufficient_usdc');
        } else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('user')) {
          errorMessage = 'Payment cancelled. Click again when ready.';
          setState('idle');
        } else {
          errorMessage = error.message;
          setState('idle');
        }
      }

      haptics.error();
      toast.error(errorMessage);
    }
  };

  /**
   * Step 2: Handle Generate
   * Payment complete → generate geometric art
   */
  const handleGenerate = async () => {
    if (!nft) {
      toast.error('Warplet not loaded');
      return;
    }

    try {
      setState('generating');
      const imageData = await generateImage(nft);
      onGenerate(imageData);
      setState('ready_to_mint');
      toast.success('Artwork created! Ready to mint.');
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate image';
      haptics.error();
      toast.error(errorMessage);
      setState('paid'); // Allow retry
    }
  };

  /**
   * Step 3: Handle Mint
   * Image ready → mint NFT with pre-authorized signature
   */
  const handleMint = async () => {
    if (!signatureData || !generatedImage) {
      toast.error('Missing signature or image data');
      return;
    }

    try {
      // Validate image size
      const validation = validateImageSize(generatedImage);
      if (!validation.valid) {
        haptics.error();
        toast.error(validation.error || 'Image validation failed');
        return;
      }

      setState('minting');
      await mintNFT(signatureData, generatedImage);
      toast.success('Minting transaction submitted!');
    } catch (error) {
      console.error('Mint error:', error);

      let errorMessage = 'Failed to mint NFT';
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        if (msg.includes('fid already minted') || msg.includes('already')) {
          errorMessage = 'Your Farcaster ID has already been used to mint a Geoplet';
          setState('already_minted');
        } else if (msg.includes('signature expired')) {
          errorMessage = 'Payment signature expired (5 min limit). Please pay again.';
          setState('idle');
          setSignatureData(null);
        } else if (msg.includes('invalid signature')) {
          errorMessage = 'Invalid payment signature. Please try again.';
          setState('idle');
          setSignatureData(null);
        } else if (msg.includes('max supply reached')) {
          errorMessage = 'All Geoplets have been minted!';
        } else if (msg.includes('image too large')) {
          errorMessage = 'Image is too large (max 24KB). Please regenerate.';
          setState('paid'); // Allow regenerate
        } else if (msg.includes('user rejected') || msg.includes('user denied')) {
          errorMessage = 'Transaction cancelled';
          setState('ready_to_mint'); // Allow retry
        } else {
          errorMessage = error.message;
        }
      }

      haptics.error();
      toast.error(errorMessage);

      // Only reset if not marked as already minted
      if (state !== 'already_minted' && !errorMessage.includes('expired') && !errorMessage.includes('invalid')) {
        setState('ready_to_mint');
      }
    }
  };

  /**
   * Handle Button Click - Route to correct step
   */
  const handleClick = async () => {
    switch (state) {
      case 'idle':
        await handlePayment();
        break;
      case 'insufficient_usdc':
        // Open Uniswap to buy USDC on Base
        window.open(
          'https://app.uniswap.org/#/swap?outputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&chain=base',
          '_blank'
        );
        break;
      case 'paid':
        await handleGenerate();
        break;
      case 'ready_to_mint':
        await handleMint();
        break;
      default:
        break;
    }
  };

  /**
   * Get Button Text based on current state
   */
  const getButtonText = () => {
    switch (state) {
      case 'idle':
        return `💳 Pay ${mintPrice} USDC`;
      case 'insufficient_usdc':
        return `Get USDC (need $${mintPrice}, have $${balance})`;
      case 'paying':
        return (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Processing Payment...
          </span>
        );
      case 'paid':
        return '🎨 Generate Artwork';
      case 'generating':
        return (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Generating...
          </span>
        );
      case 'ready_to_mint':
        return '✨ Mint NFT';
      case 'minting':
        return (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Minting...
          </span>
        );
      case 'success':
        return '✅ NFT Minted!';
      case 'already_minted':
        return '✅ Already Minted';
      default:
        return '💳 Pay & Mint';
    }
  };

  const isDisabled =
    state === 'paying' ||
    state === 'generating' ||
    state === 'minting' ||
    state === 'success' ||
    state === 'already_minted' ||
    !nft;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      className="w-full max-w-md mx-auto bg-white text-black hover:bg-gray-100 font-semibold text-base sm:text-lg touch-target haptic-press disabled:opacity-50"
      size="lg"
    >
      {getButtonText()}
    </Button>
  );
}
