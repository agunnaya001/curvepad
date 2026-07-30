# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| V2 (current) | ✅ Active |
| V1 (deprecated) | ❌ No longer supported |

The active contract is `TokenFactory V2` at [`0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6`](https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6) on Base mainnet.

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a vulnerability in the smart contracts, API, or frontend:

1. **Email** the maintainer directly (see profile contact).
2. Include a clear description: affected component, attack vector, potential impact, and reproduction steps.
3. We will acknowledge receipt within 48 hours and provide a timeline for a fix.

For vulnerabilities in the **deployed contract** specifically: because smart contracts on Base are immutable, a critical bug cannot be patched — we will publish a public disclosure and migrate users to a fixed contract as quickly as possible.

---

## Known Limitations

### Smart Contracts

| Item | Status |
|---|---|
| **No audit** | The contracts have not been audited by a third-party security firm. Use at your own risk. |
| **Immutable** | Once deployed, the contract cannot be paused, upgraded, or patched. |
| **Graduation LP burn** | LP tokens are burned on graduation — this is intentional and irreversible. |
| **No oracle** | Price is determined solely by the bonding curve; there is no oracle dependency. |
| **Precision dust** | Sub-token supply fractions are truncated; max error ≤ `2 × BASE_PRICE = 2e12 wei ≈ 0.000002 ETH`. |

### API / Frontend

| Item | Status |
|---|---|
| **Token metadata** | Off-chain metadata (name, description, image) is not authenticated — anyone can overwrite it by address. This is intentional for a permissionless launchpad. |
| **Image uploads** | Token images are publicly readable. Do not upload sensitive content. |
| **No rate limiting** | The API does not currently rate-limit requests. |

---

## Security Properties

The contracts are designed to be secure by construction:

| Property | Implementation |
|---|---|
| **No admin** | No `owner`, `pause`, `upgrade`, or `setFee` functions |
| **Reentrancy** | `ReentrancyGuard` on `buy()` and `sell()` |
| **CEI pattern** | All state mutations precede external calls |
| **Reserve invariant** | ETH balance always equals the bonding curve integral |
| **Integer precision** | 256-bit discriminant in buy formula; no premature WAD division |
| **Overflow** | Solidity 0.8.x checked arithmetic by default |
| **LP lock** | Graduation sends LP tokens directly to `0x000...dEaD` |

---

## Disclosure History

_No vulnerabilities have been disclosed to date._
