import { sdk } from '@farcaster/miniapp-sdk';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { WarpletNFT } from '@/hooks/useWarplets';

/**
 * Generate geometric art from Warplet NFT
 */
export async function generateImage(nft: WarpletNFT): Promise<string> {
  haptics.tap();

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: nft.imageUrl,
      tokenId: nft.tokenId,
      name: nft.name,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Generation failed');
  }

  const result = await response.json();

  haptics.success();
  toast.success('Geometric art generated!');

  return result.imageData;
}

/**
 * Share generated image to Farcaster
 */
export async function shareToFarcaster(
  imageData: string,
  tokenId: string,
  nftName?: string
): Promise<void> {
  haptics.tap();

  await sdk.actions.composeCast({
    text: `Just minted my Geoplet NFT! 🎨 Transform your Warplet at Geoplet #Geoplet #BaseNetwork\n\nOriginal: ${nftName || `Warplet #${tokenId}`}`,
    embeds: [imageData],
  });

  haptics.success();
  toast.success('Shared to Farcaster!');
}

/**
 * Download image to device
 */
export function downloadImage(imageData: string, tokenId: string): void {
  haptics.tap();

  const link = document.createElement('a');
  link.href = imageData;
  link.download = `geoplet-${tokenId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  haptics.success();
  toast.success('Image downloaded!');
}

/**
 * Check if FID is already minted
 */
export async function checkFidMinted(fid: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/check-fid?fid=${fid}`);
    if (response.ok) {
      const data = await response.json();
      return data.isMinted;
    }
    return false;
  } catch (error) {
    console.warn('Failed to check mint status:', error);
    return false;
  }
}

/**
 * Validate image size before minting (24KB limit)
 */
export function validateImageSize(imageData: string): {
  valid: boolean;
  sizeKB: number;
  error?: string;
} {
  const base64Data = imageData.split(',')[1] || '';
  const sizeInKB = (base64Data.length * 0.75) / 1024;

  if (sizeInKB > 24) {
    return {
      valid: false,
      sizeKB: sizeInKB,
      error: `Image too large: ${sizeInKB.toFixed(2)}KB. Maximum is 24KB.`,
    };
  }

  if (sizeInKB > 20) {
    toast.warning(`⚠️ Image is ${sizeInKB.toFixed(2)}KB (close to 24KB limit)`);
  }

  return { valid: true, sizeKB: sizeInKB };
}
