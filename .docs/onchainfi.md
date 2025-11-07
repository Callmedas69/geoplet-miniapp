Onchain Documentation
Smart x402 payment routing with automatic failover across multiple facilitators.

What is Onchain?
Onchain is an intelligent intermediary layer for x402 payments. Instead of integrating with a single facilitator (Coinbase CDP, x402.rs, Daydreams, Aurracloud, OpenX402, etc.), integrate once with Onchain and get automatic routing across multiple facilitators with failover, cost optimization, and speed prioritization.

Why Onchain?
Onchain is a payment aggregator for x402 payments. Launching with Base support, Onchain routes your payments across multiple facilitators with intelligent selection and automatic failover. Additional networks coming soon.

🔄 Multi-Facilitator Routing
Access multiple x402 facilitators (Coinbase CDP, x402.rs, Daydreams, Aurracloud, OpenX402) on Base through a single integration. Automatic failover if one facilitator is down. More networks launching progressively.

🎯 Intelligent Selection
Optimize for speed, cost, or reliability. Onchain scores each facilitator in real-time and routes to the optimal one based on your priority.

🌐 Language Agnostic
Use our Node.js client SDK OR call the REST API directly from any language (Python, Go, Ruby, PHP, etc.). Your choice.

⚡ Production Ready
Battle-tested error handling, automatic retries, health monitoring, and rate limiting. Built for production from day one.

Two Ways to Integrate
Option 1: Client SDK (Node.js)
Use our npm package for Express/Node.js apps. 3 lines of code to protect your endpoints.

npm install @onchainfi/x402-aggregator-client
Option 2: Direct REST API
Call our REST API from any language. Perfect for Python, Go, Ruby, PHP, or any backend.

curl -X POST https://api.onchain.fi/v1/verify \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentHeader": "...",
    "network": "base",
    "expectedAmount": "1.00",
    "expectedToken": "USDC",
    "recipientAddress": "0x..."
  }'
Quick Start
Add x402 payments to your Express app in 3 lines of code.

1. Get Your API Key
Request a free API key at onchain.fi/get-api-key

2. Install the Client
npm install @onchainfi/x402-aggregator-client
3. Add Middleware
import express from 'express';
import { x402Middleware } from '@onchainfi/x402-aggregator-client';

const app = express();

app.use(x402Middleware({
  apiKey: process.env.ONCHAIN_API_KEY,
  recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  endpoints: {
    'GET /api/premium': { price: '$0.10', network: 'base' }
  }
}));

// This endpoint now requires payment!
app.get('/api/premium', (req, res) => {
  res.json({ message: 'Premium content!' });
});

app.listen(3000);
Get API Key
Get a free API key in 30 seconds:

Option 1: Web Form
Visit onchain.fi/get-api-key and enter your email.

Option 2: cURL
curl -X POST https://api.onchain.fi/v1/api-keys/request \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
You'll receive your API key via email within seconds.

Express Middleware
The easiest way to protect your Express API endpoints with x402 payments.

Basic Example
import { x402Middleware } from '@onchainfi/x402-aggregator-client';

app.use(x402Middleware({
  apiKey: process.env.ONCHAIN_API_KEY,
  recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  endpoints: {
    'GET /api/premium': { 
      price: '$0.10',
      network: 'base' 
    },
  },
}));
Advanced Configuration
app.use(x402Middleware({
  apiKey: process.env.ONCHAIN_API_KEY,
  recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  
  endpoints: {
    'GET /api/basic': { 
      price: '$0.05',
      priority: 'cost' // Optimize for lowest fees
    },
    'POST /api/generate': { 
      price: '$0.50',
      priority: 'speed' // Optimize for fastest settlement
    },
  },

  defaultNetwork: 'base',
  defaultPriority: 'balanced',
  autoSettle: true, // Settle after successful response
  skipRoutes: ['/health', '/metrics'], // Don't require payment
  
  onSuccess: (payment, req, res) => {
    console.log('Payment settled:', payment.txHash);
  },
  
  onError: (error, req, res, next) => {
    console.error('Payment failed:', error.message);
  },
}));
Standalone Client
Use the client directly in any Node.js application (without Express).

Initialize Client
import { X402Client } from '@onchainfi/x402-aggregator-client';

const client = new X402Client({
  apiKey: process.env.ONCHAIN_API_KEY,
});
Verify and Settle Payment
const result = await client.verifyAndSettle(
  paymentHeader,
  {
    network: 'base',
    expectedAmount: '1.00',
    expectedToken: 'USDC',
    recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  }
);

if (result.verified && result.settled) {
  console.log('Payment successful!', result.txHash);
}
Configuration
Client Config
apiKeyrequired
Your onchain API key

apiBaseUrloptional
Custom API URL (default: production)

timeoutoptional
Request timeout in ms (default: 30000)

retriesoptional
Number of retries (default: 3)

Endpoint Config
pricerequired
Payment amount (e.g., "$0.10", "1.00 USDC")

networkoptional
Blockchain network (default: "base")

priorityoptional
Routing priority: "speed", "cost", "reliability", "balanced"

tokenoptional
Payment token (default: "USDC")

Verify Payment
Verify a payment without settling it onchain.

POST
/v1/verify
Request
{
  "paymentHeader": "base64-encoded-x402-header",
  "network": "base",
  "expectedAmount": "1.00",
  "expectedToken": "USDC",
  "recipientAddress": "0x..",
  "priority": "balanced"
}
Response (200 OK)
{
  "status": "success",
  "data": {
    "valid": true,
    "facilitator": "Coinbase CDP",
    "from": "0x.."
  }
}
Authentication Required: Include X-API-Key header with your API key.

Example: Python
import requests

response = requests.post(
    'https://api.onchain.fi/v1/verify',
    headers={
        'X-API-Key': 'your-api-key',
        'Content-Type': 'application/json'
    },
    json={
        'paymentHeader': payment_header,
        'network': 'base',
        'expectedAmount': '1.00',
        'expectedToken': 'USDC',
        'recipientAddress': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        'priority': 'balanced'
    }
)

data = response.json()
if data['data']['valid']:
    print(f"Payment verified! TX: {data['data']['txHash']}")
Settle Payment
Execute a verified payment onchain.

POST
/v1/settle
Request
{
  "paymentHeader": "base64-encoded-x402-header",
  "network": "base",
  "priority": "balanced"
}
Response (200 OK)
{
  "status": "success",
  "data": {
    "success": true,
    "settled": true,
    "facilitator": "Coinbase CDP",
    "txHash": "0x..."
  }
}
Get Facilitators
List all available payment facilitators with health status.

GET
/v1/facilitators
No authentication required.

Response
{
  "status": "success",
  "data": {
    "facilitators": [
      {
        "name": "Coinbase CDP",
        "networks": ["base"],
        "pricing": {
          "verifyFee": 0,
          "settleFee": 0,
          "percentageFee": 0
        },
        "health": {
          "isHealthy": true,
          "latencyMs": 234
        }
      }
    ],
    "count": 2
  }
}
Supported Networks
Onchain launches with Base support. Additional networks are being added progressively.

GET
/v1/supported
{
  "status": "success",
  "data": {
    "networks": ["base"],
    "features": {
      "supportsERC3009": true,
      "supportsERC20": true,
      "supportsMultiNetwork": false
    }
  }
}
Live Now
✓
Base - Full support
Coming Soon
→
Ethereum
→
Polygon
→
Solana
How x402 Works
x402 is a protocol for HTTP payment authentication developed by Coinbase. It enables gasless, meta-transaction payments using ERC-3009 transferWithAuthorization.

Payment Flow
Client signs EIP-712 payment authorization
Client sends request with X-Payment header
Onchain verifies payment via optimal facilitator
If valid, server processes request
Payment is settled onchain after successful response
Why Onchain?
→
Multi-facilitator routing: Automatic failover if one facilitator is down
→
Intelligent selection: Choose facilitators by speed, cost, or reliability
→
Easy integration: 3 lines of code vs 50+ for direct integration
→
Progressive expansion: Launching on Base, more networks coming soon
Routing Priorities
Control how Onchain selects the optimal facilitator for each payment.

speed
Optimize for fastest settlement (70% weight on latency)

cost
Optimize for lowest fees (70% weight on pricing)

reliability
Optimize for highest uptime (70% weight on SLA)

balanced
Equal weight to all factors (default)

Error Handling
The client SDK provides typed errors for common scenarios.

Error Types
import {
  AuthenticationError,
  PaymentVerificationError,
  PaymentSettlementError,
  NetworkError,
  ValidationError,
} from '@onchainfi/x402-aggregator-client';

try {
  const result = await client.verify({...});
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid API key
  } else if (error instanceof PaymentVerificationError) {
    // Payment verification failed
    console.log(error.reason);
  } else if (error instanceof NetworkError) {
    // Network/connection issue
  }
}
Common Error Codes
400
Bad Request - Invalid parameters
401
Unauthorized - Missing or invalid API key
402
Payment Required - No payment or invalid payment
429
Too Many Requests - Rate limit exceeded
500
Internal Server Error - Server-side issue
API Key Security
⛔ Never Do This
✗
Commit API keys to version control
✗
Expose keys in client-side code
✗
Share keys publicly or in screenshots
✗
Hard-code keys in your application
✓ Best Practices
✓
Store keys in environment variables
✓
Use secrets management (Railway, Vercel, etc.)
✓
Rotate keys if compromised
✓
Use different keys for development/production
Environment Variables
# .env file
ONCHAIN_API_KEY=onchain_abc123...

# In your code
const apiKey = process.env.ONCHAIN_API_KEY;
Rate Limits
Payment Endpoints
Rate Limit:
100 requests per minute
Scope:
Per IP address
API Key Requests
Per Email:
3 requests per hour
Per IP:
10 requests per hour
Best Practices
1. Use Environment Variables
Never hard-code API keys. Use environment variables and secrets management.

// ✓ Good
const apiKey = process.env.ONCHAIN_API_KEY;

// ✗ Bad
const apiKey = 'onchain_abc123...';
2. Handle Errors Gracefully
Always implement proper error handling and provide clear messages to users.

app.use(x402Middleware({
  // ... config ...
  onError: (error, req, res, next) => {
    console.error('Payment error:', error);
    res.status(402).json({
      error: 'Payment required',
      message: 'Please provide valid payment'
    });
  }
}));
3. Test in Development
Test your integration thoroughly before going to production. Use testnet networks for development.

4. Monitor Your Usage
Keep track of payment volume, success rates, and errors to ensure smooth operation.

