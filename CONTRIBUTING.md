# Contributing to CurvePad

Thanks for your interest in contributing! CurvePad is an open-source bonding-curve launchpad and we welcome improvements to the contracts, frontend, API, and documentation.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Smart Contract Development](#smart-contract-development)
- [Frontend Development](#frontend-development)
- [API Development](#api-development)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)

---

## Code of Conduct

Be respectful. Harassment, discrimination, or hostility of any kind is not welcome in this project.

---

## How to Contribute

- **Bug reports** — open an issue with reproduction steps, expected behavior, and actual behavior.
- **Feature requests** — open an issue describing the use case before writing code.
- **Bug fixes** — for clear bugs, a PR is fine without a prior issue.
- **New features** — open an issue first so we can discuss the design before you invest time coding.
- **Documentation** — PRs improving docs are always welcome.

---

## Development Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 10+ | `npm i -g pnpm` |
| Foundry | latest | `curl -L https://foundry.paradigm.xyz \| bash` then `foundryup` |
| Git | any | system package manager |

### Clone and install

```bash
git clone https://github.com/agunnaya001/curvepad
cd curvepad
pnpm install
```

### Environment variables

Copy the example and fill in values (never commit secrets):

```bash
cp .env.example .env
```

Required secrets:

```env
SESSION_SECRET=                     # Any random string ≥ 32 chars
PRIVATE_KEY=                        # Deployer wallet private key (no 0x prefix)
BASESCAN_API_KEY=                   # From basescan.org/apis

# Replit Object Storage (set up via Replit Object Storage tool)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=
PRIVATE_OBJECT_DIR=
PUBLIC_OBJECT_SEARCH_PATHS=
```

### Run everything locally

```bash
# Terminal 1 — API server
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
pnpm --filter @workspace/curvepad run dev
```

The frontend proxies `/api` requests to the API server via Vite's `server.proxy`.

---

## Project Structure

```
curvepad/
├── artifacts/            # Deployable apps
│   ├── curvepad/         # React + Vite frontend
│   └── api-server/       # Express metadata + storage API
├── contracts/foundry/    # Solidity contracts (Foundry)
├── lib/
│   ├── api-spec/         # OpenAPI spec (source of truth for the API)
│   ├── api-client-react/ # Generated React hooks (do not edit by hand)
│   ├── api-zod/          # Generated Zod schemas (do not edit by hand)
│   ├── object-storage-web/ # React upload hook
│   └── db/               # Drizzle ORM schema
└── docs/                 # Extended documentation
```

**Key rule:** `lib/api-client-react/` and `lib/api-zod/` are **generated**. Edit `lib/api-spec/openapi.yaml` instead, then run:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Smart Contract Development

Contracts live in `contracts/foundry/`. We use [Foundry](https://getfoundry.sh/).

### Build

```bash
cd contracts/foundry
forge build
```

### Test

```bash
forge test -v
```

All 20 tests must pass before submitting a PR that touches contract code.

### Coverage

```bash
forge coverage
```

### Formatting

```bash
forge fmt
```

### Adding a new test

- Add the test to `contracts/foundry/test/TokenFactory.t.sol`
- Follow the naming convention: `test_<what>_<expectedOutcome>`
- Use the existing helpers `_deployAndFillToThreshold()` and `_token()` where applicable
- Every graduation-related behavior needs a dedicated test

### Deploying (for maintainers)

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

---

## Frontend Development

The frontend is a React + Vite app in `artifacts/curvepad/`.

### Run dev server

```bash
pnpm --filter @workspace/curvepad run dev
```

### Typecheck

```bash
pnpm --filter @workspace/curvepad run typecheck
```

### Conventions

- **No `any`** — all TypeScript must typecheck with `strict: true`
- **React 19** — use React 19 patterns; avoid class components
- **Wagmi / viem** — use wagmi hooks for all on-chain reads/writes; raw viem only for utilities
- **Tailwind** — use Tailwind utility classes; match the dark terminal aesthetic
- **Component files** — one component per file; colocate small sub-components if they're only used once
- **Lazy loading** — new pages should be wrapped in `React.lazy` in `App.tsx`

### Design system

The CurvePad palette is dark terminal with neon green (`hsl(158, 100%, 53%)`) as the primary. Match these CSS variables defined in `artifacts/curvepad/src/index.css`:

| Token | Value | Use |
|---|---|---|
| `--primary` | `hsl(158 100% 53%)` | Accent, active states |
| `--background` | `hsl(220 16% 6%)` | Page background |
| `--card` | `hsl(220 14% 9%)` | Card surfaces |
| `--muted-foreground` | `hsl(220 8% 50%)` | Secondary text |
| `--destructive` | `hsl(0 72% 51%)` | Errors, sell actions |

---

## API Development

The API is an Express 5 server in `artifacts/api-server/`. The OpenAPI spec at `lib/api-spec/openapi.yaml` is the single source of truth.

### Workflow for adding an endpoint

1. Add the path, request/response schemas to `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate the client and Zod schemas
3. Add the route handler in `artifacts/api-server/src/routes/`
4. Register it in `artifacts/api-server/src/routes/index.ts`
5. Use the generated Zod schema for input validation

### Typecheck

```bash
pnpm --filter @workspace/api-server run typecheck
```

### Conventions

- Use `req.log` (pino logger) — never `console.log` in server code
- Validate all inputs with the generated Zod schemas
- Return `{ error: string }` on failures (matches the `ErrorEnvelope` schema)
- Return `200` for successful operations, appropriate 4xx/5xx for errors
- Storage routes are unauthenticated — token images are public assets

---

## Code Style

### TypeScript / JavaScript

- Use `pnpm run typecheck` before pushing — zero TS errors required
- No `any`, no `@ts-ignore` without a comment explaining why
- Prefer `const` over `let`; never use `var`
- Use ES module imports — no CommonJS `require()`

### Solidity

- Run `forge fmt` before committing
- All functions must have NatSpec comments (`@notice`, `@param`, `@return`)
- No magic numbers — use named constants
- Follow CEI (Checks-Effects-Interactions) on every external call

### Commits

Use conventional commits:

```
feat: add token image upload via presigned GCS URL
fix: prevent graduation from being called twice
test: add LP burn verification test
docs: update README with V2 contract address
refactor: extract graduation helper to _deployAndFillToThreshold
```

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `style`, `perf`.

---

## Testing Requirements

| Area | Requirement |
|---|---|
| Smart contracts | All existing tests pass; new behavior has at least one test |
| TypeScript | `pnpm run typecheck` exits 0 |
| Graduation paths | ETH drain, LP burn, permissionless call — must be covered |
| API routes | New routes have at least a happy-path manual test documented in the PR |

---

## Submitting a Pull Request

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes, following the conventions above
3. Run `pnpm run typecheck` and `forge test` — both must pass
4. Commit with a conventional commit message
5. Push and open a PR against `main`
6. Fill out the PR template: what changed, why, how to test it
7. Link any related issues

PRs that break `typecheck` or `forge test` will not be merged.

---

## Reporting Bugs

Open a GitHub issue with:

- **Title** — short, specific description
- **Environment** — browser, wallet, network, contract address
- **Steps to reproduce** — exact sequence
- **Expected behavior**
- **Actual behavior** — include error messages and stack traces
- **Screenshots / TX hashes** — if applicable

For **security vulnerabilities**, please do **not** open a public issue. Email the maintainer directly.

---

## Questions?

Open a [GitHub Discussion](https://github.com/agunnaya001/curvepad/discussions) for questions, ideas, or feedback that isn't a bug report or PR.
