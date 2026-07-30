# CurvePad

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-00ffaa.svg?style=flat-square)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg?style=flat-square&logo=solidity)](https://docs.soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-f0522b.svg?style=flat-square)](https://getfoundry.sh/)
[![Network](https://img.shields.io/badge/Network-Base%20Mainnet-0052FF.svg?style=flat-square&logo=ethereum)](https://base.org/)
[![Tests](https://img.shields.io/badge/Tests-20%20passing-00ffaa.svg?style=flat-square)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220.svg?style=flat-square&logo=pnpm)](https://pnpm.io/)

**Permissionless bonding-curve token launchpad on Base mainnet.**  
No admin keys · No rugs · Pure on-chain math · Auto-graduates to Uniswap V2

[Live App](https://curvepad.replit.app) · [Contract (Basescan)](https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6) · [Docs](docs/) · [Contributing](CONTRIBUTING.md)

</div>

---

## Table of Contents

- [What is CurvePad?](#what-is-curvepad)
- [Features](#features)
- [Architecture](#architecture)
- [How the Math Works](#how-the-math-works)
- [Deployed Contracts](#deployed-contracts)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## What is CurvePad?

CurvePad lets anyone launch an ERC-20 token in a single transaction. Price is governed by a **linear bonding curve** enforced entirely on-chain — no liquidity pools, no market makers, no admin controls.

When a token's ETH reserve hits **10 ETH**, anyone can call `graduate()`. The contract deploys all liquidity to a **Uniswap V2 pool** and permanently burns the LP tokens to the dead address (`0x000...dEaD`), locking liquidity forever.

| Property | Value |
|---|---|
| Chain | Base Mainnet (chain ID 8453) |
| Curve | Linear: `price = 1e12 + 1e6 × supply_in_tokens` wei |
| Creator fee | 1% of every buy and sell |
| Graduation threshold | 10 ETH in reserve |
| LP lock | Permanent — burned to `0x000...dEaD` |
| Admin | None — fully immutable |

---

## Features

### Smart Contract
- **Linear bonding curve** with quadratic buy formula solved at full 256-bit precision
- **Reserve invariant** — ETH balance always equals ∫ price(s) ds, fully collateralized
- **Automatic graduation** — 10 ETH reserve → Uniswap V2 pool → LP tokens burned
- **ReentrancyGuard** on `buy()` and `sell()`
- **CEI pattern** throughout — state before external calls
- **Permissionless** — no owner, no pause, no upgrades

### Frontend
- 🔍 **Explore** — token grid with multicall batching (7 calls/token), search, sort, live stats
- 🚀 **Launch** — deploy a token in one transaction with image upload, social links, seed buy
- 📈 **Trade** — Bloomberg-style terminal with bonding curve chart, depth chart, live event feed
- 💼 **Portfolio** — on-chain holdings via multicall, graduation progress bars
- 🎓 **Graduation UI** — real-time progress, timeline, celebration on threshold

### Infrastructure
- **Image upload** — token logos stored in Replit Object Storage via presigned GCS URLs
- **Metadata API** — Express server stores off-chain token metadata (description, socials, image)
- **OpenAPI codegen** — typed React hooks generated from OpenAPI spec via Orval
- **pnpm workspace** — monorepo with shared TypeScript project references

---

## Architecture

```
curvepad/
│
├── artifacts/
│   ├── curvepad/                  # React + Vite frontend
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── LandingPage.tsx
│   │       │   ├── ExplorePage.tsx     # Token grid, multicall batching
│   │       │   ├── CreatePage.tsx      # Deploy + image upload
│   │       │   ├── TradePage.tsx       # Bloomberg-style trading terminal
│   │       │   └── PortfolioPage.tsx   # On-chain holdings
│   │       ├── components/
│   │       │   ├── BondingCurveChart.tsx   # Canvas price curve
│   │       │   ├── PriceChart.tsx          # Trade history chart
│   │       │   ├── DepthChart.tsx          # Buy/sell depth
│   │       │   ├── ActivityFeed.tsx        # Live Trade event stream
│   │       │   ├── GraduationBar.tsx       # Progress bar
│   │       │   ├── GraduationTimeline.tsx  # Milestone timeline
│   │       │   └── TerminalLog.tsx         # macOS-style live terminal
│   │       └── lib/
│   │           ├── web3.ts          # ABI, factory address, math utils
│   │           └── api.ts           # Metadata API client
│   │
│   └── api-server/                # Express metadata + image API
│       └── src/
│           ├── routes/
│           │   ├── tokens.ts        # Token metadata CRUD
│           │   └── storage.ts       # Image upload + serving
│           └── lib/
│               ├── objectStorage.ts # GCS presigned URL helper
│               └── objectAcl.ts     # Access control helpers
│
├── contracts/foundry/             # Solidity contracts
│   ├── src/
│   │   └── TokenFactory.sol       # Factory + BondingCurveToken
│   ├── test/
│   │   └── TokenFactory.t.sol     # 20 Foundry tests
│   └── script/
│       └── DeployV2.s.sol
│
└── lib/
    ├── api-spec/                  # OpenAPI spec (source of truth)
    ├── api-client-react/          # Generated React query hooks
    ├── api-zod/                   # Generated Zod schemas
    ├── object-storage-web/        # React hook + Uppy upload component
    └── db/                        # Drizzle ORM schema + migrations
```

---

## How the Math Works

### Bonding Curve

```
price(s) = BASE_PRICE + SLOPE × s
```

- `s` — total supply in full tokens (WAD-divided)
- `BASE_PRICE` = `1e12` wei (0.000001 ETH at supply 0)
- `SLOPE` = `1e6` wei per token (price grows as supply grows)

### Reserve Invariant

The contract ETH balance always equals the area under the curve:

```
reserve(s) = BASE_PRICE × s + SLOPE × s² / 2
```

This invariant is enforced by the buy/sell math, not by admin controls.

### Buy Formula (Quadratic)

Given `ethForReserve` (ETH after 1% fee is deducted), tokens minted `x` satisfy:

```
SLOPE/2 · x²  +  B · x  −  ethForReserve = 0

x = (√(B² + 2 · SLOPE · ethForReserve) − B) / SLOPE
```

where `B = BASE_PRICE + SLOPE × currentSupply` is the current spot price.  
The discriminant is computed at full 256-bit precision — no premature WAD division — preventing catastrophic cancellation on small trades.

### Sell Formula

Selling `x` tokens returns `gross = reserve(s) − reserve(s − x)`, less 1% fee.

### Graduation

```
if reserve >= 10 ETH:
    anyone can call graduate()
    → addLiquidityETH(reserve, freshMintedTokens) to Uniswap V2
    → LP tokens sent to 0x000...dEaD (burned, permanent lock)
    → buy() and sell() revert forever
```

---

## Deployed Contracts

### V2 (Active) — Base Mainnet

| Field | Value |
|---|---|
| **TokenFactory** | [`0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6`](https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6) |
| **Deployer** | `0xD034E94465Db1669f80D817c66e58cF194d027C8` |
| **Deploy TX** | [`0x85681...3df05`](https://basescan.org/tx/0x856811007d5dc6ea08f577fb98d61f1ac15e4e64e5af692850751425bf23df05) |
| **Block** | 49276726 |
| **Verified** | ✅ Basescan |

### V1 (Deprecated)

`0x479596943e70316A0d893De1876EBeA1Ea8E4D5B` — block 44809260, no graduation support.

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)
- [Foundry](https://getfoundry.sh/) (for contract work)

### Install

```bash
git clone https://github.com/agunnaya001/curvepad
cd curvepad
pnpm install
```

### Run the frontend

```bash
pnpm --filter @workspace/curvepad run dev
# → http://localhost:5173
```

### Run the API server

```bash
pnpm --filter @workspace/api-server run dev
# → http://localhost:3001/api
```

### Environment variables

Create a `.env` file (never commit it):

```env
# Required for image upload (Replit Object Storage)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
PRIVATE_OBJECT_DIR=your-private-dir
PUBLIC_OBJECT_SEARCH_PATHS=your-public-paths

# Required for the API server session
SESSION_SECRET=your-session-secret

# Required for contract deployment
PRIVATE_KEY=your-deployer-private-key
BASESCAN_API_KEY=your-basescan-key
```

### Deploy a new contract

```bash
cd contracts/foundry
forge script script/DeployV2.s.sol \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vv
```

Then update `FACTORY_ADDRESS` in `artifacts/curvepad/src/lib/web3.ts`.

### Regenerate API client

After editing `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Testing

### Run all Foundry tests

```bash
cd contracts/foundry
forge test -v
```

**20 tests, all passing:**

| # | Test | Coverage |
|---|---|---|
| 1 | `test_createToken` | Factory deploys correctly |
| 2 | `test_buyReturnsNonTrivialTokens` | Buy mints tokens |
| 3 | `test_buyRequiresPayment` | Buy reverts with no ETH |
| 4 | `test_sellReturnsETH` | Sell returns ETH |
| 5 | `test_sellRevertsOnInsufficientBalance` | Sell guard |
| 6 | `test_reserveInvariantAfterBuy` | Reserve math |
| 7 | `test_reserveInvariantAfterSell` | Reserve math |
| 8 | `test_creatorFeeIsDeducted` | 1% fee routing |
| 9 | `test_multipleTokensIndependent` | Factory isolation |
| 10 | `test_buyAndSellRoundTrip` | Round-trip fidelity |
| 11 | `test_graduateRevertsBeforeThreshold` | Threshold guard |
| 12 | `test_graduateSucceedsAtThreshold` | State transition |
| 13 | `test_buyBlockedAfterGraduation` | Post-grad lock |
| 14 | `test_sellBlockedAfterGraduation` | Post-grad lock |
| 15 | `test_graduateOnlyOnce` | Double-graduate guard |
| 16 | `test_getGraduationInfoProgress` | Progress BPS |
| 17 | `test_ethFullyDrainedAfterGraduation` | ETH → Uniswap |
| 18 | `test_lpBurnedToDeadAddress` | LP burn verification |
| 19 | `test_anyoneCanGraduate` | Permissionless graduation |
| 20 | `test_fullGraduationLifecycle` | End-to-end lifecycle |

### Run specific tests

```bash
# Graduation tests only
forge test --match-test "graduation\|Graduate\|Graduated" -v

# With gas reporting
forge test --gas-report
```

### Typecheck (TypeScript)

```bash
pnpm run typecheck
```

---

## API Reference

The API server runs at `/api`. Full spec: [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).

### Token Metadata

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tokens` | List all token metadata records |
| `GET` | `/api/tokens/:address` | Get metadata for a token |
| `POST` | `/api/tokens` | Save token metadata (called after deploy) |

### Image Storage

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/storage/uploads/request-url` | Get presigned GCS URL for image upload |
| `GET` | `/api/storage/objects/:path` | Serve an uploaded image |

**Upload flow:**
1. `POST /api/storage/uploads/request-url` with `{ name, size, contentType }` → returns `{ uploadURL, objectPath }`
2. `PUT` the file directly to `uploadURL` (direct to GCS, no server roundtrip)
3. Store `objectPath` and display via `GET /api/storage/objects/:path`

---

## Security

| Concern | Mitigation |
|---|---|
| Reentrancy | `ReentrancyGuard` on `buy()` and `sell()` |
| State ordering | CEI pattern — all state mutations before external calls |
| Admin risk | No owner, no pause, no upgrade proxy |
| Reserve solvency | Reserve invariant enforced by math, not governance |
| Precision | 256-bit discriminant; no WAD division before sqrt |
| LP rug | LP tokens burned to `0x000...dEaD` on graduation |
| Overflow | Checked arithmetic (Solidity 0.8.x default) |

The contracts are **not audited**. Use at your own risk on mainnet.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

---

## License

[MIT](LICENSE) — © 2024 CurvePad contributors.

---

<div align="center">

Built on [Base](https://base.org/) · Powered by [Foundry](https://getfoundry.sh/) · Deployed with [Replit](https://replit.com/)

</div>
