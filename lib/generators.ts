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

  // Add data URI prefix if raw base64 (KISS: display layer transformation)
  const dataUri = imageData.startsWith('data:')
    ? imageData
    : `data:image/webp;base64,${imageData}`;

  await sdk.actions.composeCast({
    text: `Just minted my Geoplet NFT! 🎨 Transform your Warplet at Geoplet #Geoplet #BaseNetwork\n\nOriginal: ${nftName || `Warplet #${tokenId}`}`,
    embeds: [dataUri, 'https://geoplet.geoart.studio'],
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
 * Sanitize image data to prevent double-prefix bugs
 * Contract (Geoplets.sol:341) adds the "data:image/webp;base64," prefix when building tokenURI
 * Therefore, we must return ONLY raw base64 (no prefix)
 *
 * Handles cases like:
 * - Raw base64: "iVBORw0KG..." -> "iVBORw0KG..." (unchanged)
 * - Single prefix: "data:image/png;base64,iVBORw0KG..." -> "iVBORw0KG..."
 * - Double prefix: "data:image/webp;base64,data:image/png;base64,iVBORw0KG..." -> "iVBORw0KG..."
 *
 * @param imageData - Image data (raw base64 or with data URI prefix)
 * @returns Raw base64 string (no prefix)
 */
export function sanitizeImageData(imageData: string): string {
  if (!imageData) {
    throw new Error('Image data is required');
  }

  let cleanBase64 = imageData;

  // Strip all data URI prefixes (handles double-prefix case)
  // Keep removing prefixes until none remain
  while (cleanBase64.includes('data:image/')) {
    const parts = cleanBase64.split(',');
    // Remove the first part (prefix) and keep everything after
    parts.shift();
    cleanBase64 = parts.join(',');
  }

  // Clean whitespace, quotes, and escape sequences
  cleanBase64 = cleanBase64.trim().replace(/['"\\]/g, '');

  // Validate base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
    throw new Error('Invalid base64 format after sanitization');
  }

  if (cleanBase64.length === 0) {
    throw new Error('No valid base64 data found');
  }

  // Return ONLY raw base64 (contract adds prefix in tokenURI)
  return cleanBase64;
}

/**
 * Validate image size before minting (24KB limit)
 * Matches contract validation (Geoplets.sol line 206: bytes(base64ImageData).length <= 24576)
 *
 * Now handles double-prefix cases by using sanitization
 */
export function validateImageSize(imageData: string): {
  valid: boolean;
  sizeKB: number;
  error?: string;
} {
  // Extract raw base64 (handles single prefix, double prefix, and raw base64)
  let rawBase64 = imageData;

  // Strip all data URI prefixes (handles double-prefix bug)
  while (rawBase64.includes('data:image/')) {
    const parts = rawBase64.split(',');
    parts.shift();
    rawBase64 = parts.join(',');
  }

  // Clean whitespace and quotes
  rawBase64 = rawBase64.trim().replace(/['"\\]/g, '');

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
