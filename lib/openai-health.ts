// lib/openai-health.ts
//
// OpenAI Service Health Check (Simplified - KISS Principle)
// Just validates API key is configured, lets OpenAI SDK handle failures

/**
 * Health check result
 */
export interface OpenAIHealthCheck {
  available: boolean;
  reason?: string;
  checkedAt: number;
}

/**
 * Check OpenAI API key configuration
 *
 * SIMPLIFIED APPROACH (KISS):
 * - Only checks if API key exists
 * - Lets OpenAI SDK handle retries/errors (industry standard)
 * - Removed: status.openai.com check (external dependency)
 * - Removed: billing API check (returns 403 for most keys)
 *
 * @returns Health check result with availability status
 */
export async function checkOpenAIAvailability(): Promise<OpenAIHealthCheck> {
  const checkedAt = Date.now();

  try {
    // SIMPLIFIED: Just check if API key is configured
    // Let OpenAI SDK handle retries and errors (KISS principle)
    console.log('[OPENAI-HEALTH] Checking API key configuration...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[OPENAI-HEALTH] ❌ OPENAI_API_KEY not configured');
      return {
        available: false,
        reason: 'OpenAI API key not configured',
        checkedAt,
      };
    }

    console.log('[OPENAI-HEALTH] ✅ API key configured');

    // Assume available - let actual API calls fail fast if service is down
    // This follows industry standard (Stripe, Vercel AI SDK, etc.)
    return {
      available: true,
      checkedAt,
    };

  } catch (error: unknown) {
    console.error('[OPENAI-HEALTH] ❌ Health check error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      available: false,
      reason: `Health check failed: ${errorMessage}`,
      checkedAt,
    };
  }
}
