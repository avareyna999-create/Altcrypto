import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, RefreshCw, History } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatAmount(val: string | number, decimals = 2) {
  return Number(val).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    CLOSED: "bg-muted/40 text-muted-foreground",
    WIN: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    LOSS: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <Badge className={cn("text-xs capitalize border", map[status] ?? "border-border text-muted-foreground")}>
      {status}
    </Badge>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No {label} yet</p>
    </div>
  );
}

export default function Transactions() {
  const { data: deposits = [], isLoading: dLoading } = useQuery<any[]>({ queryKey: ["/api/deposits"] });
  const { data: withdrawals = [], isLoading: wLoading } = useQuery<any[]>({ queryKey: ["/api/withdrawals"] });
  const { data: trades = [], isLoading: tLoading } = useQuery<any[]>({ queryKey: ["/api/trades"] });
  const { data: conversions = [], isLoading: cLoading } = useQuery<any[]>({ queryKey: ["/api/conversions"] });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display text-foreground" data-testid="text-transactions-heading">Transactions</h1>
            <p className="text-muted-foreground text-sm mt-1">Your complete transaction history</p>
          </div>

          <Tabs defaultValue="deposits">
            <TabsList className="mb-6 bg-muted/30 border border-border">
              <TabsTrigger value="deposits" className="gap-2 data-testid='tab-deposits'" data-testid="tab-deposits">
                <ArrowDownLeft className="w-4 h-4" /> Deposits
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="gap-2" data-testid="tab-withdrawals">
                <ArrowUpRight className="w-4 h-4" /> Withdrawals
              </TabsTrigger>
              <TabsTrigger value="trades" className="gap-2" data-testid="tab-trades">
                <TrendingUp className="w-4 h-4" /> Trades
              </TabsTrigger>
              <TabsTrigger value="conversions" className="gap-2" data-testid="tab-conversions">
                <RefreshCw className="w-4 h-4" /> Conversions
              </TabsTrigger>
            </TabsList>

            {/* DEPOSITS */}
            <TabsContent value="deposits">
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deposit History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {dLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : deposits.length === 0 ? (
                    <EmptyState label="deposits" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Date</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Network</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Amount</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deposits.map((d: any) => (
                            <tr key={d.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10" data-testid={`row-deposit-${d.id}`}>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(d.createdAt)}</td>
                              <td className="px-4 py-3 font-medium">{d.network}</td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-400">+{formatAmount(d.amount)}</td>
                              <td className="px-4 py-3 text-right"><StatusBadge status={d.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* WITHDRAWALS */}
            <TabsContent value="withdrawals">
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Withdrawal History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {wLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : withdrawals.length === 0 ? (
                    <EmptyState label="withdrawals" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Date</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Network</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Address</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Amount</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawals.map((w: any) => (
                            <tr key={w.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10" data-testid={`row-withdrawal-${w.id}`}>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(w.createdAt)}</td>
                              <td className="px-4 py-3 font-medium">{w.network}</td>
                              <td className="px-4 py-3 text-muted-foreground font-mono text-xs max-w-[120px] truncate">{w.address}</td>
                              <td className="px-4 py-3 text-right font-mono text-red-400">-{formatAmount(w.amount)}</td>
                              <td className="px-4 py-3 text-right"><StatusBadge status={w.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TRADES */}
            <TabsContent value="trades">
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Trade History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {tLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : trades.length === 0 ? (
                    <EmptyState label="trades" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Date</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Pair</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Direction</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Amount</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">P&L</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((t: any) => {
                            const pnl = t.status === "CLOSED" && t.result
                              ? t.result === "WIN" ? Number(t.profit || 0) : -Number(t.amount || 0)
                              : null;
                            return (
                              <tr key={t.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10" data-testid={`row-trade-${t.id}`}>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(t.createdAt)}</td>
                                <td className="px-4 py-3 font-medium">{t.symbol ?? "—"}</td>
                                <td className="px-4 py-3">
                                  <Badge className={cn("text-xs border", t.direction === "BUY"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                  )}>
                                    {t.direction}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-mono">{formatAmount(t.amount)}</td>
                                <td className="px-4 py-3 text-right font-mono">
                                  {pnl !== null ? (
                                    <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                                      {pnl >= 0 ? "+" : ""}{formatAmount(pnl)}
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {t.status === "CLOSED" && t.result
                                    ? <StatusBadge status={t.result} />
                                    : <StatusBadge status={t.status} />}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* CONVERSIONS */}
            <TabsContent value="conversions">
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Conversion History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {cLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : conversions.length === 0 ? (
                    <EmptyState label="conversions" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Date</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">From</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">To</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Sent</th>
                            <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversions.map((c: any) => (
                            <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10" data-testid={`row-conversion-${c.id}`}>
                              <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                              <td className="px-4 py-3 font-medium uppercase">{c.fromAsset}</td>
                              <td className="px-4 py-3 font-medium uppercase">{c.toAsset}</td>
                              <td className="px-4 py-3 text-right font-mono text-red-400">-{formatAmount(c.amount, 8)}</td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-400">+{formatAmount(c.received, 8)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
