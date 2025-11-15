/**
 * Fetch Utilities
 *
 * Provides robust fetch wrappers with:
 * - Automatic retry with exponential backoff
 * - Configurable timeouts
 * - Error handling for transient failures
 *
 * Following KISS principle: Simple, reliable, professional
 */

export interface FetchWithRetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  retryOn5xx?: boolean;
  retryOnTimeout?: boolean;
}

/**
 * Fetch with automatic retry and timeout
 *
 * @param url - URL to fetch
 * @param options - Standard fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise<Response>
 *
 * Behavior:
 * - Retries on 5xx server errors (configurable)
 * - Retries on timeout/network errors (configurable)
 * - Does NOT retry on 4xx client errors
 * - Exponential backoff: 100ms, 200ms, 400ms, 800ms...
 * - Default timeout: 5 seconds
 * - Default max retries: 3
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    timeoutMs = 5000,
    retryOn5xx = true,
    retryOnTimeout = true,
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if we should retry on 5xx errors
      if (retryOn5xx && response.status >= 500 && response.status < 600) {
        lastError = new Error(`Server error: ${response.status} ${response.statusText}`);

        // Don't retry on last attempt
        if (attempt < maxRetries - 1) {
          const delay = 100 * Math.pow(2, attempt);
          console.warn(`[fetch-utils] Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries}) for ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Last attempt failed - return the error response
        return response;
      }

      // Success or non-retryable error (4xx)
      return response;

    } catch (error) {
      clearTimeout(timeoutId);
      const err = error as Error;

      // Handle timeout (AbortError)
      if (err.name === 'AbortError') {
        lastError = new Error(`Request timeout (${timeoutMs}ms)`);

        if (!retryOnTimeout || attempt >= maxRetries - 1) {
          throw lastError;
        }

        const delay = 100 * Math.pow(2, attempt);
        console.warn(`[fetch-utils] Timeout, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Network errors or other fetch failures
      lastError = err;

      // Don't retry if it looks like a client error
      if (err.message && (
        err.message.includes('400') ||
        err.message.includes('401') ||
        err.message.includes('403') ||
        err.message.includes('404')
      )) {
        throw err;
      }

      // Retry on network errors
      if (attempt < maxRetries - 1) {
        const delay = 100 * Math.pow(2, attempt);
        console.warn(`[fetch-utils] Network error, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed
      throw err;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Fetch failed after all retries');
}

/**
 * Simple fetch with timeout (no retry)
 * Useful when retry logic isn't desired
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request timeout (${timeoutMs}ms)`);
    }
    throw error;
  }
}
