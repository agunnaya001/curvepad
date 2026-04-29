import { useState } from "react";
import { Link as WouterLink } from "wouter";
import { useConnect, useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingUp, Zap, Shield, Users, Rocket } from "lucide-react";

export default function LandingPage() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Permissionless Launch",
      description: "Launch your token without intermediaries. Bonding curves handle everything.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Fair Price Discovery",
      description: "Bonding curve mechanics ensure organic price discovery and fair value.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community Driven",
      description: "Build community from day one with transparent, trustless mechanics.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "On-Chain Verified",
      description: "All transactions verified on Base mainnet. Full transparency and security.",
    },
  ];

  const stats = [
    { label: "Active Tokens", value: "1,240+" },
    { label: "Total Volume", value: "$5.2M" },
    { label: "Community Members", value: "45K+" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 md:px-8">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center gap-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Launching tokens on Base</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
              Launch Your Token
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                On a Bonding Curve
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-balance">
              Curvepad enables permissionless token launches with fair price discovery through bonding curve mechanics. No gatekeepers, just your community.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isConnected ? (
                <WouterLink href="/explore">
                  <Button size="lg" className="w-full sm:w-auto gap-2">
                    Explore Tokens
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
              ) : (
                <Button
                  size="lg"
                  onClick={() => {
                    const injected = connectors.find((c) => c.id === "injected");
                    if (injected) connect({ connector: injected });
                  }}
                  className="w-full sm:w-auto gap-2"
                >
                  Connect Wallet
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 md:px-8 py-16 border-y border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 md:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Why Curvepad?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on proven bonding curve mechanics, with the speed and security of Base mainnet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 md:px-8 py-20 bg-muted/20 border-y border-border/60">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-balance">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Create Token",
                desc: "Set up your token with a bonding curve. Define initial parameters and pricing.",
              },
              {
                step: "2",
                title: "Share & Grow",
                desc: "Share with your community. Early supporters help bootstrap liquidity.",
              },
              {
                step: "3",
                title: "Graduate",
                desc: "Reach the graduation threshold to transition to a DEX pool.",
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-6 -right-4 w-8 h-8">
                    <ArrowUpRight className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">Ready to Launch?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of creators launching tokens on Curvepad. No setup fees, just your vision and community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <WouterLink href="/create">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Launch Token Now
                <Rocket className="w-4 h-4" />
              </Button>
            </WouterLink>
            <WouterLink href="/explore">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Browse Tokens
              </Button>
            </WouterLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-12 border-t border-border/60 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">Explore</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Create</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Docs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Network</h4>
              <p className="text-muted-foreground text-sm">Built on Base Mainnet</p>
            </div>
          </div>

          <div className="pt-8 border-t border-border/60 text-center text-muted-foreground text-sm">
            <p>&copy; 2024 Curvepad. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
