# Curvepad Quick Start Guide

## 🚀 Start Development in 3 Steps

### 1. Install Dependencies
```bash
cd artifacts/curvepad
pnpm install
```

### 2. Set Environment Variables
```bash
# Create .env.local
VITE_RPC_URL=https://mainnet.base.org
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:3001
```

### 3. Start Dev Server
```bash
pnpm dev
```

Visit `http://localhost:5173` in your browser.

---

## 📱 What's New

### Pages You Can Visit

1. **Home Page** (`/`)
   - Beautiful landing page with features
   - Call-to-action buttons
   - Perfect entry point for new users

2. **Explore Tokens** (`/explore`)
   - Browse all available tokens
   - View token details
   - Click to trade

3. **Create Token** (`/create`)
   - Launch your own token
   - Set bonding curve parameters
   - Deploy instantly

4. **Portfolio** (`/portfolio`) - *Requires wallet connection*
   - View your holdings
   - Track portfolio value
   - Monitor price changes

5. **Trade Tokens** (`/token/:address`)
   - Buy/sell tokens
   - View charts
   - Read comments

---

## 🔌 API Quick Reference

### Get All Tokens
```bash
curl "http://localhost:3001/tokens?limit=10&offset=0"
```

### Search Tokens
```bash
curl "http://localhost:3001/search?q=ethereum"
```

### Get Trending
```bash
curl "http://localhost:3001/trending?window=24h"
```

### Get Token Stats
```bash
curl "http://localhost:3001/tokens/0xABC123/stats"
```

---

## 🛠 Common Development Tasks

### Build for Production
```bash
pnpm build
```

### Run Tests
```bash
pnpm test
```

### Check TypeScript
```bash
pnpm type-check
```

### Format Code
```bash
pnpm format
```

### Lint Code
```bash
pnpm lint
```

---

## 📦 Project Structure

```
artifacts/curvepad/
├── src/
│   ├── pages/           # Page components
│   │   ├── LandingPage.tsx      (NEW)
│   │   ├── PortfolioPage.tsx    (NEW)
│   │   ├── ExplorePage.tsx
│   │   ├── CreatePage.tsx
│   │   └── TradePage.tsx
│   ├── components/      # Reusable components
│   ├── lib/            # Utilities
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── package.json
└── vite.config.ts      # Build config
```

---

## 🎨 Key Features

### Landing Page Highlights
- ✨ Hero section with gradient
- 📋 6 feature cards
- 🎯 Clear CTAs
- 📱 Fully responsive

### Portfolio Highlights
- 💰 Total value display
- 📊 24h change tracking
- 📈 Holdings table
- 🔗 Quick trade links

### API Improvements
- 🔍 Full-text search
- 📄 Pagination support
- 📈 Trending tokens
- 📊 Token statistics

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Use different port
PORT=5174 pnpm dev
```

### Wallet Not Connecting
1. Install MetaMask or Coinbase Wallet
2. Switch to Base mainnet
3. Refresh page
4. Try again

### API Errors
1. Check if API server is running
2. Verify VITE_API_URL is correct
3. Check network tab in DevTools
4. Check server logs

### TypeScript Errors
```bash
pnpm type-check
```

---

## 📚 Important Files

### Modified
- `src/App.tsx` - Updated routing
- `src/components/Navbar.tsx` - Added portfolio link
- `artifacts/api-server/src/routes/tokens.ts` - New endpoints

### New
- `src/pages/LandingPage.tsx` - Home page
- `src/pages/PortfolioPage.tsx` - Portfolio dashboard
- `BUILD_SUMMARY.md` - Detailed build info
- `FEATURES_ADDED.md` - Feature specifications
- `DEPLOYMENT.md` - Deployment guide

---

## 💡 Tips & Tricks

### Faster Development
- Use Chrome DevTools for debugging
- Check React DevTools extension
- Use VS Code extensions for React

### Testing Wallet Features
1. Connect wallet on landing page
2. Go to portfolio to see holdings
3. Click "Explore" to browse tokens
4. Click token to trade

### API Testing
- Use curl for quick tests
- Or use Postman collection
- Check network tab in browser

---

## 🚀 Deployment

### To Vercel
```bash
# Push to GitHub
git push origin lets-build

# Create PR to main
# Vercel will deploy automatically
```

### To Production
1. Merge PR to main
2. Vercel builds automatically
3. Set environment variables
4. Deploy!

---

## 📖 Learn More

- **Full Documentation**: See `BUILD_SUMMARY.md`
- **Feature Details**: See `FEATURES_ADDED.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Verification**: See `VERIFICATION_CHECKLIST.md`

---

## ✅ Verification

Before deploying, verify:
- [ ] `pnpm build` succeeds
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] All pages load
- [ ] Wallet connection works
- [ ] API endpoints respond

---

## 🔗 Useful Links

- **Base Mainnet**: https://base.org
- **BaseScan**: https://basescan.org
- **Wagmi Docs**: https://wagmi.sh
- **React Query**: https://tanstack.com/query
- **Tailwind**: https://tailwindcss.com

---

## 🎯 Quick Checklist

### First Time Setup
- [ ] Clone repo
- [ ] Run `pnpm install`
- [ ] Create `.env.local`
- [ ] Run `pnpm dev`
- [ ] Visit `localhost:5173`

### Making Changes
- [ ] Create new branch
- [ ] Make changes
- [ ] Run `pnpm lint`
- [ ] Run `pnpm type-check`
- [ ] Commit and push
- [ ] Create PR

### Deploying
- [ ] Push to GitHub
- [ ] Create PR
- [ ] Wait for Vercel build
- [ ] Test in preview
- [ ] Merge to main
- [ ] Live!

---

**Last Updated**: April 29, 2026
**Version**: 1.0.0
**Status**: Ready to Use ✅
