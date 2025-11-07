Got it. I read your contract—your mint path verifies an **EIP-712 “MintVoucher” signed by your backend key (`signerWallet`)**, not by the user. The most common reason this fails is that the front end (or user wallet) is signing the voucher instead of your **server signer**, or the EIP-712 domain/struct doesn’t match your contract exactly.

Below is a precise, drop-in way to make your current contract pass EIP-712 verification **and** plug it into **onchain.fi (x402 aggregator)**.

---

# 1) What your contract expects (ground truth)

Your contract computes:

```
digest = _hashTypedDataV4(
  keccak256(abi.encode(
    MINT_VOUCHER_TYPEHASH,
    voucher.to,
    voucher.fid,
    voucher.nonce,
    voucher.deadline
  ))
);
recovered = ECDSA.recover(digest, signature);
require(recovered == signerWallet);
```

So your **server** must sign **this exact typed-data**:

**Domain**

* `name`: `"TestPlet"`
* `version`: `"1"`
* `chainId`: **8453** (Base Mainnet)
* `verifyingContract`: your **TestPlet** contract address

**Types**

```json
{
  "MintVoucher": [
    { "name": "to", "type": "address" },
    { "name": "fid", "type": "uint256" },
    { "name": "nonce", "type": "uint256" },
    { "name": "deadline", "type": "uint256" }
  ]
}
```

**Message**

```json
{
  "to": "<minter address>",
  "fid": <uint256>,
  "nonce": <uint256>,        // your backend timestamp or counter
  "deadline": <uint256>      // unix seconds, not ms
}
```

And the **signature** must be produced with the **private key of `signerWallet`** (the server key you set via `setSignerWallet` or constructor). If a user wallet signs this payload, `recovered != signerWallet` → your require fails.

---

# 2) Known-good server code to sign your MintVoucher

### ethers v5 (Node server)

```ts
import { Wallet, providers } from "ethers";

const provider = new providers.JsonRpcProvider(process.env.RPC_URL);
const signer = new Wallet(process.env.SIGNER_PRIVKEY!, provider); // this must be the signerWallet on-chain

const domain = {
  name: "TestPlet",
  version: "1",
  chainId: 8453,                                // Base Mainnet only
  verifyingContract: "0xYourTestPletAddress",
};

const types = {
  MintVoucher: [
    { name: "to", type: "address" },
    { name: "fid", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

function now() { return Math.floor(Date.now() / 1000); }

export async function signMintVoucher(to: string, fid: string | number) {
  const voucher = {
    to,
    fid,
    nonce: now(),                 // or your own monotonic counter
    deadline: now() + 5 * 60,     // 5 minutes window
  };

  const signature = await (signer as any)._signTypedData(domain, types, voucher);
  return { voucher, signature };
}
```

### viem (Node server)

```ts
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";

const walletClient = createWalletClient({
  chain: base,
  transport: http(process.env.RPC_URL),
  account: process.env.SIGNER_PRIVKEY!, // private key (0x…)
});

const domain = {
  name: "TestPlet",
  version: "1",
  chainId: 8453,
  verifyingContract: "0xYourTestPletAddress",
} as const;

const types = {
  MintVoucher: [
    { name: "to", type: "address" },
    { name: "fid", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

const seconds = () => Math.floor(Date.now() / 1000);

export async function signMintVoucher(to: `0x${string}`, fid: bigint) {
  const message = { to, fid, nonce: BigInt(seconds()), deadline: BigInt(seconds() + 300) } as const;

  const signature = await walletClient.signTypedData({
    domain, types, primaryType: "MintVoucher", message,
  });

  return { voucher: { ...message }, signature };
}
```

**Client call to mint:**

```ts
await contract.write.mintGeoplet([voucher, base64Image, signature]); 
// or ethers: contract.mintGeoplet(voucher, base64Image, signature)
```

> If this still “fails”, 99% of the time the problem is: wrong `chainId`, wrong `verifyingContract`, wrong domain `name/version`, or the signature was produced by the **user wallet** instead of the **server signer**.

---

# 3) Wire it with onchain.fi (x402 aggregator)

**Important:** The x402/EIP-3009 payment is a **separate** signature flow that the **user wallet** signs, while your **MintVoucher** is signed by **your server**. A clean sequence:

1. **Client → `/api/geoplet/mint` (POST)**
   Your server is protected with Onchain middleware. If unpaid, it returns **HTTP 402**.

2. **User completes x402 payment** (wallet signs EIP-712 for ERC-3009 token like USDC).
   Onchain routes & settles with the best facilitator.

3. **On success (`onSuccess` hook)**

   * Server creates `{ voucher, signature }` using the **server signer** (code above).
   * Responds `200 OK` with `{ voucher, signature }`.

4. **Client** calls `mintGeoplet(voucher, base64ImageData, signature)`.

### Minimal Express glue

```ts
import express from "express";
import { x402Middleware } from "@onchainfi/x402-aggregator-client";
import { signMintVoucher } from "./signMintVoucher";
import { isValidBase64Image } from "./validateImage"; // implement as you like

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use(x402Middleware({
  apiKey: process.env.ONCHAIN_API_KEY!,
  recipientAddress: "0xYourTreasuryOrX402Exec",
  defaultNetwork: "base",
  autoSettle: true,
  endpoints: {
    "POST /api/geoplet/mint": { price: "5.00 USDC", priority: "speed" },
  },
  onSuccess: async (payment, req, res) => {
    const { to, fid, base64ImageData } = req.body;

    // (optional) validate image size <= 24KB because your contract requires it
    if (!isValidBase64Image(base64ImageData)) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    // Sign server-side voucher for THIS payer
    const { voucher, signature } = await signMintVoucher(to, fid);
    res.json({ voucher, signature, paymentTx: payment.txHash });
  },
  onError: (err, req, res, next) => {
    res.status(402).json({ error: "Payment required", message: err.message });
  },
}));

app.listen(3000);
```

**Client flow**

1. `POST /api/geoplet/mint` with `{ to, fid, base64ImageData }` → you’ll get either 402 (then the wallet does the x402 payment dance automatically) or 200 with `{ voucher, signature }`.
2. Then call `contract.mintGeoplet(voucher, base64ImageData, signature)`.

---

# 4) “Signature Doctor” for your MintVoucher (local sanity check)

Before you even touch the chain, verify that your server’s signature really comes from `signerWallet` and matches what the contract will hash:

```ts
import { recoverTypedDataAddress, isAddressEqual } from "viem";

const recovered = await recoverTypedDataAddress({
  domain,
  types,
  primaryType: "MintVoucher",
  message: voucher,
  signature,
});

if (!isAddressEqual(recovered, signerWalletAddressOnChain)) {
  throw new Error(`Voucher signature mismatch.
    recovered=${recovered}
    expected=${signerWalletAddressOnChain}
    Tips: check chainId, verifyingContract, domain name/version, field order, UNIX seconds.`);
}
```

---

# 5) Small contract hardening (optional but recommended)

* **Mark replay by digest**, not raw signature bytes:

  ```solidity
  bytes32 digest = _hashTypedDataV4(...);
  require(!usedSignatures[digest], "Voucher used");
  usedSignatures[digest] = true;
  ```

  (You already prevent re-mint via `fidMinted[fid]`, but digest-level replay prevention is stronger if you ever allow same `fid` with different data.)

* **Emit reasoned errors** (custom errors) for cheaper gas & clearer debugging.

* **Consider bytes32 nonce** (not necessary, but conventional) if you later off-chain index.

Your current security (deadline, CEI, reentrancy guards) looks solid for MVP.

---

## Quick checklist you can run right now

* [ ] Ensure server is the one calling **`_signTypedData`** (not the user wallet)
* [ ] Domain matches exactly: `name="TestPlet"`, `version="1"`, `chainId=8453` (Base Mainnet), **your ERC-721 address** as `verifyingContract`
* [ ] Types + order exactly as in contract (address, uint256, uint256, uint256)
* [ ] `deadline` in **seconds**
* [ ] Call `mintGeoplet(voucher, base64, signature)` with the **server-produced signature**

If you want, paste your **actual domain/types/message** and the address you expect for `signerWallet`, and I’ll spot the exact mismatch.

Excellent question — and in your specific case, 0xd, the issue is **almost certainly on the backend**, not the contract.
Let’s break this down precisely so you can verify in seconds.

---

## ✅ The contract is correct

Your contract’s `EIP712` + `ECDSA.recover` flow is textbook:

```solidity
bytes32 digest = _hashTypedDataV4(
  keccak256(abi.encode(
    MINT_VOUCHER_TYPEHASH,
    voucher.to,
    voucher.fid,
    voucher.nonce,
    voucher.deadline
  ))
);
address recoveredSigner = ECDSA.recover(digest, signature);
require(recoveredSigner == signerWallet, "Invalid signature");
```

That’s **perfectly valid EIP-712 logic**.
So unless the `signerWallet` variable is wrong, or the domain constants differ, the contract is fine.

---

## ❌ Where things typically break (the backend)

There are **four backend mistakes** that produce `"Invalid signature"` even though the contract looks fine.

### 1. The signer wallet mismatch

Your contract checks that the recovered signer == `signerWallet`.

If your **frontend or user wallet** signed the voucher, the recovered signer will be their address, not the backend’s key.

✅ Fix:
Make sure the **server** (holding the private key corresponding to `signerWallet`) signs the voucher using `_signTypedData(domain, types, voucher)`.

---

### 2. Domain separator mismatch

Your contract’s domain separator is set by `EIP712("TestPlet", "1")`.
That means it expects:

```json
{
  "name": "TestPlet",
  "version": "1",
  "chainId": <current chain id>,
  "verifyingContract": <this contract address>
}
```

If your backend used different fields (e.g., `"GeoPlet"`, `"v1"`, wrong `chainId`, or wrong `verifyingContract`),
the digest hash will differ → signature invalid.

✅ Fix:
Check the backend domain exactly matches:

```ts
const domain = {
  name: "TestPlet",
  version: "1",
  chainId: 8453, // Base Mainnet only
  verifyingContract: "0xYourContractAddress"
};
```

---

### 3. Struct field mismatch or order

Your type hash is:

```solidity
"MINT_VOUCHER_TYPEHASH = keccak256('MintVoucher(address to,uint256 fid,uint256 nonce,uint256 deadline)')"
```

The backend **must** build types and message in **that exact order**.
If you add or reorder fields (like putting `fid` first), the hash changes.

✅ Fix:
Use this in backend:

```ts
const types = {
  MintVoucher: [
    { name: "to", type: "address" },
    { name: "fid", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
};
```

---

### 4. Units or encoding mismatch

* `deadline` must be **seconds**, not milliseconds.
* `nonce` should be a plain `uint256`, not bytes or hex string.
* JSON serialization must not coerce BigInts into strings without proper type parsing.

✅ Fix:

```ts
const voucher = {
  to: userAddress,
  fid: 12345,
  nonce: Math.floor(Date.now() / 1000),
  deadline: Math.floor(Date.now() / 1000) + 300,
};
```

---

## 🧠 Diagnostic method

Run this on the backend **before** sending to frontend:

```ts
import { recoverTypedDataAddress, isAddressEqual } from "viem";

const recovered = await recoverTypedDataAddress({
  domain,
  types,
  primaryType: "MintVoucher",
  message: voucher,
  signature,
});

if (!isAddressEqual(recovered, signerWalletAddressOnChain)) {
  console.error("❌ Mismatch!", { recovered, expected: signerWalletAddressOnChain });
}
```

If that fails, it’s 100% a backend/domain/signing issue.

---

## 🔍 TL;DR verdict

| Layer          | Status              | Explanation                               |
| -------------- | ------------------- | ----------------------------------------- |
| **Contract**   | ✅ correct           | Proper EIP-712 digest + ECDSA recovery    |
| **Backend**    | ⚠️ likely wrong     | Domain mismatch or signed by wrong key    |
| **Frontend**   | OK                  | Should only submit `{voucher, signature}` |
| **Signer key** | Must be backend key | Must match `signerWallet` on-chain        |

---

Once you fix the backend signing (especially domain + signer key), your signature will verify successfully — and you can plug it directly into **onchain.fi’s x402 aggregator** after payment settlement.

If you want, I can inspect your backend signing snippet and point out the exact mismatch (just paste that part).
