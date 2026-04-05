import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAMES = [
  { label: "1s", value: "1s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
];

interface TradingChartProps {
  pair?: string;
  currentPrice?: string;
}

export function TradingChart({ pair = "BTCUSDT", currentPrice }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1m");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [ohlc, setOhlc] = useState({ open: 0, high: 0, low: 0, close: 0, volume: 0 });

  const fetchKlines = useCallback(async () => {
    try {
      const res = await fetch(`/api/klines/${pair}?interval=${selectedTimeframe}&limit=500`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data: KlineData[] = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to fetch klines:", err);
      return null;
    }
  }, [pair, selectedTimeframe]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    setHasLoadedOnce(false);
    setIsInitialLoading(true);

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        fontSize: 11,
      },
      width: container.clientWidth,
      height: 450,
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(100, 116, 139, 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: 'rgba(100, 116, 139, 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e293b',
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: selectedTimeframe === '1s',
        rightOffset: 5,
        barSpacing: selectedTimeframe === '1s' ? 4 : 8,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param: any) => {
      if (!param || !param.time) return;
      const candleData = param.seriesData?.get(candlestickSeries);
      const volData = param.seriesData?.get(volumeSeries);
      if (candleData) {
        setOhlc({
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || 0,
        });
      }
    });

    const handleResize = () => {
      if (container) {
        chart.applyOptions({ width: container.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [selectedTimeframe, pair]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let mounted = true;

    const loadData = async () => {
      const data = await fetchKlines();
      if (!data || data.length === 0 || !mounted) return;
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      const candleData = data.map(d => ({
        time: d.time as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      const volumeData = data.map(d => ({
        time: d.time as any,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }));

      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      const last = data[data.length - 1];
      const first = data[0];
      const change = last.close - first.open;
      const changePercent = (change / first.open) * 100;
      setPriceChange({ value: change, percent: changePercent });
      setOhlc({
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
      });

      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
        setIsInitialLoading(false);
      }
    };

    loadData();

    const refreshInterval = selectedTimeframe === '1s' ? 2000 : selectedTimeframe === '1m' ? 10000 : 30000;
    intervalId = setInterval(loadData, refreshInterval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchKlines, selectedTimeframe, hasLoadedOnce]);

  const displayPair = pair.replace("USDT", "/USDT");
  const isPositive = priceChange.value >= 0;

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + 'K';
    return vol.toFixed(2);
  };

  return (
    <Card className="bg-card border-border shadow-lg flex flex-col overflow-visible">
      <div className="px-4 pt-3 pb-2 border-b border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 data-testid="text-chart-pair" className="font-bold text-lg">
              {displayPair}
            </h3>
            {currentPrice && (
              <span className="text-lg font-mono font-bold text-foreground" data-testid="text-live-price">
                ${formatPrice(Number(currentPrice))}
              </span>
            )}
            <span
              className={`text-sm font-mono font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
              data-testid="text-price-change"
            >
              {isPositive ? '+' : ''}{formatPrice(priceChange.value)} ({isPositive ? '+' : ''}{priceChange.percent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {TIMEFRAMES.map(tf => (
              <Button
                key={tf.value}
                variant={selectedTimeframe === tf.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedTimeframe(tf.value)}
                className="px-2 text-xs"
                data-testid={`button-timeframe-${tf.value}`}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-wrap">
            <span>O <span className={ohlc.close >= ohlc.open ? 'text-emerald-500' : 'text-red-500'}>{formatPrice(ohlc.open)}</span></span>
            <span>H <span className={ohlc.close >= ohlc.open ? 'text-emerald-500' : 'text-red-500'}>{formatPrice(ohlc.high)}</span></span>
            <span>L <span className={ohlc.close >= ohlc.open ? 'text-emerald-500' : 'text-red-500'}>{formatPrice(ohlc.low)}</span></span>
            <span>C <span className={ohlc.close >= ohlc.open ? 'text-emerald-500' : 'text-red-500'}>{formatPrice(ohlc.close)}</span></span>
            <span>Vol <span className="text-blue-400">{formatVolume(ohlc.volume)}</span></span>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: '450px' }}>
        {isInitialLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={chartContainerRef} data-testid="chart-container" className="w-full" style={{ height: '450px' }} />
      </div>
    </Card>
  );
}
