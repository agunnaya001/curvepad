import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "CurvePad" }),
    walletConnect({
      projectId: "2d0b9b35da4a10a8c6d6cd2b55a63a3b",
    }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
});

// ─── Contract addresses ───────────────────────────────────────────────────────

// V1 factory — deployed & verified on Base mainnet block 44809260
// V2 (with graduation + Uniswap LP): ready to deploy, awaiting wallet funding
// https://basescan.org/address/0x479596943e70316A0d893De1876EBeA1Ea8E4D5B
export const FACTORY_ADDRESS = "0x479596943e70316A0d893De1876EBeA1Ea8E4D5B" as `0x${string}`;

// V2 constants (same math as V1 + graduation added)
export const BASE_PRICE = BigInt("1000000000000"); // 1e12 wei — 0.000001 ETH/token at supply=0
export const SLOPE = BigInt("1000000");            // 1e6 wei — price increases by 1e6 wei per token
export const GRADUATION_THRESHOLD = BigInt("10000000000000000000"); // 10 ETH

const WAD = BigInt(1e18);

// ─── Factory ABI ──────────────────────────────────────────────────────────────

export const FACTORY_ABI = [
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
    ],
  },
  {
    type: "function",
    name: "createToken",
    inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }],
    outputs: [{ name: "token", type: "address" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getTokens",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ─── Bonding Curve ABI (V1 + V2 additions) ────────────────────────────────────

export const BONDING_CURVE_ABI = [
  // ── Events ──
  {
    type: "event",
    name: "Trade",
    inputs: [
      { name: "trader", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: false },
      { name: "tokenAmount", type: "uint256", indexed: false },
      { name: "ethAmount", type: "uint256", indexed: false },
      { name: "newSupply", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Graduated",
    inputs: [
      { name: "pool", type: "address", indexed: true },
      { name: "ethLiquidity", type: "uint256", indexed: false },
      { name: "tokenLiquidity", type: "uint256", indexed: false },
      { name: "supplyAtGraduation", type: "uint256", indexed: false },
    ],
  },
  // ── Standard ERC20 ──
  { type: "function", name: "name", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // ── Price & market data ──
  { type: "function", name: "getCurrentPrice", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getMarketCap", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getBuyPrice", inputs: [{ name: "ethAmount", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getSellReturn", inputs: [{ name: "tokenAmount", type: "uint256" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // ── Creator data ──
  { type: "function", name: "creator", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "creatorFeesEarned", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  // ── Trade ──
  { type: "function", name: "buy", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "sell", inputs: [{ name: "tokenAmount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  // ── V2: Graduation ──
  { type: "function", name: "graduated", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "uniswapPool", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "graduate", inputs: [], outputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "getGraduationInfo",
    inputs: [],
    outputs: [
      { name: "_graduated", type: "bool" },
      { name: "_pool", type: "address" },
      { name: "_reserveEth", type: "uint256" },
      { name: "_threshold", type: "uint256" },
      { name: "_progressBps", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

// ─── Trade event type ─────────────────────────────────────────────────────────

export interface TradeEventData {
  trader: string;
  isBuy: boolean;
  tokenAmount: bigint;
  ethAmount: bigint;
  newSupply: bigint;
  txHash: string;
  blockNumber: bigint;
  timestamp?: number;
  /** Closing price (ETH per full token) derived from newSupply */
  price: number;
}

export interface PriceCandle {
  blockStart: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // ETH
  isBullish: boolean;
  tradeCount: number;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatEth(wei: bigint, decimals = 6): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.000001) return "<0.000001";
  return eth.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatTokens(amount: bigint, decimals = 2): string {
  const tokens = Number(amount) / 1e18;
  if (tokens >= 1_000_000) return (tokens / 1_000_000).toFixed(2) + "M";
  if (tokens >= 1_000) return (tokens / 1_000).toFixed(2) + "K";
  return tokens.toFixed(decimals);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── On-chain math (mirrors TokenFactory.sol exactly) ────────────────────────

export function calcBuyTokens(ethIn: bigint, currentSupply: bigint): bigint {
  const ethForReserve = (ethIn * BigInt(99)) / BigInt(100);
  const s = currentSupply / WAD;
  const B = BASE_PRICE + SLOPE * s;
  const discriminant = B * B + BigInt(2) * SLOPE * ethForReserve;
  const sqrtD = bigIntSqrt(discriminant);
  if (sqrtD <= B) return BigInt(0);
  const xTokens = (sqrtD - B) / SLOPE;
  return xTokens * WAD;
}

export function calcSellReturn(tokenAmount: bigint, currentSupply: bigint): bigint {
  if (tokenAmount > currentSupply) return BigInt(0);
  const s = currentSupply / WAD;
  const x = tokenAmount / WAD;
  const supplyAfter = s - x;
  const reserveBefore = BASE_PRICE * s + (SLOPE * s * s) / BigInt(2);
  const reserveAfter = BASE_PRICE * supplyAfter + (SLOPE * supplyAfter * supplyAfter) / BigInt(2);
  if (reserveAfter > reserveBefore) return BigInt(0);
  const gross = reserveBefore - reserveAfter;
  return (gross * BigInt(99)) / BigInt(100);
}

export function bigIntSqrt(n: bigint): bigint {
  if (n <= BigInt(0)) return BigInt(0);
  let x = n;
  let y = (x + BigInt(1)) / BigInt(2);
  while (y < x) { x = y; y = (x + n / x) / BigInt(2); }
  return x;
}

// ─── Price helpers ────────────────────────────────────────────────────────────

/** Closing price in ETH per full token from supply (WAD) */
export function priceFromSupply(supplyWad: bigint): number {
  const s = Number(supplyWad) / 1e18;
  return (Number(BASE_PRICE) + Number(SLOPE) * s) / 1e18;
}

/** Price impact in basis points for a buy of ethIn */
export function buyPriceImpactBps(ethIn: bigint, supply: bigint): number {
  const tokensBought = calcBuyTokens(ethIn, supply);
  if (tokensBought === BigInt(0)) return 0;
  const priceBefore = priceFromSupply(supply);
  const priceAfter = priceFromSupply(supply + tokensBought);
  return Math.round(((priceAfter - priceBefore) / priceBefore) * 10000);
}

/** Price impact in basis points for a sell of tokenAmount */
export function sellPriceImpactBps(tokenAmount: bigint, supply: bigint): number {
  if (tokenAmount > supply) return 0;
  const priceBefore = priceFromSupply(supply);
  const priceAfter = priceFromSupply(supply - tokenAmount);
  return Math.round(((priceBefore - priceAfter) / priceBefore) * 10000);
}

// ─── Curve plotting ───────────────────────────────────────────────────────────

export function calcCurvePoints(
  currentSupply: bigint,
  points = 100
): { supply: number; price: number }[] {
  const supplyNum = Number(currentSupply) / 1e18;
  const maxSupply = Math.max(supplyNum * 2, 1_000_000);
  const result = [];
  for (let i = 0; i <= points; i++) {
    const s = (maxSupply * i) / points;
    const price = (Number(BASE_PRICE) + Number(SLOPE) * s) / 1e18;
    result.push({ supply: s, price });
  }
  return result;
}

/** Build price candles from Trade events.
 *  blocksPerCandle controls time resolution (30 blocks ≈ 1 min on Base). */
export function buildCandles(
  events: TradeEventData[],
  blocksPerCandle = 300
): PriceCandle[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => Number(a.blockNumber - b.blockNumber));
  const buckets = new Map<number, TradeEventData[]>();
  for (const ev of sorted) {
    const bucket = Math.floor(Number(ev.blockNumber) / blocksPerCandle) * blocksPerCandle;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(ev);
  }
  const candles: PriceCandle[] = [];
  for (const [blockStart, evs] of Array.from(buckets.entries()).sort(([a], [b]) => a - b)) {
    const prices = evs.map((e) => e.price);
    const open = prices[0];
    const close = prices[prices.length - 1];
    const volume = evs.reduce((s, e) => s + Number(e.ethAmount) / 1e18, 0);
    candles.push({
      blockStart,
      open,
      high: Math.max(...prices),
      low: Math.min(...prices),
      close,
      volume,
      isBullish: close >= open,
      tradeCount: evs.length,
    });
  }
  return candles;
}
