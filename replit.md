# CurvePad — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Smart contracts**: Foundry (Solidity 0.8.20)
- **Chain**: Base Mainnet (chain ID 8453)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/curvepad run dev` — run frontend locally
- `~/.foundry/bin/forge test --root contracts/foundry` — run all 20 smart contract tests

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## CurvePad — Bonding Curve Token Launchpad

### What it is
CurvePad is a permissionless bonding curve token launchpad on Base mainnet. Anyone can deploy an ERC-20 token in one transaction; price is determined by a linear bonding curve, not market makers. When the ETH reserve hits 10 ETH, anyone can graduate the token to a permanent Uniswap V2 pool with LP tokens burned.

### Architecture
- **Frontend**: React + Vite at `artifacts/curvepad/` (served at `/`)
- **API**: Express at `artifacts/api-server/` (served at `/api`) — token metadata + image storage
- **Blockchain**: Connects directly to Base mainnet via wagmi + viem
- **Web3 libs**: wagmi, viem, @rainbow-me/rainbowkit, @tanstack/react-query
- **Image storage**: Replit Object Storage (GCS) via presigned URLs (`@workspace/object-storage-web`)

### Key Files
- `artifacts/curvepad/src/lib/web3.ts` — ABI definitions, contract addresses, math utilities
- `artifacts/curvepad/src/pages/ExplorePage.tsx` — token grid with multicall batching
- `artifacts/curvepad/src/pages/CreatePage.tsx` — deploy token + image upload
- `artifacts/curvepad/src/pages/TradePage.tsx` — Bloomberg-style trading terminal
- `artifacts/curvepad/src/components/BondingCurveChart.tsx` — Canvas-rendered price curve
- `artifacts/curvepad/src/components/ActivityFeed.tsx` — live on-chain Trade event stream
- `artifacts/api-server/src/routes/storage.ts` — presigned URL + image serving endpoints
- `lib/object-storage-web/src/use-upload.ts` — React hook for two-step upload flow

### Deployed Contracts (Base Mainnet)
- **TokenFactory V1** (deprecated): `0x479596943e70316A0d893De1876EBeA1Ea8E4D5B`
  - Block: 44809260 | No graduation support

- **TokenFactory V2** (active): `0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6`
  - Block: 49276726
  - Tx: `0x856811007d5dc6ea08f577fb98d61f1ac15e4e64e5af692850751425bf23df05`
  - Deployer: `0xD034E94465Db1669f80D817c66e58cF194d027C8`
  - Verified: https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6
  - Features: bonding curve + 10 ETH graduation → Uniswap V2 LP burn (permanent)

### Bonding Curve Math
- `price(supply) = BASE_PRICE + SLOPE × supply`
- `reserve = BASE_PRICE × S + SLOPE × S² / 2`
- Buy: solves quadratic `(SLOPE/2)x² + Bx - reserve = 0` at full 256-bit precision
- 1% creator fee on every trade (from trader, not reserve)
- Graduation: 10 ETH reserve → `addLiquidityETH` → LP tokens → `0x000...dEaD`

### Test Suite (20 tests)
All tests in `contracts/foundry/test/TokenFactory.t.sol`:
- Tests 1–10: bonding curve math, fees, multi-token isolation, round-trip
- Tests 11–16: graduation threshold, success, buy/sell lock, only-once, progress BPS
- Tests 17–20: ETH drain, LP burn to DEAD, permissionless graduation, full lifecycle

Run with: `~/.foundry/bin/forge test --root contracts/foundry -v`

### Image Upload Flow
1. `POST /api/storage/uploads/request-url` → `{ uploadURL, objectPath }`
2. `PUT uploadURL` (direct to GCS, no server roundtrip)
3. Display: `GET /api/storage/objects/{path}` (strip `/objects/` prefix from objectPath)

### Documentation
- `README.md` — project overview, badges, quick start, test table
- `CONTRIBUTING.md` — development setup, code conventions, PR guidelines
- `SECURITY.md` — vulnerability reporting, known limitations
- `CHANGELOG.md` — version history (V1 → V2 → current)
- `docs/ARCHITECTURE.md` — full system diagram and data flows
- `docs/MATH.md` — formal bonding curve derivations
- `docs/GRADUATION.md` — graduation mechanics, LP lock verification, FAQ
- `docs/IMAGE_UPLOAD.md` — upload API reference and frontend integration

### User Preferences
- Keep contract addresses and deploy TX hashes in replit.md
- Run `forge` via `~/.foundry/bin/forge` (foundry installed at that path, not on system PATH)
