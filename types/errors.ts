/**
 * Error Types and Error Codes
 *
 * Structured error handling for the Geoplet application
 * Replaces fragile string-based error matching with reliable error codes
 *
 * Usage:
 * - Backend returns errors with codes
 * - Frontend handles errors based on codes, not string matching
 * - Type-safe error handling throughout the app
 */

/**
 * Payment Error Codes
 * Used in x402 payment flow and mint signature generation
 */
export enum PaymentErrorCode {
  // User-related errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  USER_REJECTED = 'USER_REJECTED',
  USER_CANCELLED = 'USER_CANCELLED',

  // Signature-related errors
  SIGNATURE_EXPIRED = 'SIGNATURE_EXPIRED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  SIGNATURE_GENERATION_FAILED = 'SIGNATURE_GENERATION_FAILED',

  // Payment-related errors
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',

  // Network and API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  ONCHAIN_FI_ERROR = 'ONCHAIN_FI_ERROR',

  // Rate limiting and throttling
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Minting Error Codes
 * Used in NFT minting process
 */
export enum MintErrorCode {
  // Mint-specific errors
  FID_ALREADY_MINTED = 'FID_ALREADY_MINTED',
  MAX_SUPPLY_REACHED = 'MAX_SUPPLY_REACHED',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  IMAGE_VALIDATION_FAILED = 'IMAGE_VALIDATION_FAILED',

  // Contract errors
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',

  // User wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK = 'WRONG_NETWORK',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',

  // Transaction errors
  TX_REVERTED = 'TX_REVERTED',
  TX_TIMEOUT = 'TX_TIMEOUT',
  TX_REJECTED = 'TX_REJECTED',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Generation Error Codes
 * Used in image/animation generation
 */
export enum GenerationErrorCode {
  // OpenAI API errors
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  OPENAI_RATE_LIMIT = 'OPENAI_RATE_LIMIT',
  OPENAI_TIMEOUT = 'OPENAI_TIMEOUT',

  // Generation errors
  GENERATION_FAILED = 'GENERATION_FAILED',
  INVALID_PROMPT = 'INVALID_PROMPT',
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',

  // Image processing errors
  IMAGE_PROCESSING_FAILED = 'IMAGE_PROCESSING_FAILED',
  IMAGE_DOWNLOAD_FAILED = 'IMAGE_DOWNLOAD_FAILED',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Combine all error codes for type checking
 */
export type AppErrorCode = PaymentErrorCode | MintErrorCode | GenerationErrorCode;

/**
 * Structured API Error Response
 * This is the shape of error responses from the backend
 */
export interface APIError {
  code: AppErrorCode;
  message: string;
  details?: {
    [key: string]: unknown;
    // Common detail fields
    required?: string; // For INSUFFICIENT_FUNDS
    available?: string; // For INSUFFICIENT_FUNDS
    deadline?: number; // For SIGNATURE_EXPIRED
    maxSize?: number; // For IMAGE_TOO_LARGE
    actualSize?: number; // For IMAGE_TOO_LARGE
    txHash?: string; // For transaction errors
    blockNumber?: number; // For blockchain errors
  };
}

/**
 * Success Response (for consistency)
 */
export interface APISuccess<T = unknown> {
  success: true;
  data: T;
}

/**
 * Combined API Response
 */
export type APIResponse<T = unknown> = APISuccess<T> | { error: APIError };

/**
 * Type guard to check if response is an error
 */
export function isAPIError(response: unknown): response is { error: APIError } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as { error: APIError }).error === 'object' &&
    'code' in (response as { error: APIError }).error &&
    'message' in (response as { error: APIError }).error
  );
}

/**
 * Type guard to check if response is success
 */
export function isAPISuccess<T>(response: unknown): response is APISuccess<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as APISuccess<T>).success === true &&
    'data' in response
  );
}

/**
 * Error class for application errors
 * Extends Error with error code and details
 */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public details?: APIError['details']
  ) {
    super(message);
    this.name = 'AppError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create AppError from API error response
   */
  static fromAPIError(apiError: APIError): AppError {
    return new AppError(apiError.code, apiError.message, apiError.details);
  }

  /**
   * Convert to API error format
   */
  toAPIError(): APIError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * User-friendly error messages
 * Maps error codes to user-facing messages
 */
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  // Payment errors
  [PaymentErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient USDC balance',
  [PaymentErrorCode.USER_REJECTED]: 'Payment cancelled by user',
  [PaymentErrorCode.USER_CANCELLED]: 'Payment cancelled',
  [PaymentErrorCode.SIGNATURE_EXPIRED]: 'Payment signature expired (5 min limit)',
  [PaymentErrorCode.INVALID_SIGNATURE]: 'Invalid payment signature',
  [PaymentErrorCode.SIGNATURE_GENERATION_FAILED]: 'Failed to generate signature',
  [PaymentErrorCode.PAYMENT_VERIFICATION_FAILED]: 'Payment verification failed',
  [PaymentErrorCode.PAYMENT_TIMEOUT]: 'Payment timed out',
  [PaymentErrorCode.PAYMENT_REJECTED]: 'Payment was rejected',
  [PaymentErrorCode.NETWORK_ERROR]: 'Network error occurred',
  [PaymentErrorCode.API_ERROR]: 'API error occurred',
  [PaymentErrorCode.ONCHAIN_FI_ERROR]: 'Payment processor error',
  [PaymentErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests, please wait',
  [PaymentErrorCode.TOO_MANY_REQUESTS]: 'Too many requests, please wait',

  // Mint errors
  [MintErrorCode.FID_ALREADY_MINTED]: 'Your Farcaster ID has already been used to mint',
  [MintErrorCode.MAX_SUPPLY_REACHED]: 'All Geoplets have been minted',
  [MintErrorCode.IMAGE_TOO_LARGE]: 'Image is too large (max 24KB)',
  [MintErrorCode.IMAGE_VALIDATION_FAILED]: 'Image validation failed',
  [MintErrorCode.CONTRACT_ERROR]: 'Smart contract error',
  [MintErrorCode.TRANSACTION_FAILED]: 'Transaction failed',
  [MintErrorCode.GAS_ESTIMATION_FAILED]: 'Gas estimation failed',
  [MintErrorCode.WALLET_NOT_CONNECTED]: 'Wallet not connected',
  [MintErrorCode.WRONG_NETWORK]: 'Wrong network, please switch to Base',
  [MintErrorCode.INSUFFICIENT_GAS]: 'Insufficient gas for transaction',
  [MintErrorCode.TX_REVERTED]: 'Transaction reverted',
  [MintErrorCode.TX_TIMEOUT]: 'Transaction timed out',
  [MintErrorCode.TX_REJECTED]: 'Transaction rejected by user',

  // Generation errors
  [GenerationErrorCode.OPENAI_API_ERROR]: 'Image generation service error',
  [GenerationErrorCode.OPENAI_RATE_LIMIT]: 'Rate limit reached, please wait',
  [GenerationErrorCode.OPENAI_TIMEOUT]: 'Image generation timed out',
  [GenerationErrorCode.GENERATION_FAILED]: 'Failed to generate image',
  [GenerationErrorCode.INVALID_PROMPT]: 'Invalid generation prompt',
  [GenerationErrorCode.CONTENT_POLICY_VIOLATION]: 'Content policy violation',
  [GenerationErrorCode.IMAGE_PROCESSING_FAILED]: 'Image processing failed',
  [GenerationErrorCode.IMAGE_DOWNLOAD_FAILED]: 'Failed to download image',

  // Unknown errors
  UNKNOWN_ERROR: 'An unknown error occurred',
};

/**
 * Get user-friendly message for error code
 */
export function getErrorMessage(code: AppErrorCode, details?: APIError['details']): string {
  const baseMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;

  // Add details if available
  if (details) {
    if (code === PaymentErrorCode.INSUFFICIENT_FUNDS && details.required && details.available) {
      return `${baseMessage}. Need $${parseFloat(details.required) / 1e6} USDC, have $${parseFloat(details.available) / 1e6} USDC`;
    }

    if (code === MintErrorCode.IMAGE_TOO_LARGE && details.maxSize && details.actualSize) {
      return `${baseMessage}. Maximum ${details.maxSize}KB, your image is ${details.actualSize}KB`;
    }
  }

  return baseMessage;
}
