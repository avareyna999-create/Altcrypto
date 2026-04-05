import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PublicNavbar from "@/components/PublicNavbar";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  fetchMarketData,
  formatPrice,
  formatVolume,
  getCoinName,
  getCoinTicker,
  type MarketCoin,
} from "@/lib/marketService";
import { cn } from "@/lib/utils";

// ─── Sparkline helpers ──────────────────────────────────────────────────────

function generateSparkline(coin: MarketCoin, points = 24): number[] {
  const { price, highPrice, lowPrice, priceChangePercent } = coin;
  if (!highPrice || !lowPrice || highPrice === lowPrice) {
    return Array.from({ length: points }, (_, i) => price + Math.sin(i) * price * 0.001);
  }
  const range = highPrice - lowPrice;
  const isUp = priceChangePercent >= 0;
  const startPrice = isUp ? lowPrice + range * 0.2 : highPrice - range * 0.2;
  const result: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const base = startPrice + (price - startPrice) * t;
    const seed = Math.sin(i * 2.5 + coin.symbol.charCodeAt(0)) * range * 0.08;
    const noise = Math.sin(i * 1.3 + coin.symbol.charCodeAt(1)) * range * 0.04;
    result.push(Math.max(lowPrice, Math.min(highPrice, base + seed + noise)));
  }
  return result;
}

function buildSvgPath(values: number[], W: number, H: number, pad = 2) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = (H - pad) - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    line: `M ${pts.join(" L ")}`,
    fill: `M 0,${H} L ${pts.join(" L ")} L ${W},${H} Z`,
  };
}

// ─── SVG Sparkline (card inline) ────────────────────────────────────────────

function SvgSparkline({ values, color, symbol }: { values: number[]; color: string; symbol: string }) {
  const W = 200, H = 48;
  const { line, fill } = useMemo(() => buildSvgPath(values, W, H), [values]);
  const gradId = `grad-${symbol}`;
  return (
    <div className="h-12 w-full mb-3" data-testid={`chart-sparkline-${symbol.toLowerCase()}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─── Hover popup chart ───────────────────────────────────────────────────────

function HoverChart({ values, color, coin }: { values: number[]; color: string; coin: MarketCoin }) {
  const W = 220, H = 100;
  const { line, fill } = useMemo(() => buildSvgPath(values, W, H, 4), [values]);
  const gradId = `popup-grad-${coin.symbol}`;
  const isUp = coin.priceChangePercent >= 0;

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{ width: 240 }}
      data-testid={`popup-chart-${coin.symbol.toLowerCase()}`}
    >
      <div className="bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl shadow-black/60 p-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white">{getCoinTicker(coin.symbol)} / USDT</span>
          <span className={cn("text-xs font-bold", isUp ? "text-emerald-400" : "text-red-400")}>
            {isUp ? "+" : ""}{coin.priceChangePercent.toFixed(2)}% 24h
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div className="flex justify-between mt-2 text-[10px] text-white/40">
          <span>L: ${formatPrice(coin.lowPrice)}</span>
          <span>H: ${formatPrice(coin.highPrice)}</span>
        </div>
      </div>
      {/* Arrow */}
      <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0f1117] border-r border-b border-white/10 rotate-45" />
    </div>
  );
}

// ─── Coin logo ───────────────────────────────────────────────────────────────

const COIN_BADGE_COLORS = [
  "#F7931A","#627EEA","#F0B90B","#9945FF","#00CED1",
  "#E84142","#0033AD","#26A17B","#FF007A","#7B3FE4",
];

function CoinLogo({ symbol, image }: { symbol: string; image?: string }) {
  const ticker = getCoinTicker(symbol).toLowerCase();
  const localIcons: Record<string, boolean> = { near: true, apt: true, shib: true };
  const spothqUrl = localIcons[ticker]
    ? `/coin-icons/${ticker}.png`
    : `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${ticker}.png`;

  const [src, setSrc] = useState<string>(image || spothqUrl);
  const [stage, setStage] = useState<0 | 1 | 2>(image ? 0 : 1);

  useEffect(() => {
    if (image) { setSrc(image); setStage(0); }
  }, [image]);

  const handleError = () => {
    if (stage === 0) { setSrc(spothqUrl); setStage(1); }
    else { setStage(2); }
  };

  if (stage === 2) {
    const color = COIN_BADGE_COLORS[ticker.charCodeAt(0) % COIN_BADGE_COLORS.length];
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
        style={{ background: color }}
        data-testid={`img-logo-fallback-${symbol.toLowerCase()}`}
      >
        {ticker.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={ticker.toUpperCase()}
      className="w-10 h-10 rounded-full flex-shrink-0"
      onError={handleError}
      data-testid={`img-logo-${symbol.toLowerCase()}`}
    />
  );
}

// ─── Coin Card ───────────────────────────────────────────────────────────────

type FlashDir = "up" | "down" | null;

interface CoinCardProps {
  coin: MarketCoin;
  flash: FlashDir;
  onClick: () => void;
}

function CoinCard({ coin, flash, onClick }: CoinCardProps) {
  const isUp = coin.priceChangePercent >= 0;
  const chartColor = isUp ? "#10b981" : "#ef4444";
  const sparkValues = useMemo(() => generateSparkline(coin), [coin.symbol, Math.floor(coin.price)]);
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Hover popup chart */}
      {hovered && <HoverChart values={sparkValues} color={chartColor} coin={coin} />}

      <Card
        onClick={onClick}
        className={cn(
          "bg-card/50 border-border/50 backdrop-blur-sm cursor-pointer group",
          "transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/30",
          "hover:border-primary/30 hover:bg-card/80 active:scale-[0.99]"
        )}
        data-testid={`card-coin-${coin.symbol.toLowerCase()}`}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <CoinLogo symbol={coin.symbol} image={coin.image} />
              <div>
                <div className="font-bold text-sm">{getCoinTicker(coin.symbol)}</div>
                <div className="text-xs text-muted-foreground">{getCoinName(coin.symbol)}</div>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              )}
              data-testid={`text-change-${coin.symbol.toLowerCase()}`}
            >
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? "+" : ""}{coin.priceChangePercent.toFixed(2)}%
            </div>
          </div>

          {/* Price with flash */}
          <div className="mb-3">
            <div
              className={cn(
                "text-2xl font-bold font-mono transition-colors duration-300",
                flash === "up" && "text-emerald-400",
                flash === "down" && "text-red-400",
                !flash && "text-foreground"
              )}
              data-testid={`text-price-${coin.symbol.toLowerCase()}`}
            >
              ${formatPrice(coin.price)}
            </div>
          </div>

          {/* Inline sparkline */}
          <SvgSparkline values={sparkValues} color={chartColor} symbol={coin.symbol} />

          {/* 24h stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">24h High</div>
              <div className="text-xs font-mono font-medium" data-testid={`text-high-${coin.symbol.toLowerCase()}`}>${formatPrice(coin.highPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">24h Low</div>
              <div className="text-xs font-mono font-medium" data-testid={`text-low-${coin.symbol.toLowerCase()}`}>${formatPrice(coin.lowPrice)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Volume</div>
              <div className="text-xs font-mono font-medium">{formatVolume(coin.quoteVolume)}</div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-3 pt-2 border-t border-border/20 flex items-center justify-center gap-1 text-[11px] text-primary/50 group-hover:text-primary transition-colors">
            <TrendingUp className="w-3 h-3" />
            <span>Click to trade</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Filter type ─────────────────────────────────────────────────────────────

type FilterMode = "all" | "gainers" | "losers";

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Market() {
  const [, navigate] = useLocation();
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [liveIndicator, setLiveIndicator] = useState(false);

  // Track previous prices to detect direction of change
  const prevPrices = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<Record<string, FlashDir>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const applyFlash = useCallback((symbol: string, dir: FlashDir) => {
    // Clear any existing timer for this symbol
    if (flashTimers.current[symbol]) clearTimeout(flashTimers.current[symbol]);
    setFlashMap(m => ({ ...m, [symbol]: dir }));
    flashTimers.current[symbol] = setTimeout(() => {
      setFlashMap(m => ({ ...m, [symbol]: null }));
    }, 800);
  }, []);

  const loadData = useCallback(async (isInitial = false) => {
    if (document.hidden && !isInitial) return; // pause when tab hidden
    try {
      const data = await fetchMarketData();
      setCoins(data);
      setError(null);

      // Detect price changes and trigger flash
      data.forEach(coin => {
        const prev = prevPrices.current[coin.symbol];
        if (prev !== undefined && prev !== coin.price) {
          applyFlash(coin.symbol, coin.price > prev ? "up" : "down");
        }
        prevPrices.current[coin.symbol] = coin.price;
      });

      // Blink the live dot
      setLiveIndicator(v => !v);
    } catch (err) {
      if (isInitial) setError("Failed to load market data. Retrying...");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [applyFlash]);

  useEffect(() => {
    loadData(true);
    // Poll every 5s (server cache is 30s; updates propagate when cache expires)
    const interval = setInterval(() => loadData(false), 5000);
    return () => {
      clearInterval(interval);
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, [loadData]);

  const filtered = coins.filter(coin => {
    const q = search.toLowerCase();
    if (q && !coin.symbol.toLowerCase().includes(q) && !getCoinName(coin.symbol).toLowerCase().includes(q)) return false;
    if (filter === "gainers") return coin.priceChangePercent > 0;
    if (filter === "losers") return coin.priceChangePercent < 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2" data-testid="text-market-title">
            Crypto Market
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Live cryptocurrency prices</span>
            <span className="flex items-center gap-1.5">
              <span className={cn(
                "inline-block w-2 h-2 rounded-full transition-colors duration-500",
                liveIndicator ? "bg-emerald-400" : "bg-emerald-600"
              )} />
              <Zap className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Live</span>
            </span>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-card border-border"
              data-testid="input-search-market"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "gainers", "losers"] as FilterMode[]).map(mode => (
              <Button
                key={mode}
                variant={filter === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(mode)}
                className="capitalize"
                data-testid={`button-filter-${mode}`}
              >
                {mode === "gainers" && <TrendingUp className="w-3.5 h-3.5 mr-1.5" />}
                {mode === "losers" && <TrendingDown className="w-3.5 h-3.5 mr-1.5" />}
                {mode}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive" data-testid="text-market-error">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-market" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-market-coins">
            {filtered.map(coin => (
              <CoinCard
                key={coin.symbol}
                coin={coin}
                flash={flashMap[coin.symbol] ?? null}
                onClick={() => navigate(`/trading?pair=${coin.symbol}`)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground" data-testid="text-no-results">
                No coins match your search or filter criteria.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
