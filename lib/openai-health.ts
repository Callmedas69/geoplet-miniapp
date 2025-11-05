// lib/openai-health.ts
//
// OpenAI Service Health Check
// Validates service availability and credit balance before generation

/**
 * Health check result
 */
export interface OpenAIHealthCheck {
  available: boolean;
  reason?: string;
  checkedAt: number;
}

/**
 * OpenAI service status response
 * https://status.openai.com/api/v2/status.json
 */
interface OpenAIStatusResponse {
  status: {
    description: string;
    indicator: string;
  };
}

/**
 * OpenAI billing credit response
 * https://api.openai.com/v1/dashboard/billing/credit_grants
 */
interface OpenAIBillingResponse {
  total_available: number;
}

/**
 * Check OpenAI service availability and credits
 *
 * Steps:
 * 1. Check service status (status.openai.com)
 * 2. Check remaining credits (OpenAI billing API)
 *
 * @returns Health check result with availability status
 */
export async function checkOpenAIAvailability(): Promise<OpenAIHealthCheck> {
  const checkedAt = Date.now();

  try {
    // Step 1: Check OpenAI service status
    console.log('[OPENAI-HEALTH] Checking service status...');

    const statusResponse = await fetch('https://status.openai.com/api/v2/status.json', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 10 second timeout for status check
      signal: AbortSignal.timeout(10000),
    });

    if (!statusResponse.ok) {
      return {
        available: false,
        reason: 'Unable to verify OpenAI service status',
        checkedAt,
      };
    }

    const statusData = await statusResponse.json() as OpenAIStatusResponse;
    const statusDescription = statusData.status.description.toLowerCase();

    // Check if service is operational
    if (!statusDescription.includes('operational')) {
      console.log('[OPENAI-HEALTH] ❌ Service not operational:', statusData.status.description);
      return {
        available: false,
        reason: `OpenAI service is currently ${statusData.status.description}`,
        checkedAt,
      };
    }

    console.log('[OPENAI-HEALTH] ✅ Service operational');

    // Step 2: Check remaining credits
    console.log('[OPENAI-HEALTH] Checking credits...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[OPENAI-HEALTH] ❌ OPENAI_API_KEY not configured');
      return {
        available: false,
        reason: 'OpenAI API key not configured',
        checkedAt,
      };
    }

    const billingResponse = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // 10 second timeout for billing check
      signal: AbortSignal.timeout(10000),
    });

    // Note: This endpoint may return 403 for some API keys (org-level permissions required)
    // If we can't check credits, we'll assume available (service status check passed)
    if (!billingResponse.ok) {
      if (billingResponse.status === 403) {
        console.log('[OPENAI-HEALTH] ⚠️ Credit check not available (permissions), assuming OK');
        return {
          available: true,
          checkedAt,
        };
      }

      console.error('[OPENAI-HEALTH] ❌ Billing check failed:', billingResponse.status);
      return {
        available: false,
        reason: 'Unable to verify OpenAI credit balance',
        checkedAt,
      };
    }

    const billingData = await billingResponse.json() as OpenAIBillingResponse;
    const remainingCredits = billingData.total_available;

    console.log('[OPENAI-HEALTH] Remaining credits:', remainingCredits);

    // Check if we have credits remaining
    if (remainingCredits <= 0) {
      console.error('[OPENAI-HEALTH] ❌ No credits remaining');
      return {
        available: false,
        reason: 'OpenAI credit balance exhausted',
        checkedAt,
      };
    }

    console.log('[OPENAI-HEALTH] ✅ Credits available');

    // All checks passed
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
