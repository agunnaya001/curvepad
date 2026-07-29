# Workspace

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

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## CurvePad — Bonding Curve Token Launchpad

### What it is
CurvePad is a permissionless bonding curve token launchpad on Base mainnet. Anyone can deploy an ERC-20 token in one transaction; price is determined by a linear bonding curve, not market makers.

### Architecture
- **Frontend**: React + Vite at `artifacts/curvepad/` (served at `/`)
- **Blockchain**: Connects directly to Base mainnet via wagmi + viem (no backend needed)
- **Web3 libs**: wagmi, viem, @rainbow-me/rainbowkit, @tanstack/react-query

### Key Files
- `artifacts/curvepad/src/lib/web3.ts` — ABI definitions, contract addresses, math utilities
- `artifacts/curvepad/src/pages/ExplorePage.tsx` — token grid with search/sort
- `artifacts/curvepad/src/pages/CreatePage.tsx` — deploy new token UI
- `artifacts/curvepad/src/pages/TradePage.tsx` — per-token trade view with live chart
- `artifacts/curvepad/src/components/BondingCurveChart.tsx` — Canvas-rendered live price chart
- `artifacts/curvepad/src/components/ActivityFeed.tsx` — Live on-chain Trade event stream

### Deployed Contracts (Base Mainnet)
- **TokenFactory V1** (deprecated): `0x479596943e70316A0d893De1876EBeA1Ea8E4D5B`
  - Block: 44809260 | No graduation support

- **TokenFactory V2** (active): `0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6`
  - Block: 49276726
  - Tx: `0x856811007d5dc6ea08f577fb98d61f1ac15e4e64e5af692850751425bf23df05`
  - Deployer: `0xD034E94465Db1669f80D817c66e58cF194d027C8`
  - Verified: https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6
  - Features: bonding curve + 10 ETH graduation → Uniswap V2 LP burn

### Live Terminal Feature
- `artifacts/curvepad/src/components/TerminalLog.tsx` — macOS-style terminal panel on TradePage that streams on-chain Trade events in real time via watchContractEvent. Green for buys, red for sells, blinking cursor.

### Bonding Curve Math
- `price(supply) = BASE_PRICE + SLOPE × supply`
- `reserve = BASE_PRICE × S + SLOPE × S² / 2`
- Buy pricing: solves quadratic `(SLOPE/2)x² + Bx - reserve = 0`
- 1% creator fee on every trade (from trader, not reserve)
