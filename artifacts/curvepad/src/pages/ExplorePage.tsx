import { useState, useEffect, useMemo, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { Link } from "wouter";
import { base } from "wagmi/chains";
import {
  FACTORY_ADDRESS, FACTORY_ABI, BONDING_CURVE_ABI,
  formatEth, formatTokens, shortenAddress, priceFromSupply,
} from "@/lib/web3";
import { getTokenMetadata, type TokenMeta } from "@/lib/api";
import { TokenAvatar } from "@/components/TokenAvatar";
import { GraduationBar } from "@/components/GraduationBar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, TrendingUp, Clock, Zap, ArrowUpRight,
  Crown, Rocket, Flame, Activity, RefreshCcw,
} from "lucide-react";

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  currentPrice: bigint;
  totalSupply: bigint;
  marketCap: bigint;
  creator: string;
  creatorFees: bigint;
  reserveEth: bigint;
  tradeCount?: number;
  meta?: TokenMeta | null;
}

const GRADUATION_TARGET = BigInt("10000000000000000000"); // 10 ETH

function isGraduated(reserve: bigint) {
  return reserve >= GRADUATION_TARGET;
}

function progressPct(reserve: bigint): number {
  return Math.min(100, Number((reserve * BigInt(10000)) / GRADUATION_TARGET) / 100);
}

export default function ExplorePage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "marketcap" | "trending" | "graduating">("newest");
  const [lastFetch, setLastFetch] = useState(0);
  const publicClient = usePublicClient({ chainId: base.id });

  const fetchTokens = useCallback(async (isManual = false) => {
    if (!publicClient) return;
    if (isManual) setRefreshing(true);

    try {
      let addresses: string[] = [];
      if (FACTORY_ADDRESS !== "0x0000000000000000000000000000000000000000") {
        const result = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "getTokens",
        });
        addresses = result as string[];
      }

      if (addresses.length === 0) {
        setTokens([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // ── Multicall: fetch all token data in one round-trip ──
      const calls = addresses.flatMap((addr) => [
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "name" as const },
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "symbol" as const },
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "getCurrentPrice" as const },
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "totalSupply" as const },
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "getMarketCap" as const },
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "creator" as const },
        { address: addr as `0x${string}`, abi: BONDING_CURVE_ABI, functionName: "creatorFeesEarned" as const },
      ]);

      const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

      // Fetch reserves in parallel (can't multicall eth_getBalance, but batching calls)
      const reserves = await Promise.all(
        addresses.map((addr) => publicClient.getBalance({ address: addr as `0x${string}` }).catch(() => BigInt(0)))
      );

      const infos: TokenInfo[] = [];
      for (let i = 0; i < addresses.length; i++) {
        const base = i * 7;
        const get = (offset: number) => results[base + offset];
        if (get(0).status !== "success") continue;
        try {
          infos.push({
            address: addresses[i],
            name: get(0).result as string,
            symbol: get(1).result as string,
            currentPrice: get(2).result as bigint,
            totalSupply: get(3).result as bigint,
            marketCap: get(4).result as bigint,
            creator: get(5).result as string,
            creatorFees: get(6).result as bigint,
            reserveEth: reserves[i],
          });
        } catch { /* skip */ }
      }

      // Fetch metadata in parallel (all at once)
      const metas = await Promise.all(infos.map((t) => getTokenMetadata(t.address).catch(() => null)));
      metas.forEach((m, i) => { infos[i].meta = m; });

      setTokens(infos);
      setLastFetch(Date.now());
    } catch (e) {
      console.error("ExplorePage fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchTokens();
    const id = setInterval(() => fetchTokens(), 20000);
    return () => clearInterval(id);
  }, [fetchTokens]);

  const kingOfTheHill = useMemo(() => {
    if (tokens.length === 0) return null;
    return tokens.reduce((best, t) => t.marketCap > best.marketCap ? t : best, tokens[0]);
  }, [tokens]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        (t.meta?.description ?? "").toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
    switch (sortBy) {
      case "marketcap":    return [...list].sort((a, b) => Number(b.marketCap - a.marketCap));
      case "trending":     return [...list].sort((a, b) => Number(b.creatorFees - a.creatorFees));
      case "graduating":   return [...list].sort((a, b) => Number(b.reserveEth - a.reserveEth));
      default:             return [...list].reverse(); // newest first
    }
  }, [tokens, search, sortBy]);

  const stats = useMemo(() => ({
    total: tokens.length,
    graduated: tokens.filter((t) => isGraduated(t.reserveEth)).length,
    totalMcap: tokens.reduce((s, t) => s + Number(t.marketCap) / 1e18, 0),
    totalFees: tokens.reduce((s, t) => s + Number(t.creatorFees) / 1e18, 0),
  }), [tokens]);

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Hero */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">Base Network</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Token Launchpad</h1>
          <p className="text-sm text-muted-foreground">
            Permissionless bonding curve tokens. Price is a function, not a negotiation.
          </p>
        </div>

        {/* Stats bar */}
        {!loading && tokens.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Tokens Launched", value: stats.total.toString(), icon: Rocket },
              { label: "Graduated", value: stats.graduated.toString(), icon: Activity },
              { label: "Total MCap", value: `${stats.totalMcap.toFixed(4)} ETH`, icon: TrendingUp },
              { label: "Creator Fees", value: `${stats.totalFees.toFixed(4)} ETH`, icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-border/40 bg-card/50 px-3 py-2.5 flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold font-mono text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* King of the Hill */}
        {kingOfTheHill && tokens.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">King of the Hill</span>
            </div>
            <Link href={`/token/${kingOfTheHill.address}`}>
              <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-card/60 to-card/60 p-5 hover:border-yellow-400/50 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <TokenAvatar name={kingOfTheHill.name} symbol={kingOfTheHill.symbol} imageUrl={kingOfTheHill.meta?.imageUrl} size="xl" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                      <Crown className="w-3 h-3 text-black" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-lg font-bold text-foreground group-hover:text-yellow-400 transition-colors">
                        {kingOfTheHill.name}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono border-yellow-500/40 text-yellow-400">
                        {kingOfTheHill.symbol}
                      </Badge>
                      {isGraduated(kingOfTheHill.reserveEth) && (
                        <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                          <Rocket className="w-2.5 h-2.5 mr-1" /> Graduated
                        </Badge>
                      )}
                    </div>
                    {kingOfTheHill.meta?.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {kingOfTheHill.meta.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs flex-wrap">
                      <span className="font-mono text-primary font-bold">
                        {formatEth(kingOfTheHill.marketCap, 4)} ETH mcap
                      </span>
                      <span className="text-muted-foreground">
                        {formatEth(kingOfTheHill.currentPrice, 8)} ETH/token
                      </span>
                      <span className="text-muted-foreground font-mono">
                        by {shortenAddress(kingOfTheHill.creator)}
                      </span>
                    </div>
                    <div className="mt-2 max-w-xs">
                      <GraduationBar reserveWei={kingOfTheHill.reserveEth} compact />
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-yellow-400 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens by name, symbol, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-card/50 border-border/60 text-sm"
            />
          </div>
          <div className="flex gap-1.5 items-center">
            {[
              { id: "newest" as const, icon: Clock, label: "Newest" },
              { id: "marketcap" as const, icon: TrendingUp, label: "Top MCap" },
              { id: "trending" as const, icon: Flame, label: "Trending" },
              { id: "graduating" as const, icon: Rocket, label: "Graduating" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSortBy(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  sortBy === id
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-card/50 text-muted-foreground border border-border/40 hover:border-border"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <button
              onClick={() => fetchTokens(true)}
              disabled={refreshing}
              className="p-2 rounded-md border border-border/40 bg-card/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
              title="Refresh"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Token grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full bg-muted/40" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-28 bg-muted/40" />
                    <Skeleton className="h-3 w-16 bg-muted/40" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full bg-muted/40" />
                <Skeleton className="h-2 w-full bg-muted/40" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {search ? "No tokens match your search" : "No tokens launched yet"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {search ? "Try a different name, symbol, or address" : "Be the first to launch a token on CurvePad"}
            </p>
            <Link href="/create">
              <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                <Zap className="w-3.5 h-3.5" /> Launch a Token
              </button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3 font-mono">
              {filtered.length} token{filtered.length !== 1 ? "s" : ""}
              {search && ` matching "${search}"`}
              {lastFetch > 0 && ` · refreshed ${Math.round((Date.now() - lastFetch) / 1000)}s ago`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((token, idx) => {
                const graduated = isGraduated(token.reserveEth);
                const pct = progressPct(token.reserveEth);
                const isKing = kingOfTheHill?.address === token.address && tokens.length > 1;
                const isHot = idx === 0 && tokens.length > 2 && sortBy === "trending";
                const nearGrad = !graduated && pct >= 80;
                return (
                  <Link key={token.address} href={`/token/${token.address}`}>
                    <div
                      className={`group rounded-xl border bg-card/50 hover:bg-card transition-all cursor-pointer p-4 h-full flex flex-col ${
                        isKing
                          ? "border-yellow-500/30 hover:border-yellow-400/50"
                          : graduated
                          ? "border-primary/30 hover:border-primary/50"
                          : nearGrad
                          ? "border-orange-400/30 hover:border-orange-400/50"
                          : "border-border/40 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="relative flex-shrink-0">
                          <TokenAvatar name={token.name} symbol={token.symbol} imageUrl={token.meta?.imageUrl} size="md" />
                          {isKing && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                              <Crown className="w-2.5 h-2.5 text-black" />
                            </div>
                          )}
                          {graduated && !isKing && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Rocket className="w-2.5 h-2.5 text-black" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-bold truncate ${isKing ? "group-hover:text-yellow-400" : "group-hover:text-primary"} transition-colors`}>
                              {token.name}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono border-border/50 text-muted-foreground h-4 px-1.5 flex-shrink-0">
                              {token.symbol}
                            </Badge>
                            {isHot && (
                              <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30 h-4 px-1.5">
                                <Flame className="w-2.5 h-2.5 mr-0.5" /> Hot
                              </Badge>
                            )}
                            {nearGrad && !graduated && (
                              <Badge className="text-xs bg-orange-400/20 text-orange-400 border-orange-400/30 h-4 px-1.5">
                                🔥 {pct.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            by {shortenAddress(token.creator)}
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>

                      {token.meta?.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed flex-shrink-0">
                          {token.meta.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-md bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                          <p className="text-xs font-mono font-semibold text-foreground">
                            {formatEth(token.currentPrice, 8)} ETH
                          </p>
                        </div>
                        <div className="rounded-md bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Market Cap</p>
                          <p className="text-xs font-mono font-semibold text-primary">
                            {formatEth(token.marketCap, 4)} ETH
                          </p>
                        </div>
                        <div className="rounded-md bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Supply</p>
                          <p className="text-xs font-mono font-semibold text-foreground">
                            {formatTokens(token.totalSupply)}
                          </p>
                        </div>
                        <div className="rounded-md bg-background/50 p-2">
                          <p className="text-xs text-muted-foreground mb-0.5">Reserve</p>
                          <p className="text-xs font-mono font-semibold text-foreground">
                            {formatEth(token.reserveEth, 4)} ETH
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Graduation</span>
                          <span className={`font-mono ${graduated ? "text-primary font-bold" : nearGrad ? "text-orange-400 font-semibold" : "text-muted-foreground"}`}>
                            {graduated ? "🎓 Complete" : `${pct.toFixed(1)}% of 10 ETH`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              graduated
                                ? "bg-primary"
                                : nearGrad
                                ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                                : "bg-gradient-to-r from-primary/50 to-primary"
                            }`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
