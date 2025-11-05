'use client';

import { useState, useRef } from 'react';
import { usePayment } from '@/hooks/usePayment';
import { PAYMENT_CONFIG } from '@/lib/payment-config';
import { sdk } from '@farcaster/miniapp-sdk';
import Image from 'next/image';

export function AnimationGenerator() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedAnimation, setGeneratedAnimation] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const payment = usePayment(PAYMENT_CONFIG.ANIMATION);

  /**
   * Handle image upload
   */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setError(null);
      setGeneratedAnimation(null);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Generate animation
   */
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      if (!selectedImage) {
        throw new Error('Please select an image first');
      }

      if (!payment.isConnected) {
        throw new Error('Please connect your wallet');
      }

      // TODO: Update to use x402 payment flow
      // if (!payment.hasBalance(PRICE)) {
      //   throw new Error(`Insufficient USDC balance. You need ${PRICE} USDC`);
      // }

      // Step 1: Pay $5 USDC (TODO: Update to x402)
      console.log('Processing payment...');
      // const txHash = await payment.pay(PRICE);
      // console.log('Payment successful:', txHash);
      throw new Error('Animation generation temporarily disabled during payment system upgrade');

      // Step 2: Call API to generate animation
      console.log('Generating animation...');
      const response = await fetch('/api/generate-animation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash: 'placeholder', // TODO: Update with x402 payment
          imageData: selectedImage,
          userAddress: payment.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      setGeneratedAnimation(result.animationUrl);

      console.log('Animation generated successfully!');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate animation');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Share to Farcaster
   */
  const handleShare = async () => {
    try {
      if (!generatedAnimation) return;

      await sdk.actions.composeCast({
        text: 'Check out my animated image created with Geoplet! 🎬✨',
        embeds: [generatedAnimation],
      });
    } catch (err) {
      console.error('Share failed:', err);
      setError('Failed to share to Farcaster');
    }
  };

  /**
   * Reset state
   */
  const handleReset = () => {
    setSelectedImage(null);
    setGeneratedAnimation(null);
    setError(null);
    payment.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🎥 Animation Generator</h3>
        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">${PAYMENT_CONFIG.ANIMATION.price} USDC</span>
      </div>

      {/* Upload Section */}
      {!generatedAnimation && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center cursor-pointer hover:border-white/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <div className="relative w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden">
                <Image
                  src={selectedImage}
                  alt="Selected"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">🎬</div>
                <p className="text-sm text-indigo-100">Click to upload image</p>
                <p className="text-xs text-indigo-200">PNG, JPG up to 5MB</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Wallet Info */}
          {payment.isConnected && (
            <div className="text-xs text-indigo-100 space-y-1">
              <p>Payment Status: {payment.status}</p>
              <p>Price: {payment.price} USDC</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedImage || isGenerating || !payment.isConnected}
            className="w-full bg-white text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {payment.status === 'processing' && 'Processing payment...'}
                {payment.status === 'verifying' && 'Verifying...'}
                {payment.status === 'success' && 'Generating animation...'}
                {payment.status === 'idle' && 'Generating animation...'}
              </span>
            ) : (
              `Animate for ${PAYMENT_CONFIG.ANIMATION.price} USDC`
            )}
          </button>
        </div>
      )}

      {/* Result Section */}
      {generatedAnimation && (
        <div className="space-y-4">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
            <video
              src={generatedAnimation}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 bg-white text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Share 🚀
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-white/20 text-white font-semibold py-3 rounded-xl hover:bg-white/30 transition-colors"
            >
              New Animation
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-100">
          ⚠️ {error}
        </div>
      )}

      {/* Payment Error */}
      {payment.error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-100">
          ⚠️ {payment.error}
        </div>
      )}

      {/* Note about xAI */}
      <div className="mt-4 text-xs text-indigo-200 bg-white/5 rounded-lg p-3">
        💡 Note: Make sure you have a valid xAI API key configured in .env.local
      </div>
    </div>
  );
}
