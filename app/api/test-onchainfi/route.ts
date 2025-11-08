/**
 * onchain.fi API Unit Test Route
 *
 * Tests each onchain.fi endpoint systematically to identify issues
 *
 * Usage: GET /api/test-onchainfi
 */

import { NextResponse } from 'next/server';

const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    statusText: string;
    data: unknown;
  };
  error?: string;
  duration?: number;
}

/**
 * Test 1: Supported Networks
 * GET /v1/supported
 */
async function testSupportedNetworks(): Promise<TestResult> {
  const start = Date.now();
  const testName = '1. Supported Networks';

  try {
    const url = `${ONCHAIN_API_URL}/supported`;

    console.log(`[TEST] ${testName} - Calling ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
      },
    });

    const data = await response.json();
    const duration = Date.now() - start;

    console.log(`[TEST] ${testName} - Response:`, JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'success') {
      return {
        name: testName,
        status: 'passed',
        request: {
          method: 'GET',
          url,
          headers: { 'X-API-Key': '***' },
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        duration,
      };
    } else {
      return {
        name: testName,
        status: 'failed',
        request: {
          method: 'GET',
          url,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        error: data.message || `HTTP ${response.status}`,
        duration,
      };
    }
  } catch (error) {
    return {
      name: testName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 2: Get Facilitators
 * GET /v1/facilitators?network=base&token=USDC
 */
async function testGetFacilitators(): Promise<TestResult> {
  const start = Date.now();
  const testName = '2. Get Facilitators';

  try {
    const url = `${ONCHAIN_API_URL}/facilitators?network=base&token=USDC`;

    console.log(`[TEST] ${testName} - Calling ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
      },
    });

    const data = await response.json();
    const duration = Date.now() - start;

    console.log(`[TEST] ${testName} - Response:`, JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'success') {
      return {
        name: testName,
        status: 'passed',
        request: {
          method: 'GET',
          url,
          headers: { 'X-API-Key': '***' },
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        duration,
      };
    } else {
      return {
        name: testName,
        status: 'failed',
        request: {
          method: 'GET',
          url,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        error: data.message || `HTTP ${response.status}`,
        duration,
      };
    }
  } catch (error) {
    return {
      name: testName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 3: Verify Payment
 * POST /v1/verify
 *
 * Note: This test uses a MOCK payment header for testing purposes
 * A real payment header would need to be generated from a wallet signature
 */
async function testVerifyPayment(paymentHeader?: string): Promise<TestResult> {
  const start = Date.now();
  const testName = '3. Verify Payment';

  try {
    const url = `${ONCHAIN_API_URL}/verify`;

    // Use provided payment header or skip if not available
    if (!paymentHeader) {
      return {
        name: testName,
        status: 'skipped',
        error: 'No payment header provided (requires real wallet signature)',
        duration: Date.now() - start,
      };
    }

    const requestBody = {
      paymentHeader,
      sourceNetwork: 'base',      // New format (supports cross-chain)
      destinationNetwork: 'base',  // New format (supports cross-chain)
      expectedAmount: '3.00',
      expectedToken: 'USDC',
      recipientAddress: RECIPIENT_ADDRESS,
      priority: 'balanced',
    };

    console.log(`[TEST] ${testName} - Calling ${url}`);
    console.log(`[TEST] ${testName} - Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const duration = Date.now() - start;

    console.log(`[TEST] ${testName} - Response:`, JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'success' && data.data?.valid) {
      return {
        name: testName,
        status: 'passed',
        request: {
          method: 'POST',
          url,
          headers: { 'X-API-Key': '***', 'Content-Type': 'application/json' },
          body: requestBody,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        duration,
      };
    } else {
      return {
        name: testName,
        status: 'failed',
        request: {
          method: 'POST',
          url,
          headers: { 'X-API-Key': '***', 'Content-Type': 'application/json' },
          body: requestBody,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        error: data.message || data.data?.reason || `HTTP ${response.status}`,
        duration,
      };
    }
  } catch (error) {
    return {
      name: testName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 4: Settle Payment
 * POST /v1/settle
 *
 * Note: This test uses a MOCK payment header for testing purposes
 */
async function testSettlePayment(paymentHeader?: string): Promise<TestResult> {
  const start = Date.now();
  const testName = '4. Settle Payment';

  try {
    const url = `${ONCHAIN_API_URL}/settle`;

    // Use provided payment header or skip if not available
    if (!paymentHeader) {
      return {
        name: testName,
        status: 'skipped',
        error: 'No payment header provided (requires real wallet signature)',
        duration: Date.now() - start,
      };
    }

    const requestBody = {
      paymentHeader,
      sourceNetwork: 'base',      // New format (supports cross-chain)
      destinationNetwork: 'base',  // New format (supports cross-chain)
      priority: 'balanced',
    };

    console.log(`[TEST] ${testName} - Calling ${url}`);
    console.log(`[TEST] ${testName} - Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const duration = Date.now() - start;

    console.log(`[TEST] ${testName} - Response:`, JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'success' && data.data?.settled) {
      return {
        name: testName,
        status: 'passed',
        request: {
          method: 'POST',
          url,
          headers: { 'X-API-Key': '***', 'Content-Type': 'application/json' },
          body: requestBody,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        duration,
      };
    } else {
      return {
        name: testName,
        status: 'failed',
        request: {
          method: 'POST',
          url,
          headers: { 'X-API-Key': '***', 'Content-Type': 'application/json' },
          body: requestBody,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
        error: data.message || data.data?.reason || `HTTP ${response.status}`,
        duration,
      };
    }
  } catch (error) {
    return {
      name: testName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 5: Verify + Settle (Complete Flow)
 */
async function testVerifyAndSettle(paymentHeader?: string): Promise<TestResult> {
  const start = Date.now();
  const testName = '5. Verify + Settle (Complete Flow)';

  if (!paymentHeader) {
    return {
      name: testName,
      status: 'skipped',
      error: 'No payment header provided (requires real wallet signature)',
      duration: Date.now() - start,
    };
  }

  try {
    // First verify
    const verifyResult = await testVerifyPayment(paymentHeader);

    if (verifyResult.status !== 'passed') {
      return {
        name: testName,
        status: 'failed',
        error: `Verify step failed: ${verifyResult.error}`,
        duration: Date.now() - start,
      };
    }

    // Then settle
    const settleResult = await testSettlePayment(paymentHeader);

    if (settleResult.status !== 'passed') {
      return {
        name: testName,
        status: 'failed',
        error: `Settle step failed: ${settleResult.error}`,
        duration: Date.now() - start,
      };
    }

    return {
      name: testName,
      status: 'passed',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: testName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

/**
 * Main test handler
 * GET /api/test-onchainfi?paymentHeader=...
 */
export async function GET(request: Request) {
  console.log('\n=== Starting onchain.fi API Tests ===\n');

  // Get payment header from query params if provided
  const { searchParams } = new URL(request.url);
  const paymentHeader = searchParams.get('paymentHeader') || undefined;

  const results: TestResult[] = [];

  // Run tests sequentially
  console.log('Running Test 1: Supported Networks...');
  results.push(await testSupportedNetworks());

  console.log('\nRunning Test 2: Get Facilitators...');
  results.push(await testGetFacilitators());

  console.log('\nRunning Test 3: Verify Payment...');
  results.push(await testVerifyPayment(paymentHeader));

  console.log('\nRunning Test 4: Settle Payment...');
  results.push(await testSettlePayment(paymentHeader));

  console.log('\nRunning Test 5: Verify + Settle...');
  results.push(await testVerifyAndSettle(paymentHeader));

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
  };

  console.log('\n=== Test Summary ===');
  console.log(`Total: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log('\n=== Tests Complete ===\n');

  return NextResponse.json({
    summary,
    results,
    apiUrl: ONCHAIN_API_URL,
    timestamp: new Date().toISOString(),
    note: paymentHeader
      ? 'Tests 3-5 ran with provided payment header'
      : 'Tests 3-5 skipped (no payment header provided). Add ?paymentHeader=... to URL to test verify/settle endpoints.',
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
