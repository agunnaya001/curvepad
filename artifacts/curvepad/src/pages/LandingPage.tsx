// SPDX-License-Identifier: MIT
// Copyright (c) 2024 CurvePad — Designed & Built by David Okeamah
import { useEffect, useRef } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { useConnect, useAccount, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { FACTORY_ADDRESS, FACTORY_ABI } from "@/lib/web3";
import {
  ArrowUpRight,
  TrendingUp,
  Zap,
  Shield,
  Lock,
  Rocket,
  ExternalLink,
  Github,
  Twitter,
  ChevronRight,
  BarChart2,
  Flame,
} from "lucide-react";

// ── Subtle animated grid background ──────────────────────────────────────────
function GridCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let t = 0;

    function draw() {
      if (!ctx || !canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const spacing = 60;
      ctx.strokeStyle = "rgba(0,255,170,0.06)";
      ctx.lineWidth = 0.5;

      for (let x = 0; x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Traveling pulse along a diagonal
      const pulse = (t % 200) / 200;
      const px = pulse * canvas.width;
      const py = pulse * canvas.height;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 200);
      grad.addColorStop(0, "rgba(0,255,170,0.12)");
      grad.addColorStop(1, "rgba(0,255,170,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      t++;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ── Bonding curve SVG illustration ────────────────────────────────────────────
function CurveIllustration() {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const s = i / 80;
    const x = 20 + s * 260;
    const price = 0.000001 + 0.000001 * s * s * 80;
    const y = 130 - price * 30000000;
    pts.push(`${i === 0 ? "M" : "L"}${x},${Math.max(10, y)}`);
  }
  const d = pts.join(" ");

  return (
    <svg viewBox="0 0 300 140" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00ffaa" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00ffaa" stopOpacity="1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Area fill */}
      <path d={`${d} L280,130 L20,130 Z`} fill="url(#curveGrad)" opacity="0.1" />
      {/* Main curve */}
      <path d={d} fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" filter="url(#glow)" />
      {/* Axes */}
      <line x1="20" y1="130" x2="285" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="20" y1="10" x2="20" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Labels */}
      <text x="150" y="143" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Supply (tokens)</text>
      <text x="8" y="75" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle" transform="rotate(-90,8,75)">Price</text>
      {/* Graduation marker */}
      <line x1="220" y1="10" x2="220" y2="130" stroke="rgba(0,255,170,0.3)" strokeWidth="1" strokeDasharray="4 3" />
      <text x="224" y="22" fill="rgba(0,255,170,0.6)" fontSize="7">10 ETH</text>
      <text x="224" y="32" fill="rgba(0,255,170,0.6)" fontSize="7">Grad ↑</text>
    </svg>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  // Fetch real token count from the chain
  const { data: tokenCount } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  });

  const displayTokenCount = tokenCount ? Number(tokenCount) : null;

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "One-Transaction Launch",
      description:
        "Deploy a fully-functional ERC-20 token in a single transaction. No setup, no liquidity pool, no gatekeepers.",
    },
    {
      icon: <BarChart2 className="w-5 h-5" />,
      title: "Linear Bonding Curve",
      description:
        "Price is pure math: P(s) = BASE + SLOPE × s. Every buy mints; every sell burns. Fully collateralized, always.",
    },
    {
      icon: <Flame className="w-5 h-5" />,
      title: "Automatic Graduation",
      description:
        "Hit 10 ETH in reserve and anyone can graduate the token. All liquidity migrates to Uniswap V2 — permanently.",
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Locked LP Forever",
      description:
        "LP tokens are burned to 0x000...dEaD on graduation. No rug possible. Liquidity is locked mathematically.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Audit-Grade Security",
      description:
        "ReentrancyGuard, CEI pattern, 256-bit precision arithmetic. No admin keys. No pause. Immutable once deployed.",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Creator Revenue",
      description:
        "1% fee on every buy and sell routes directly to the token creator. Launch a token, earn from every trade.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Animated grid */}
        <GridCanvas />
        {/* Hero image glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url(/hero-bg.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Radial fade over image */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center flex flex-col items-center gap-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-primary text-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live on Base Mainnet · Chain ID 8453
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tight">
            Launch Tokens.{" "}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/50">
              Let Math Set the Price.
            </span>
          </h1>

          {/* Sub */}
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            CurvePad is a permissionless bonding-curve launchpad on Base. Deploy an ERC-20, watch it
            trade fairly, and graduate to permanent Uniswap V2 liquidity — all without intermediaries.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isConnected ? (
              <Button size="lg" onClick={() => setLocation("/explore")} className="gap-2 text-base font-semibold">
                Explore Tokens <ArrowUpRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                className="gap-2 text-base font-semibold"
                onClick={() => {
                  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
                  if (injected) connect({ connector: injected });
                }}
              >
                Connect Wallet <ArrowUpRight className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/create")}
              className="gap-2 text-base border-border/50"
            >
              Launch a Token <Rocket className="w-4 h-4" />
            </Button>
          </div>

          {/* Live on-chain stat */}
          {displayTokenCount !== null && (
            <p className="text-sm text-muted-foreground font-mono">
              <span className="text-primary font-bold">{displayTokenCount.toLocaleString()}</span>{" "}
              tokens launched on-chain so far
            </p>
          )}
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50">
          <div className="w-0.5 h-8 bg-gradient-to-b from-primary/40 to-transparent" />
          <span className="text-xs font-mono">scroll</span>
        </div>
      </section>

      {/* ── Contract strip ─────────────────────────────────────────────────── */}
      <div className="border-y border-border/40 bg-card/40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
          <span>
            <span className="text-primary">TokenFactory V2</span> ·{" "}
            <a
              href="https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6
              <ExternalLink className="w-3 h-3 inline ml-1" />
            </a>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Verified · Base Mainnet · Block 49276726
          </span>
        </div>
      </div>

      {/* ── The bonding curve ──────────────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: visual */}
            <div className="rounded-xl border border-primary/20 bg-card/60 p-6 h-64">
              <CurveIllustration />
            </div>

            {/* Right: explanation */}
            <div className="space-y-6">
              <div>
                <span className="text-xs font-mono text-primary uppercase tracking-widest">The Mechanism</span>
                <h2 className="text-3xl md:text-4xl font-bold mt-2 leading-tight">
                  Price is a function,<br />not a negotiation.
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Every token on CurvePad follows a linear bonding curve:{" "}
                <code className="text-primary bg-primary/10 px-1 rounded text-sm">
                  price = BASE_PRICE + SLOPE × supply
                </code>
                . The smart contract is the only market maker — no whales, no manipulation, no secrets.
              </p>
              <ul className="space-y-3">
                {[
                  "Every buy mints tokens from the curve; every sell burns them",
                  "ETH reserve always equals the integral of the curve — fully collateralized",
                  "When reserve hits 10 ETH → Uniswap graduation → LP burned permanently",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <WouterLink href="/explore">
                <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                  See live tokens <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </WouterLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section id="features" className="px-4 py-20 border-t border-border/40 bg-card/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-primary uppercase tracking-widest">Why CurvePad</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Built different, by design.</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Every design decision optimizes for fairness, security, and creator revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="px-4 py-20 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-mono text-primary uppercase tracking-widest">Simple as 3 steps</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">From idea to Uniswap in minutes.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* connector lines */}
            <div className="hidden md:block absolute top-6 left-1/3 w-1/3 h-0.5 bg-gradient-to-r from-primary/40 to-primary/40" />
            <div className="hidden md:block absolute top-6 left-2/3 w-1/3 h-0.5 bg-gradient-to-r from-primary/40 to-primary/10" />

            {[
              {
                n: "01",
                title: "Deploy Your Token",
                body: "Give it a name, symbol, and optional logo. One transaction, no liquidity needed. The bonding curve is live immediately.",
                cta: "Launch →",
                href: "/create",
              },
              {
                n: "02",
                title: "Trade & Build Community",
                body: "Share your token address. Early supporters buy at low prices. Price rises naturally with every purchase. Earn 1% on every trade as creator.",
                cta: "Explore →",
                href: "/explore",
              },
              {
                n: "03",
                title: "Graduate to Uniswap",
                body: "When 10 ETH in reserve is reached, graduation is triggered. Liquidity migrates to Uniswap V2 permanently. LP tokens are burned — no rug.",
                cta: "Learn more →",
                href: "/explore",
              },
            ].map((step, i) => (
              <div key={i} className="relative p-6 rounded-xl border border-border/50 bg-card/60 flex flex-col gap-3">
                <span className="text-3xl font-black text-primary/20 font-mono leading-none">{step.n}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{step.body}</p>
                <WouterLink href={step.href}>
                  <span className="text-sm text-primary hover:text-primary/80 font-medium cursor-pointer">{step.cta}</span>
                </WouterLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 border-t border-border/40 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Ready to launch your token?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl">
            It takes one transaction. No setup fee. No gatekeepers. Just your idea and a bonding curve.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <WouterLink href="/create">
              <Button size="lg" className="gap-2 text-base font-semibold w-full sm:w-auto">
                Launch Token Now <Rocket className="w-4 h-4" />
              </Button>
            </WouterLink>
            <WouterLink href="/explore">
              <Button size="lg" variant="outline" className="gap-2 border-border/50 w-full sm:w-auto">
                Browse All Tokens
              </Button>
            </WouterLink>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-4 py-14 border-t border-border/50 bg-card/30">
        <div className="max-w-6xl mx-auto">
          {/* Top row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">CurvePad</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Permissionless bonding-curve token launchpad on Base mainnet. No admin keys. No rugs.
                Pure on-chain math.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://github.com/agunnaya001/curvepad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  { label: "Explore Tokens", href: "/explore" },
                  { label: "Launch Token", href: "/create" },
                  { label: "Portfolio", href: "/portfolio" },
                ].map((l) => (
                  <li key={l.href}>
                    <WouterLink href={l.href}>
                      <span className="hover:text-primary transition-colors cursor-pointer">{l.label}</span>
                    </WouterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Developers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://github.com/agunnaya001/curvepad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    Contract ↗
                  </a>
                </li>
                <li>
                  <span className="opacity-50">Docs (coming soon)</span>
                </li>
              </ul>
            </div>

            {/* Network */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Network</h4>
              <ul className="space-y-2 text-xs font-mono text-muted-foreground">
                <li>Base Mainnet · Chain 8453</li>
                <li className="break-all">
                  Factory:{" "}
                  <a
                    href="https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    0x6EF5...dDf6
                  </a>
                </li>
                <li>Uniswap V2 · LP burned</li>
              </ul>
            </div>
          </div>

          {/* Bottom row — attribution */}
          <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} CurvePad. MIT License. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Designed &amp; engineered by{" "}
              <a
                href="https://github.com/agunnaya001"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1"
              >
                David Okeamah
              </a>
              <span className="ml-1">· Built on</span>
              <a
                href="https://base.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
              >
                Base
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
