import { Rocket, TrendingUp, Target, Flame, Waves, ExternalLink } from "lucide-react";

interface GraduationTimelineProps {
  reserveWei: bigint;
  graduated: boolean;
  uniswapPool?: string;
}

const GRADUATION_THRESHOLD = BigInt("10000000000000000000"); // 10 ETH

const STEPS = [
  {
    id: 1,
    icon: Rocket,
    label: "Token Launch",
    desc: "Deployed on Base via bonding curve factory",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
  {
    id: 2,
    icon: TrendingUp,
    label: "Curve Trading",
    desc: "Price rises with every buy on the bonding curve",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  {
    id: 3,
    icon: Target,
    label: "Reserve Growth",
    desc: "10 ETH graduation threshold approaching",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
  },
  {
    id: 4,
    icon: Flame,
    label: "Graduation",
    desc: "Reserve deployed as permanent Uniswap V2 liquidity",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
  {
    id: 5,
    icon: Waves,
    label: "Free Market",
    desc: "Uniswap pool active — price governed by market",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
  },
];

function currentStep(reserveWei: bigint, graduated: boolean): number {
  if (graduated) return 5;
  if (reserveWei >= GRADUATION_THRESHOLD) return 4;
  if (reserveWei > BigInt(0)) return 2;
  return 1;
}

export function GraduationTimeline({ reserveWei, graduated, uniswapPool }: GraduationTimelineProps) {
  const step = currentStep(reserveWei, graduated);
  const progressPct = graduated
    ? 100
    : Math.min(100, Number((reserveWei * BigInt(10000)) / GRADUATION_THRESHOLD) / 100);

  return (
    <div className="rounded-lg border border-border/40 bg-card/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Graduation Lifecycle
        </h3>
        <span className={`text-xs font-mono font-bold ${graduated ? "text-primary" : "text-muted-foreground"}`}>
          {graduated ? "🎓 Complete" : `${progressPct.toFixed(1)}% to graduation`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-primary/50 via-yellow-400/70 to-primary"
          style={{ width: `${Math.max(progressPct, 1)}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((s, i) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          const isPending = step < s.id;

          return (
            <div key={s.id} className="flex items-start gap-3">
              {/* Connector line */}
              <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isDone
                      ? `${s.bg} ${s.border} border`
                      : isActive
                      ? `${s.bg} ${s.border} border ring-2 ring-offset-1 ring-offset-background ring-${s.color.replace("text-", "")}/30`
                      : "bg-muted/20 border-border/30 border"
                  }`}
                >
                  <s.icon
                    className={`w-3 h-3 ${isDone || isActive ? s.color : "text-muted-foreground/40"}`}
                  />
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-px h-3 mt-0.5 transition-colors ${
                      isDone ? "bg-primary/30" : "bg-border/30"
                    }`}
                  />
                )}
              </div>

              <div className={`pb-1 ${i < STEPS.length - 1 ? "mb-0" : ""}`}>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-semibold transition-colors ${
                      isDone || isActive ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isActive && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.bg} ${s.color} font-medium`}>
                      Active
                    </span>
                  )}
                  {isDone && s.id === 4 && uniswapPool && (
                    <a
                      href={`https://basescan.org/address/${uniswapPool}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-0.5 text-xs ${s.color} hover:underline`}
                    >
                      Pool <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                {(isActive || isDone) && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {s.id === 3 && !graduated
                      ? `${(Number(reserveWei) / 1e18).toFixed(4)} ETH raised of 10 ETH target`
                      : s.desc}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {step === 4 && !graduated && (
        <div className="rounded-md bg-orange-400/10 border border-orange-400/20 p-3">
          <p className="text-xs text-orange-400 font-semibold mb-0.5">🔥 Ready to Graduate!</p>
          <p className="text-xs text-muted-foreground">
            The 10 ETH threshold has been reached. Anyone can call graduate() to deploy
            permanent Uniswap V2 liquidity and lock the bonding curve forever.
          </p>
        </div>
      )}

      {graduated && uniswapPool && (
        <a
          href={`https://app.uniswap.org/#/swap?outputCurrency=${uniswapPool}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 hover:bg-violet-500/20 transition-colors font-semibold"
        >
          <Waves className="w-3.5 h-3.5" /> Trade on Uniswap
        </a>
      )}
    </div>
  );
}
