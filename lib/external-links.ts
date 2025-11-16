/**
 * External Links Utility
 *
 * Handles opening external URLs using Farcaster's in-app browser
 * via sdk.actions.openUrl() to keep users within the Farcaster app
 */

import { sdk } from "@farcaster/miniapp-sdk";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

/**
 * Opens an external URL in Farcaster's in-app browser
 *
 * @param url - The URL to open (e.g., Basescan, OpenSea, Twitter)
 * @param serviceName - Optional name of the service for error messages
 *
 * @example
 * ```ts
 * await openExternalUrl('https://basescan.org/tx/0x123', 'BaseScan');
 * await openExternalUrl('https://opensea.io/assets/base/0x123/1', 'OpenSea');
 * ```
 */
export async function openExternalUrl(
  url: string,
  serviceName?: string
): Promise<void> {
  try {
    await sdk.actions.openUrl(url);
    haptics.tap();
  } catch (error) {
    const service = serviceName || "link";
    console.error(`Failed to open ${service}:`, error);
    haptics.error();
    toast.error(`Failed to open ${service}`);
  }
}
