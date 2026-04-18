import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import {
  usePublicClient,
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { base } from "wagmi/chains";
import {
  BONDING_CURVE_ABI,
  formatEth,
  formatTokens,
  shortenAddress,
  calcBuyTokens,
  calcSellReturn,
  priceFromSupply,
  buyPriceImpactBps,
  sellPriceImpactBps,
  GRADUATION_THRESHOLD,
} from "@/lib/web3";
import { getTokenMetadata, type TokenMeta } from "@/lib/api";
import { PriceChart } from "@/components/PriceChart";
import { DepthChart } from "@/components/DepthChart";
import { GraduationTimeline } from "@/components/GraduationTimeline";
import { TokenComments } from "@/components/TokenComments";
import { TokenAvatar } from "@/components/TokenAvatar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2, ChevronDown,
  Zap, Twitter, Globe, Send, Copy, Check, TrendingUp, TrendingDown,
  AlertTriangle, Activity, MessageSquare
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TradePage() {
  const params = useParams<{ address: string }>();
  const tokenAddress = params.address as `0x${string}`;
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { toast } = useToast();
  const publicClient = usePublicClient({ chainId: base.id });

  const [buyEth, setBuyEth] = useState("");
  const [sellTokens, setSellTokens] = useState("");
  const [activeTab, setActiveTab] = useState("buy");
  const [bottomTab, setBottomTab] = useState("trades");
  const [meta, setMeta] = useState<TokenMeta | null>(null);
  const [reserveWei, setReserveWei] = useState<bigint>(BigInt(0));
  const [copied, setCopied] = useState(false);
  const [graduated, setGraduated] = useState(false);
  const [uniswapPool, setUniswapPool] = useState<string | undefined>();
  const [prevPrice, setPrevPrice] = useState<number>(0);

  // Contract reads
  const { data: name } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "name", chainId: base.id });
  const { data: symbol } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "symbol", chainId: base.id });
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "totalSupply", chainId: base.id });
  const { data: currentPrice, refetch: refetchPrice } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "getCurrentPrice", chainId: base.id });
  const { data: marketCap } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "getMarketCap", chainId: base.id });
  const { data: creator } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "creator", chainId: base.id });
  const { data: creatorFees, refetch: refetchFees } = useReadContract({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "creatorFeesEarned", chainId: base.id });
  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, chainId: base.id,
  });

  // Write
  const { writeContract: buyTx, data: buyTxHash, isPending: isBuying } = useWriteContract();
  const { writeContract: sellTx, data: sellTxHash, isPending: isSelling } = useWriteContract();
  const { writeContract: graduateTx, data: gradTxHash, isPending: isGraduating } = useWriteContract();
  const { isLoading: isBuyConfirming, isSuccess: buySuccess } = useWaitForTransactionReceipt({ hash: buyTxHash });
  const { isLoading: isSellConfirming, isSuccess: sellSuccess } = useWaitForTransactionReceipt({ hash: sellTxHash });
  const { isLoading: isGradConfirming, isSuccess: gradSuccess } = useWaitForTransactionReceipt({ hash: gradTxHash });

  // Refresh after trade
  useEffect(() => {
    if (buySuccess || sellSuccess) {
      refetchSupply(); refetchPrice(); refetchFees(); refetchBalance();
      setBuyEth(""); setSellTokens("");
      toast({ title: "Transaction confirmed", description: "Trade executed on Base." });
    }
  }, [buySuccess, sellSuccess]);

  useEffect(() => {
    if (gradSuccess) {
      setGraduated(true);
      toast({ title: "🎓 Graduated!", description: "Token is now live on Uniswap V2." });
    }
  }, [gradSuccess]);

  // Load metadata
  useEffect(() => { getTokenMetadata(tokenAddress).then(setMeta); }, [tokenAddress]);

  // Poll reserve and graduation state
  const fetchChainState = useCallback(async () => {
    if (!publicClient) return;
    const bal = await publicClient.getBalance({ address: tokenAddress });
    setReserveWei(bal);
    // Try getGraduationInfo (V2 only)
    try {
      const result = await publicClient.readContract({
        address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "getGraduationInfo",
      }) as [boolean, string, bigint, bigint, bigint];
      setGraduated(result[0]);
      if (result[1] && result[1] !== "0x0000000000000000000000000000000000000000") {
        setUniswapPool(result[1]);
      }
    } catch {
      // V1 contract: graduation not supported, compute from balance
      setGraduated(false);
    }
  }, [publicClient, tokenAddress]);

  useEffect(() => {
    fetchChainState();
    const id = setInterval(fetchChainState, 12000);
    return () => clearInterval(id);
  }, [fetchChainState]);

  // Track price direction
  useEffect(() => {
    const p = Number(currentPrice ?? 0) / 1e18;
    if (prevPrice > 0 && p !== prevPrice) setPrevPrice(p);
    else if (prevPrice === 0 && p > 0) setPrevPrice(p);
  }, [currentPrice]);

  const supply = (totalSupply as bigint) ?? BigInt(0);
  const price = (currentPrice as bigint) ?? BigInt(0);
  const mcap = (marketCap as bigint) ?? BigInt(0);
  const fees = (creatorFees as bigint) ?? BigInt(0);
  const userBal = (userBalance as bigint) ?? BigInt(0);
  const priceEth = Number(price) / 1e18;

  const buyEthWei = buyEth ? parseEther(buyEth) : BigInt(0);
  const estimatedTokens = buyEthWei > BigInt(0) ? calcBuyTokens(buyEthWei, supply) : BigInt(0);
  const buyImpactBps = buyEthWei > BigInt(0) ? buyPriceImpactBps(buyEthWei, supply) : 0;

  const sellTokensWei = sellTokens ? parseEther(sellTokens) : BigInt(0);
  const estimatedEth = sellTokensWei > BigInt(0) ? calcSellReturn(sellTokensWei, supply) : BigInt(0);
  const sellImpactBps = sellTokensWei > BigInt(0) ? sellPriceImpactBps(sellTokensWei, supply) : 0;

  const progressPct = graduated
    ? 100
    : Math.min(100, Number((reserveWei * BigInt(10000)) / GRADUATION_THRESHOLD) / 100);
  const canGraduate = !graduated && reserveWei >= GRADUATION_THRESHOLD;

  const handleBuy = () => {
    if (!buyEth || parseFloat(buyEth) <= 0) return;
    const fee = (buyEthWei * BigInt(1)) / BigInt(100);
    buyTx({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "buy", value: buyEthWei + fee });
  };

  const handleSell = () => {
    if (!sellTokens || parseFloat(sellTokens) <= 0) return;
    sellTx({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "sell", args: [sellTokensWei] });
  };

  const handleGraduate = () => {
    graduateTx({ address: tokenAddress, abi: BONDING_CURVE_ABI, functionName: "graduate" });
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const sym = (symbol as string) || "—";
  const nm = (name as string) || "Loading...";

  return (
    <div className="min-h-screen grid-bg">
      {/* ── Stats Header ── */}
      <div className="border-b border-border/30 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-2">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <TokenAvatar name={nm} symbol={sym} imageUrl={meta?.imageUrl} size="sm" />
              <div>
                <span className="text-sm font-bold text-foreground">{nm}</span>
                <span className="text-xs font-mono text-muted-foreground ml-1.5">{sym}</span>
              </div>
            </div>

            <div className="h-5 w-px bg-border/40 flex-shrink-0" />

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-sm font-mono font-bold text-primary">
                {priceEth.toFixed(8)} ETH
              </span>
            </div>

            {[
              { label: "MCap", value: `${formatEth(mcap, 4)} ETH` },
              { label: "Supply", value: formatTokens(supply) },
              { label: "Reserve", value: `${formatEth(reserveWei, 4)} ETH` },
              { label: "Fees", value: `${formatEth(fees, 5)} ETH` },
              { label: "Graduation", value: graduated ? "🎓 Done" : `${progressPct.toFixed(1)}%` },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                <span className="text-muted-foreground">{s.label}:</span>
                <span className="font-mono font-semibold text-foreground">{s.value}</span>
                <div className="h-4 w-px bg-border/30 mx-1" />
              </div>
            ))}

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <button onClick={copyAddress} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-mono">
                {shortenAddress(tokenAddress)}
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
              </button>
              {meta?.twitter && <a href={meta.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Twitter className="w-3.5 h-3.5" /></a>}
              {meta?.telegram && <a href={meta.telegram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Send className="w-3.5 h-3.5" /></a>}
              {meta?.website && <a href={meta.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Globe className="w-3.5 h-3.5" /></a>}
              <a href={`https://basescan.org/address/${tokenAddress}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">BaseScan <ExternalLink className="w-3 h-3" /></a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">

          {/* ── Left: Charts ── */}
          <div className="space-y-3">
            <div className="rounded-xl border border-border/40 bg-card/60 p-4">
              <PriceChart tokenAddress={tokenAddress} currentSupply={supply} height={340} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Market Depth
                </h3>
                <DepthChart currentSupply={supply} height={170} />
              </div>

              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Curve Parameters
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  {[
                    { k: "price(s)", v: "BASE + SLOPE × s" },
                    { k: "BASE_PRICE", v: "1e-6 ETH/token" },
                    { k: "SLOPE", v: "1e6 wei per token" },
                    { k: "fee", v: "1% → creator" },
                    { k: "reserve(S)", v: "∫₀ˢ price(t)dt" },
                    { k: "integrity", v: "reserve = integral ✓" },
                    { k: "rug risk", v: "ZERO — math only" },
                    { k: "graduation", v: "10 ETH → Uniswap V2" },
                  ].map((r) => (
                    <div key={r.k} className="flex items-center justify-between gap-2 py-1 border-b border-border/20 last:border-0">
                      <span className="text-muted-foreground">{r.k}</span>
                      <span className="text-foreground">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Graduation timeline full width */}
            <GraduationTimeline
              reserveWei={reserveWei}
              graduated={graduated}
              uniswapPool={uniswapPool}
            />

            {/* Bottom tabs */}
            <div className="rounded-xl border border-border/40 bg-card/60">
              <div className="flex border-b border-border/30">
                {[
                  { id: "trades", icon: Activity, label: "Trade History" },
                  { id: "comments", icon: MessageSquare, label: "Comments" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setBottomTab(id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      bottomTab === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {bottomTab === "trades" && <ActivityFeed tokenAddress={tokenAddress} />}
                {bottomTab === "comments" && <TokenComments tokenAddress={tokenAddress} />}
              </div>
            </div>
          </div>

          {/* ── Right: Trade Panel ── */}
          <div className="space-y-3">
            {/* Token info */}
            {meta?.description && (
              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <div className="flex items-start gap-3">
                  <TokenAvatar name={nm} symbol={sym} imageUrl={meta.imageUrl} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
                    {creator && (
                      <a href={`https://basescan.org/address/${creator}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary font-mono mt-1 flex items-center gap-1">
                        by {shortenAddress(creator as string)} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* User balance */}
            {isConnected && userBal > BigInt(0) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Your balance</span>
                <span className="text-sm font-mono font-semibold text-primary">
                  {formatTokens(userBal)} {sym}
                </span>
              </div>
            )}

            {/* Graduation callout */}
            {canGraduate && (
              <div className="rounded-xl border border-orange-400/30 bg-orange-400/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-orange-400">🔥 Ready to Graduate!</p>
                <p className="text-xs text-muted-foreground">
                  10 ETH reached. Deploy permanent Uniswap V2 liquidity and lock the bonding curve.
                </p>
                {isConnected ? (
                  <Button
                    className="w-full h-8 text-xs bg-orange-400 text-black hover:bg-orange-500 font-bold"
                    onClick={handleGraduate}
                    disabled={isGraduating || isGradConfirming}
                  >
                    {isGraduating || isGradConfirming ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {isGraduating ? "Confirm..." : "Deploying LP..."}</>
                    ) : "🚀 Graduate Token"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Connect wallet to graduate</p>
                )}
              </div>
            )}

            {graduated && uniswapPool && (
              <div className="rounded-xl border border-violet-400/30 bg-violet-400/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-violet-400">🎓 Graduated — Trade on Uniswap</p>
                <a
                  href={`https://app.uniswap.org/#/swap?outputCurrency=${tokenAddress}&chain=base`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-violet-500/20 text-xs text-violet-400 hover:bg-violet-500/30 transition-colors font-semibold"
                >
                  Swap on Uniswap <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Trade panel */}
            {!graduated && (
              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full mb-4 h-9">
                    <TabsTrigger value="buy" className="flex-1 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Buy
                    </TabsTrigger>
                    <TabsTrigger value="sell" className="flex-1 text-xs font-semibold data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                      <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> Sell
                    </TabsTrigger>
                  </TabsList>

                  {/* ── BUY ── */}
                  <TabsContent value="buy" className="space-y-3 mt-0">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">ETH to spend</label>
                      <Input
                        placeholder="0.0"
                        value={buyEth}
                        onChange={(e) => setBuyEth(e.target.value)}
                        className="h-9 text-sm bg-background/50 font-mono"
                        type="number" min="0" step="0.001"
                      />
                      <div className="flex gap-1.5 mt-1.5">
                        {["0.001", "0.01", "0.05", "0.1"].map((amt) => (
                          <button key={amt} onClick={() => setBuyEth(amt)}
                            className="text-xs px-2 py-0.5 rounded bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors font-mono flex-1">
                            {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {estimatedTokens > BigInt(0) && (
                      <div className="rounded-lg bg-background/50 border border-border/40 p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">You receive</span>
                          <span className="font-mono font-bold text-primary">
                            {formatTokens(estimatedTokens)} {sym}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Price impact</span>
                          <span className={`font-mono ${buyImpactBps > 500 ? "text-destructive" : buyImpactBps > 100 ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {buyImpactBps > 0 ? `+${(buyImpactBps / 100).toFixed(2)}%` : "—"}
                            {buyImpactBps > 500 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Creator fee (1%)</span>
                          <span className="font-mono text-muted-foreground">
                            {formatEth(buyEthWei / BigInt(100), 5)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total cost</span>
                          <span className="font-mono text-foreground font-semibold">
                            {formatEth(buyEthWei + buyEthWei / BigInt(100), 5)} ETH
                          </span>
                        </div>
                      </div>
                    )}

                    {isConnected ? (
                      <Button
                        className="w-full h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                        onClick={handleBuy}
                        disabled={!buyEth || parseFloat(buyEth) <= 0 || isBuying || isBuyConfirming}
                      >
                        {isBuying || isBuyConfirming ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            {isBuying ? "Confirm in wallet…" : "Confirming…"}</>
                        ) : (
                          <><Zap className="w-3.5 h-3.5 mr-1.5" /> Buy {sym}</>
                        )}
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="w-full h-9 text-xs">
                            Connect Wallet <ChevronDown className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {connectors.map((c) => (
                            <DropdownMenuItem key={c.uid} onClick={() => connect({ connector: c })}>{c.name}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {buyTxHash && (
                      <a href={`https://basescan.org/tx/${buyTxHash}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary justify-center">
                        <ExternalLink className="w-3 h-3" /> View on BaseScan
                      </a>
                    )}
                  </TabsContent>

                  {/* ── SELL ── */}
                  <TabsContent value="sell" className="space-y-3 mt-0">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Tokens to sell</label>
                      <Input
                        placeholder="0.0"
                        value={sellTokens}
                        onChange={(e) => setSellTokens(e.target.value)}
                        className="h-9 text-sm bg-background/50 font-mono"
                        type="number" min="0"
                      />
                      {isConnected && userBal > BigInt(0) && (
                        <button className="text-xs text-muted-foreground hover:text-primary mt-1 transition-colors"
                          onClick={() => setSellTokens(formatEther(userBal))}>
                          Max: {formatTokens(userBal)} {sym}
                        </button>
                      )}
                    </div>

                    {estimatedEth > BigInt(0) && (
                      <div className="rounded-lg bg-background/50 border border-border/40 p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">You receive</span>
                          <span className="font-mono font-bold text-destructive">
                            {formatEth(estimatedEth, 6)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Price impact</span>
                          <span className={`font-mono ${sellImpactBps > 500 ? "text-destructive" : sellImpactBps > 100 ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {sellImpactBps > 0 ? `-${(sellImpactBps / 100).toFixed(2)}%` : "—"}
                            {sellImpactBps > 500 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Creator fee (1%)</span>
                          <span className="font-mono text-muted-foreground">
                            {formatEth(estimatedEth / BigInt(99), 6)} ETH
                          </span>
                        </div>
                      </div>
                    )}

                    {isConnected ? (
                      <Button
                        variant="destructive"
                        className="w-full h-9 text-xs font-bold"
                        onClick={handleSell}
                        disabled={!sellTokens || parseFloat(sellTokens) <= 0 || isSelling || isSellConfirming || sellTokensWei > userBal}
                      >
                        {isSelling || isSellConfirming ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            {isSelling ? "Confirm in wallet…" : "Confirming…"}</>
                        ) : `Sell ${sym}`}
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="w-full h-9 text-xs">
                            Connect Wallet <ChevronDown className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {connectors.map((c) => (
                            <DropdownMenuItem key={c.uid} onClick={() => connect({ connector: c })}>{c.name}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {sellTxHash && (
                      <a href={`https://basescan.org/tx/${sellTxHash}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary justify-center">
                        <ExternalLink className="w-3 h-3" /> View on BaseScan
                      </a>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Graduation progress bar */}
            <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Bonding Curve Progress</span>
                <span className={`font-mono font-bold ${graduated ? "text-primary" : "text-foreground"}`}>
                  {graduated ? "🎓 Graduated" : `${progressPct.toFixed(2)}%`}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    graduated
                      ? "bg-primary shadow-[0_0_8px_2px_rgba(0,255,136,0.4)]"
                      : progressPct > 80
                      ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                      : "bg-gradient-to-r from-primary/60 to-primary"
                  }`}
                  style={{ width: `${Math.max(progressPct, 1)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>{formatEth(reserveWei, 4)} ETH raised</span>
                <span>{graduated ? "Curve complete" : "10 ETH target"}</span>
              </div>
              {!graduated && (
                <p className="text-xs text-muted-foreground/60">
                  {Math.max(0, 10 - Number(reserveWei) / 1e18).toFixed(4)} ETH remaining to graduation.
                  LP tokens will be permanently locked on Uniswap V2.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
