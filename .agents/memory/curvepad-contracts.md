---
name: CurvePad Contracts
description: Deployed contract addresses, V1 vs V2 differences, deploy wallet, and frontend wiring.
---

## V2 Factory (Active)
- Address: `0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6`
- Block: 49276726
- TX: `0x856811007d5dc6ea08f577fb98d61f1ac15e4e64e5af692850751425bf23df05`
- Deployer: `0xD034E94465Db1669f80D817c66e58cF194d027C8`
- Chain: Base mainnet (8453)
- Verified: https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6
- Features: bonding curve + 10 ETH graduation → Uniswap V2 LP burn + permanent lock

## V1 Factory (Deprecated)
- Address: `0x479596943e70316A0d893De1876EBeA1Ea8E4D5B`
- Block: 44809260
- No graduation support

## Deploy Script
- Path: `contracts/foundry/script/DeployV2.s.sol`
- Reads `PRIVATE_KEY` env var (not `WALLET_PRIVATE_KEY`)
- Command: `forge script script/DeployV2.s.sol --rpc-url https://mainnet.base.org --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY --legacy --gas-price 1000000`

## Frontend Wiring
- `FACTORY_ADDRESS` in `artifacts/curvepad/src/lib/web3.ts` points to V2
- Frontend handles both V1 (no graduation) and V2 (graduation) by catching reverts from V2-only functions

**Why:** V2 adds the graduation lifecycle — once 10 ETH accumulates in reserve, anyone can call `graduate()` which burns LP and lists on Uniswap V2.
