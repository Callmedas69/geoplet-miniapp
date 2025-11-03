import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS as `0x${string}`;
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as `0x${string}`;
const EXPECTED_AMOUNT = '5.00'; // $5 USDC
const USDC_DECIMALS = 6;
const XAI_API_KEY = process.env.XAI_API_KEY;

// Create Base public client for verification
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

/**
 * Verify USDC payment on Base
 */
async function verifyPayment(txHash: string, userAddress: string): Promise<boolean> {
  try {
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== 'success') {
      throw new Error('Transaction failed or not found');
    }

    // Find Transfer event
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    );

    if (!transferLog) {
      throw new Error('No USDC transfer found in transaction');
    }

    // Decode transfer event
    const from = `0x${transferLog.topics[1]?.slice(26)}`.toLowerCase();
    const to = `0x${transferLog.topics[2]?.slice(26)}`.toLowerCase();
    const value = BigInt(transferLog.data);

    // Verify transfer details
    const expectedAmount = parseUnits(EXPECTED_AMOUNT, USDC_DECIMALS);
    const isCorrectSender = from === userAddress.toLowerCase();
    const isCorrectRecipient = to === RECIPIENT_ADDRESS.toLowerCase();
    const isCorrectAmount = value >= expectedAmount;

    if (!isCorrectSender) {
      throw new Error('Payment sender mismatch');
    }

    if (!isCorrectRecipient) {
      throw new Error('Payment recipient mismatch');
    }

    if (!isCorrectAmount) {
      throw new Error(`Insufficient payment amount. Expected ${EXPECTED_AMOUNT} USDC`);
    }

    return true;
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    throw new Error(error.message || 'Payment verification failed');
  }
}

/**
 * Generate animation using xAI/Grok
 * Note: xAI API integration depends on their actual API structure
 * This is a placeholder implementation - adjust according to xAI docs
 */
async function generateAnimation(imageData: string): Promise<string> {
  try {
    if (!XAI_API_KEY || XAI_API_KEY === 'my_api_key') {
      throw new Error('xAI API key not configured. Please set XAI_API_KEY in .env.local');
    }

    // xAI/Grok API call (placeholder - adjust based on actual API)
    // Assuming xAI has a similar structure to OpenAI
    const response = await fetch('https://api.x.ai/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Animate this image with smooth motion, dynamic effects, and cinematic quality',
        image: imageData,
        output_format: 'video',
        duration: 5, // 5 second animation
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `xAI API error: ${response.status}`);
    }

    const result = await response.json();
    const animationUrl = result.url || result.video_url || result.output;

    if (!animationUrl) {
      throw new Error('No animation generated');
    }

    return animationUrl;
  } catch (error: any) {
    console.error('xAI generation failed:', error);

    // Fallback: Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock animation URL for development');
      return 'https://example.com/mock-animation.mp4';
    }

    throw new Error(error.message || 'Animation generation failed');
  }
}

/**
 * POST /api/generate-animation
 * Generate animation from uploaded image
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, imageData, userAddress } = body;

    // Validation
    if (!txHash || !imageData || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: txHash, imageData, userAddress' },
        { status: 400 }
      );
    }

    // Verify payment ($5 USDC)
    console.log('Verifying payment for tx:', txHash);
    await verifyPayment(txHash, userAddress);
    console.log('Payment verified successfully');

    // Generate animation
    console.log('Generating animation...');
    const resultAnimationUrl = await generateAnimation(imageData);
    console.log('Animation generated:', resultAnimationUrl);

    return NextResponse.json({
      success: true,
      animationUrl: resultAnimationUrl,
      txHash,
    });
  } catch (error: any) {
    console.error('API Error:', error);

    // Determine error status code
    let statusCode = 500;
    if (error.message.includes('Payment')) {
      statusCode = 402; // Payment Required
    } else if (error.message.includes('Missing')) {
      statusCode = 400; // Bad Request
    }

    return NextResponse.json(
      {
        error: error.message || 'Animation generation failed',
        success: false,
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/generate-animation
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'animation-generation',
    price: `${EXPECTED_AMOUNT} USDC`,
    network: 'base',
    note: 'xAI API key required - update XAI_API_KEY in .env.local',
  });
}
