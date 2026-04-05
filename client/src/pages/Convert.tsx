import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { ArrowUpDown, Loader2, History, RefreshCw } from "lucide-react";
import { getAuthToken, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

const ALL_ASSETS = [
  { symbol: "USDT", name: "Tether", balanceKey: "usdtBalance", decimals: 2 },
  { symbol: "USDC", name: "USD Coin", balanceKey: "usdcBalance", decimals: 2 },
  { symbol: "BTC", name: "Bitcoin", balanceKey: "btcBalance", decimals: 8 },
  { symbol: "ETH", name: "Ethereum", balanceKey: "ethBalance", decimals: 8 },
  { symbol: "BNB", name: "BNB", balanceKey: "bnbBalance", decimals: 8 },
];

export default function Convert() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fromAsset, setFromAsset] = useState("USDT");
  const [toAsset, setToAsset] = useState("BTC");
  const [amount, setAmount] = useState("");

  const { data: livePrices } = useQuery<any[]>({
    queryKey: ["/api/market/24hr"],
    refetchInterval: 15000,
  });

  const { data: conversionHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/conversions"],
  });

  const getPrice = (symbol: string): number => {
    const pair = livePrices?.find((p: any) => p.symbol === `${symbol}USDT`);
    return pair ? Number(pair.lastPrice) || 0 : 0;
  };

  const fromInfo = ALL_ASSETS.find(a => a.symbol === fromAsset)!;
  const toInfo = ALL_ASSETS.find(a => a.symbol === toAsset)!;
  const fromBalance = Number((user as any)?.[fromInfo.balanceKey] || 0);

  const STABLES = ["USDT", "USDC"];
  const isFromStable = STABLES.includes(fromAsset);
  const isToStable = STABLES.includes(toAsset);
  const isStableToStable = isFromStable && isToStable;

  const cryptoAsset = isFromStable ? toAsset : fromAsset;
  const price = isStableToStable ? 1 : getPrice(cryptoAsset);
  const numAmount = Number(amount) || 0;

  let estimatedReceive = 0;
  if (numAmount > 0) {
    if (isStableToStable) {
      estimatedReceive = numAmount;
    } else if (isFromStable && price > 0) {
      estimatedReceive = numAmount / price;
    } else if (price > 0) {
      estimatedReceive = numAmount * price;
    }
  }

  const canConvert = numAmount > 0 && numAmount <= fromBalance && (isStableToStable || price > 0);

  const getAvailableToAssets = () => {
    if (isFromStable) return ALL_ASSETS.filter(a => a.symbol !== fromAsset);
    return ALL_ASSETS.filter(a => STABLES.includes(a.symbol));
  };

  const handleSwap = () => {
    const prevFrom = fromAsset;
    const prevTo = toAsset;
    setFromAsset(prevTo);
    setToAsset(prevFrom);
    setAmount("");
  };

  const handleFromChange = (newFrom: string) => {
    setFromAsset(newFrom);
    const newFromIsStable = STABLES.includes(newFrom);
    if (newFromIsStable) {
      if (newFrom === toAsset) setToAsset(newFrom === "USDT" ? "BTC" : "USDT");
    } else {
      if (!STABLES.includes(toAsset)) setToAsset("USDT");
    }
    setAmount("");
  };

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ fromAsset, toAsset, amount: numAmount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Conversion failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const fromSym = data.from_asset || data.fromAsset;
      const toSym = data.to_asset || data.toAsset;
      const amt = Number(data.amount);
      const rec = Number(data.received);
      const toDecimals = toSym === "USDT" ? 2 : 8;
      const fromDecimals = fromSym === "USDT" ? 2 : 6;
      toast({ title: `Converted ${amt.toFixed(fromDecimals)} ${fromSym} to ${rec.toFixed(toDecimals)} ${toSym}` });
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversions"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const rateDisplay = () => {
    if (isStableToStable) return `1 ${fromAsset} = 1 ${toAsset}`;
    if (price <= 0) return "...";
    if (isFromStable) {
      return `1 ${cryptoAsset} = ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    return `1 ${fromAsset} = ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <h1 className="text-3xl font-display font-bold mb-8" data-testid="text-convert-title">Convert</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Convert Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md mx-auto space-y-6">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <select
                      value={fromAsset}
                      onChange={(e) => handleFromChange(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      data-testid="select-from-asset"
                    >
                      {ALL_ASSETS.map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol} ({a.name})</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Available: {fromBalance.toFixed(fromInfo.decimals)} {fromAsset}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount ({fromAsset})</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        data-testid="input-convert-amount"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-primary h-6 px-2"
                        onClick={() => setAmount(fromBalance.toFixed(fromInfo.decimals))}
                        data-testid="button-max-amount"
                      >
                        MAX
                      </Button>
                    </div>
                    {numAmount > fromBalance && (
                      <p className="text-xs text-red-500">Insufficient {fromAsset} balance</p>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleSwap}
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer"
                      data-testid="button-swap-direction"
                    >
                      <ArrowUpDown className="w-5 h-5 text-primary" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label>To</Label>
                    <select
                      value={toAsset}
                      onChange={(e) => { setToAsset(e.target.value); setAmount(""); }}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      data-testid="select-to-asset"
                    >
                      {getAvailableToAssets().map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol} ({a.name})</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-md border border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-mono">{rateDisplay()}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50">
                      <span>You receive</span>
                      <span className="text-primary font-mono" data-testid="text-estimated-receive">
                        {estimatedReceive > 0
                          ? estimatedReceive.toLocaleString("en-US", {
                              minimumFractionDigits: toInfo.decimals === 2 ? 2 : 6,
                              maximumFractionDigits: toInfo.decimals,
                            })
                          : toInfo.decimals === 2 ? "0.00" : "0.000000"} {toAsset}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!canConvert || convertMutation.isPending}
                    onClick={() => convertMutation.mutate()}
                    data-testid="button-convert"
                  >
                    {convertMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting...</>
                    ) : (
                      `Convert ${fromAsset} to ${toAsset}`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <History className="w-4 h-4" /> Conversion History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversionHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No conversions yet</p>
                ) : (
                  conversionHistory.slice(0, 10).map((conv: any) => {
                    const from = conv.from_asset || conv.fromAsset;
                    const to = conv.to_asset || conv.toAsset;
                    const amtDecimals = from === "USDT" ? 2 : 6;
                    const recDecimals = to === "USDT" ? 2 : 8;
                    return (
                      <div key={conv.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0" data-testid={`row-conversion-${conv.id}`}>
                        <div>
                          <div className="font-medium">{from} → {to}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(conv.created_at || conv.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-muted-foreground">
                            -{Number(conv.amount).toFixed(amtDecimals)} {from}
                          </div>
                          <div className="font-mono font-bold text-primary">
                            +{Number(conv.received).toFixed(recDecimals)} {to}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
