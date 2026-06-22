---
name: CurvePad Multicall Pattern
description: How ExplorePage batches RPC calls for performance
---

## Pattern
ExplorePage batches all per-token reads into a single `publicClient.multicall` call (7 reads × N tokens = 1 round-trip instead of 7N).

```ts
const calls = addresses.flatMap((addr) => [
  { address, abi: BONDING_CURVE_ABI, functionName: "name" },
  { address, abi: BONDING_CURVE_ABI, functionName: "symbol" },
  { address, abi: BONDING_CURVE_ABI, functionName: "getCurrentPrice" },
  { address, abi: BONDING_CURVE_ABI, functionName: "totalSupply" },
  { address, abi: BONDING_CURVE_ABI, functionName: "getMarketCap" },
  { address, abi: BONDING_CURVE_ABI, functionName: "creator" },
  { address, abi: BONDING_CURVE_ABI, functionName: "creatorFeesEarned" },
]);
const results = await publicClient.multicall({ contracts: calls, allowFailure: true });
```

Reserves (`eth_getBalance`) cannot be multicalled — they're batched in `Promise.all` separately.
Metadata (API calls) are also `Promise.all`'d after the multicall completes.

**Why:** Without multicall, loading 10 tokens would require 70+ sequential RPC calls. With multicall it's 1 call + 10 getBalance + 10 API calls.
