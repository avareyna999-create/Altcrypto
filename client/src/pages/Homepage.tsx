import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import PublicNavbar from "@/components/PublicNavbar";
import {
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CandlestickChart,
  SlidersHorizontal,
  Activity,
} from "lucide-react";
import { useEffect, useRef, useState, memo } from "react";
import { motion, useInView } from "framer-motion";
import { fetchMarketData, formatPrice, getCoinTicker, type MarketCoin } from "@/lib/marketService";

// ─── Particle Canvas ─────────────────────────────────────────────────────────
const ParticleCanvas = memo(function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 50;
    const MAX_DIST = 130;
    interface P { x: number; y: number; vx: number; vy: number }
    const particles: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(52, 211, 153, 0.35)";
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
});

// ─── Count-Up Number ─────────────────────────────────────────────────────────
function CountUp({
  target, prefix = "", suffix = "", decimals = 0, duration = 1800,
}: { target: number; prefix?: string; suffix?: string; decimals?: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });

  useEffect(() => {
    if (!inView) return;
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const prog = Math.min((ts - startTs) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setCount(ease * target);
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  const display = decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString();
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

// ─── Ticker Bar ──────────────────────────────────────────────────────────────
function TickerBar({ coins }: { coins: MarketCoin[] }) {
  if (!coins.length) return null;
  const items = [...coins, ...coins];
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-background/60 backdrop-blur-sm py-3"
         data-testid="ticker-bar">
      <div className="ticker-track">
        {items.map((coin, i) => {
          const ticker = getCoinTicker(coin.symbol);
          const isUp = coin.priceChangePercent >= 0;
          return (
            <div key={i} className="flex items-center gap-2 mx-6 flex-shrink-0 select-none">
              {coin.image && (
                <img src={coin.image} alt={ticker}
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <span className="text-sm font-semibold text-foreground/80">{ticker}</span>
              <span className="text-sm font-mono text-foreground/60">${formatPrice(coin.price)}</span>
              <span className={`text-xs font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                {isUp ? "+" : ""}{coin.priceChangePercent.toFixed(2)}%
              </span>
              <span className="text-white/10 mx-1">|</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Floating Coin ────────────────────────────────────────────────────────────
const FLOAT_CLASSES = ["float-a", "float-b", "float-c", "float-d"];
const FLOAT_COINS = [
  { ticker: "btc", top: "12%",  left: "8%",  size: 72, opacity: 0.07 },
  { ticker: "eth", top: "60%",  left: "5%",  size: 56, opacity: 0.06 },
  { ticker: "sol", top: "15%",  right: "7%", size: 64, opacity: 0.07 },
  { ticker: "bnb", top: "65%",  right: "6%", size: 52, opacity: 0.06 },
];

// ─── Homepage ─────────────────────────────────────────────────────────────────
export default function Homepage() {
  const [previewCoins, setPreviewCoins] = useState<MarketCoin[]>([]);
  const [tickerCoins, setTickerCoins] = useState<MarketCoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData()
      .then((data) => {
        const TOP_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
        const ordered = TOP_SYMBOLS
          .map(sym => data.find(c => c.symbol === sym))
          .filter(Boolean) as typeof data;
        setPreviewCoins(ordered.length >= 4 ? ordered : data.slice(0, 4));
        setTickerCoins(data.slice(0, 10));
      })
      .catch((err) => console.error("Market preview error:", err))
      .finally(() => setLoading(false));
  }, []);

  const STATS = [
    { label: "24h Volume",     prefix: "$", target: 2.4, suffix: "B+", decimals: 1 },
    { label: "Active Traders", prefix: "",  target: 120, suffix: "K+", decimals: 0 },
    { label: "Crypto Pairs",   prefix: "",  target: 50,  suffix: "+",  decimals: 0 },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
  };
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* particle network */}
        <ParticleCanvas />

        {/* grid background */}
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        {/* white radial glow */}
        <div className="absolute inset-0 hero-radial-glow pointer-events-none" />

        {/* globe glow — radial light behind the globe */}
        <div className="hero-globe-glow absolute pointer-events-none" />

        {/* rotating blockchain globe — circular div so no corner artifacts */}
        <div className="hero-globe-img globe-rotate absolute pointer-events-none" />

        {/* ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[130px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[110px]" />
          <div className="absolute top-[40%] right-[30%] w-[300px] h-[300px] bg-purple-500/8 rounded-full blur-[80px]" />
        </div>

        {/* floating coin icons */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block">
          {FLOAT_COINS.map((c, i) => (
            <div
              key={c.ticker}
              className={`absolute ${FLOAT_CLASSES[i]}`}
              style={{ top: c.top, left: c.left, right: c.right, opacity: c.opacity }}
            >
              <img
                src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${c.ticker}.png`}
                alt={c.ticker}
                width={c.size}
                height={c.size}
                className="rounded-full blur-[1px]"
                style={{ filter: "blur(1px) brightness(1.4)" }}
              />
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {/* pill badge */}
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-sm font-medium mb-8 glow-white"
            >
              <Zap className="w-4 h-4" />
              Live Crypto Trading Platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6 text-shadow"
              data-testid="text-hero-title"
            >
              Trade the Future of{" "}
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Crypto
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              data-testid="text-hero-subtitle"
            >
              The most secure and intuitive platform for cryptocurrency trading. Execute trades in seconds with real-time market data.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="text-base font-bold px-8 btn-primary-glow"
                  data-testid="button-start-trading"
                >
                  Start Trading <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/market">
                <button
                  className="btn-white-outline min-h-10 rounded-md px-8 text-base font-bold inline-flex items-center gap-2"
                  data-testid="button-view-markets"
                >
                  View Markets
                </button>
              </Link>
            </motion.div>

            {/* ── Animated stats ── */}
            <motion.div
              variants={fadeUp}
              className="mt-16 grid grid-cols-3 gap-px mx-auto max-w-xl overflow-hidden rounded-2xl border border-border/60"
            >
              {STATS.map((s, i) => (
                <div key={i} className="bg-card/40 backdrop-blur-sm px-6 py-5 text-center group">
                  <p className="text-xl font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                    <CountUp target={s.target} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE TICKER ── */}
      <TickerBar coins={tickerCoins} />

      {/* ── white section divider ── */}
      <div className="white-divider" />

      {/* ── FEATURES ── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4" data-testid="text-features-heading">
              Why Choose Altcryptotrade
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Professional-grade tools built for traders of every level.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { icon: Zap,      title: "Fast Execution",  color: "text-yellow-400", bg: "bg-yellow-500/10", glow: "card-glow-green",
                description: "Execute trades in milliseconds with our low-latency infrastructure. Never miss a market opportunity." },
              { icon: Shield,   title: "Secure Platform", color: "text-blue-400",   bg: "bg-blue-500/10",   glow: "card-glow-blue",
                description: "Bank-grade encryption protects your assets and data. Multi-layer security keeps your funds safe." },
              { icon: BarChart3, title: "Real-Time Data",  color: "text-primary",    bg: "bg-primary/10",    glow: "card-glow-green",
                description: "Live market data streaming directly from major exchanges. Advanced charting tools at your fingertips." },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className={`glass-card rounded-2xl p-7 card-hover ${feature.glow} transition-all duration-300`}
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5 border border-border/50`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── white section divider ── */}
      <div className="white-divider" />

      {/* ── ADVANCED TRADING TOOLS ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4" data-testid="text-trading-tools-heading">
              Advanced Trading Tools
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Everything a professional trader needs, in one place.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { icon: CandlestickChart, title: "Advanced Charting",
                description: "Analyze markets using professional candlestick charts, technical indicators, and real-time price updates.",
                accent: "text-primary", bg: "bg-primary/10", glow: "card-glow-green" },
              { icon: SlidersHorizontal, title: "Professional Order Types",
                description: "Execute trades using advanced order types including market, limit, stop-loss, and take-profit orders.",
                accent: "text-violet-400", bg: "bg-violet-500/10", glow: "card-glow-violet" },
              { icon: Activity, title: "Real-Time Market Data",
                description: "Access live cryptocurrency prices, market trends, and instant trading signals.",
                accent: "text-cyan-400", bg: "bg-cyan-500/10", glow: "card-glow-cyan" },
            ].map((tool) => (
              <motion.div
                key={tool.title}
                variants={fadeUp}
                className={`glass-card rounded-2xl p-7 border transition-all duration-300 cursor-default ${tool.glow}`}
                data-testid={`card-tool-${tool.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="relative mb-6">
                  <div className={`w-12 h-12 rounded-xl ${tool.bg} border border-border/50 flex items-center justify-center`}>
                    <tool.icon className={`w-6 h-6 ${tool.accent}`} />
                  </div>
                  <span className="absolute bottom-0 left-0 w-12 h-[2px] rounded-full bg-gradient-to-r from-primary/60 to-transparent" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
                <div className={`mt-6 inline-flex items-center gap-1.5 text-xs font-semibold ${tool.accent}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Live on platform
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── white section divider ── */}
      <div className="white-divider" />

      {/* ── MARKET PREVIEW ── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
            >
              <h2 className="text-3xl font-display font-bold mb-1" data-testid="text-market-preview-heading">
                Market Overview
              </h2>
              <p className="text-muted-foreground text-sm">Top cryptocurrencies by market cap</p>
            </motion.div>
            <Link href="/market">
              <button
                className="btn-white-outline min-h-9 rounded-md px-4 text-sm font-medium inline-flex items-center gap-2"
                data-testid="link-view-all-markets"
              >
                View All Markets <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                    <div className="h-5 bg-white/[0.05] rounded w-20 mb-3" />
                    <div className="h-7 bg-white/[0.05] rounded w-32 mb-2" />
                    <div className="h-4 bg-white/[0.05] rounded w-16" />
                  </div>
                ))
              : previewCoins.map((coin) => {
                  const ticker = getCoinTicker(coin.symbol);
                  const coinNames: Record<string, string> = {
                    BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana",
                    XRP: "Ripple", ADA: "Cardano", DOGE: "Dogecoin", AVAX: "Avalanche",
                    MATIC: "Polygon", LINK: "Chainlink",
                  };
                  const isUp = coin.priceChangePercent >= 0;
                  return (
                    <motion.div
                      key={coin.symbol}
                      variants={fadeUp}
                      className="glass-card rounded-2xl p-5 card-hover card-glow-green transition-all duration-300"
                      data-testid={`card-market-${coin.symbol.toLowerCase()}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={coin.image || (['near','apt','shib'].includes(ticker.toLowerCase()) ? `/coin-icons/${ticker.toLowerCase()}.png` : `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${ticker.toLowerCase()}.png`)}
                            alt={ticker}
                            className="w-9 h-9 rounded-full ring-1 ring-border"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              const fallback = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${ticker.toLowerCase()}.png`;
                              if (img.src !== fallback) {
                                img.src = fallback;
                              } else {
                                img.style.display = 'none';
                              }
                            }}
                          />
                          <div>
                            <span className="font-bold text-sm text-foreground">{ticker}</span>
                            <p className="text-muted-foreground text-xs">{coinNames[ticker] || ticker}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${
                          isUp
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isUp ? "+" : ""}{coin.priceChangePercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-xl font-bold font-mono text-foreground">
                        ${formatPrice(coin.price)}
                      </div>
                    </motion.div>
                  );
                })}
          </motion.div>
        </div>
      </section>

      {/* ── white section divider ── */}
      <div className="white-divider" />

      {/* ── FOOTER ── */}
      <footer className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center logo-glow">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-bold font-display bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
                  Altcryptotrade
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Professional cryptocurrency trading platform with real-time market data and advanced trading tools.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-foreground/60 uppercase tracking-wider text-xs">Platform</h4>
              <div className="space-y-2">
                <Link href="/market"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Markets</span></Link>
                <Link href="/trading"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Trading</span></Link>
                <Link href="/register"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Register</span></Link>
                <Link href="/download"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Download App</span></Link>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-foreground/60 uppercase tracking-wider text-xs">About</h4>
              <div className="space-y-2">
                <Link href="/about"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">About Us</span></Link>
                <Link href="/user-agreement"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">User Agreement</span></Link>
                <Link href="/white-paper"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">White Paper</span></Link>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-foreground/60 uppercase tracking-wider text-xs">Help</h4>
              <div className="space-y-2">
                <Link href="/contact"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Contact Us</span></Link>
                <Link href="/privacy-policy"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></Link>
                <Link href="/legal-notices"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Legal Notices</span></Link>
                <Link href="/disclaimer"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Disclaimer</span></Link>
                <Link href="/aml-policy"><span className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">AML Agreement</span></Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 white-divider flex items-center justify-between flex-wrap gap-4">
            <p className="text-xs text-muted-foreground" data-testid="text-copyright">
              © 2026 Altcryptotrade. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">Trade responsibly.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
