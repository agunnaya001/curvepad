# Token Graduation

Graduation is the mechanism by which a CurvePad token "graduates" from the bonding curve to a permanent Uniswap V2 liquidity pool. Once graduated, the token trades on the open market with locked, permanent liquidity.

---

## How It Works

### Threshold

Every `BondingCurveToken` has a graduation threshold of **10 ETH** in its reserve. As traders buy the token, the ETH reserve grows. The graduation progress is visible in real time via `getGraduationInfo()`.

```solidity
uint256 public constant GRADUATION_THRESHOLD = 10 ether;
```

### Triggering Graduation

When `address(token).balance >= 10 ETH`, **anyone** can call `graduate()` — not just the creator or the last buyer. This is intentional: graduation is a permissionless public good that benefits all token holders.

```solidity
function graduate() external nonReentrant {
    require(!graduated, "Already graduated");
    require(address(this).balance >= GRADUATION_THRESHOLD, "Below graduation threshold");
    // ...
}
```

### What Happens On Graduation

1. `graduated = true` — bonding curve trading permanently disabled
2. Fresh tokens are minted proportional to the reserve
3. `approve(UNISWAP_V2_ROUTER, freshTokens)` 
4. `router.addLiquidityETH{value: reserve}(token, freshTokens, 0, 0, DEAD, deadline)`
   - All 10 ETH reserve → Uniswap pool
   - All freshly-minted tokens → Uniswap pool
   - LP tokens → `0x000000000000000000000000000000000000dEaD` (burned forever)
5. `uniswapPool = factory.getPair(token, WETH)` — stored on-chain
6. `emit Graduated(uniswapPool, reserve)`

### After Graduation

- `buy()` and `sell()` both revert with `"Graduated: trade on Uniswap"`
- `graduated()` returns `true`
- `uniswapPool()` returns the Uniswap V2 pair address
- The liquidity pool is live and tradeable on Uniswap/any DEX aggregator
- LP is permanently locked — no rug possible

---

## Checking Graduation Status

### On-chain

```solidity
(
    bool graduated,
    address pool,
    uint256 reserve,
    uint256 threshold,
    uint256 progressBps   // 0–10000 = 0%–100%
) = token.getGraduationInfo();
```

### Via the frontend

The `TradePage` shows a `GraduationBar` with real-time progress. At 100%, a "Graduate Now" button appears for anyone to call `graduate()`. After graduation, the `GraduationTimeline` celebrates and shows the Uniswap pool link.

### Via the API (multicall)

The `ExplorePage` fetches `getGraduationInfo()` for every token in a single `multicall` batch, so graduation status is visible on every token card without extra RPC calls.

---

## LP Lock Verification

LP tokens are sent to `DEAD = 0x000000000000000000000000000000000000dEaD`. You can verify this on Basescan:

1. Find the Uniswap V2 pair for the token: `factory.getPair(tokenAddress, WETH)`
2. On Basescan, check the pair's ERC-20 holders — `0x000...dEaD` should hold 100% (or near 100%) of the LP supply

The test `test_lpBurnedToDeadAddress` in `TokenFactory.t.sol` verifies this with a mock LP ERC-20 that tracks minted balances:

```solidity
function test_lpBurnedToDeadAddress() public {
    MockLPToken lpTok = new MockLPToken();
    // ... etch tracking router at canonical ROUTER address ...
    token.graduate();
    address dead = 0x000000000000000000000000000000000000dEaD;
    assertGt(lpTok.balanceOf(dead), 0, "LP tokens must be burned to the DEAD address");
}
```

---

## Economics of Graduation

### Before graduation

Price and supply follow the bonding curve. The last buyer before graduation gets tokens at the highest bonding-curve price — but they're also the ones most likely to benefit from the liquidity event.

### At graduation

The Uniswap pool is seeded with:
- **ETH** — the full 10 ETH reserve from the bonding curve
- **Tokens** — freshly minted tokens, at a quantity chosen to match the current bonding-curve spot price as the Uniswap initial price

This means the Uniswap opening price should be near the bonding-curve price at graduation, providing a smooth transition.

### After graduation

Trading is free market. Price can move up or down based on open-market demand. The permanent LP ensures there is always liquidity for traders.

---

## Frequently Asked Questions

**Can the graduation threshold be changed?**  
No. `GRADUATION_THRESHOLD` is a `constant` in the contract — immutable once deployed.

**What if nobody calls `graduate()` after the threshold is hit?**  
The token stays on the bonding curve. Buys and sells continue to work normally. The graduation is not automatic — it requires an explicit transaction. Once the threshold is hit, anyone can call `graduate()` at any time.

**Can the LP be withdrawn after graduation?**  
No. The LP tokens are sent directly to `0x000...dEaD` inside the `addLiquidityETH` call. There is no mechanism to recover them.

**Does the creator benefit from graduation?**  
Not directly — graduation sends liquidity to the Uniswap pool and burns LP tokens. The creator's benefit was the 1% fee on every bonding-curve trade leading up to graduation. After graduation, the creator's accumulated fees are whatever they earned; they receive no special benefit from the graduation event itself.

**What network is the Uniswap pool on?**  
Base mainnet. The Uniswap V2 Router address `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` is the Base Uniswap V2 deployment.
