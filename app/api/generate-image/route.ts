import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import sharp from 'sharp';
import { checkOpenAIAvailability } from '@/lib/openai-health';
import { supabaseAdmin } from '@/lib/supabase';

// x402 Payment Configuration
const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';
const REGENERATE_PRICE = '3.00'; // $3.00 USDC
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as string;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://geoplet.geoart.studio',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Conditional logging wrapper - only logs in development
 */
const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

/**
 * Verify and settle x402 payment via Onchain.fi API
 * (Same implementation as get-mint-signature route)
 */
async function verifyX402Payment(paymentHeader: string): Promise<boolean> {
  try {
    console.log('[ONCHAIN.FI] Step 1: Verifying payment...');

    // Step 1: Verify payment
    const verifyResponse = await fetch(`${ONCHAIN_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentHeader,
        network: 'base',
        expectedAmount: REGENERATE_PRICE,
        expectedToken: 'USDC',
        recipientAddress: RECIPIENT_ADDRESS,
        priority: 'balanced',
      }),
    });

    const verifyData = await verifyResponse.json();

    console.log('[ONCHAIN.FI] Verify response:', {
      status: verifyResponse.status,
      valid: verifyData.data?.valid,
    });

    if (!verifyResponse.ok || verifyData.status !== 'success' || !verifyData.data?.valid) {
      console.error('[ONCHAIN.FI] ❌ Verification failed:', verifyData.data?.reason);
      return false;
    }

    console.log('[ONCHAIN.FI] ✅ Payment verified');
    console.log('[ONCHAIN.FI] Step 2: Settling payment...');

    // Step 2: Settle payment
    const settleResponse = await fetch(`${ONCHAIN_API_URL}/settle`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentHeader,
        network: 'base',
        priority: 'balanced',
      }),
    });

    const settleData = await settleResponse.json();

    console.log('[ONCHAIN.FI] Settle response:', {
      status: settleResponse.status,
      settled: settleData.data?.settled,
      txHash: settleData.data?.txHash,
    });

    if (!settleResponse.ok || settleData.status !== 'success' || !settleData.data?.settled) {
      console.error('[ONCHAIN.FI] ❌ Settlement failed:', settleData.data?.reason);
      return false;
    }

    console.log('[ONCHAIN.FI] ✅ Payment settled successfully!');
    console.log('[ONCHAIN.FI] Transaction hash:', settleData.data.txHash);

    return true;
  } catch (error: unknown) {
    console.error('[ONCHAIN.FI] Payment error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error,
    });
    return false;
  }
}

/**
 * Generate geometric art using gpt-image-1 with direct image-to-image transformation
 */
async function generateGeometricArt(
  imageUrl: string,
  tokenId: string,
  name: string,
  retryCount = 0
): Promise<{ imageData: string; prompt: string }> {
  try {
    log(`\n🎨 Generating geometric art for ${name} (Token #${tokenId})`);
    log(`📷 Image URL: ${imageUrl}`);

    // Whitelist allowed image domains (SSRF prevention)
    const ALLOWED_DOMAINS = [
      'base-mainnet.g.alchemy.com',
      'nft-cdn.alchemy.com',
      'ipfs.io',
      'gateway.pinata.cloud',
      'res.cloudinary.com',        // Cloudinary CDN (Warpcast/Farcaster images)
      'imagedelivery.net',          // Cloudflare Images (Warpcast/Farcaster images)
    ];

    const url = new URL(imageUrl);
    const isAllowed = ALLOWED_DOMAINS.some(domain => url.hostname.includes(domain));

    if (!isAllowed) {
      throw new Error(`Invalid image URL domain: ${url.hostname}. Only whitelisted CDN domains allowed (Alchemy, IPFS, Cloudinary, Cloudflare).`);
    }

    // Fetch the original Warplet image
    log(`📥 Fetching image from URL...`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Convert to File object for OpenAI API
    const imageFile = await toFile(Buffer.from(imageBuffer), 'warplet.png', { type: 'image/png' });

    log(`🎨 Generating geometric interpretation with gpt-image-1...`);

    const prompt = `Transform this image into bauhaus and suprematism geometric art style with these strict rules:
    - Add random monsters attributes for halloween party
    - Use solid flat colors with subtle shading between shapes to create 3D depth
    - Use clean sharp edges and straight lines
    - Keep the character's exact pose as shown in reference image
    - Keep the character's exact body shape as shown in reference image
    - Plain solid pastel color background with more empty space around the smaller character`;


    log(`📝 Prompt: ${prompt}`);

    // Use images.edit() with gpt-image-1 for direct image-to-image transformation
    // Note: images.generate() with referenced_image does NOT exist in OpenAI SDK
    // input_fidelity: 'high' makes the model preserve pose/features more consistently
    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      input_fidelity: 'high',
    });

    log(`🔍 API Response received`);

    if (!response.data || response.data.length === 0) {
      console.error('❌ No data in response');
      throw new Error('No image generated by gpt-image-1');
    }

    // gpt-image-1 always returns base64-encoded images (b64_json), not URLs
    const b64Json = response.data[0]?.b64_json;

    if (!b64Json) {
      // Retry logic: if no data and haven't retried yet, try once more
      if (retryCount < 1) {
        console.warn(`⚠️ Empty response from gpt-image-1, retrying... (attempt ${retryCount + 1}/1)`);
        return await generateGeometricArt(imageUrl, tokenId, name, retryCount + 1);
      }
      console.error('❌ No b64_json in data after retry');
      throw new Error('No image data returned by gpt-image-1');
    }

    log(`✅ Received base64 image (${(b64Json.length / 1024).toFixed(2)} KB)`);

    // Compress image for on-chain storage (reduce payload size for minting)
    log(`🗜️ Compressing image for on-chain storage...`);
    const generatedImageBuffer = Buffer.from(b64Json, 'base64');
    const compressed = await sharp(generatedImageBuffer)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85, effort: 6 })
      .toBuffer();

    const compressedBase64 = compressed.toString('base64');
    const base64Data = `data:image/webp;base64,${compressedBase64}`;

    log(`✅ Compression complete! Original: ${(b64Json.length / 1024).toFixed(2)} KB → Compressed: ${(compressedBase64.length / 1024).toFixed(2)} KB`);
    log(`✅ Size reduction: ${(((b64Json.length - compressedBase64.length) / b64Json.length) * 100).toFixed(1)}%\n`);

    return { imageData: base64Data, prompt };
  } catch (error: unknown) {
    console.error('❌ Generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
    throw new Error(errorMessage);
  }
}

/**
 * Check if FID has already generated (has entry in Supabase)
 * Used to determine if generation should be FREE (first time) or PAID (regeneration)
 */
async function hasFidGenerated(fid: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('unminted_geoplets')
      .select('fid')
      .eq('fid', parseInt(fid))
      .limit(1);

    if (error) {
      console.error('[FID-CHECK] Supabase error:', error);
      // On error, assume not generated (allow free generation)
      return false;
    }

    const hasGenerated = data && data.length > 0;
    console.log(`[FID-CHECK] FID ${fid} has generated: ${hasGenerated}`);
    return hasGenerated;
  } catch (error) {
    console.error('[FID-CHECK] Error checking FID:', error);
    // On error, assume not generated (allow free generation)
    return false;
  }
}

// Handle OPTIONS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/generate-image
 * Generate geometric art from Warplet NFT
 * - FREE for first-time generation (auto-gen)
 * - $3 USDC for regeneration (x402 payment required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, tokenId, name, fid } = body;

    // Validation
    if (!imageUrl || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, tokenId' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate image URL format
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if this is a first-time generation (FREE) or regeneration (PAID)
    const isFirstTime = fid ? !(await hasFidGenerated(fid)) : false;

    console.log(`[GENERATION-TYPE] FID: ${fid}, First time: ${isFirstTime}`);

    // Get x402 payment header
    const paymentHeader = request.headers.get('X-Payment');

    // If no payment header AND not first time → require payment
    if (!paymentHeader && !isFirstTime) {
      // Return x402-compliant 402 response
      console.log('[X402] No X-Payment header found, returning 402 Payment Required');

      const amountInAtomicUnits = (parseFloat(REGENERATE_PRICE) * 1e6).toString();

      return NextResponse.json(
        {
          x402Version: 1,
          accepts: [
            {
              scheme: 'exact',
              network: 'base',
              maxAmountRequired: amountInAtomicUnits,
              asset: process.env.BASE_USDC_ADDRESS!,
              payTo: RECIPIENT_ADDRESS,
              resource: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/generate-image`,
              description: `Generate a new Geoplet artwork for ${REGENERATE_PRICE} USDC`,
              mimeType: 'application/json',
              maxTimeoutSeconds: 300,
              extra: {
                name: 'USD Coin',
                version: '2',
              },
            },
          ],
          error: 'Payment Required',
        },
        {
          status: 402,
          headers: corsHeaders,
        }
      );
    }

    // If first time (auto-gen) → skip payment, proceed directly to generation
    if (isFirstTime) {
      console.log('[AUTO-GEN] First-time generation - FREE (no payment required)');
    }

    // Pre-check OpenAI availability BEFORE settling payment
    console.log('[OPENAI-PRECHECK] Checking service availability before payment...');
    const health = await checkOpenAIAvailability();

    if (!health.available) {
      console.error('[OPENAI-PRECHECK] ❌ Service unavailable:', health.reason);
      return NextResponse.json(
        {
          error: health.reason || 'OpenAI service temporarily unavailable',
          success: false,
          code: 'OPENAI_UNAVAILABLE',
        },
        {
          status: 503,
          headers: corsHeaders,
        }
      );
    }

    console.log('[OPENAI-PRECHECK] ✅ Service available');

    // Only verify/settle payment if NOT first time (regeneration requires payment)
    if (!isFirstTime && paymentHeader) {
      console.log('[ONCHAIN.FI] Verifying and settling x402 payment...');
      const paymentValid = await verifyX402Payment(paymentHeader);

      if (!paymentValid) {
        return NextResponse.json(
          {
            error: 'Payment verification/settlement failed - Invalid or insufficient payment',
            success: false,
          },
          {
            status: 402,
            headers: corsHeaders,
          }
        );
      }

      console.log('[ONCHAIN.FI] Payment verified and settled successfully');
    }

    log(`\n🎨 Starting generation for Warplet #${tokenId}`);
    log(`📷 Image URL: ${imageUrl}`);
    log(`💰 Payment: ${isFirstTime ? 'FREE (first time)' : 'PAID ($3 USDC)'}`);

    // Generate geometric art
    const result = await generateGeometricArt(imageUrl, tokenId, name || `Warplet #${tokenId}`);

    log(`✅ Generation successful for Warplet #${tokenId}\n`);

    return NextResponse.json(
      {
        success: true,
        imageData: result.imageData, // Base64 for download and future onchain storage
        metadata: {
          tokenId,
          name: name || `Warplet #${tokenId}`,
          model: 'gpt-image-1',
          prompt: result.prompt,
          size: '1024x1024',
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
        },
      }
    );
  } catch (error: unknown) {
    console.error('❌ API Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Image generation failed';

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/generate-image
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'geometric-art-generation',
    price: `${REGENERATE_PRICE} USDC (x402)`,
    network: 'base',
    provider: 'OpenAI gpt-image-1',
    paymentProtocol: 'x402 (onchain.fi)',
  });
}
