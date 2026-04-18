import { useRef, useEffect } from "react";
import { BASE_PRICE, SLOPE, priceFromSupply } from "@/lib/web3";

interface DepthChartProps {
  currentSupply: bigint;
  height?: number;
}

const WAD = BigInt(1e18);

function reserveAt(supplyWad: bigint): number {
  const s = Number(supplyWad / WAD);
  return Number(BASE_PRICE) * s + Number(SLOPE) * s * s / 2;
}

export function DepthChart({ currentSupply, height = 180 }: DepthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const pad = { top: 12, right: 8, bottom: 28, left: 8 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const currentPrice = priceFromSupply(currentSupply);
    const supply = Number(currentSupply) / 1e18;

    // Generate buy depth: how much ETH to push price X% higher
    const BUY_LEVELS = 20;
    const SELL_LEVELS = 20;
    const buyDepth: { price: number; cumEth: number }[] = [];
    const sellDepth: { price: number; cumEth: number }[] = [];

    // Buy side: accumulate ETH needed to reach price levels
    for (let i = 1; i <= BUY_LEVELS; i++) {
      const targetPrice = currentPrice * (1 + (i / BUY_LEVELS) * 0.5); // up to 50% above
      const targetSupply = Math.max(0, (targetPrice * 1e18 - Number(BASE_PRICE)) / Number(SLOPE));
      const targetSupplyWad = BigInt(Math.floor(targetSupply)) * WAD;
      const ethNeeded = (reserveAt(targetSupplyWad) - reserveAt(currentSupply)) / 1e18;
      buyDepth.push({ price: targetPrice, cumEth: Math.max(0, ethNeeded) });
    }

    // Sell side: ETH received from selling to reach lower price levels
    for (let i = 1; i <= SELL_LEVELS; i++) {
      const targetPrice = currentPrice * (1 - (i / SELL_LEVELS) * 0.5); // down to 50% below
      const targetSupply = Math.max(0, (targetPrice * 1e18 - Number(BASE_PRICE)) / Number(SLOPE));
      const targetSupplyWad = BigInt(Math.floor(targetSupply)) * WAD;
      const ethReleased = (reserveAt(currentSupply) - reserveAt(targetSupplyWad)) / 1e18;
      sellDepth.push({ price: targetPrice, cumEth: Math.max(0, ethReleased) });
    }

    const maxDepth = Math.max(
      ...buyDepth.map((d) => d.cumEth),
      ...sellDepth.map((d) => d.cumEth),
      0.001
    );

    const midX = pad.left + chartW / 2;

    // Grid
    ctx.strokeStyle = "rgba(0,255,170,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (chartH * i) / 3;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
    }

    // Midline (current price)
    ctx.strokeStyle = "rgba(0,255,170,0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(midX, pad.top);
    ctx.lineTo(midX, pad.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw sell depth (left side, red)
    ctx.beginPath();
    ctx.moveTo(midX, pad.top + chartH);
    for (let i = 0; i < sellDepth.length; i++) {
      const x = midX - ((i + 1) / SELL_LEVELS) * (chartW / 2);
      const y = pad.top + chartH - (sellDepth[i].cumEth / maxDepth) * chartH;
      ctx.lineTo(x, y);
    }
    const leftEnd = midX - chartW / 2;
    ctx.lineTo(leftEnd, pad.top + chartH);
    ctx.closePath();
    const sellGrad = ctx.createLinearGradient(midX, 0, leftEnd, 0);
    sellGrad.addColorStop(0, "rgba(255,80,80,0.3)");
    sellGrad.addColorStop(1, "rgba(255,80,80,0.05)");
    ctx.fillStyle = sellGrad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(midX, pad.top + chartH);
    for (let i = 0; i < sellDepth.length; i++) {
      const x = midX - ((i + 1) / SELL_LEVELS) * (chartW / 2);
      const y = pad.top + chartH - (sellDepth[i].cumEth / maxDepth) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(255,80,80,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw buy depth (right side, green)
    ctx.beginPath();
    ctx.moveTo(midX, pad.top + chartH);
    for (let i = 0; i < buyDepth.length; i++) {
      const x = midX + ((i + 1) / BUY_LEVELS) * (chartW / 2);
      const y = pad.top + chartH - (buyDepth[i].cumEth / maxDepth) * chartH;
      ctx.lineTo(x, y);
    }
    const rightEnd = midX + chartW / 2;
    ctx.lineTo(rightEnd, pad.top + chartH);
    ctx.closePath();
    const buyGrad = ctx.createLinearGradient(midX, 0, rightEnd, 0);
    buyGrad.addColorStop(0, "rgba(0,255,170,0.3)");
    buyGrad.addColorStop(1, "rgba(0,255,170,0.05)");
    ctx.fillStyle = buyGrad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(midX, pad.top + chartH);
    for (let i = 0; i < buyDepth.length; i++) {
      const x = midX + ((i + 1) / BUY_LEVELS) * (chartW / 2);
      const y = pad.top + chartH - (buyDepth[i].cumEth / maxDepth) * chartH;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(0,255,170,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current price label at top center
    ctx.fillStyle = "rgba(0,255,170,0.85)";
    ctx.font = "9px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${currentPrice.toFixed(8)} ETH`, midX, pad.top + 10);

    // Axis labels
    ctx.fillStyle = "rgba(160,200,180,0.35)";
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`-50%`, pad.left + 2, h - pad.bottom + 13);
    ctx.textAlign = "center";
    ctx.fillText("DEPTH", midX, h - pad.bottom + 13);
    ctx.textAlign = "right";
    ctx.fillText(`+50%`, pad.left + chartW - 2, h - pad.bottom + 13);
  }, [currentSupply]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-destructive/70 text-xs">◀ Sell Depth</span>
        <span className="text-muted-foreground font-mono text-xs">Market Depth</span>
        <span className="text-primary/70 text-xs">Buy Depth ▶</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height }}
        className="w-full rounded-md bg-background/30"
      />
    </div>
  );
}
