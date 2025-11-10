/**
 * Application Configuration
 *
 * Centralized configuration for URLs and environment-specific settings.
 * KISS Principle: Single source of truth for all domain/URL configuration.
 *
 * Usage:
 * - Import { appUrl, appName } from '@/lib/config'
 * - Use in metadata, share URLs, API calls, etc.
 */

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://geoplet.geoart.studio";

export const appName = process.env.NEXT_PUBLIC_APP_NAME || "Geoplet";

// Validate URL format in development
if (process.env.NODE_ENV === "development") {
  try {
    new URL(appUrl);
  } catch {
    console.error(`[CONFIG] Invalid NEXT_PUBLIC_APP_URL: ${appUrl}`);
  }
}
