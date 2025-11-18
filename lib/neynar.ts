import { NeynarAPIClient } from '@neynar/nodejs-sdk';

/**
 * Neynar API Client
 *
 * Singleton client for interacting with Neynar API (Farcaster infrastructure)
 * Used for posting casts, managing users, and other Farcaster operations
 *
 * Requires environment variables:
 * - NEYNAR_API_KEY: API key from neynar.com/developers
 * - NEYNAR_SIGNER_UUID: UUID of the managed signer (identifies which account posts)
 */

if (!process.env.NEYNAR_API_KEY) {
  throw new Error('NEYNAR_API_KEY is not configured in environment variables');
}

export const neynarClient = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_API_KEY,
});

/**
 * Get the signer UUID for cast operations
 * This identifies which Farcaster account will post the casts
 */
export function getSignerUuid(): string {
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;

  if (!signerUuid) {
    throw new Error('NEYNAR_SIGNER_UUID is not configured in environment variables');
  }

  return signerUuid;
}
