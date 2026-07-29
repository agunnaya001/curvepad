# Curvepad Deployment Guide

## Overview

Curvepad is a permissionless bonding curve token launchpad built on Base mainnet. This guide covers deployment, configuration, and operation.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Web3**: Wagmi, Viem, RainbowKit
- **State Management**: TanStack React Query
- **Routing**: Wouter

### Backend (Express + Node.js)
- **Framework**: Express.js
- **Database**: Drizzle ORM with PostgreSQL
- **Validation**: Zod schemas

### Smart Contracts (Solidity)
- **Network**: Base Mainnet
- **Framework**: Foundry
- **Token Standard**: ERC-20 with bonding curve mechanics
- **Graduation**: Uniswap V2 integration

## Key Features Implemented

### 1. Landing Page
- Hero section with compelling value proposition
- Feature highlights (permissionless, fair price discovery, community-driven)
- Statistics dashboard showing platform metrics
- How-it-works section with 3-step process
- Call-to-action buttons for wallet connection and token launch
- Footer with links to product, community, legal, and network info

### 2. Portfolio Dashboard
- **Connected wallet view** showing user's token holdings
- **Portfolio stats**: Total value, gains/losses, holding count
- **Holdings table** with token details, balances, values, and price changes
- **Recent activity** showing transaction history with buy/sell indicators
- **Mock data** for demonstration (replace with real chain data)

### 3. Enhanced Navbar
- **Logo and navigation** links (Home, Explore, Launch)
- **Portfolio link** for connected wallets
- **Wallet connection** with MetaMask support
- **User dropdown** with copy address, BaseScan link, disconnect
- **Launch Token button** for quick access to creation page

### 4. Trade Page (Enhanced)
- **Token details** in sticky header (price, market cap, supply, reserve, fees, graduation status)
- **Price chart** showing historical token price movements
- **Market depth chart** visualizing buy/sell liquidity
- **Curve parameters** display showing bonding curve mechanics
- **Graduation timeline** tracking progress to 10 ETH threshold
- **Trade history and comments** tabs for community engagement

### 5. API Endpoints

#### Token Metadata
- `GET /tokens/:address/metadata` - Get token metadata
- `POST /tokens/:address/metadata` - Update token metadata
- `GET /tokens` - List all tokens (paginated)
- `GET /search` - Search tokens
- `GET /trending` - Get trending tokens

#### Token Engagement
- `GET /tokens/:address/comments` - Get token comments
- `POST /tokens/:address/comments` - Post comment on token
- `GET /tokens/:address/stats` - Get token statistics

## Running the Application

### Prerequisites
- Node.js 18+
- pnpm package manager
- MetaMask or compatible Web3 wallet
- Base mainnet RPC endpoint (optional for local testing)

### Development

```bash
# Install dependencies
pnpm install

# Run frontend dev server
cd artifacts/curvepad
pnpm dev

# In another terminal, run API server
cd artifacts/api-server
pnpm dev
```

### Build

```bash
# Build frontend
cd artifacts/curvepad
pnpm build

# Build API server
cd artifacts/api-server
pnpm build
```

### Production

```bash
# Start production servers
cd artifacts/curvepad
pnpm serve

# In another terminal
cd artifacts/api-server
pnpm start
```

## Smart Contract Details

### BondingCurveToken.sol
- **Base Price**: 0.000001 ETH per token
- **Price Slope**: 1e6 wei per token (price rises linearly with supply)
- **Creator Fee**: 1% on all trades
- **Graduation Threshold**: 10 ETH in reserve

### Features
- Linear bonding curve pricing: `price(s) = BASE_PRICE + SLOPE * s`
- Automatic reserve calculation: `reserve(S) = ∫₀ˢ price(t)dt`
- Reentrancy protection with SafeTransfer
- Graduation to Uniswap V2 when threshold reached
- Creator fee accumulation and withdrawal

## Environment Configuration

Create `.env.local` in the frontend directory:
```
VITE_API_URL=http://localhost:3000
VITE_CHAIN_ID=8453
```

Create `.env` in the API server directory:
```
DATABASE_URL=postgresql://user:password@localhost/curvepad
API_PORT=3000
```

## Network Configuration

- **Network**: Base Mainnet
- **Chain ID**: 8453
- **Uniswap V2 Router**: 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24
- **RPC**: https://mainnet.base.org

## Deployment Checklist

- [ ] Smart contracts compiled and verified on BaseScan
- [ ] Factory contract deployed to Base mainnet
- [ ] API server deployed with production database
- [ ] Frontend built and deployed to Vercel/hosting
- [ ] Environment variables configured for production
- [ ] CORS settings configured for API
- [ ] Database migrations run
- [ ] Monitoring and error tracking enabled
- [ ] Rate limiting configured on API endpoints
- [ ] Documentation updated

## Monitoring & Support

- Monitor contract events for token launches
- Track API response times and error rates
- Set up alerts for graduation events
- Monitor creator fee accumulation
- Regular database backups

## Troubleshooting

### Wallet Connection Issues
- Ensure MetaMask is installed
- Verify you're on Base mainnet (Chain ID: 8453)
- Check if account has ETH for gas fees

### Transaction Failures
- Verify sufficient ETH balance for gas
- Check gas price on network
- Ensure contract is not paused
- Check for reentrancy protection issues

### API Errors
- Verify database connection
- Check API server logs
- Validate request parameters against schemas
- Ensure proper CORS headers

## Future Enhancements

- [ ] Multi-chain support
- [ ] Advanced charting with more indicators
- [ ] Token governance features
- [ ] DAO treasury integration
- [ ] NFT integration for early supporters
- [ ] Advanced trading pairs
- [ ] Limit orders
- [ ] Trading bot integration
