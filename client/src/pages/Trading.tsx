import { Sidebar } from "@/components/Sidebar";
import { TradingChart } from "@/components/TradingChart";
import { useTrades } from "@/hooks/use-trades";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import {
  TrendingUp, TrendingDown, Clock, AlertTriangle, DollarSign,
  ChevronDown, CheckCircle, XCircle, BarChart2,
} from "lucide-react";
import { TRADING_CONFIG, TRADING_PAIRS } from "@shared/schema";
import type { Trade } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchMarketData, formatPrice, formatVolume, type MarketCoin } from "@/lib/marketService";

const MARKET_POPULARITY_ORDER = [
  "BTCUSDT","ETHUSDT","BNBUSDT","XRPUSDT","SOLUSDT","TRXUSDT","DOGEUSDT","ADAUSDT",
  "AVAXUSDT","LINKUSDT","DOTUSDT","LTCUSDT","SHIBUSDT","NEARUSDT","ATOMUSDT","APTUSDT",
  "FILUSDT","UNIUSDT","AAVEUSDT","MATICUSDT","OPUSDT","ARBUSDT","SUIUSDT","SEIUSDT",
  "FTMUSDT","STXUSDT","CRVUSDT","LDOUSDT","COMPUSDT","SNXUSDT","1INCHUSDT","DYDXUSDT",
  "FETUSDT","AGIXUSDT","OCEANUSDT","RNDRUSDT","ARKMUSDT","OKBUSDT","KCSUSDT",
  "SANDUSDT","MANAUSDT","AXSUSDT","GALAUSDT","IMXUSDT",
  "PEPEUSDT","FLOKIUSDT","BONKUSDT","WIFUSDT",
  "GRTUSDT","THETAUSDT",
];

const COIN_COLORS = [
  "#F7931A","#627EEA","#0033AD","#9945FF","#E84142",
  "#00CED1","#0066FF","#E84142","#26A17B","#BFBBBB",
  "#00D4AA","#FF007A","#7B3FE4","#F0B90B","#E84042",
];

const CoinIcon = memo(function CoinIcon({ symbol, className, image }: { symbol: string; className?: string; image?: string }) {
  const ticker = symbol.replace("USDT", "").toLowerCase();
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
    const color = COIN_COLORS[ticker.charCodeAt(0) % COIN_COLORS.length];
    return (
      <span
        className={cn("rounded-full flex items-center justify-center text-white font-bold flex-shrink-0", className)}
        style={{ background: color, fontSize: "9px" }}
      >
        {ticker.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={symbol}
      className={cn("rounded-full flex-shrink-0", className)}
      onError={handleError}
    />
  );
});

function TradeCountdown({ expiryTime, duration }: { expiryTime: string | Date; duration: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiryTime).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const percent = duration > 0 ? Math.min(100, (remaining / duration) * 100) : 0;

  return (
    <div className="flex items-center gap-2" data-testid="trade-countdown">
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={remaining <= 5 ? "text-red-500" : remaining <= 15 ? "text-yellow-500" : "text-primary"}
            strokeDasharray={`${percent * 0.942} 94.2`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={cn(
        "font-mono font-bold text-sm tabular-nums",
        remaining <= 5 ? "text-red-500" : remaining <= 15 ? "text-yellow-500" : "text-foreground"
      )}>
        {mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`}
      </span>
    </div>
  );
}

function TradeResultOverlay({ trade, onDismiss }: { trade: Trade; onDismiss: () => void }) {
  const isWin = trade.result === "WIN";
  const profit = Number(trade.amount) * (trade.profitPercent / 100);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "border rounded-md p-4 flex items-center justify-between gap-3",
        isWin ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"
      )}
      data-testid={`trade-result-${trade.id}`}
    >
      <div className="flex items-center gap-3">
        {isWin ? (
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{trade.pair}</span>
            <span className={cn("text-xs font-medium", trade.direction === "BUY" ? "text-emerald-500" : "text-red-500")}>
              {trade.direction === "BUY" ? "CALL" : "PUT"}
            </span>
            <span className="text-xs text-muted-foreground">{trade.duration}s</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Entry: ${Number(trade.entryPrice).toFixed(2)} → Exit: ${Number(trade.exitPrice).toFixed(2)}
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={cn("text-lg font-bold font-mono", isWin ? "text-emerald-500" : "text-red-500")}>
          {isWin ? `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `-$${Number(trade.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        </div>
        <div className={cn("text-xs font-medium", isWin ? "text-emerald-500" : "text-red-500")}>
          {isWin ? `+${trade.profitPercent}% Profit` : "Loss"}
        </div>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0" data-testid="button-dismiss-result">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

function MarketStatsBar({ coin, livePrice }: { coin: MarketCoin | undefined; livePrice: string }) {
  const price = livePrice ? parseFloat(livePrice) : (coin?.price ?? 0);
  const change = Number(coin?.priceChangePercent ?? 0);
  const isUp = change >= 0;

  return (
    <div
      className="flex items-center flex-wrap gap-px bg-card border border-border rounded-lg overflow-hidden text-xs"
      data-testid="market-stats-bar"
    >
      <div className="flex flex-col px-4 py-2 min-w-[110px] border-r border-border">
        <span className="text-muted-foreground mb-0.5">Market Price</span>
        <span className={cn("font-mono font-bold text-sm", isUp ? "text-emerald-400" : "text-red-400")} data-testid="stat-market-price">
          ${formatPrice(price)}
        </span>
        <span className={cn("font-semibold", isUp ? "text-emerald-400" : "text-red-400")}>
          {isUp ? "+" : ""}{change.toFixed(2)}%
        </span>
      </div>
      <div className="flex flex-col px-4 py-2 min-w-[100px] border-r border-border">
        <span className="text-muted-foreground mb-0.5">24h High</span>
        <span className="font-mono font-semibold text-emerald-400" data-testid="stat-24h-high">
          ${formatPrice(coin?.highPrice ?? 0)}
        </span>
      </div>
      <div className="flex flex-col px-4 py-2 min-w-[100px] border-r border-border">
        <span className="text-muted-foreground mb-0.5">24h Low</span>
        <span className="font-mono font-semibold text-red-400" data-testid="stat-24h-low">
          ${formatPrice(coin?.lowPrice ?? 0)}
        </span>
      </div>
      <div className="flex flex-col px-4 py-2 min-w-[110px]">
        <span className="text-muted-foreground mb-0.5">24h Volume</span>
        <span className="font-mono font-semibold text-foreground" data-testid="stat-24h-volume">
          {formatVolume(coin?.quoteVolume ?? 0)} USDT
        </span>
      </div>
    </div>
  );
}

function OrderBook({ price }: { price: number }) {
  const rows = 8;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const { asks, bids } = useMemo(() => {
    if (!price) return { asks: [], bids: [] };

    const tickSize = price < 1 ? 0.000001 : price < 10 ? 0.0001 : price < 1000 ? 0.01 : 0.1;
    const spread = tickSize * (price < 10 ? 5 : price < 1000 ? 3 : 2);

    const asks = Array.from({ length: rows }, (_, i) => {
      const p = price + spread + tickSize * (rows - i - 1);
      const amt = +(Math.random() * 8 + 0.05).toFixed(4);
      return { price: p, amount: amt, total: +(p * amt).toFixed(2) };
    });

    const bids = Array.from({ length: rows }, (_, i) => {
      const p = price - spread - tickSize * i;
      const amt = +(Math.random() * 8 + 0.05).toFixed(4);
      return { price: p, amount: amt, total: +(p * amt).toFixed(2) };
    });

    return { asks, bids };
  }, [price, tick]);

  const maxAskTotal = asks.length ? Math.max(...asks.map(a => a.total)) : 1;
  const maxBidTotal = bids.length ? Math.max(...bids.map(b => b.total)) : 1;
  const spreadVal = asks.length && bids.length ? asks[asks.length - 1].price - bids[0].price : 0;
  const spreadPct = price > 0 && spreadVal > 0 ? (spreadVal / price) * 100 : 0;

  return (
    <Card className="bg-card border-border shadow-lg flex flex-col" data-testid="order-book-panel">
      <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2 shrink-0">
        <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Order Book</h3>
      </div>

      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border/40 shrink-0">
        <span>Price (USDT)</span>
        <span className="text-center">Amount</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-col-reverse">
          {asks.map((row, i) => (
            <div key={i} className="relative grid grid-cols-3 px-3 py-[3px] text-[11px] hover:bg-red-500/5 cursor-default">
              <div
                className="absolute inset-y-0 right-0 pointer-events-none"
                style={{ width: `${(row.total / maxAskTotal) * 100}%`, background: "rgba(239,68,68,0.08)" }}
              />
              <span className="font-mono text-red-400 font-semibold relative z-10">{formatPrice(row.price)}</span>
              <span className="font-mono text-center text-muted-foreground relative z-10">{row.amount.toFixed(4)}</span>
              <span className="font-mono text-right text-muted-foreground relative z-10">{row.total.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 py-1 border-y border-border/50 bg-muted/10">
          <span className="text-[10px] text-muted-foreground">Spread</span>
          <span className="text-[10px] font-mono font-bold text-foreground">{formatPrice(spreadVal)}</span>
          {spreadPct > 0 && <span className="text-[10px] text-muted-foreground">({spreadPct.toFixed(3)}%)</span>}
        </div>

        {bids.map((row, i) => (
          <div key={i} className="relative grid grid-cols-3 px-3 py-[3px] text-[11px] hover:bg-emerald-500/5 cursor-default">
            <div
              className="absolute inset-y-0 right-0 pointer-events-none"
              style={{ width: `${(row.total / maxBidTotal) * 100}%`, background: "rgba(34,197,94,0.08)" }}
            />
            <span className="font-mono text-emerald-400 font-semibold relative z-10">{formatPrice(row.price)}</span>
            <span className="font-mono text-center text-muted-foreground relative z-10">{row.amount.toFixed(4)}</span>
            <span className="font-mono text-right text-muted-foreground relative z-10">{row.total.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Trading() {
  const { createTrade, isCreating, trades } = useTrades();
  const { user } = useAuth();

  const [amount, setAmount] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [selectedPair, setSelectedPair] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pair = params.get("pair");
      return pair && TRADING_PAIRS.some(p => p.symbol === pair) ? pair : "BTCUSDT";
    } catch {
      return "BTCUSDT";
    }
  });
  const [showPairSelector, setShowPairSelector] = useState(false);
  const [livePrice, setLivePrice] = useState<string>("");

  const currentConfig = useMemo(
    () => TRADING_CONFIG.find(c => c.duration === selectedDuration) ?? TRADING_CONFIG[0],
    [selectedDuration]
  );

  const currentPairInfo = useMemo(
    () => TRADING_PAIRS.find(p => p.symbol === selectedPair) ?? TRADING_PAIRS[0],
    [selectedPair]
  );

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/price/${selectedPair}`);
      const data = await res.json();
      if (data.price && data.price !== "0") setLivePrice(data.price);
    } catch {}
  }, [selectedPair]);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  const numAmount = Number(amount) || 0;
  const isBelowMin = numAmount > 0 && numAmount < currentConfig.minAmount;
  const isAboveBalance = numAmount > Number(user?.usdtBalance || 0);
  const canTrade = numAmount >= currentConfig.minAmount && !isAboveBalance && numAmount > 0;
  const potentialProfit = numAmount * (currentConfig.profitPercent / 100);

  const handleTrade = (direction: "BUY" | "SELL") => {
    if (!canTrade) return;
    createTrade({ pair: selectedPair, direction, amount: numAmount, duration: selectedDuration });
  };

  const activeTrades = trades.filter(t => t.status === "OPEN");
  const [completedResults, setCompletedResults] = useState<Trade[]>([]);
  const prevTradeIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const currentOpenIds = new Set(activeTrades.map(t => t.id));
    const prevIds = prevTradeIdsRef.current;
    if (prevIds.size > 0) {
      const justClosed = Array.from(prevIds).filter(id => !currentOpenIds.has(id));
      if (justClosed.length > 0) {
        const closedTrades = trades.filter(t => justClosed.includes(t.id) && t.status === "CLOSED" && t.result);
        if (closedTrades.length > 0) {
          setCompletedResults(prev => [...closedTrades, ...prev].slice(0, 5));
        }
      }
    }
    prevTradeIdsRef.current = currentOpenIds;
  }, [trades, activeTrades]);

  const dismissResult = useCallback((tradeId: number) => {
    setCompletedResults(prev => prev.filter(t => t.id !== tradeId));
  }, []);

  const [marketSearch, setMarketSearch] = useState("");

  const { data: marketCoins = [] } = useQuery<MarketCoin[]>({
    queryKey: ["/api/market/24hr"],
    queryFn: fetchMarketData,
    refetchInterval: 15000,
  });

  const sortedMarketCoins = useMemo(() => {
    const all = TRADING_PAIRS.map(pair => {
      const live = marketCoins.find(c => c.symbol === pair.symbol);
      return live ?? ({
        symbol: pair.symbol,
        price: pair.basePrice,
        priceChangePercent: 0,
        volume: 0,
        highPrice: pair.basePrice,
        lowPrice: pair.basePrice,
        quoteVolume: 0,
      } as MarketCoin);
    }).sort((a, b) => {
      const ia = MARKET_POPULARITY_ORDER.indexOf(a.symbol);
      const ib = MARKET_POPULARITY_ORDER.indexOf(b.symbol);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    if (!marketSearch.trim()) return all;
    const q = marketSearch.toLowerCase();
    return all.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      (TRADING_PAIRS.find(p => p.symbol === c.symbol)?.name ?? "").toLowerCase().includes(q)
    );
  }, [marketCoins, marketSearch]);

  const currentCoinStats = useMemo(
    () => marketCoins.find(c => c.symbol === selectedPair),
    [marketCoins, selectedPair]
  );

  const livePriceNum = parseFloat(livePrice) || currentCoinStats?.price || 0;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64">
        <div className="p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">

          {/* ── Market List (left, desktop only) ── */}
          <div
            className="hidden lg:flex lg:col-span-2"
            style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}
          >
            <Card className="w-full bg-card border-border shadow-lg flex flex-col h-full overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/20 shrink-0">
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Markets</h3>
              </div>
              <div className="px-2 py-1.5 border-b border-border shrink-0">
                <input
                  type="text"
                  placeholder="Search..."
                  value={marketSearch}
                  onChange={e => setMarketSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                  data-testid="input-market-search"
                />
              </div>
              <div className="flex-1 overflow-y-auto" style={{ overflowY: "auto" }}>
                {sortedMarketCoins.length === 0 && (
                  <p className="text-[11px] text-muted-foreground text-center py-6 px-2">No pairs found</p>
                )}
                {sortedMarketCoins.map((coin) => (
                  <button
                    key={coin.symbol}
                    onClick={() => setSelectedPair(coin.symbol)}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-all hover:bg-accent/50",
                      selectedPair === coin.symbol
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "border-l-2 border-transparent"
                    )}
                    data-testid={`market-ticker-${coin.symbol}`}
                  >
                    <CoinIcon symbol={coin.symbol} className="w-4 h-4 flex-shrink-0" image={coin.image} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold truncate leading-none mb-0.5">
                        {coin.symbol.replace("USDT", "")}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground leading-none">
                        ${formatPrice(coin.price || 0)}
                      </div>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold flex-shrink-0 leading-none",
                      Number(coin.priceChangePercent || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {Number(coin.priceChangePercent || 0) >= 0 ? "+" : ""}
                      {Number(coin.priceChangePercent || 0).toFixed(2)}%
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Chart + Positions (center) ── */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <MarketStatsBar coin={currentCoinStats} livePrice={livePrice} />

            <TradingChart pair={selectedPair} currentPrice={livePrice} />

            {completedResults.length > 0 && (
              <div className="space-y-2" data-testid="trade-results-container">
                {completedResults.map(trade => (
                  <TradeResultOverlay key={trade.id} trade={trade} onDismiss={() => dismissResult(trade.id)} />
                ))}
              </div>
            )}

            <Card className="bg-card border-border shadow-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Active Positions</h3>
                {activeTrades.length > 0 && (
                  <span className="ml-auto text-xs font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {activeTrades.length}
                  </span>
                )}
              </div>
              <div className="overflow-auto" style={{ maxHeight: "220px" }}>
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Asset</th>
                      <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Direction</th>
                      <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Entry</th>
                      <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Amount</th>
                      <th className="px-3 py-1.5 text-left text-muted-foreground font-medium">Time Left</th>
                      <th className="px-3 py-1.5 text-right text-muted-foreground font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTrades.map(trade => (
                      <tr key={trade.id} className="border-b border-border/40 hover:bg-accent/30 transition-colors" data-testid={`row-trade-${trade.id}`}>
                        <td className="px-3 py-2 font-semibold">{trade.pair}</td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            "font-bold text-xs px-1.5 py-0.5 rounded",
                            trade.direction === "BUY"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-red-500/15 text-red-400"
                          )}>
                            {trade.direction === "BUY" ? "CALL" : "PUT"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">${Number(trade.entryPrice).toFixed(2)}</td>
                        <td className="px-3 py-2 font-mono">${Number(trade.amount).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <TradeCountdown expiryTime={trade.expiryTime} duration={trade.duration} />
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400 font-bold">+{trade.profitPercent}%</td>
                      </tr>
                    ))}
                    {activeTrades.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">No active positions</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ── Right panel: Order Book + Trading Panel ── */}
          <div className="lg:col-span-3 flex flex-col gap-3">

            <OrderBook price={livePriceNum} />

            <Card className="bg-card border-border shadow-lg">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Place Order</h3>
              </div>

              <div className="p-4 flex flex-col gap-4">
                {/* Pair Selector */}
                <div className="relative">
                  <Label className="text-muted-foreground mb-1.5 block text-xs">Trading Pair</Label>
                  <button
                    onClick={() => setShowPairSelector(!showPairSelector)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-background border border-input rounded-md text-sm hover:border-primary/50 transition-colors"
                    data-testid="button-pair-selector"
                  >
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={selectedPair} className="w-5 h-5" image={sortedMarketCoins.find(c => c.symbol === selectedPair)?.image} />
                      <span className="font-semibold text-sm">{currentPairInfo.baseAsset}/{currentPairInfo.quoteAsset}</span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showPairSelector && "rotate-180")} />
                  </button>

                  {showPairSelector && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl z-50 max-h-[280px] overflow-y-auto" data-testid="dropdown-pair-list">
                      {TRADING_PAIRS.map((p) => (
                        <button
                          key={p.symbol}
                          onClick={() => { setSelectedPair(p.symbol); setShowPairSelector(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors",
                            selectedPair === p.symbol && "bg-primary/10 text-primary"
                          )}
                          data-testid={`button-pair-${p.symbol}`}
                        >
                          <CoinIcon symbol={p.symbol} className="w-4 h-4" image={sortedMarketCoins.find(c => c.symbol === p.symbol)?.image} />
                          <span className="font-medium">{p.baseAsset}/{p.quoteAsset}</span>
                          <span className="text-muted-foreground ml-auto text-xs">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-muted-foreground mb-1.5 block text-xs">Duration</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TRADING_CONFIG.map(cfg => (
                      <Button
                        key={cfg.duration}
                        variant={selectedDuration === cfg.duration ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setSelectedDuration(cfg.duration)}
                        data-testid={`button-duration-${cfg.duration}`}
                      >
                        {cfg.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Config info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-muted/30 rounded border border-border/50 text-center">
                    <div className="text-[10px] text-muted-foreground">Min Amount</div>
                    <div className="text-xs font-mono font-bold mt-0.5" data-testid="text-min-amount">${currentConfig.minAmount.toLocaleString()}</div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20 text-center">
                    <div className="text-[10px] text-muted-foreground">Profit Rate</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5" data-testid="text-profit-rate">+{currentConfig.profitPercent}%</div>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <Label className="text-muted-foreground mb-1.5 block text-xs">Amount (USDT)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10 font-mono bg-background border-input focus:ring-primary/20"
                    data-testid="input-trade-amount"
                  />
                  {isBelowMin && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs" data-testid="text-min-warning">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>Min {currentConfig.minAmount.toLocaleString()} USDT</span>
                    </div>
                  )}
                  {isAboveBalance && numAmount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs" data-testid="text-balance-warning">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>Insufficient balance</span>
                    </div>
                  )}
                </div>

                {/* Stop Loss */}
                <div>
                  <Label className="text-muted-foreground mb-1.5 block text-xs">
                    Stop Loss <span className="text-muted-foreground/60 font-normal">(optional)</span>
                  </Label>
                  <Input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="e.g. 65000"
                    className="h-9 font-mono text-sm bg-background border-input"
                    data-testid="input-stop-loss"
                  />
                </div>

                {/* Take Profit */}
                <div>
                  <Label className="text-muted-foreground mb-1.5 block text-xs">
                    Take Profit <span className="text-muted-foreground/60 font-normal">(optional)</span>
                  </Label>
                  <Input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="e.g. 72000"
                    className="h-9 font-mono text-sm bg-background border-input"
                    data-testid="input-take-profit"
                  />
                </div>

                {/* Potential profit preview */}
                {canTrade && (
                  <div className="p-2.5 bg-emerald-500/10 rounded border border-emerald-500/20" data-testid="text-profit-preview">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 mb-0.5">
                      <DollarSign className="w-3 h-3" />
                      Potential Profit
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      +${potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-xs font-medium ml-1">({currentConfig.profitPercent}%)</span>
                    </div>
                  </div>
                )}

                {/* CALL / PUT buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="lg"
                    className={cn(
                      "font-bold text-sm h-12 flex flex-col gap-0",
                      canTrade ? "bg-emerald-500 hover:bg-emerald-600" : "bg-emerald-500/30 cursor-not-allowed"
                    )}
                    onClick={() => handleTrade("BUY")}
                    disabled={!canTrade || isCreating}
                    data-testid="button-call"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>CALL</span>
                    <span className="text-[10px] font-normal opacity-80">UP</span>
                  </Button>

                  <Button
                    size="lg"
                    className={cn(
                      "font-bold text-sm h-12 flex flex-col gap-0",
                      canTrade ? "bg-red-500 hover:bg-red-600" : "bg-red-500/30 cursor-not-allowed"
                    )}
                    onClick={() => handleTrade("SELL")}
                    disabled={!canTrade || isCreating}
                    data-testid="button-put"
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>PUT</span>
                    <span className="text-[10px] font-normal opacity-80">DOWN</span>
                  </Button>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">USDT Balance</span>
                  <span className="text-xs font-mono font-bold text-foreground" data-testid="text-usdt-balance">
                    ${Number(user?.usdtBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
