import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { config } from "@/lib/web3";

// Lazy-load heavy pages to keep initial bundle small
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const CreatePage = lazy(() => import("@/pages/CreatePage"));
const TradePage = lazy(() => import("@/pages/TradePage"));
const PortfolioPage = lazy(() => import("@/pages/PortfolioPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      gcTime: 60_000,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen grid-bg flex items-start justify-center pt-24">
      <div className="w-full max-w-xl space-y-4 px-4">
        <Skeleton className="h-8 w-48 bg-muted/30" />
        <Skeleton className="h-4 w-72 bg-muted/20" />
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-muted/20" />
          ))}
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={ExplorePage} />
          <Route path="/create" component={CreatePage} />
          <Route path="/token/:address" component={TradePage} />
          <Route path="/portfolio" component={PortfolioPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
