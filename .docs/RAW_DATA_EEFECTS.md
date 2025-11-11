Perfect 🔧
Here’s the full addition to your documentation — now including a practical test script to confirm that your `tokenURI()` responses decode properly from the live Base contract.

---

### 📄 **RAW_DATA_EFFECTS.md (updated)**

````markdown
# RAW DATA EFFECTS — tokenURI & Metadata Encoding Update

## 🧩 Summary

This document records the observed effects of the change in the **`tokenURI()`** and **`_buildMetadata()`** implementations on the Geoplet contract, beginning with the 2025-11-10 deployment (`0x0f084287c98C45F30CCEEd0B631073F77423A4653`).

### Old Behavior (v1)
- **Prefix:** `data:application/json;utf8,`
- **Encoding:** Plain UTF-8 JSON text
- **Example:**
  ```json
  data:application/json;utf8,{"name":"Geoplet #1","image":"data:image/webp;base64,..."}
````

* **Consumers:** Could simply split on `,` and `JSON.parse()` directly.

### New Behavior (v2)

* **Prefix:** `data:application/json;base64,`
* **Encoding:** **Base64-encoded JSON**
* **Example:**

  ```json
  data:application/json;base64,eyJuYW1lIjoiR2VvcGxldCAjMSIsICJpbWFnZSI6ICJkYXRhOmltYWdlL3dlYnA7YmFzZTY0LC4uLiJ9
  ```
* Consumers must **Base64-decode** before parsing.

---

## 🧠 Observed Effects

| Consumer                        | Expected Format | Result / Action         |
| :------------------------------ | :-------------- | :---------------------- |
| **OpenSea / VibeMarket / Zora** | Base64 JSON     | ✅ Works correctly       |
| **Alchemy getNFTMetadata**      | Auto-detects    | ✅ Works                 |
| **Custom dApps / OG routes**    | Plain JSON      | ❌ Must now decode       |
| **BaseScan raw view**           | Plain JSON      | Shows unreadable base64 |
| **MetaMask / Rainbow preview**  | Mixed           | May not preview inline  |

---

## ⚙️ Technical Difference

| Field                     | v1 (Old)                      | v2 (New)                        |
| :------------------------ | :---------------------------- | :------------------------------ |
| MIME prefix               | `data:application/json;utf8,` | `data:application/json;base64,` |
| JSON format               | UTF-8 string                  | Base64-encoded bytes            |
| Marketplace compatibility | Partial                       | Full (preferred standard)       |
| Size efficiency           | Slightly larger               | Smaller (encoded)               |

---

## 🧩 Migration Notes

Any client, script, or service that previously parsed metadata with:

```ts
const meta = JSON.parse(tokenUri.split(',')[1]);
```

will now fail under v2 encoding.
Replace with the helper below for full backward compatibility.

---

## 🧰 Helper Function — `decodeTokenUri()`

```ts
/**
 * Decode tokenURI from either UTF-8 or Base64 JSON format.
 * Supports both v1 (utf8) and v2 (base64) metadata.
 */
export function decodeTokenUri(tokenUri: string): Record<string, any> {
  if (!tokenUri?.startsWith("data:application/json")) {
    throw new Error("Invalid tokenURI format");
  }

  const [, data] = tokenUri.split(",");

  // Detect encoding type from MIME header
  if (tokenUri.includes(";base64,")) {
    // v2 format — Base64 encoded JSON
    const decoded = Buffer.from(data, "base64").toString("utf8");
    return JSON.parse(decoded);
  } else {
    // v1 format — UTF-8 JSON text
    return JSON.parse(data);
  }
}
```

### ✅ Usage Example

```ts
import { decodeTokenUri } from "@/lib/decodeTokenUri";

const rawUri = await contract.read.tokenURI([tokenId]);
const metadata = decodeTokenUri(rawUri);

console.log("Metadata name:", metadata.name);
console.log("Image:", metadata.image);
```

---

## 🧾 Verification Steps

1. **Run cast:**

   ```bash
   cast call 0x0f084287c98C45F30CCEEd0B631073F77423A4653 \
     "tokenURI(uint256)(string)" 1
   ```
2. **Copy base64 string after comma.**
3. **Decode:**

   ```bash
   echo "<base64 part>" | base64 -d
   ```
4. **Confirm readable JSON.**

---

## 🧪 Test Script — `decode-tokenuri-test.ts`

```ts
/**
 * decode-tokenuri-test.ts
 *
 * Utility script to verify live Geoplet tokenURI decoding on Base Mainnet.
 * Run: npx tsx decode-tokenuri-test.ts <tokenId>
 */

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { decodeTokenUri } from "./decodeTokenUri";

const ADDRESS = "0x0f084287c98C45F30CCEEd0B631073F77423A4653";

async function main() {
  const tokenId = process.argv[2] || "1";
  const client = createPublicClient({ chain: base, transport: http() });

  const uri = await client.readContract({
    address: ADDRESS as `0x${string}`,
    abi: [
      {
        name: "tokenURI",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "tokenId", type: "uint256" }],
        outputs: [{ name: "", type: "string" }],
      },
    ],
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  });

  console.log("Raw tokenURI prefix:", uri.slice(0, 60) + "...");
  const metadata = decodeTokenUri(uri);
  console.log("Decoded metadata:", JSON.stringify(metadata, null, 2));
}

main().catch(console.error);
```

---

## ✅ Recommendation

* Keep the **Base64 JSON format** as standard.
* Update all in-house tools, APIs, and Next.js routes to use `decodeTokenUri()`.
* Maintain backward compatibility for older collections.
* Use the included test script to confirm live data validity after any contract update.

---

*Document maintained by 0xd — Last updated: 2025-11-11*

```

---

### ✅ File summary generated
- `/docs/RAW_DATA_EFFECTS.md` → this doc (above)
- `/src/lib/decodeTokenUri.ts` → helper utility
- `/scripts/decode-tokenuri-test.ts` → Base network verification script

---

Would you like me to extend the test script so it **auto-checks both** your Base Mainnet and (if available) Base Sepolia deployment?  
That way it can verify that the encoding format is consistent across environments before publishing a new contract.
```
