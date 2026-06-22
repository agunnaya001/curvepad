import { useEffect, useState, useRef } from "react";
import { usePublicClient } from "wagmi";
import {
  formatEth, formatTokens, shortenAddress, BONDING_CURVE_ABI,
  priceFromSupply,
} from "@/lib/web3";
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Zap } from "lucide-react";
import { base } from "wagmi/chains";

interface TradeEvent {
  trader: string;
  isBuy: boolean;
  tokenAmount: bigint;
  ethAmount: bigint;
  newSupply: bigint;
  price: number;
  txHash: string;
  blockNumber: bigint;
  isNew?: boolean;
}

interface ActivityFeedProps {
  tokenAddress: `0x${string}`;
  maxRows?: number;
}

export function ActivityFeed({ tokenAddress, maxRows = 30 }: ActivityFeedProps) {
  const [events, setEvents] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient({ chainId: base.id });
  const knownHashes = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      if (!publicClient) return;
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > BigInt(500000) ? latestBlock - BigInt(500000) : BigInt(0);

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
          fromBlock,
          toBlock: "latest",
        });

        if (!cancelled) {
          const parsed: TradeEvent[] = logs
            .filter((l) => l.args.trader !== undefined)
            .map((l) => {
              const newSupply = l.args.newSupply as bigint;
              const hash = l.transactionHash || "";
              const isNew = !knownHashes.current.has(hash);
              if (hash) knownHashes.current.add(hash);
              return {
                trader: l.args.trader as string,
                isBuy: l.args.isBuy as boolean,
                tokenAmount: l.args.tokenAmount as bigint,
                ethAmount: l.args.ethAmount as bigint,
                newSupply,
                price: priceFromSupply(newSupply),
                txHash: hash,
                blockNumber: l.blockNumber || BigInt(0),
                isNew,
              };
            })
            .reverse()
            .slice(0, maxRows);
          setEvents(parsed);
          setLoading(false);
          // Clear new flags after animation
          setTimeout(() => {
            setEvents((prev) => prev.map((e) => ({ ...e, isNew: false })));
          }, 1500);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tokenAddress, publicClient, maxRows]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-10 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
          <Zap className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No trades yet. Be the first to buy!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="activity-feed">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-1.5 text-xs text-muted-foreground/60 font-mono border-b border-border/20">
        <span>Trader</span>
        <span className="text-right">Type</span>
        <span className="text-right">Tokens</span>
        <span className="text-right">ETH</span>
        <span className="text-right">Price</span>
      </div>

      {events.map((event, i) => (
        <div
          key={`${event.txHash}-${i}`}
          data-testid={`trade-event-${i}`}
          className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2 rounded-md border transition-all group ${
            event.isNew
              ? event.isBuy
                ? "border-primary/40 bg-primary/5 animate-in fade-in duration-300"
                : "border-destructive/40 bg-destructive/5 animate-in fade-in duration-300"
              : "border-border/30 bg-card/40 hover:border-border/60 hover:bg-card/60"
          }`}
        >
          {/* Trader */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              event.isBuy ? "bg-primary/10" : "bg-destructive/10"
            }`}>
              {event.isBuy
                ? <ArrowUpRight className="w-3 h-3 text-primary" />
                : <ArrowDownLeft className="w-3 h-3 text-destructive" />}
            </div>
            <span className="text-xs font-mono text-muted-foreground truncate">
              {shortenAddress(event.trader)}
            </span>
          </div>

          {/* Type */}
          <span className={`text-xs font-semibold ${event.isBuy ? "text-primary" : "text-destructive"}`}>
            {event.isBuy ? "BUY" : "SELL"}
          </span>

          {/* Tokens */}
          <span className="text-xs font-mono text-foreground text-right">
            {formatTokens(event.tokenAmount)}
          </span>

          {/* ETH */}
          <span className="text-xs font-mono text-foreground text-right">
            {formatEth(event.ethAmount, 5)}
          </span>

          {/* Price + link */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-xs font-mono text-muted-foreground text-right">
              {event.price.toFixed(8)}
            </span>
            {event.txHash && (
              <a
                href={`https://basescan.org/tx/${event.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary flex-shrink-0"
                data-testid={`link-tx-${i}`}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
