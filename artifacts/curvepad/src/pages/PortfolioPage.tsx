import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { base } from "wagmi/chains";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { formatEth, shortenAddress } from "@/lib/web3";

interface HoldingToken {
  address: string;
  symbol: string;
  name: string;
  balance: bigint;
  value: bigint;
  priceChange: number;
}

interface Transaction {
  type: "buy" | "sell";
  token: string;
  amount: string;
  price: string;
  date: string;
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const [holdings, setHoldings] = useState<HoldingToken[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    // Mock portfolio data for demonstration
    const mockHoldings: HoldingToken[] = [
      {
        address: "0x123...",
        symbol: "CURVE",
        name: "Curve Token",
        balance: BigInt(1000) * BigInt(10 ** 18),
        value: BigInt(5200) * BigInt(10 ** 18),
        priceChange: 12.5,
      },
      {
        address: "0x456...",
        symbol: "MOON",
        name: "To The Moon",
        balance: BigInt(50000) * BigInt(10 ** 18),
        value: BigInt(3400) * BigInt(10 ** 18),
        priceChange: -5.2,
      },
      {
        address: "0x789...",
        symbol: "BASE",
        name: "Base Token",
        balance: BigInt(250) * BigInt(10 ** 18),
        value: BigInt(1800) * BigInt(10 ** 18),
        priceChange: 8.9,
      },
    ];

    const mockTransactions: Transaction[] = [
      { type: "buy", token: "CURVE", amount: "1000", price: "$5.2", date: "2 hours ago" },
      { type: "sell", token: "MOON", amount: "10000", price: "$0.068", date: "5 hours ago" },
      { type: "buy", token: "BASE", amount: "250", price: "$7.2", date: "1 day ago" },
      { type: "buy", token: "CURVE", amount: "500", price: "$4.8", date: "2 days ago" },
    ];

    setHoldings(mockHoldings);
    setTransactions(mockTransactions);
    setLoading(false);
  }, [isConnected, address, publicClient]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-2">Connect Your Wallet</h1>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your portfolio and trading history.
            </p>
            <Button>Connect Wallet</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.value, BigInt(0));
  const totalGain = holdings.reduce((sum, h) => sum + h.value * BigInt(Math.floor(h.priceChange * 100)) / BigInt(10000), BigInt(0));

  return (
    <div className="min-h-screen bg-background text-foreground px-4 md:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Portfolio</h1>
          <p className="text-muted-foreground">{shortenAddress(address || "")}</p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Value</p>
            <p className="text-3xl font-bold">
              {loading ? <Skeleton className="w-32 h-8" /> : `$${formatEth(totalValue, 2)}`}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Gain/Loss</p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold ${totalGain >= BigInt(0) ? "text-primary" : "text-destructive"}`}>
                {loading ? <Skeleton className="w-32 h-8" /> : `$${formatEth(totalGain, 2)}`}
              </p>
              {totalGain >= BigInt(0) ? (
                <TrendingUp className="w-6 h-6 text-primary" />
              ) : (
                <TrendingDown className="w-6 h-6 text-destructive" />
              )}
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Holdings</p>
            <p className="text-3xl font-bold">
              {loading ? <Skeleton className="w-32 h-8" /> : holdings.length}
            </p>
          </Card>
        </div>

        {/* Holdings Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Your Holdings</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-full h-16" />
              ))}
            </div>
          ) : holdings.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No holdings yet. Start by exploring or creating tokens.</p>
              <Link href="/explore">
                <Button variant="outline" className="mt-4">
                  Explore Tokens
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Token</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Balance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Value</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Change</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.address} className="border-b border-border/60 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold">{holding.symbol}</p>
                          <p className="text-sm text-muted-foreground">{holding.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">
                        {formatEth(holding.balance, 2)}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        ${formatEth(holding.value, 2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-1 ${holding.priceChange >= 0 ? "text-primary" : "text-destructive"}`}>
                          {holding.priceChange >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{Math.abs(holding.priceChange).toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/token/${holding.address}`}>
                          <Button variant="outline" size="sm">
                            Trade
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-full h-12" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No transactions yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "buy" ? "bg-primary/20" : "bg-destructive/20"
                    }`}>
                      {tx.type === "buy" ? (
                        <ArrowDownLeft className={`w-5 h-5 ${tx.type === "buy" ? "text-primary" : "text-destructive"}`} />
                      ) : (
                        <ArrowUpRight className={`w-5 h-5 ${tx.type === "buy" ? "text-primary" : "text-destructive"}`} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">
                        {tx.type} {tx.token}
                      </p>
                      <p className="text-sm text-muted-foreground">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{tx.amount}</p>
                    <p className="text-sm text-muted-foreground">{tx.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
