# Changelog

All notable changes to CurvePad are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Versions correspond to contract deployments and major feature milestones.

---

## [Unreleased]

### Added
- **Image upload** — token creators can upload a logo PNG/JPEG/GIF/WEBP (max 5 MB) when launching; stored in Replit Object Storage via presigned GCS URLs
- **4 new graduation tests** — `test_ethFullyDrainedAfterGraduation`, `test_lpBurnedToDeadAddress`, `test_anyoneCanGraduate`, `test_fullGraduationLifecycle` (total: 20 tests)
- **`@workspace/object-storage-web`** — shared React hook (`useUpload`) for two-step presigned URL upload flow
- **Storage API routes** — `POST /api/storage/uploads/request-url` and `GET /api/storage/objects/*path`
- **README overhaul** — badges, math documentation, test table, architecture diagram, API reference
- **CONTRIBUTING.md** — full contributor guide with setup, conventions, and PR guidelines
- **SECURITY.md** — vulnerability reporting process and known limitations
- **docs/** — `ARCHITECTURE.md`, `MATH.md`, `IMAGE_UPLOAD.md`, `GRADUATION.md`

### Changed
- `CreatePage.tsx` — replaced image URL text input with a drag-to-upload file picker button
- `lib/api-spec/openapi.yaml` — added `Storage` tag and upload/serve endpoints

---

## [2.0.0] — 2026-06-24 · Block 49276726

**V2 contract deployed and verified on Base mainnet.**

### Added
- **`graduate()`** — permissionless function callable by anyone once the ETH reserve hits 10 ETH
- **Uniswap V2 integration** — graduation deploys all reserve ETH + freshly-minted tokens as Uniswap V2 liquidity
- **LP burn** — LP tokens sent to `0x000...dEaD` on graduation, permanently locking liquidity
- **`getGraduationInfo()`** — returns `(graduated, uniswapPool, reserve, threshold, progressBps)`
- **`GraduationBar.tsx`** — real-time progress bar showing reserve vs. threshold
- **`GraduationTimeline.tsx`** — milestone timeline with celebration animation on graduation
- **`PortfolioPage.tsx`** — on-chain holdings with multicall + graduation mini-bars
- **MIT license** — `LICENSE` file + `SPDX-License-Identifier: MIT` on all source files
- **16 Foundry tests** — full coverage of bonding curve math, fee routing, and graduation lifecycle

### Changed
- `FACTORY_ADDRESS` updated to V2 in `artifacts/curvepad/src/lib/web3.ts`
- `TokenFactory.t.sol` — graduation mocks use `vm.etch` at canonical Uniswap V2 Router address

### Deprecated
- **V1** (`0x479596943e70316A0d893De1876EBeA1Ea8E4D5B`) — no graduation support; do not use for new tokens

---

## [1.0.0] — 2025-12-15 · Block 44809260

**V1 contract deployed on Base mainnet. First public launch.**

### Added
- `TokenFactory.sol` — factory contract deploying `BondingCurveToken` instances
- `BondingCurveToken` — ERC-20 with linear bonding curve, 1% creator fee, ReentrancyGuard
- `buy()` and `sell()` — quadratic buy formula at full 256-bit precision
- `ExplorePage.tsx` — token grid with multicall batching (7 calls/token)
- `CreatePage.tsx` — deploy token with seed buy option
- `TradePage.tsx` — Bloomberg-style trading terminal with Canvas charts
- `ActivityFeed.tsx` — live `Trade` event stream via `watchContractEvent`
- `TerminalLog.tsx` — macOS-style live trade log
- `BondingCurveChart.tsx`, `PriceChart.tsx`, `DepthChart.tsx` — Canvas-based chart suite
- `LandingPage.tsx` — hero landing page
- `Navbar.tsx` — navigation with wallet dropdown and ETH balance
- RainbowKit wallet connection
- `artifacts/api-server` — Express metadata API for off-chain token data
- OpenAPI spec + Orval codegen pipeline

---

## Legend

| Symbol | Meaning |
|---|---|
| **Added** | New features |
| **Changed** | Changes to existing behavior |
| **Deprecated** | Features to be removed in a future release |
| **Removed** | Features removed in this release |
| **Fixed** | Bug fixes |
| **Security** | Security fixes |
