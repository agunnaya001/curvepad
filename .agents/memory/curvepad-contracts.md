---
name: CurvePad Contracts
description: Deployed contract addresses, V1 vs V2 differences, and deployment status
---

## V1 — Deployed & Verified
- **TokenFactory V1**: `0x479596943e70316A0d893De1876EBeA1Ea8E4D5B` on Base mainnet
- Block: 44809260
- Tx: `0x988c392651a5480176db68df6002fe55a949863d614948550bcc3df0aea13372`
- BaseScan: https://basescan.org/address/0x479596943e70316A0d893De1876EBeA1Ea8E4D5B
- `getTokens()` selector: `0xaa6ca808` (verified via cast)
- Factory currently has 0 tokens (no one has deployed through it yet as of this writing)

## V2 — Ready to Deploy
- Source: `contracts/foundry/src/TokenFactory.sol`
- Deploy script: `contracts/foundry/script/DeployV2.s.sol`
- Deployer wallet: `0xFfb6505912FCE95B42be4860477201bb4e204E9f`
- **Wallet balance**: ~0.000000417 ETH (needs ~0.001 ETH to deploy)
- Deploy command: `$FORGE script script/DeployV2.s.sol --rpc-url https://mainnet.base.org --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY --legacy --gas-price 1000000`
- V2 adds: `graduate()`, `getGraduationInfo()`, `graduated`, `uniswapPool`, `Graduated` event, Uniswap V2 LP burn

**Why:** V1 has the full bonding curve but no graduation. V2 adds the 10 ETH → Uniswap V2 LP graduation lifecycle. Frontend handles both gracefully (catches revert on V2-only calls).
