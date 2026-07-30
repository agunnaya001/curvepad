# CurvePad Documentation

Welcome to the CurvePad documentation. These guides cover the technical details of the protocol, smart contracts, and application.

---

## Guides

| Document | Description |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview — contracts, frontend, API, and data flows |
| [MATH.md](MATH.md) | Formal derivation of the bonding curve, buy/sell formulas, and graduation math |
| [GRADUATION.md](GRADUATION.md) | How token graduation works — threshold, LP lock, economics, FAQ |
| [IMAGE_UPLOAD.md](IMAGE_UPLOAD.md) | Token image upload flow — presigned GCS URLs, API reference, code examples |

---

## Quick Links

- [README](../README.md) — project overview and getting started
- [CONTRIBUTING](../CONTRIBUTING.md) — how to contribute
- [SECURITY](../SECURITY.md) — vulnerability reporting and known limitations
- [CHANGELOG](../CHANGELOG.md) — version history
- [LICENSE](../LICENSE) — MIT license

---

## Contract Reference

**V2 (active):** [`0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6`](https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6)  
**Network:** Base Mainnet (chain ID 8453)  
**Source:** [`contracts/foundry/src/TokenFactory.sol`](../contracts/foundry/src/TokenFactory.sol)

### Key Functions

```solidity
// Factory
function createToken(string name, string symbol) external returns (address)
function getTokens() external view returns (address[])
function getTokenCount() external view returns (uint256)
function tokenCreator(address token) external view returns (address)

// BondingCurveToken
function buy() external payable
function sell(uint256 tokenAmount) external
function graduate() external
function getGraduationInfo() external view returns (
    bool graduated,
    address uniswapPool,
    uint256 reserve,
    uint256 threshold,
    uint256 progressBps
)
```

### Key Constants

```solidity
uint256 BASE_PRICE = 1_000_000_000_000;  // 1e12 wei — starting price
uint256 SLOPE      = 1_000_000;          // 1e6 wei — price increase per token
uint256 FEE_BPS    = 100;                // 1% creator fee
uint256 GRADUATION_THRESHOLD = 10 ether; // graduation trigger
address DEAD       = 0x000...dEaD;      // LP burn address
```
