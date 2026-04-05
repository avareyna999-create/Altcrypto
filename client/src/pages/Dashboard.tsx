import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useTrades } from "@/hooks/use-trades";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  MapPin,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/queryClient";
import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

// --- Helpers ---
function formatUSD(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ChartPoint = { day: string; balance: number; timestamp?: number };

async function fetchPortfolioHistory(currentBalance: number, range = "7d"): Promise<ChartPoint[]> {
  const token = getAuthToken();
  try {
    const res = await fetch(`/api/portfolio/history?range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("failed");
    const data: { date: string; balance: number; timestamp?: number }[] = await res.json();
    if (!data || data.length === 0) {
      return [{ day: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }), balance: currentBalance }];
    }
    return data.map(d => ({ day: d.date, balance: d.balance, timestamp: d.timestamp }));
  } catch {
    return [{ day: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }), balance: currentBalance }];
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const current = payload[0]?.value as number;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-lg text-xs min-w-[160px]">
      <div className="text-muted-foreground mb-1.5 text-[10px]">{label}</div>
      <div className="font-mono font-bold text-sm text-foreground">${formatUSD(current)}</div>
    </div>
  );
}

function countryFlag(country: string | null | undefined): string {
  if (!country) return "🌐";
  const map: Record<string, string> = {
    "United States": "🇺🇸", "Canada": "🇨🇦", "United Kingdom": "🇬🇧",
    "Germany": "🇩🇪", "France": "🇫🇷", "Australia": "🇦🇺",
    "Japan": "🇯🇵", "China": "🇨🇳", "India": "🇮🇳", "Brazil": "🇧🇷",
    "Nigeria": "🇳🇬", "South Africa": "🇿🇦", "Mexico": "🇲🇽",
    "Russia": "🇷🇺", "Spain": "🇪🇸", "Italy": "🇮🇹", "Netherlands": "🇳🇱",
    "Singapore": "🇸🇬", "UAE": "🇦🇪", "Saudi Arabia": "🇸🇦", "Indonesia": "🇮🇩",
    "Turkey": "🇹🇷", "Argentina": "🇦🇷", "Philippines": "🇵🇭", "Vietnam": "🇻🇳",
    "Thailand": "🇹🇭", "Malaysia": "🇲🇾", "Pakistan": "🇵🇰", "Bangladesh": "🇧🇩",
    "Egypt": "🇪🇬", "Kenya": "🇰🇪", "Ghana": "🇬🇭", "Ethiopia": "🇪🇹",
    "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰", "Finland": "🇫🇮",
    "Switzerland": "🇨🇭", "Belgium": "🇧🇪", "Austria": "🇦🇹", "Poland": "🇵🇱",
    "Portugal": "🇵🇹", "Czech Republic": "🇨🇿", "Romania": "🇷🇴", "Hungary": "🇭🇺",
    "Ukraine": "🇺🇦", "Israel": "🇮🇱", "South Korea": "🇰🇷", "Taiwan": "🇹🇼",
    "Hong Kong": "🇭🇰", "New Zealand": "🇳🇿", "Colombia": "🇨🇴", "Chile": "🇨🇱",
    "Peru": "🇵🇪", "Venezuela": "🇻🇪", "Ecuador": "🇪🇨", "Morocco": "🇲🇦",
    "Algeria": "🇩🇿", "Tunisia": "🇹🇳", "Iraq": "🇮🇶", "Iran": "🇮🇷",
    "Kazakhstan": "🇰🇿", "Uzbekistan": "🇺🇿", "Sri Lanka": "🇱🇰",
  };
  return map[country] ?? "🌐";
}

const TIME_RANGES = ["1D", "7D", "30D"] as const;
type TimeRange = typeof TIME_RANGES[number];
const rangeParam: Record<TimeRange, string> = { "1D": "1d", "7D": "7d", "30D": "30d" };

export default function Dashboard() {
  const { user } = useAuth();
  const { trades } = useTrades();
  const [timeRange, setTimeRange] = useState<TimeRange>("7D");
  const [visualData, setVisualData] = useState<ChartPoint[]>([]);
  const fluctIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: livePrices } = useQuery<any[]>({
    queryKey: ["/api/market/24hr"],
    refetchInterval: 30000,
  });

  const { data: livePortfolio } = useQuery<{ total: number; breakdown: any; pricesFrom: string }>({
    queryKey: ["/api/portfolio/value"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio/value", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("portfolio value fetch failed");
      return res.json();
    },
    refetchInterval: 20000,
  });

  const { data: lastSecurity } = useQuery<any>({
    queryKey: ["/api/auth/my-security"],
    queryFn: async () => {
      const res = await fetch("/api/auth/my-security", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const getPrice = (symbol: string): number => {
    if (symbol === "USDT" || symbol === "USDC") return 1;
    const pair = livePrices?.find((p: any) => p.symbol === `${symbol}USDT`);
    return pair ? (parseFloat(pair.lastPrice) || 0) : 0;
  };

  const portfolioValue =
    Number(user?.usdtBalance || 0) +
    Number((user as any)?.btcBalance || 0) * getPrice("BTC") +
    Number((user as any)?.ethBalance || 0) * getPrice("ETH") +
    Number((user as any)?.bnbBalance || 0) * getPrice("BNB") +
    Number((user as any)?.usdcBalance || 0);

  // Prefer server-computed live value (includes real-time crypto prices); fall back to local calc
  const displayPortfolioValue = livePortfolio?.total ?? portfolioValue;

  const activeTrades = trades.filter(t => t.status === "OPEN");
  const closedTrades = trades.filter(t => t.status === "CLOSED");
  const winRate = closedTrades.length > 0
    ? (closedTrades.filter(t => t.result === "WIN").length / closedTrades.length) * 100
    : 0;

  const { data: chartData = [] } = useQuery<ChartPoint[]>({
    queryKey: ["/api/portfolio/history", timeRange],
    queryFn: () => fetchPortfolioHistory(displayPortfolioValue, rangeParam[timeRange]),
    refetchInterval: 12000,
    enabled: displayPortfolioValue >= 0,
  });

  // Sync visualData when real data arrives
  useEffect(() => {
    if (chartData.length > 0) setVisualData(chartData);
  }, [chartData]);

  // Fluctuation effect — visual only, does NOT modify DB
  useEffect(() => {
    if (fluctIntervalRef.current) clearInterval(fluctIntervalRef.current);
    fluctIntervalRef.current = setInterval(() => {
      setVisualData(prev => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const last = copy[copy.length - 1];
        const pct = (Math.random() * 0.008 - 0.003); // ±0.3% max
        copy[copy.length - 1] = { ...last, balance: parseFloat((last.balance * (1 + pct)).toFixed(2)) };
        return copy;
      });
    }, 7000 + Math.random() * 3000); // 7-10 second jitter
    return () => { if (fluctIntervalRef.current) clearInterval(fluctIntervalRef.current); };
  }, [chartData]);

  const marketAssets = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"].map(sym => {
    const p = livePrices?.find((x: any) => x.symbol === sym);
    return {
      symbol: sym.replace("USDT", ""),
      price: p ? Number(p.lastPrice) : null,
      change: p ? Number(p.priceChangePercent) : null,
      image: p?.image,
    };
  });

  const totalPnl = closedTrades.reduce((sum, t) => {
    const amount = Number(t.amount);
    return sum + (t.result === "WIN" ? amount * (t.profitPercent / 100) : -amount);
  }, 0);

  // Chart color logic: green if trending up, red if trending down
  const displayData = visualData.length > 0 ? visualData : chartData;
  const firstBal = displayData[0]?.balance ?? 0;
  const lastBal = displayData[displayData.length - 1]?.balance ?? 0;
  const isIncreasing = lastBal >= firstBal;
  const chartColor = isIncreasing ? "#10b981" : "#ef4444";
  const chartGradId = isIncreasing ? "gradGreen" : "gradRed";
  const pctChange = firstBal > 0 ? ((lastBal - firstBal) / firstBal) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <header className="mb-6">
          <h1 className="text-xl md:text-3xl font-display font-bold">
            Welcome back, <span className="text-primary">{user?.username}</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        {user?.verificationStatus === "UNVERIFIED" && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-500 text-sm">Identity Verification Required</h3>
                <p className="text-xs text-amber-500/80">Complete KYC to unlock full withdrawal limits.</p>
              </div>
            </div>
            <Link href="/kyc">
              <button className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg text-xs transition-colors shrink-0">
                Verify Now
              </button>
            </Link>
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Balance</CardTitle>
              <Wallet className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl md:text-2xl font-bold font-mono text-foreground" data-testid="text-portfolio-value">
                ${formatUSD(displayPortfolioValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Portfolio value</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total P&amp;L</CardTitle>
              {totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={cn("text-xl md:text-2xl font-bold font-mono", totalPnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                {totalPnl >= 0 ? "+" : ""}${formatUSD(Math.abs(totalPnl))}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">All closed trades</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Win Rate</CardTitle>
              <Activity className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl md:text-2xl font-bold text-emerald-500">{winRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {closedTrades.filter(t => t.result === "WIN").length}W / {closedTrades.filter(t => t.result === "LOSS").length}L
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active Trades</CardTitle>
              <Clock className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl md:text-2xl font-bold">{activeTrades.length}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{trades.length} total executed</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Portfolio Chart + Market Overview ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Portfolio Chart */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-semibold">Portfolio Performance</CardTitle>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    isIncreasing ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%
                  </span>
                </div>
                <div className="flex gap-1">
                  {TIME_RANGES.map(r => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium transition-all",
                        timeRange === r
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      data-testid={`button-range-${r}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4 pt-1">
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={displayData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    width={52}
                    domain={["auto", "auto"]}
                  />
                  <ReTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotoneX"
                    dataKey="balance"
                    stroke={chartColor}
                    strokeWidth={2}
                    fill={`url(#${chartGradId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={600}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Market Overview */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Market Overview</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-3">
              {marketAssets.map(asset => (
                <div key={asset.symbol} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {asset.image ? (
                      <img src={asset.image} alt={asset.symbol} className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{asset.symbol[0]}</div>
                    )}
                    <div>
                      <div className="font-semibold text-sm leading-none">{asset.symbol}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {asset.price !== null ? `$${asset.price >= 1 ? asset.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : asset.price.toFixed(4)}` : "—"}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    asset.change === null ? "text-muted-foreground" :
                    asset.change >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {asset.change !== null ? `${asset.change >= 0 ? "+" : ""}${asset.change.toFixed(2)}%` : "—"}
                  </div>
                </div>
              ))}
              <Link href="/trading" className="mt-2 block">
                <button className="w-full text-xs text-center text-primary hover:underline mt-1 flex items-center justify-center gap-1">
                  View all markets <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Activity + Side Panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Recent Activity (compact) */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <Link href="/trading" className="text-primary text-xs hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pb-2 px-0">
              {trades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No trades yet. Start trading to see activity here.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {trades.slice(0, 4).map(trade => {
                    const amount = Number(trade.amount);
                    const profit = trade.result === "WIN" ? amount * (trade.profitPercent / 100) : -amount;
                    return (
                      <div key={trade.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors" data-testid={`row-trade-${trade.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            trade.direction === "BUY" ? "bg-emerald-500/10" : "bg-red-500/10"
                          )}>
                            {trade.direction === "BUY" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm leading-none">{trade.pair}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {trade.openTime ? new Date(trade.openTime).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm font-medium">
                            {trade.status === "CLOSED" ? (
                              <span className={trade.result === "WIN" ? "text-emerald-500" : "text-red-500"}>
                                {trade.result === "WIN" ? "+" : "-"}${formatUSD(Math.abs(profit))}
                              </span>
                            ) : (
                              <span className="text-blue-400">OPEN</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">${formatUSD(amount)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Alerts + Security */}
          <div className="space-y-5">
            {/* Alerts */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Notifications</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">System operational</p>
                    <p className="text-xs text-muted-foreground">All services running normally</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">Market volatility</p>
                    <p className="text-xs text-muted-foreground">Elevated volatility across major pairs</p>
                  </div>
                </div>
                {user?.verificationStatus !== "VERIFIED" && (
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">KYC pending</p>
                      <p className="text-xs text-muted-foreground">Complete verification to unlock all features</p>
                    </div>
                  </div>
                )}
                {activeTrades.length > 0 && (
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{activeTrades.length} active trade{activeTrades.length > 1 ? "s" : ""}</p>
                      <p className="text-xs text-muted-foreground">Positions currently open</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security / Login Activity */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Last Login</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">IP:</span>
                  <span className="text-xs font-mono font-medium">{(user as any)?.lastLoginIp ?? lastSecurity?.ip ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Location:</span>
                  <span className="text-xs font-medium">
                    {lastSecurity?.country
                      ? `${countryFlag(lastSecurity.country)} ${lastSecurity.city ? `${lastSecurity.city}, ` : ""}${lastSecurity.country}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Time:</span>
                  <span className="text-xs font-medium">
                    {lastSecurity?.createdAt
                      ? new Date(lastSecurity.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
                {lastSecurity?.isSuspicious && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Unusual login location detected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-3 gap-3 md:gap-5">
          <Link href="/wallet">
            <button className="w-full flex flex-col items-center justify-center gap-2 p-4 md:p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group" data-testid="button-quick-deposit">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm font-semibold">Deposit</span>
            </button>
          </Link>
          <Link href="/wallet">
            <button className="w-full flex flex-col items-center justify-center gap-2 p-4 md:p-5 bg-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group" data-testid="button-quick-withdraw">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-sm font-semibold">Withdraw</span>
            </button>
          </Link>
          <Link href="/trading">
            <button className="w-full flex flex-col items-center justify-center gap-2 p-4 md:p-5 bg-primary/10 border border-primary/30 rounded-xl hover:bg-primary/20 hover:border-primary/60 transition-all group" data-testid="button-quick-trade">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary">Trade Now</span>
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
