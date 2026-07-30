# CurvePad Architecture

This document describes the full system architecture — smart contracts, frontend, backend, and supporting libraries.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Wallet                        │
│                   React + Vite (artifacts/curvepad)             │
└──────────────┬─────────────────────────────┬───────────────────┘
               │ wagmi / viem (RPC calls)     │ fetch (REST API)
               ▼                             ▼
┌──────────────────────────┐   ┌─────────────────────────────────┐
│     Base Mainnet RPC     │   │   Express API (api-server)      │
│                          │   │   - Token metadata (CRUD)       │
│  ┌────────────────────┐  │   │   - Image upload (presigned)    │
│  │  TokenFactory.sol  │  │   │   - GCS object serving          │
│  │  (V2 deployed)     │  │   └──────────────┬──────────────────┘
│  │                    │  │                  │
│  │  BondingCurveToken │  │   ┌──────────────▼──────────────────┐
│  │  (per token)       │  │   │    Replit Object Storage (GCS)  │
│  └────────────────────┘  │   │    Token images                 │
└──────────────────────────┘   └─────────────────────────────────┘
```

---

## Smart Contracts

### `TokenFactory`

The factory stores a registry of all deployed tokens and emits `TokenCreated` events. It:
- Deploys a `BondingCurveToken` for each `createToken()` call
- Maps token address → creator address
- Provides `getTokens()` and `getTokenCount()` for enumeration

### `BondingCurveToken`

Each token is a standalone `ERC20 + ReentrancyGuard` contract. The key state:

```solidity
uint256 public constant BASE_PRICE = 1_000_000_000_000; // 1e12 wei
uint256 public constant SLOPE = 1_000_000;              // 1e6 wei
uint256 public constant FEE_BPS = 100;                  // 1%
uint256 public constant GRADUATION_THRESHOLD = 10 ether;

address public immutable creator;
bool public graduated;
address public uniswapPool;
```

The bonding curve mechanics are described in [MATH.md](MATH.md).

---

## Frontend (`artifacts/curvepad`)

### Stack

| Library | Role |
|---|---|
| React 19 | UI framework |
| Vite 7 | Build tool + dev server |
| wagmi 3 | React hooks for Ethereum |
| viem | Low-level Ethereum client |
| RainbowKit | Wallet connection modal |
| @tanstack/react-query | Async state / caching |
| wouter | Lightweight client-side routing |
| Tailwind CSS 4 | Utility-first styling |
| Radix UI | Accessible headless components |
| Framer Motion | Animations |

### Page Structure

```
App.tsx (lazy-loaded routes)
├── /              LandingPage.tsx
├── /explore       ExplorePage.tsx      ← token grid, multicall
├── /create        CreatePage.tsx       ← deploy + image upload
├── /token/:addr   TradePage.tsx        ← trade terminal
└── /portfolio     PortfolioPage.tsx    ← wallet holdings
```

### Multicall Pattern (ExplorePage)

To avoid N sequential RPC calls, the explore page batches 7 calls per token using `publicClient.multicall`:

```ts
// Per token: name, symbol, totalSupply, graduated, uniswapPool,
//            getGraduationInfo (5-tuple), creator
const results = await publicClient.multicall({ contracts: [...] });
// Plus parallel getBalance for ETH reserve
const balances = await Promise.all(tokens.map(t => publicClient.getBalance(...)));
```

This reduces explore page load to ~2 RPC round-trips regardless of token count.

---

## API Server (`artifacts/api-server`)

### Stack

| Library | Role |
|---|---|
| Express 5 | HTTP framework |
| Drizzle ORM | DB query builder |
| PostgreSQL | Token metadata storage |
| @google-cloud/storage | GCS presigned URL signing |
| Zod | Schema validation |
| pino | Structured logging |

### Routes

| Method | Path | Handler |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/tokens` | List all token metadata |
| `GET` | `/api/tokens/:address` | Get single token metadata |
| `POST` | `/api/tokens` | Save token metadata |
| `POST` | `/api/storage/uploads/request-url` | Request presigned upload URL |
| `GET` | `/api/storage/objects/*path` | Serve uploaded image |

### Image Upload Flow

```
Client                      API Server           GCS
  │                              │                │
  │─ POST /storage/uploads/  ───►│                │
  │   request-url                │                │
  │   { name, size, type }       │                │
  │                              │─ Sign URL ────►│
  │                              │◄─ signedURL ───│
  │◄── { uploadURL, objectPath } │                │
  │                              │                │
  │─ PUT uploadURL (direct) ────────────────────►│
  │◄──────────────────────────────────────────── │
  │                              │                │
  │  Store objectPath            │                │
  │  Display: GET /api/storage/objects/{path}     │
```

---

## Library Packages (`lib/`)

### `api-spec`

Single source of truth: `openapi.yaml`. Running `codegen` generates:
- `api-client-react/` — typed React Query hooks via Orval
- `api-zod/` — Zod schemas for runtime validation

**Never edit generated files.** Edit the spec, run codegen.

### `object-storage-web`

Provides `useUpload()` React hook implementing the presigned-URL two-step upload flow. Has no server-side code — works purely in the browser.

### `db`

Drizzle ORM schema. The only package that touches the database. Contains migrations, the schema file, and a `push` script for dev.

---

## Data Flow: Launching a Token

```
1. User fills CreatePage form (name, symbol, description, uploads image)
   │
   ├── Image: POST /api/storage/uploads/request-url → PUT to GCS presigned URL
   │          Image URL stored locally until deploy completes
   │
2. User clicks Deploy → wagmi writeContract({ createToken(name, symbol), value: seedEth })
   │
3. Transaction confirmed → receipt.logs[0].address = new token address
   │
4. POST /api/tokens with { address, name, symbol, description, imageUrl, twitter, ... }
   │
5. User redirected to /token/:address (TradePage)
```

---

## Data Flow: Trading

```
TradePage mounts
│
├── publicClient.multicall → token metadata, graduation status
├── publicClient.watchContractEvent(Trade) → ActivityFeed, TerminalLog
│
Buy:
├── User enters ETH amount
├── wagmi writeContract({ buy(), value: ethAmount + 1% fee })
├── On confirmation: refetch multicall, update BondingCurveChart
│
Sell:
├── User enters token amount
├── wagmi writeContract({ sell(tokenAmount) })
├── On confirmation: refetch

Graduate (when reserve >= 10 ETH):
├── wagmi writeContract({ graduate() })
├── On confirmation: graduated = true, uniswapPool set
├── GraduationTimeline celebrates, buy/sell buttons hidden
```

---

## Security Boundaries

| Boundary | Detail |
|---|---|
| Smart contract | Immutable once deployed; no admin keys |
| API server | Stateless for image uploads (public); token metadata has no auth (public launchpad) |
| Image storage | Presigned URLs expire in 15 minutes; uploads are public-readable by design |
| Secrets | `PRIVATE_KEY` only used in deploy scripts; never in the running server |
