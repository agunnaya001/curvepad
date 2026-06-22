---
name: CurvePad Graduation System
description: How the 10 ETH graduation threshold and Uniswap V2 LP deployment works
---

## Graduation Lifecycle
1. Token deployed via TokenFactory → bonding curve active
2. Reserve grows as traders buy (1% fee to creator, 99% to reserve)
3. Reserve hits 10 ETH → `graduate()` callable by anyone
4. `graduate()` deploys ETH + tokens as permanent Uniswap V2 LP, burns LP to dead address
5. `graduated = true` → buy/sell on bonding curve blocked forever

## Math
- `GRADUATION_THRESHOLD = 10 ETH = 10e18 wei`
- `tokensForLP = reserveEth * WAD / price` (matches curve price at graduation point)
- Uniswap V2 Router on Base: `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24`
- LP burned to: `0x000000000000000000000000000000000000dEaD`

## Frontend Handling
- V1 tokens: `getGraduationInfo()` call reverts in a try/catch → falls back to computing progress from ETH balance
- V2 tokens: `getGraduationInfo()` returns `(graduated, pool, reserve, threshold, progressBps)`
- GraduationTimeline shows 5-step lifecycle; GraduationBar shows progress %

**Why:** V2 contract needed separate deployment (V1 already live, can't upgrade). Frontend gracefully handles both by catching reverts from V2-only functions.
