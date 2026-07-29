// SPDX-License-Identifier: MIT
// Copyright (c) 2024 CurvePad. All rights reserved.
import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useConnect } from "wagmi";
import { Link } from "wouter";
import { base } from "wagmi/chains";
import { formatEther } from "viem";
import {
  FACTORY_ADDRESS, FACTORY_ABI, BONDING_CURVE_ABI,
  formatEth, formatTokens, shortenAddress, priceFromSupply,
} from "@/lib/web3";
import { getTokenMetadata, type TokenMeta } from "@/lib/api";
import { TokenAvatar } from "@/components/TokenAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart2, ArrowUpRight, Wallet, ChevronDown,
  ExternalLink, Zap, RefreshCcw,
} from "lucide-react";

interface HoldingInfo {
  address: string;
  name: string;
  symbol: string;
  balance: bigint;
  totalSupply: bigint;
  currentPrice: bigint;
  marketCap: bigint;
  reserveEth: bigint;
  valueEth: number;
  shareOfSupply: number;
  meta?: TokenMeta | null;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient({ chainId: base.id });

  const [holdings, setHoldings] = useState<HoldingInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [totalValueEth, setTotalValueEth] = useState(0);

  const fetchPortfolio = async () => {
    if (!publicClient || !address) return;
    setLoading(true);
    try {
      const tokenAddrs = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "getTokens",
      }) as string[];

      if (tokenAddrs.length === 0) { setLoading(false); return; }

      // Batch balance checks using multicall
      const balanceCalls = tokenAddrs.map((addr) => ({
        address: addr as `0x${string}`,
        abi: BONDING_CURVE_ABI,
        functionName: "balanceOf" as const,
        args: [address] as [`0x${string}`],
      }));

      const balances = await publicClient.multicall({ contracts: balanceCalls });

      // Filter to tokens where user has non-zero balance
      const held = tokenAddrs.filter((_, i) => {
        const r = balances[i];
        return r.status === "success" && (r.result as bigint) > BigInt(0);
      });

      if (held.length === 0) { setHoldings([]); setTotalValueEth(0); setLoading(false); setLastRefresh(new Date()); return; }

      // Fetch full info for held tokens in parallel
      const infos: HoldingInfo[] = [];
      await Promise.all(
        held.map(async (addr) => {
          try {
            const idx = tokenAddrs.indexOf(addr);
            const balance = balances[idx].result as bigint;

            const [name, symbol, totalSupply, currentPrice, marketCap] = await Promise.all([
              publicClient.readContract({ address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "name" }),
              publicClient.readContract({ address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "symbol" }),
              publicClient.readContract({ address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "totalSupply" }),
              publicClient.readContract({ address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "getCurrentPrice" }),
              publicClient.readContract({ address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "getMarketCap" }),
            ]);

            const reserveEth = await publicClient.getBalance({ address: addr as `0x${string}` });
            const meta = await getTokenMetadata(addr);

            const supply = totalSupply as bigint;
            const price = currentPrice as bigint;
            const valueEth = (Number(balance) / 1e18) * (Number(price) / 1e18) * 0.99;
            const shareOfSupply = supply > BigInt(0)
              ? (Number(balance) / Number(supply)) * 100
              : 0;

            infos.push({
              address: addr,
              name: name as string,
              symbol: symbol as string,
              balance,
              totalSupply: supply,
              currentPrice: price,
              marketCap: marketCap as bigint,
              reserveEth,
              valueEth,
              shareOfSupply,
              meta,
            });
          } catch { /* skip token if unavailable */ }
        })
      );

      infos.sort((a, b) => b.valueEth - a.valueEth);
      setHoldings(infos);
      setTotalValueEth(infos.reduce((s, h) => s + h.valueEth, 0));
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) fetchPortfolio();
  }, [isConnected, address, publicClient]);

  if (!isConnected) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Connect to view portfolio</h2>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to see your token holdings across all CurvePad tokens on Base.
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Wallet className="w-4 h-4" /> Connect Wallet <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {connectors.map((c) => (
                <DropdownMenuItem key={c.uid} onClick={() => connect({ connector: c })}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-primary uppercase tracking-widest">Portfolio</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">My Holdings</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">
              {shortenAddress(address!)}
            </p>
          </div>
          <button
            onClick={fetchPortfolio}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-md border border-border/40 hover:border-primary/30"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Portfolio Value",
              value: `${totalValueEth.toFixed(6)} ETH`,
              color: "text-primary",
              sub: "estimated sell value",
            },
            {
              label: "Tokens Held",
              value: holdings.length.toString(),
              color: "text-foreground",
              sub: "unique tokens",
            },
            {
              label: "Last Updated",
              value: lastRefresh ? lastRefresh.toLocaleTimeString() : "—",
              color: "text-muted-foreground",
              sub: "live from Base",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/40 bg-card/60 p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Holdings list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/60 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full bg-muted/40" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 bg-muted/40" />
                    <Skeleton className="h-3 w-20 bg-muted/40" />
                  </div>
                  <Skeleton className="h-8 w-24 bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
              <BarChart2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">No holdings yet</p>
              <p className="text-xs text-muted-foreground">
                You don't hold any CurvePad tokens. Browse tokens and make your first trade.
              </p>
            </div>
            <Link href="/explore">
              <Button size="sm" className="gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Browse Tokens
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((h) => {
              const pct = Math.min(100, Number((h.reserveEth * BigInt(10000)) / BigInt("10000000000000000000")) / 100);
              return (
                <Link key={h.address} href={`/token/${h.address}`}>
                  <div className="group rounded-xl border border-border/40 bg-card/60 hover:bg-card hover:border-primary/30 transition-all cursor-pointer p-4">
                    <div className="flex items-center gap-4">
                      <TokenAvatar
                        name={h.name}
                        symbol={h.symbol}
                        imageUrl={h.meta?.imageUrl}
                        size="lg"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {h.name}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded">
                            {h.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono flex-wrap">
                          <span>
                            <span className="text-foreground font-semibold">{formatTokens(h.balance)}</span> tokens
                          </span>
                          <span className="text-muted-foreground/50">·</span>
                          <span>{h.shareOfSupply.toFixed(2)}% of supply</span>
                          <span className="text-muted-foreground/50">·</span>
                          <span>Curve: {pct.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold font-mono text-primary">
                          ~{h.valueEth.toFixed(6)} ETH
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatEth(h.currentPrice, 8)} ETH/token
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <a
                            href={`https://basescan.org/token/${h.address}?a=${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Graduation mini bar */}
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Graduation progress</span>
                        <span className="font-mono text-muted-foreground">{formatEth(h.reserveEth, 4)} / 10 ETH</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary transition-all"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
