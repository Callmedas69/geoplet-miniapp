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
    embeds: [imageData, 'https://geoplet.geoart.studio'],
  });

  haptics.success();
  toast.success('Shared to Farcaster!');
}

/**
 * Download image to device
 */
export function downloadImage(imageData: string, tokenId: string): void {
  haptics.tap();

  // Add data URI prefix if raw base64 (KISS: display layer transformation)
  const dataUri = imageData.startsWith('data:')
    ? imageData
    : `data:image/webp;base64,${imageData}`;

  const link = document.createElement('a');
  link.href = dataUri;
  link.download = `geoplet-${tokenId}.webp`;
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
 * Matches contract validation (Geoplets.sol line 206: bytes(base64ImageData).length <= 24576)
 */
export function validateImageSize(imageData: string): {
  valid: boolean;
  sizeKB: number;
  error?: string;
} {
  // Extract raw base64 (handles both data URI and raw base64)
  const rawBase64 = imageData.startsWith('data:')
    ? imageData.split(',')[1] || ''
    : imageData;

  // Validate on raw base64 size (matches contract exactly)
  const sizeInBytes = rawBase64.length;
  const sizeInKB = sizeInBytes / 1024;

  if (sizeInBytes > 24576) {
    return {
      valid: false,
      sizeKB: sizeInKB,
      error: `Image too large: ${sizeInKB.toFixed(2)}KB. Maximum is 24KB.`,
    };
  }

  if (sizeInBytes > 20480) {
    toast.warning(`⚠️ Image is ${sizeInKB.toFixed(2)}KB (close to 24KB limit)`);
  }

  return { valid: true, sizeKB: sizeInKB };
}
