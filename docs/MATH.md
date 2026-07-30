# CurvePad Bonding Curve Math

This document formally derives the bonding curve equations used in `BondingCurveToken.sol`.

---

## Notation

| Symbol | Meaning |
|---|---|
| `s` | Current total supply in **full tokens** (`totalSupply / WAD` where `WAD = 1e18`) |
| `x` | Tokens to mint (buy) or burn (sell) |
| `BASE_PRICE` | `1e12` wei — price at supply = 0 |
| `SLOPE` | `1e6` wei per token — price increase per unit of supply |
| `WAD` | `1e18` — one full token in the smallest unit |
| `BPS_DENOM` | `10000` — basis-points denominator |
| `FEE_BPS` | `100` — 1% fee |

---

## Price Function

```
price(s) = BASE_PRICE + SLOPE × s     [wei per 1 full token]
```

This is a simple linear function: price starts at `BASE_PRICE` and rises proportionally with supply. The slope ensures later buyers always pay more, incentivizing early participation.

---

## Reserve Function

The ETH reserve required to collateralize supply `s` is the integral of the price curve from 0 to s:

```
reserve(s) = ∫₀ˢ price(t) dt
           = ∫₀ˢ (BASE_PRICE + SLOPE·t) dt
           = BASE_PRICE·s + SLOPE·s²/2
```

**This is the reserve invariant.** At any point in time:

```
address(token).balance == reserve(totalSupply / WAD)
```

The Solidity implementation:

```solidity
function _reserveAt(uint256 supply) internal pure returns (uint256) {
    uint256 s = supply / WAD;           // full tokens
    uint256 s2 = (supply / WAD) * (supply / WAD); // s²
    return BASE_PRICE * s + (SLOPE * s2) / 2;
}
```

> **Precision note:** Dividing by WAD before squaring truncates sub-token fractions. The resulting dust is at most `2 × BASE_PRICE = 2e12 wei ≈ 0.000002 ETH` — negligible for any realistic use.

---

## Buy Formula

A buyer sends `ethIn` wei. The protocol deducts a 1% fee and routes the rest to the reserve:

```
fee           = ethIn × FEE_BPS / BPS_DENOM
ethForReserve = ethIn − fee
```

We need to find `x` (tokens to mint) such that adding `x` tokens would require exactly `ethForReserve` additional reserve:

```
reserve(s + x) − reserve(s) = ethForReserve
```

Expanding using the reserve function:

```
BASE_PRICE·(s+x) + SLOPE·(s+x)²/2 − [BASE_PRICE·s + SLOPE·s²/2] = ethForReserve

BASE_PRICE·x + SLOPE·(2sx + x²)/2 = ethForReserve

(SLOPE/2)·x² + (BASE_PRICE + SLOPE·s)·x − ethForReserve = 0
```

Let `B = BASE_PRICE + SLOPE × s` (the current spot price). This is a standard quadratic:

```
(SLOPE/2)·x² + B·x − ethForReserve = 0
```

Applying the quadratic formula (taking the positive root):

```
x = (√(B² + 2·SLOPE·ethForReserve) − B) / SLOPE
```

### Precision in Solidity

The discriminant `B² + 2·SLOPE·ethForReserve` is computed **before** any WAD division to preserve full precision:

```solidity
uint256 B = BASE_PRICE + (SLOPE * (supply / WAD));   // spot price in wei
uint256 disc = B * B + 2 * SLOPE * ethForReserve;    // discriminant (no division)
uint256 sqrtDisc = sqrt(disc);                        // integer square root
uint256 tokensOut = ((sqrtDisc - B) * WAD) / SLOPE;  // re-scale to WAD at the end
```

Dividing `B` by WAD before squaring would lose ~18 decimal digits of precision, causing catastrophic cancellation on small trades (< ~0.001 ETH). The current approach avoids this.

---

## Sell Formula

Selling `x` full tokens (in WAD units) returns the area under the price curve that those tokens represent:

```
gross = reserve(s) − reserve(s − x)
      = BASE_PRICE·x + SLOPE·(2s − x)·x / 2
```

After the 1% creator fee:

```
net = gross × (BPS_DENOM − FEE_BPS) / BPS_DENOM
    = gross × 99 / 100
```

The Solidity implementation:

```solidity
uint256 gross = _reserveAt(supply) - _reserveAt(supply - tokenAmount);
uint256 fee   = (gross * FEE_BPS) / BPS_DENOM;
uint256 net   = gross - fee;

_burn(msg.sender, tokenAmount);
creatorFeesEarned += fee;
payable(creator).transfer(fee);
payable(msg.sender).transfer(net);
```

> **CEI note:** `_burn` (state change) happens before the two `transfer` calls (external interactions), satisfying the Checks-Effects-Interactions pattern.

---

## Graduation

When `address(token).balance >= GRADUATION_THRESHOLD` (10 ETH), anyone may call `graduate()`:

```
1. require(!graduated)
2. require(balance >= GRADUATION_THRESHOLD)
3. graduated = true                          // effect
4. mint fresh tokens proportional to reserve  // effect
5. approve(UNISWAP_ROUTER, freshTokens)
6. (amountToken, amountETH, liquidity) =
       router.addLiquidityETH{value: reserve}(
           address(this), freshTokens, 0, 0, DEAD, deadline
       )
7. uniswapPool = factory.getPair(address(this), WETH)
8. emit Graduated(uniswapPool, reserve)
```

The `to` parameter in `addLiquidityETH` is set to `DEAD = 0x000...dEaD`, so LP tokens are minted directly to the dead address — they can never be transferred, redeemed, or used to drain the pool.

---

## Numerical Bounds

### Maximum safe supply

`BASE_PRICE × s` uses a 256-bit integer. With `BASE_PRICE = 1e12` and `WAD = 1e18`:

```
Max s before overflow in BASE_PRICE × s:
2²⁵⁶ / 1e12 ≈ 1.16 × 10⁶⁵ full tokens
```

With `SLOPE = 1e6` and the `s²` term:

```
Max s before overflow in SLOPE × s²:
√(2²⁵⁶ / 1e6) ≈ 1.07 × 10²⁵ full tokens
```

Both bounds are astronomically large. The practical maximum supply (given a 10 ETH reserve cap before graduation) is approximately:

```
Solving 1e12·s + 1e6·s²/2 = 10e18:
s ≈ √(2 × 10e18 / 1e6) ≈ 4.47 × 10⁶ full tokens
```

No overflow is possible at realistic supply levels.

### Fee precision

The 1% fee is computed as `ethIn × 100 / 10000`. For `ethIn = 1 wei`, the fee rounds to 0 (integer division). This is intentional: very small trades pay no fee, but the rounding error is negligible.
