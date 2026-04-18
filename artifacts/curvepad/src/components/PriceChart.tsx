import { useRef, useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { base } from "wagmi/chains";
import { buildCandles, priceFromSupply, type TradeEventData, type PriceCandle, BASE_PRICE, SLOPE } from "@/lib/web3";

interface PriceChartProps {
  tokenAddress: `0x${string}`;
  currentSupply: bigint;
  height?: number;
}

const TIMEFRAMES = [
  { label: "1M", blocks: 30 },
  { label: "5M", blocks: 150 },
  { label: "15M", blocks: 450 },
  { label: "1H", blocks: 1800 },
] as const;

type TF = (typeof TIMEFRAMES)[number]["label"];

export function PriceChart({ tokenAddress, currentSupply, height = 320 }: PriceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<PriceCandle[]>([]);
  const [timeframe, setTimeframe] = useState<TF>("5M");
  const [loading, setLoading] = useState(true);
  const [animFrame, setAnimFrame] = useState(0);
  const [hoveredCandle, setHoveredCandle] = useState<PriceCandle | null>(null);
  const publicClient = usePublicClient({ chainId: base.id });

  const blocksPerCandle = TIMEFRAMES.find((t) => t.label === timeframe)?.blocks ?? 150;

  const fetchAndBuild = useCallback(async () => {
    if (!publicClient) return;
    try {
      const latest = await publicClient.getBlockNumber();
      const from = latest > BigInt(500000) ? latest - BigInt(500000) : BigInt(0);

      const logs = await publicClient.getLogs({
        address: tokenAddress,
        event: {
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
        fromBlock: from,
        toBlock: "latest",
      });

      const events: TradeEventData[] = logs
        .filter((l) => l.args.trader !== undefined)
        .map((l) => ({
          trader: l.args.trader as string,
          isBuy: l.args.isBuy as boolean,
          tokenAmount: l.args.tokenAmount as bigint,
          ethAmount: l.args.ethAmount as bigint,
          newSupply: l.args.newSupply as bigint,
          txHash: l.transactionHash || "",
          blockNumber: l.blockNumber || BigInt(0),
          price: priceFromSupply(l.args.newSupply as bigint),
        }));

      setCandles(buildCandles(events, blocksPerCandle));
    } catch {
      // keep existing candles
    } finally {
      setLoading(false);
    }
  }, [publicClient, tokenAddress, blocksPerCandle]);

  useEffect(() => {
    setLoading(true);
    fetchAndBuild();
    const id = setInterval(fetchAndBuild, 15000);
    return () => clearInterval(id);
  }, [fetchAndBuild]);

  // Animate dot
  useEffect(() => {
    const id = setInterval(() => setAnimFrame((f) => f + 1), 60);
    return () => clearInterval(id);
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 16, right: 60, bottom: 40, left: 10 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom - 50; // 50px for volume bars
    const volH = 36;
    const volTop = h - pad.bottom - volH;

    const currentPrice = priceFromSupply(currentSupply);

    // If no candles: draw a simple live price line
    if (candles.length === 0) {
      // Background grid
      ctx.strokeStyle = "rgba(0,255,170,0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + chartW, y);
        ctx.stroke();
      }
      // Price label
      ctx.fillStyle = "rgba(0,255,170,0.7)";
      ctx.font = `11px 'Space Mono', monospace`;
      ctx.textAlign = "left";
      ctx.fillText(`${currentPrice.toFixed(8)} ETH`, pad.left + 8, pad.top + 24);
      ctx.fillStyle = "rgba(160,200,180,0.4)";
      ctx.font = "10px 'Space Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for first trade…", pad.left + chartW / 2, pad.top + chartH / 2);
      return;
    }

    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    allPrices.push(currentPrice);
    const minPrice = Math.min(...allPrices) * 0.98;
    const maxPrice = Math.max(...allPrices) * 1.02;
    const priceRange = maxPrice - minPrice || maxPrice * 0.01;

    const maxVol = Math.max(...candles.map((c) => c.volume), 0.000001);

    const toY = (p: number) => pad.top + chartH - ((p - minPrice) / priceRange) * chartH;
    const toX = (i: number) => pad.left + (i / candles.length) * chartW;
    const candleW = Math.max(2, (chartW / candles.length) * 0.7);

    // Grid lines
    ctx.strokeStyle = "rgba(0,255,170,0.04)";
    ctx.lineWidth = 1;
    const gridRows = 5;
    for (let i = 0; i <= gridRows; i++) {
      const y = pad.top + (chartH * i) / gridRows;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
      const priceAt = maxPrice - (priceRange * i) / gridRows;
      ctx.fillStyle = "rgba(160,200,180,0.45)";
      ctx.font = "9px 'Space Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(priceAt.toFixed(8), pad.left + chartW + 4, y + 3);
    }

    // Candles
    candles.forEach((c, i) => {
      const cx = toX(i) + (chartW / candles.length) * 0.15;
      const openY = toY(c.open);
      const closeY = toY(c.close);
      const highY = toY(c.high);
      const lowY = toY(c.low);

      const color = c.isBullish ? "rgba(0,255,170,0.85)" : "rgba(255,80,80,0.85)";
      const colorFill = c.isBullish ? "rgba(0,255,170,0.15)" : "rgba(255,80,80,0.15)";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + candleW / 2, highY);
      ctx.lineTo(cx + candleW / 2, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(closeY - openY), 1);
      ctx.fillStyle = colorFill;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.fillRect(cx, bodyTop, candleW, bodyH);
      ctx.strokeRect(cx, bodyTop, candleW, bodyH);

      // Volume bar
      const volBarH = Math.max(2, (c.volume / maxVol) * volH);
      ctx.fillStyle = c.isBullish ? "rgba(0,255,170,0.25)" : "rgba(255,80,80,0.25)";
      ctx.fillRect(cx, volTop + volH - volBarH, candleW, volBarH);
    });

    // Current price dashed line
    const cpY = toY(currentPrice);
    ctx.strokeStyle = "rgba(0,255,170,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, cpY);
    ctx.lineTo(pad.left + chartW, cpY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label background
    const cpLabel = currentPrice.toFixed(8);
    ctx.font = "9px 'Space Mono', monospace";
    const labelW = ctx.measureText(cpLabel).width + 10;
    ctx.fillStyle = "rgba(0,255,170,0.85)";
    ctx.fillRect(pad.left + chartW + 2, cpY - 8, labelW, 16);
    ctx.fillStyle = "#000";
    ctx.textAlign = "left";
    ctx.fillText(cpLabel, pad.left + chartW + 7, cpY + 3);

    // Animated dot at last candle
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const dotX = toX(candles.length - 1) + candleW / 2;
      const dotY = toY(lastCandle.close);
      const pulse = Math.sin(animFrame * 0.15) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 7 + pulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,170,${0.05 + pulse * 0.08})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffaa";
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // X-axis block labels
    ctx.fillStyle = "rgba(160,200,180,0.35)";
    ctx.font = "9px 'Space Mono', monospace";
    ctx.textAlign = "center";
    const labelEvery = Math.max(1, Math.floor(candles.length / 5));
    candles.forEach((c, i) => {
      if (i % labelEvery === 0) {
        ctx.fillText(`#${c.blockStart.toString().slice(-5)}`, toX(i) + candleW / 2, h - pad.bottom + 14);
      }
    });

    // Volume label
    ctx.fillStyle = "rgba(160,200,180,0.25)";
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("VOL", pad.left + chartW, volTop - 3);
  }, [candles, currentSupply, animFrame]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf.label)}
              className={`px-2 py-0.5 text-xs rounded font-mono transition-colors ${
                timeframe === tf.label
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {hoveredCandle && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={hoveredCandle.isBullish ? "text-primary" : "text-destructive"}>
              O: {hoveredCandle.open.toFixed(8)}
            </span>
            <span className="text-muted-foreground">H: {hoveredCandle.high.toFixed(8)}</span>
            <span className="text-muted-foreground">L: {hoveredCandle.low.toFixed(8)}</span>
            <span className={hoveredCandle.isBullish ? "text-primary" : "text-destructive"}>
              C: {hoveredCandle.close.toFixed(8)}
            </span>
            <span className="text-muted-foreground">V: {hoveredCandle.volume.toFixed(5)} ETH</span>
          </div>
        )}
      </div>
      {loading && candles.length === 0 ? (
        <div className="animate-pulse rounded-lg bg-muted/20" style={{ height }} />
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height }}
          className="w-full rounded-lg bg-background/40"
          onMouseMove={(e) => {
            if (!candles.length) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            const idx = Math.floor(pct * candles.length);
            setHoveredCandle(candles[Math.min(idx, candles.length - 1)]);
          }}
          onMouseLeave={() => setHoveredCandle(null)}
        />
      )}
    </div>
  );
}
