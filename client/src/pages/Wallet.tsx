import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDeposits, useWithdrawals } from "@/hooks/use-wallet";
import { useRef, useState, useEffect, useCallback } from "react";
import { Upload, ArrowUpRight, ArrowDownLeft, History, Loader2, CheckCircle, AlertTriangle, Copy, Wallet as WalletIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { SiBitcoin, SiEthereum, SiBinance, SiTether, SiCircle } from "react-icons/si";

const ASSETS = [
  { key: "usdtBalance", symbol: "USDT", name: "Tether", networks: ["TRC20", "ERC20", "BEP20"], decimals: 2 },
  { key: "usdcBalance", symbol: "USDC", name: "USD Coin", networks: ["USDC"], decimals: 2 },
  { key: "btcBalance", symbol: "BTC", name: "Bitcoin", networks: ["BTC"], decimals: 8 },
  { key: "ethBalance", symbol: "ETH", name: "Ethereum", networks: ["ETH"], decimals: 8 },
  { key: "bnbBalance", symbol: "BNB", name: "BNB", networks: ["BNB", "BEP20"], decimals: 8 },
] as const;

export default function Wallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createDeposit, deposits } = useDeposits();
  const { createWithdrawal, withdrawals } = useWithdrawals();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [depositFileName, setDepositFileName] = useState<string>("");
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const depositFormRef = useRef<HTMLFormElement>(null);
  const withdrawFormRef = useRef<HTMLFormElement>(null);

  const [depositNetwork, setDepositNetwork] = useState("TRC20");
  const [withdrawNetwork, setWithdrawNetwork] = useState("TRC20");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletQrCode, setWalletQrCode] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletUnavailable, setWalletUnavailable] = useState(false);

  const { data: livePrices } = useQuery<any[]>({
    queryKey: ["/api/market/24hr"],
    refetchInterval: 30000,
  });

  const getPrice = (symbol: string): number => {
    if (symbol === "USDT" || symbol === "USDC") return 1;
    const pair = livePrices?.find((p: any) => p.symbol === `${symbol}USDT`);
    return pair ? (parseFloat(pair.lastPrice) || 0) : 0;
  };

  const getBalance = (key: string): number => {
    if (!user) return 0;
    return Number((user as any)[key]) || 0;
  };

  const portfolioValue = ASSETS.reduce((total, asset) => {
    return total + getBalance(asset.key) * getPrice(asset.symbol);
  }, 0);

  const getWithdrawAssetBalance = (): string => {
    const asset = ASSETS.find(a => a.networks.includes(withdrawNetwork as any));
    if (!asset) return "0.00";
    const bal = getBalance(asset.key);
    return bal.toFixed(asset.decimals);
  };

  const getWithdrawAssetSymbol = (): string => {
    const asset = ASSETS.find(a => a.networks.includes(withdrawNetwork as any));
    return asset?.symbol || "USDT";
  };

  const fetchWalletAddress = useCallback(async (network: string) => {
    setWalletLoading(true);
    setWalletUnavailable(false);
    setWalletAddress(null);
    setWalletQrCode(null);
    try {
      const res = await fetch(`/api/deposit/wallet/${network}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletAddress(data.address);
        setWalletQrCode(data.qrCodeImage || null);
      } else {
        setWalletUnavailable(true);
      }
    } catch {
      setWalletUnavailable(true);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletAddress(depositNetwork);
  }, [depositNetwork, fetchWalletAddress]);

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositSuccess(false);
    const formData = new FormData(e.target as HTMLFormElement);
    createDeposit.mutate(formData, {
      onSuccess: () => {
        setDepositSuccess(true);
        setDepositFileName("");
        depositFormRef.current?.reset();
        setTimeout(() => setDepositSuccess(false), 4000);
      },
    });
  };

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawSuccess(false);
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      amount: Number(formData.get("amount")),
      walletAddress: formData.get("walletAddress") as string,
      network: formData.get("network") as string,
      withdrawalPin: formData.get("withdrawalPin") as string,
    };
    createWithdrawal.mutate(data, {
      onSuccess: () => {
        setWithdrawSuccess(true);
        withdrawFormRef.current?.reset();
        setTimeout(() => setWithdrawSuccess(false), 4000);
      },
    });
  };

  const hasWithdrawalPin = !!(user as any)?.hasWithdrawalPin;

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({ title: "Address copied to clipboard" });
    }
  };

  const getDepositAssetLabel = (): string => {
    const asset = ASSETS.find(a => a.networks.includes(depositNetwork as any));
    return asset?.symbol || "USDT";
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <h1 className="text-3xl font-display font-bold mb-8" data-testid="text-wallet-title">Wallet</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-gradient-to-br from-card to-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-primary mb-4" data-testid="text-portfolio-value">
                  ${portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="space-y-3">
                  {ASSETS.map((asset) => {
                    const bal = getBalance(asset.key);
                    const price = getPrice(asset.symbol);
                    const value = bal * price;
                    return (
                      <div key={asset.symbol} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0" data-testid={`row-asset-${asset.symbol}`}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            asset.symbol === "USDT" ? "bg-emerald-500/20 text-emerald-400" :
                            asset.symbol === "USDC" ? "bg-blue-400/20 text-blue-300" :
                            asset.symbol === "BTC" ? "bg-orange-500/20 text-orange-400" :
                            asset.symbol === "ETH" ? "bg-blue-500/20 text-blue-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          )}>
                            {asset.symbol === "BTC" && <SiBitcoin className="w-4 h-4" />}
                            {asset.symbol === "ETH" && <SiEthereum className="w-4 h-4" />}
                            {asset.symbol === "BNB" && <SiBinance className="w-4 h-4" />}
                            {asset.symbol === "USDT" && <SiTether className="w-4 h-4" />}
                            {asset.symbol === "USDC" && <SiCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{asset.symbol}</div>
                            <div className="text-xs text-muted-foreground">{asset.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-medium" data-testid={`text-balance-${asset.symbol}`}>
                            {bal.toFixed(asset.decimals)}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 flex-wrap">
                  <History className="w-4 h-4" /> Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...deposits, ...withdrawals]
                  .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
                  .slice(0, 5)
                  .map((tx, i) => {
                    const isDeposit = 'proofImage' in tx;
                    const network = isDeposit ? (tx as any).transferMethod : (tx as any).network;
                    const assetInfo = ASSETS.find(a => a.networks.includes(network));
                    const assetSymbol = assetInfo?.symbol || "USDT";
                    return (
                      <div key={i} className="flex justify-between items-center gap-2 text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0">
                        <div>
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            {isDeposit ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-500" />
                            )}
                            {isDeposit ? "Deposit" : "Withdrawal"}
                            <span className="text-xs text-muted-foreground">({assetSymbol})</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt!).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold">{Number(tx.amount).toFixed(assetInfo?.decimals === 8 ? 6 : 2)} {assetSymbol}</div>
                          <div className={cn(
                            "text-xs capitalize",
                            tx.status === "PENDING" ? "text-yellow-500" :
                            tx.status === "APPROVED" ? "text-emerald-500" : "text-red-500"
                          )}>
                            {tx.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {deposits.length === 0 && withdrawals.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">No history yet</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-6">
                <Tabs defaultValue="deposit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="deposit" data-testid="tab-deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="withdraw" data-testid="tab-withdraw">Withdraw</TabsTrigger>
                  </TabsList>

                  <TabsContent value="deposit">
                    {depositSuccess && (
                      <div className="flex items-center gap-2 p-3 mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-500 text-sm" data-testid="alert-deposit-success">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        Deposit submitted successfully! Waiting for admin approval.
                      </div>
                    )}
                    <form ref={depositFormRef} onSubmit={handleDeposit} className="space-y-6 max-w-md mx-auto">
                      <div className="space-y-2">
                        <Label>Select Network</Label>
                        <select
                          name="transferMethod"
                          value={depositNetwork}
                          onChange={(e) => setDepositNetwork(e.target.value)}
                          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          data-testid="select-deposit-network"
                        >
                          <option value="TRC20">USDT (TRC20)</option>
                          <option value="ERC20">USDT (ERC20)</option>
                          <option value="BEP20">USDT (BEP20)</option>
                          <option value="USDC">USDC (USD Coin)</option>
                          <option value="BTC">BTC (Bitcoin)</option>
                          <option value="ETH">ETH (Ethereum)</option>
                          <option value="BNB">BNB (BNB Chain)</option>
                        </select>
                      </div>

                      <div className="p-4 bg-muted/30 rounded-md border border-border text-center space-y-3">
                        <p className="text-sm text-muted-foreground">Send {getDepositAssetLabel()} to this address:</p>
                        {walletLoading ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        ) : walletUnavailable ? (
                          <div className="flex items-center justify-center gap-2 py-2 text-yellow-500" data-testid="text-wallet-unavailable">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">Deposit currently unavailable for this network</span>
                          </div>
                        ) : walletAddress ? (
                          <>
                            {walletQrCode && (
                              <div className="flex justify-center py-2" data-testid="img-wallet-qr">
                                <img
                                  src={walletQrCode}
                                  alt="Wallet QR Code"
                                  className="w-40 h-40 rounded-md border border-border bg-white p-1"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm break-all bg-background p-2 rounded-md border border-border flex-1" data-testid="text-deposit-address">
                                {walletAddress}
                              </p>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={copyAddress}
                                data-testid="button-copy-address"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label>Amount Sent</Label>
                        <Input name="amount" type="number" step="any" min="0.00000001" required placeholder="0.00" data-testid="input-deposit-amount" />
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Payment Proof</Label>
                        <div
                          className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 rounded-md p-8 text-center cursor-pointer transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                          data-testid="button-upload-proof"
                        >
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {depositFileName || "Click to upload screenshot"}
                          </p>
                          <input
                            ref={fileInputRef}
                            name="proofImage"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            required
                            onChange={(e) => setDepositFileName(e.target.files?.[0]?.name || "")}
                            data-testid="input-deposit-proof"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={createDeposit.isPending || walletUnavailable || !walletAddress}
                        data-testid="button-submit-deposit"
                      >
                        {createDeposit.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                        ) : (
                          "Submit Deposit"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="withdraw">
                    {withdrawSuccess && (
                      <div className="flex items-center gap-2 p-3 mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-500 text-sm" data-testid="alert-withdraw-success">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        Withdrawal request submitted! It will be processed shortly.
                      </div>
                    )}
                    <form ref={withdrawFormRef} onSubmit={handleWithdrawal} className="space-y-6 max-w-md mx-auto">
                      <div className="space-y-2">
                        <Label>Withdrawal Network</Label>
                        <select
                          name="network"
                          value={withdrawNetwork}
                          onChange={(e) => setWithdrawNetwork(e.target.value)}
                          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          data-testid="select-withdraw-network"
                        >
                          <option value="TRC20">USDT (TRC20)</option>
                          <option value="ERC20">USDT (ERC20)</option>
                          <option value="BEP20">USDT (BEP20)</option>
                          <option value="USDC">USDC (USD Coin)</option>
                          <option value="BTC">BTC (Bitcoin)</option>
                          <option value="ETH">ETH (Ethereum)</option>
                          <option value="BNB">BNB (BNB Chain)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Wallet Address</Label>
                        <Input name="walletAddress" placeholder="Enter your wallet address" required data-testid="input-wallet-address" />
                      </div>

                      <div className="space-y-2">
                        <Label>Amount ({getWithdrawAssetSymbol()})</Label>
                        <Input name="amount" type="number" step="any" min="0.00000001" required placeholder="0.00" data-testid="input-withdraw-amount" />
                        <p className="text-xs text-muted-foreground">Available: {getWithdrawAssetBalance()} {getWithdrawAssetSymbol()}</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Withdrawal PIN</Label>
                        {hasWithdrawalPin ? (
                          <Input
                            name="withdrawalPin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit PIN"
                            required
                            data-testid="input-withdraw-pin"
                          />
                        ) : (
                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-500 text-sm flex items-center gap-2" data-testid="alert-no-pin">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>Please set your withdrawal PIN in <a href="/change-password" className="underline font-medium">Security Settings</a> first.</span>
                          </div>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={createWithdrawal.isPending || !hasWithdrawalPin} data-testid="button-submit-withdraw">
                        {createWithdrawal.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          "Request Withdrawal"
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
