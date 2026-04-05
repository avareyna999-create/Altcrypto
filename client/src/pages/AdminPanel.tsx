import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "@shared/routes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Loader2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Eye,
  X,
  Image as ImageIcon,
  Wallet,
  Plus,
  Minus,
  Trash2,
  Power,
  Pencil,
  Save,
  Lock,
  Snowflake,
  Ban,
  Check,
  MoreVertical,
  DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, Trade, Deposit, Withdrawal, DepositWallet, SupportTicket, Loan, SecurityLog } from "@shared/schema";
import { AdminSupportChat } from "@/components/AdminSupportChat";

function getAdminPrice(symbol: string, livePrices: any[]): number {
  if (symbol === "USDT" || symbol === "USDC") return 1;
  const pair = livePrices?.find((p: any) => p.symbol === `${symbol}USDT`);
  return pair ? Number(pair.lastPrice) : 0;
}

function getUserTotalBalance(user: User, livePrices: any[]): number {
  return (
    Number(user.usdtBalance) * 1 +
    Number(user.usdcBalance) * getAdminPrice("USDC", livePrices) +
    Number(user.btcBalance)  * getAdminPrice("BTC",  livePrices) +
    Number(user.ethBalance)  * getAdminPrice("ETH",  livePrices) +
    Number(user.bnbBalance)  * getAdminPrice("BNB",  livePrices)
  );
}

function formatDepositAmount(amount: string | number, transferMethod: string): string {
  const num = Number(amount);
  const method = (transferMethod || "").toUpperCase();
  if (method === "BTC") return `${parseFloat(num.toFixed(8))} BTC`;
  if (method === "ETH") return `${parseFloat(num.toFixed(8))} ETH`;
  if (method === "BNB") return `${parseFloat(num.toFixed(8))} BNB`;
  if (method === "SOL") return `${parseFloat(num.toFixed(8))} SOL`;
  if (method === "USDC") return `${num.toFixed(2)} USDC`;
  return `${num.toFixed(2)} USDT`;
}

function formatLastOnline(lastOnlineAt: string | Date | null | undefined): string {
  if (!lastOnlineAt) return "Never";
  const diff = Date.now() - new Date(lastOnlineAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      onClick={onClose}
      data-testid="modal-image-preview"
    >
      <div className="relative max-w-3xl max-h-[80vh] m-4" onClick={(e) => e.stopPropagation()}>
        <Button
          size="icon"
          variant="ghost"
          className="absolute -top-10 right-0 text-white"
          onClick={onClose}
          data-testid="button-close-modal"
        >
          <X className="w-5 h-5" />
        </Button>
        <img src={src} alt="Preview" className="max-w-full max-h-[80vh] rounded-md object-contain" />
      </div>
    </div>
  );
}

const ASSETS = [
  { key: "usdt", label: "USDT", decimals: 2, color: "text-emerald-400" },
  { key: "usdc", label: "USDC", decimals: 2, color: "text-blue-400" },
  { key: "btc",  label: "BTC",  decimals: 8, color: "text-orange-400" },
  { key: "eth",  label: "ETH",  decimals: 8, color: "text-violet-400" },
  { key: "bnb",  label: "BNB",  decimals: 8, color: "text-yellow-400" },
] as const;

type AssetKey = typeof ASSETS[number]["key"];

function ManageBalanceModal({
  user,
  onClose,
  onAdjust,
  isPending,
}: {
  user: User;
  onClose: () => void;
  onAdjust: (args: { userId: number; asset: AssetKey; amount: number }) => void;
  isPending: boolean;
}) {
  const [amounts, setAmounts] = useState<Record<AssetKey, string>>({
    usdt: "", usdc: "", btc: "", eth: "", bnb: "",
  });

  const getBalance = (key: AssetKey) => {
    const map: Record<AssetKey, string> = {
      usdt: user.usdtBalance as string,
      usdc: user.usdcBalance as string,
      btc:  user.btcBalance  as string,
      eth:  user.ethBalance  as string,
      bnb:  user.bnbBalance  as string,
    };
    return parseFloat(map[key]) || 0;
  };

  const handleAdjust = (asset: AssetKey, sign: 1 | -1) => {
    const raw = parseFloat(amounts[asset]);
    if (!raw || raw <= 0) return;
    onAdjust({ userId: user.id, asset, amount: raw * sign });
    setAmounts(a => ({ ...a, [asset]: "" }));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      onClick={onClose}
      data-testid="modal-balance-manager"
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Manage Balances
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {user.username} <span className="text-xs opacity-60">#{user.id}</span>
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-balance-modal">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {ASSETS.map(({ key, label, decimals, color }) => {
            const bal = getBalance(key);
            const amt = parseFloat(amounts[key]);
            const canSub = amt > 0 && amt <= bal;
            return (
              <div key={key} className="bg-background/60 border border-border/60 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${color}`}>{label}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    Balance: <span className="text-foreground font-medium">{bal.toFixed(decimals)}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step={key === "usdt" || key === "usdc" ? "0.01" : "0.00000001"}
                    placeholder="Amount"
                    value={amounts[key]}
                    onChange={e => setAmounts(a => ({ ...a, [key]: e.target.value }))}
                    className="h-8 text-sm font-mono"
                    data-testid={`input-balance-amount-${key}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/60"
                    disabled={isPending || !amounts[key] || parseFloat(amounts[key]) <= 0}
                    onClick={() => handleAdjust(key, 1)}
                    data-testid={`button-add-${key}`}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/60"
                    disabled={isPending || !canSub}
                    onClick={() => handleAdjust(key, -1)}
                    data-testid={`button-subtract-${key}`}
                  >
                    <Minus className="w-3.5 h-3.5 mr-1" />Sub
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Each adjustment is applied immediately. Subtract is disabled if amount exceeds balance.
        </p>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [balanceModalUser, setBalanceModalUser] = useState<User | null>(null);
  const [newWalletNetwork, setNewWalletNetwork] = useState("TRC20");
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletQrFile, setNewWalletQrFile] = useState<File | null>(null);
  const [editingWalletId, setEditingWalletId] = useState<number | null>(null);
  const [editingAddress, setEditingAddress] = useState("");
  const [walletPinInput, setWalletPinInput] = useState("");
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [walletPinError, setWalletPinError] = useState("");
  const [walletPinLoading, setWalletPinLoading] = useState(false);
  const [editingWithdrawalWallet, setEditingWithdrawalWallet] = useState<{ id: number; currentAddress: string } | null>(null);
  const [newWithdrawalAddress, setNewWithdrawalAddress] = useState("");
  const [showChangePinForm, setShowChangePinForm] = useState(false);
  const [changePinPassword, setChangePinPassword] = useState("");
  const [changePinNew, setChangePinNew] = useState("");
  const [changePinConfirm, setChangePinConfirm] = useState("");
  const [changePinError, setChangePinError] = useState("");
  const [changePinLoading, setChangePinLoading] = useState(false);
  const [needsSetPin, setNeedsSetPin] = useState(false);
  const [securityUserFilter, setSecurityUserFilter] = useState("");

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: allDeposits = [], isLoading: loadingDeposits } = useQuery<Deposit[]>({
    queryKey: ["/api/admin/deposits"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deposits", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch deposits");
      return res.json();
    },
  });

  const { data: allWithdrawals = [], isLoading: loadingWithdrawals } = useQuery<Withdrawal[]>({
    queryKey: ["/api/admin/withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/withdrawals", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      return res.json();
    },
  });

  const { data: allTrades = [], isLoading: loadingTrades } = useQuery<Trade[]>({
    queryKey: ["/api/admin/trades"],
    queryFn: async () => {
      const res = await fetch("/api/admin/trades", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch trades");
      return res.json();
    },
  });

  const { data: supportTickets = [], isLoading: loadingTickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/support-tickets", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch support tickets");
      return res.json();
    },
  });

  const { data: adminLoans = [], isLoading: loadingLoans } = useQuery<Loan[]>({
    queryKey: ["/api/admin/loans"],
    queryFn: async () => {
      const res = await fetch("/api/admin/loans", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch loans");
      return res.json();
    },
  });

  const { data: securityLogs = [], isLoading: loadingSecurityLogs } = useQuery<SecurityLog[]>({
    queryKey: ["/api/admin/security-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/security-logs", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch security logs");
      return res.json();
    },
  });

  const approveLoanMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      await apiRequest("POST", `/api/admin/loans/${id}/approve`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/loans"] });
      toast({ title: "Loan approved and funds credited" });
    },
    onError: () => { toast({ title: "Failed to approve loan", variant: "destructive" }); },
  });

  const rejectLoanMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      await apiRequest("POST", `/api/admin/loans/${id}/reject`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/loans"] });
      toast({ title: "Loan rejected" });
    },
    onError: () => { toast({ title: "Failed to reject loan", variant: "destructive" }); },
  });

  const pendingLoans = adminLoans.filter(l => l.status === "PENDING");

  const { data: myReferrals } = useQuery<{ referralCode: string | null; totalUsers: number; users: User[] }>({
    queryKey: ["/api/admin/my-referrals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/my-referrals", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
  });

  const { data: referralStats = [] } = useQuery<{ adminId: number; username: string; email: string; role: string; referralCode: string; totalUsers: number }[]>({
    queryKey: ["/api/admin/referral-stats"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-stats", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch referral stats");
      return res.json();
    },
  });

  const [replyingTicketId, setReplyingTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const replyTicketMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      await apiRequest("POST", `/api/admin/support-tickets/${id}/reply`, { reply });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      setReplyingTicketId(null);
      setReplyText("");
      toast({ title: "Reply sent to customer" });
    },
    onError: () => toast({ title: "Failed to send reply", variant: "destructive" }),
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/admin/support-tickets/${id}/status`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-tickets"] });
      toast({ title: "Ticket closed" });
    },
    onError: () => toast({ title: "Failed to close ticket", variant: "destructive" }),
  });

  const openTickets = supportTickets.filter(t => t.status === "open");

  const kycReviewMutation = useMutation({
    mutationFn: async ({ userId, status, reason }: { userId: number; status: string; reason?: string }) => {
      const url = buildUrl("/api/admin/kyc/:userId/review", { userId });
      await apiRequest("POST", url, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "KYC review submitted" });
    },
    onError: () => toast({ title: "Failed to review KYC", variant: "destructive" }),
  });

  const depositReviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl("/api/admin/deposits/:id/review", { id });
      await apiRequest("POST", url, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Deposit review submitted" });
    },
    onError: () => toast({ title: "Failed to review deposit", variant: "destructive" }),
  });

  const withdrawalReviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl("/api/admin/withdrawals/:id/review", { id });
      await apiRequest("POST", url, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Withdrawal review submitted" });
    },
    onError: () => toast({ title: "Failed to review withdrawal", variant: "destructive" }),
  });

  const updateWithdrawalWalletMutation = useMutation({
    mutationFn: async ({ id, walletAddress }: { id: number; walletAddress: string }) => {
      await apiRequest("PATCH", `/api/admin/withdrawals/${id}/wallet`, { walletAddress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      setEditingWithdrawalWallet(null);
      setNewWithdrawalAddress("");
      toast({ title: "Wallet address updated successfully" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to update wallet address", variant: "destructive" }),
  });

  const tradeControlMutation = useMutation({
    mutationFn: async ({ id, controlMode }: { id: number; controlMode: string }) => {
      const url = buildUrl("/api/admin/trades/:id/control", { id });
      await apiRequest("POST", url, { controlMode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trades"] });
      toast({ title: "Trade control updated" });
    },
    onError: () => toast({ title: "Failed to update trade", variant: "destructive" }),
  });

  const userTradeControlMutation = useMutation({
    mutationFn: async ({ userId, tradeOutcomeControl }: { userId: number; tradeOutcomeControl: string }) => {
      const url = buildUrl("/api/admin/user/:id/trade-control", { id: userId });
      await apiRequest("POST", url, { tradeOutcomeControl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User trade control updated" });
    },
    onError: () => toast({ title: "Failed to update user trade control", variant: "destructive" }),
  });

  const accountStatusMutation = useMutation({
    mutationFn: async ({ userId, accountStatus }: { userId: number; accountStatus: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/status`, { accountStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Account status updated" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to update account status", variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to delete user", variant: "destructive" }),
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to update role", variant: "destructive" }),
  });

  const assignAdminMutation = useMutation({
    mutationFn: async ({ userId, adminId }: { userId: number; adminId: number | null }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/assign-admin`, { adminId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Admin assignment updated" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to assign admin", variant: "destructive" }),
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ userId, asset, amount }: { userId: number; asset: AssetKey; amount: number }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/balance`, { asset, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Balance updated successfully" });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to update balance", variant: "destructive" }),
  });

  const { data: livePrices = [] } = useQuery<any[]>({
    queryKey: ["/api/market/24hr"],
    refetchInterval: 60000,
  });

  const { data: depositWalletsList = [], isLoading: loadingWallets } = useQuery<DepositWallet[]>({
    queryKey: ["/api/admin/deposit-wallets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deposit-wallets", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch wallets");
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  const createWalletMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/deposit-wallet", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-wallets"] });
      setNewWalletAddress("");
      setNewWalletQrFile(null);
      toast({ title: "Wallet address added" });
    },
    onError: () => toast({ title: "Failed to add wallet", variant: "destructive" }),
  });

  const activateWalletMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", buildUrl("/api/admin/deposit-wallet/:id/activate", { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-wallets"] });
      toast({ title: "Wallet activated" });
    },
    onError: () => toast({ title: "Failed to activate wallet", variant: "destructive" }),
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl("/api/admin/deposit-wallet/:id", { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-wallets"] });
      toast({ title: "Wallet deleted" });
    },
    onError: () => toast({ title: "Failed to delete wallet", variant: "destructive" }),
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, address }: { id: number; address: string }) => {
      await apiRequest("PUT", buildUrl("/api/admin/deposit-wallet/:id", { id }), { address });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposit-wallets"] });
      setEditingWalletId(null);
      setEditingAddress("");
      toast({ title: "Wallet address updated" });
    },
    onError: () => toast({ title: "Failed to update wallet", variant: "destructive" }),
  });

  if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 flex items-center justify-center">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </main>
      </div>
    );
  }

  const pendingDeposits = allDeposits.filter(d => d.status === "PENDING");
  const pendingWithdrawals = allWithdrawals.filter(w => w.status === "PENDING");
  const pendingKyc = allUsers.filter(u => u.verificationStatus === "PENDING");
  const activeTrades = allTrades.filter(t => t.status === "OPEN");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8 overflow-y-auto">
        {previewImage && <ImagePreviewModal src={previewImage} onClose={() => setPreviewImage(null)} />}
        {balanceModalUser && (
          <ManageBalanceModal
            user={balanceModalUser}
            onClose={() => setBalanceModalUser(null)}
            onAdjust={adjustBalanceMutation.mutate}
            isPending={adjustBalanceMutation.isPending}
          />
        )}

        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Manage users, transactions, and trades.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">{allUsers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending KYC</CardTitle>
              <ShieldCheck className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-kyc">{pendingKyc.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Deposits</CardTitle>
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-deposits">{pendingDeposits.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-trades">{activeTrades.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <div className="w-full overflow-x-auto mb-6 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="w-max flex-nowrap h-auto flex-wrap-none gap-0">
              <TabsTrigger value="users" className="whitespace-nowrap shrink-0" data-testid="tab-users">
                Users ({allUsers.length})
              </TabsTrigger>
              <TabsTrigger value="kyc" className="whitespace-nowrap shrink-0" data-testid="tab-kyc">
                KYC ({pendingKyc.length} pending)
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="deposits" className="whitespace-nowrap shrink-0" data-testid="tab-deposits">
                  Deposits ({pendingDeposits.length} pending)
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="withdrawals" className="whitespace-nowrap shrink-0" data-testid="tab-withdrawals">
                  Withdrawals ({pendingWithdrawals.length} pending)
                </TabsTrigger>
              )}
              <TabsTrigger value="trades" className="whitespace-nowrap shrink-0" data-testid="tab-trades">
                Trades ({activeTrades.length} active)
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="wallets" className="whitespace-nowrap shrink-0" data-testid="tab-wallets">
                  <Wallet className="w-3.5 h-3.5 mr-1" /> Deposit Wallets
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="support" className="whitespace-nowrap shrink-0" data-testid="tab-support">
                  Support ({openTickets.length} open)
                </TabsTrigger>
              )}
              {isSuperAdmin && (
                <TabsTrigger value="loans" className="whitespace-nowrap shrink-0" data-testid="tab-loans">
                  Loans ({pendingLoans.length} pending)
                </TabsTrigger>
              )}
              <TabsTrigger value="referrals" className="whitespace-nowrap shrink-0" data-testid="tab-referrals">
                Referrals ({myReferrals?.totalUsers || 0})
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="security" className="whitespace-nowrap shrink-0" data-testid="tab-security">
                  Security ({securityLogs.filter(l => l.isSuspicious).length > 0 ? `⚠ ${securityLogs.filter(l => l.isSuspicious).length} suspicious` : securityLogs.length})
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* USERS TAB */}
          <TabsContent value="users">
            {loadingUsers ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Username</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Phone</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Balance</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">KYC</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Trade Control</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Role</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Referred By</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Last Online</th>
                      {isSuperAdmin && (
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Assigned Admin</th>
                      )}
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 last:border-0" data-testid={`row-user-${u.id}`}>
                        <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                        <td className="px-4 py-3 font-medium">{u.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs" data-testid={`text-phone-${u.id}`}>
                          {u.phoneNumber || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <div className="relative group cursor-default inline-block">
                            <span className="font-medium text-foreground">
                              ${getUserTotalBalance(u, livePrices).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-popover border border-border rounded-lg p-3 shadow-xl text-xs min-w-[190px]">
                              <div className="font-medium text-foreground mb-2 border-b border-border pb-1.5">Portfolio Breakdown</div>
                              <div className="space-y-1.5">
                                <div className="flex justify-between gap-4"><span className="text-muted-foreground">USDT</span><span className="font-mono">{Number(u.usdtBalance).toFixed(2)}</span></div>
                                {Number(u.usdcBalance) > 0 && <div className="flex justify-between gap-4"><span className="text-muted-foreground">USDC</span><span className="font-mono">{Number(u.usdcBalance).toFixed(2)}</span></div>}
                                {Number(u.btcBalance) > 0 && <div className="flex justify-between gap-4"><span className="text-muted-foreground">BTC</span><span className="font-mono">{Number(u.btcBalance).toFixed(8)}</span></div>}
                                {Number(u.ethBalance) > 0 && <div className="flex justify-between gap-4"><span className="text-muted-foreground">ETH</span><span className="font-mono">{Number(u.ethBalance).toFixed(6)}</span></div>}
                                {Number(u.bnbBalance) > 0 && <div className="flex justify-between gap-4"><span className="text-muted-foreground">BNB</span><span className="font-mono">{Number(u.bnbBalance).toFixed(6)}</span></div>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            u.verificationStatus === "VERIFIED" ? "bg-emerald-500/10 text-emerald-500" :
                            u.verificationStatus === "PENDING" ? "bg-yellow-500/10 text-yellow-500" :
                            u.verificationStatus === "REJECTED" ? "bg-red-500/10 text-red-500" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {u.verificationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.tradeOutcomeControl || "auto"}
                            onChange={(e) => userTradeControlMutation.mutate({ userId: u.id, tradeOutcomeControl: e.target.value })}
                            disabled={userTradeControlMutation.isPending || u.role === "ADMIN" || u.role === "SUPER_ADMIN"}
                            className="bg-background border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                            data-testid={`select-trade-control-${u.id}`}
                          >
                            <option value="auto">Auto</option>
                            <option value="force_win">Force Win</option>
                            <option value="force_lose">Force Lose</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            u.accountStatus === "active" ? "bg-emerald-500/10 text-emerald-500" :
                            u.accountStatus === "frozen" ? "bg-blue-500/10 text-blue-400" :
                            u.accountStatus === "blocked" ? "bg-red-500/10 text-red-500" :
                            "bg-emerald-500/10 text-emerald-500"
                          )} data-testid={`text-status-${u.id}`}>
                            {(u.accountStatus || "active").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium",
                            u.role === "SUPER_ADMIN" ? "text-yellow-500" :
                            u.role === "ADMIN" ? "text-primary" : "text-muted-foreground"
                          )}>
                            {u.role === "SUPER_ADMIN" ? "SUPER ADMIN" : u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground" data-testid={`text-referred-by-${u.id}`}>
                            {(u as any).referredBy || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3" data-testid={`text-last-online-${u.id}`}>
                          <span className={cn(
                            "text-xs font-medium",
                            (u as any).lastOnlineAt && Date.now() - new Date((u as any).lastOnlineAt).getTime() < 10 * 60 * 1000
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          )}>
                            {formatLastOnline((u as any).lastOnlineAt)}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3">
                            {u.role !== "SUPER_ADMIN" ? (
                              <select
                                value={(u as any).assignedAdmin ?? ""}
                                onChange={(e) =>
                                  assignAdminMutation.mutate({
                                    userId: u.id,
                                    adminId: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                disabled={assignAdminMutation.isPending}
                                className="bg-background border border-input rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[110px]"
                                data-testid={`select-assigned-admin-${u.id}`}
                              >
                                <option value="">Unassigned</option>
                                {allUsers
                                  .filter((a) => a.role === "ADMIN")
                                  .map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.username}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {u.role !== "SUPER_ADMIN" && isSuperAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-user-actions-${u.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setBalanceModalUser(u)}
                                  data-testid={`button-manage-balance-${u.id}`}
                                >
                                  <DollarSign className="w-4 h-4 mr-2 text-primary" />
                                  Manage Balance
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {u.role === "USER" && (
                                  <DropdownMenuItem
                                    onClick={() => setRoleMutation.mutate({ userId: u.id, role: "ADMIN" })}
                                    data-testid={`button-make-admin-${u.id}`}
                                  >
                                    <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                                    Make Admin
                                  </DropdownMenuItem>
                                )}
                                {u.role === "ADMIN" && (
                                  <DropdownMenuItem
                                    onClick={() => setRoleMutation.mutate({ userId: u.id, role: "USER" })}
                                    data-testid={`button-remove-admin-${u.id}`}
                                  >
                                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Remove Admin
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {u.accountStatus !== "active" && (
                                  <DropdownMenuItem
                                    onClick={() => accountStatusMutation.mutate({ userId: u.id, accountStatus: "active" })}
                                    data-testid={`button-activate-${u.id}`}
                                  >
                                    <Check className="w-4 h-4 mr-2 text-emerald-500" />
                                    Activate Account
                                  </DropdownMenuItem>
                                )}
                                {u.accountStatus !== "frozen" && (
                                  <DropdownMenuItem
                                    onClick={() => accountStatusMutation.mutate({ userId: u.id, accountStatus: "frozen" })}
                                    data-testid={`button-freeze-${u.id}`}
                                  >
                                    <Snowflake className="w-4 h-4 mr-2 text-blue-400" />
                                    Freeze Account
                                  </DropdownMenuItem>
                                )}
                                {u.accountStatus !== "blocked" && (
                                  <DropdownMenuItem
                                    onClick={() => accountStatusMutation.mutate({ userId: u.id, accountStatus: "blocked" })}
                                    data-testid={`button-block-${u.id}`}
                                  >
                                    <Ban className="w-4 h-4 mr-2 text-red-500" />
                                    Block Account
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete user "${u.username}"? This action cannot be undone.`)) {
                                      deleteUserMutation.mutate(u.id);
                                    }
                                  }}
                                  data-testid={`button-delete-${u.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* KYC TAB */}
          <TabsContent value="kyc">
            {loadingUsers ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-4">
                {allUsers.filter(u => u.verificationStatus === "PENDING" || u.kycData).map((u) => {
                  const kyc = u.kycData as any;
                  if (!kyc) return null;
                  return (
                    <Card key={u.id} data-testid={`card-kyc-${u.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-3 flex-1 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg">{u.username}</h3>
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                u.verificationStatus === "VERIFIED" ? "bg-emerald-500/10 text-emerald-500" :
                                u.verificationStatus === "PENDING" ? "bg-yellow-500/10 text-yellow-500" :
                                "bg-red-500/10 text-red-500"
                              )}>
                                {u.verificationStatus}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                              <div><span className="text-muted-foreground">Full Name:</span> {kyc.fullName || "-"}</div>
                              <div><span className="text-muted-foreground">ID Number:</span> {kyc.idNumber || "-"}</div>
                              <div><span className="text-muted-foreground">Phone:</span> {kyc.phone || "-"}</div>
                              <div><span className="text-muted-foreground">Address:</span> {kyc.address || "-"}</div>
                              <div><span className="text-muted-foreground">Submitted:</span> {kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : "-"}</div>
                              {kyc.rejectionReason && (
                                <div className="col-span-2"><span className="text-red-500">Rejection Reason:</span> {kyc.rejectionReason}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-3">
                            {kyc.idImageUrl && (
                              <div className="text-center">
                                {kyc.idImageUrl.startsWith("data:") ? (
                                  <div
                                    className="w-24 h-24 border border-border rounded-md overflow-hidden cursor-pointer"
                                    onClick={() => setPreviewImage(kyc.idImageUrl)}
                                    data-testid={`button-preview-id-${u.id}`}
                                  >
                                    <img src={kyc.idImageUrl} alt="ID Document" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-24 h-24 border border-border rounded-md flex items-center justify-center bg-muted/30">
                                    <span className="text-xs text-muted-foreground text-center px-1">Image lost</span>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">ID Doc</div>
                              </div>
                            )}
                            {kyc.selfieImageUrl && (
                              <div className="text-center">
                                {kyc.selfieImageUrl.startsWith("data:") ? (
                                  <div
                                    className="w-24 h-24 border border-border rounded-md overflow-hidden cursor-pointer"
                                    onClick={() => setPreviewImage(kyc.selfieImageUrl)}
                                    data-testid={`button-preview-selfie-${u.id}`}
                                  >
                                    <img src={kyc.selfieImageUrl} alt="Selfie" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-24 h-24 border border-border rounded-md flex items-center justify-center bg-muted/30">
                                    <span className="text-xs text-muted-foreground text-center px-1">Image lost</span>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">Selfie</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {u.verificationStatus === "PENDING" && (
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-500 border-emerald-500/30"
                              onClick={() => kycReviewMutation.mutate({ userId: u.id, status: "VERIFIED" })}
                              disabled={kycReviewMutation.isPending}
                              data-testid={`button-approve-kyc-${u.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve KYC
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-500/30"
                              onClick={() => kycReviewMutation.mutate({ userId: u.id, status: "REJECTED", reason: "Documents insufficient" })}
                              disabled={kycReviewMutation.isPending}
                              data-testid={`button-reject-kyc-${u.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject KYC
                            </Button>
                          </div>
                        )}
                        {kyc && (kyc.idImageUrl?.startsWith("/uploads") || kyc.selfieImageUrl?.startsWith("/uploads")) && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-xs text-yellow-500 mb-2">Images were lost during a system update. You can ask the user to re-submit their documents.</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-500 border-yellow-500/30"
                              onClick={() => kycReviewMutation.mutate({ userId: u.id, status: "REJECTED", reason: "Please re-submit your documents. Your previous images were lost during a system update." })}
                              disabled={kycReviewMutation.isPending}
                              data-testid={`button-reupload-kyc-${u.id}`}
                            >
                              Request Re-upload
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {allUsers.filter(u => u.verificationStatus === "PENDING" || u.kycData).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">No KYC submissions yet</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* DEPOSITS TAB */}
          <TabsContent value="deposits">
            {loadingDeposits ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">User ID</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Method</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Proof</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Date</th>
                      <th className="px-4 py-3 text-right text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDeposits.map((d) => (
                      <tr key={d.id} className="border-b border-border/50 last:border-0" data-testid={`row-deposit-${d.id}`}>
                        <td className="px-4 py-3 font-mono text-xs">{d.id}</td>
                        <td className="px-4 py-3">{d.userId}</td>
                        <td className="px-4 py-3 font-mono font-medium">{formatDepositAmount(d.amount, d.transferMethod)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.transferMethod}</td>
                        <td className="px-4 py-3">
                          {d.proofImage ? (
                            <button
                              className="flex items-center gap-1 text-primary text-xs underline-offset-2 hover:underline"
                              onClick={() => setPreviewImage(d.proofImage!)}
                              data-testid={`button-view-proof-${d.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            d.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
                            d.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-red-500/10 text-red-500"
                          )}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {d.createdAt ? new Date(d.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {d.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-500 border-emerald-500/30"
                                onClick={() => depositReviewMutation.mutate({ id: d.id, status: "APPROVED" })}
                                disabled={depositReviewMutation.isPending}
                                data-testid={`button-approve-deposit-${d.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500/30"
                                onClick={() => depositReviewMutation.mutate({ id: d.id, status: "REJECTED" })}
                                disabled={depositReviewMutation.isPending}
                                data-testid={`button-reject-deposit-${d.id}`}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {allDeposits.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No deposits yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* WITHDRAWALS TAB */}
          <TabsContent value="withdrawals">
            {loadingWithdrawals ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">User ID</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Wallet</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Network</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Date</th>
                      <th className="px-4 py-3 text-right text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allWithdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-border/50 last:border-0" data-testid={`row-withdrawal-${w.id}`}>
                        <td className="px-4 py-3 font-mono text-xs">{w.id}</td>
                        <td className="px-4 py-3">{w.userId}</td>
                        <td className="px-4 py-3 font-mono font-medium">{formatDepositAmount(w.amount, w.network)}</td>
                        <td className="px-4 py-3 font-mono text-xs max-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-muted-foreground" title={w.walletAddress}>{w.walletAddress}</span>
                            {isSuperAdmin && w.status === "PENDING" && (
                              <button
                                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                title="Edit wallet address"
                                data-testid={`button-edit-wallet-${w.id}`}
                                onClick={() => {
                                  setEditingWithdrawalWallet({ id: w.id, currentAddress: w.walletAddress });
                                  setNewWithdrawalAddress(w.walletAddress);
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{w.network}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            w.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
                            w.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500" :
                            "bg-red-500/10 text-red-500"
                          )}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {w.createdAt ? new Date(w.createdAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {w.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-500 border-emerald-500/30"
                                onClick={() => withdrawalReviewMutation.mutate({ id: w.id, status: "APPROVED" })}
                                disabled={withdrawalReviewMutation.isPending}
                                data-testid={`button-approve-withdrawal-${w.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500/30"
                                onClick={() => withdrawalReviewMutation.mutate({ id: w.id, status: "REJECTED" })}
                                disabled={withdrawalReviewMutation.isPending}
                                data-testid={`button-reject-withdrawal-${w.id}`}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {allWithdrawals.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No withdrawals yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TRADES TAB */}
          <TabsContent value="trades">
            {loadingTrades ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">ID</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">User</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Pair</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Dir</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Profit</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Control</th>
                      <th className="px-4 py-3 text-right text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTrades.slice(0, 50).map((t) => (
                      <tr key={t.id} className="border-b border-border/50 last:border-0" data-testid={`row-trade-${t.id}`}>
                        <td className="px-4 py-3 font-mono text-xs">{t.id}</td>
                        <td className="px-4 py-3">{t.userId}</td>
                        <td className="px-4 py-3 font-medium">{t.pair}</td>
                        <td className="px-4 py-3">
                          <span className={t.direction === "BUY" ? "text-emerald-500" : "text-red-500"}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">${Number(t.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {t.result === "WIN" ? (
                            <span className="text-emerald-500">
                              +${(Number(t.amount) * Number(t.profitPercent) / 100).toFixed(2)}
                            </span>
                          ) : t.result === "LOSS" ? (
                            <span className="text-red-500">
                              -${Number(t.amount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            t.status === "OPEN" ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                          )}>
                            {t.status}
                            {t.result && ` - ${t.result}`}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-medium",
                            t.controlMode === "FORCE_WIN" ? "text-emerald-500" :
                            t.controlMode === "FORCE_LOSE" ? "text-red-500" :
                            "text-muted-foreground"
                          )}>
                            {t.controlMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.status === "OPEN" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant={t.controlMode === "FORCE_WIN" ? "default" : "outline"}
                                className="text-xs"
                                onClick={() => tradeControlMutation.mutate({ id: t.id, controlMode: "FORCE_WIN" })}
                                disabled={tradeControlMutation.isPending}
                                data-testid={`button-force-win-${t.id}`}
                              >
                                Win
                              </Button>
                              <Button
                                size="sm"
                                variant={t.controlMode === "FORCE_LOSE" ? "default" : "outline"}
                                className="text-xs"
                                onClick={() => tradeControlMutation.mutate({ id: t.id, controlMode: "FORCE_LOSE" })}
                                disabled={tradeControlMutation.isPending}
                                data-testid={`button-force-lose-${t.id}`}
                              >
                                Lose
                              </Button>
                              <Button
                                size="sm"
                                variant={t.controlMode === "NORMAL" ? "default" : "outline"}
                                className="text-xs"
                                onClick={() => tradeControlMutation.mutate({ id: t.id, controlMode: "NORMAL" })}
                                disabled={tradeControlMutation.isPending}
                                data-testid={`button-normal-${t.id}`}
                              >
                                Normal
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {allTrades.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No trades yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* DEPOSIT WALLETS TAB */}
          <TabsContent value="wallets">
            {!walletUnlocked ? (
              <div className="flex items-center justify-center py-16">
                <Card className="w-full max-w-sm">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-lg text-foreground">
                          {needsSetPin ? "Set Wallet Access PIN" : "Wallet Access Protected"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {needsSetPin ? "Set a 6-digit PIN to protect wallet access" : "Enter the 6-digit PIN to access deposit wallets"}
                        </p>
                      </div>

                      {needsSetPin ? (
                        <form
                          className="w-full space-y-3"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (changePinNew.length !== 6) {
                              setChangePinError("PIN must be 6 digits");
                              return;
                            }
                            if (changePinNew !== changePinConfirm) {
                              setChangePinError("PINs do not match");
                              return;
                            }
                            setChangePinLoading(true);
                            setChangePinError("");
                            try {
                              const res = await fetch("/api/admin/wallet-pin/change", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
                                body: JSON.stringify({ password: changePinPassword, newPin: changePinNew }),
                              });
                              const data = await res.json();
                              if (!res.ok) { setChangePinError(data.message || "Failed"); return; }
                              toast({ title: "Wallet PIN set successfully" });
                              setNeedsSetPin(false);
                              setChangePinPassword("");
                              setChangePinNew("");
                              setChangePinConfirm("");
                            } catch { setChangePinError("Failed to set PIN"); }
                            finally { setChangePinLoading(false); }
                          }}
                        >
                          <Input
                            type="password"
                            placeholder="Login password"
                            value={changePinPassword}
                            onChange={(e) => { setChangePinPassword(e.target.value); setChangePinError(""); }}
                            data-testid="input-set-pin-password"
                          />
                          <Input
                            type="password"
                            maxLength={6}
                            placeholder="New 6-digit PIN"
                            value={changePinNew}
                            onChange={(e) => { setChangePinNew(e.target.value.replace(/\D/g, "").slice(0, 6)); setChangePinError(""); }}
                            className="text-center text-lg tracking-[0.5em] font-mono"
                            data-testid="input-set-pin-new"
                          />
                          <Input
                            type="password"
                            maxLength={6}
                            placeholder="Confirm PIN"
                            value={changePinConfirm}
                            onChange={(e) => { setChangePinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6)); setChangePinError(""); }}
                            className="text-center text-lg tracking-[0.5em] font-mono"
                            data-testid="input-set-pin-confirm"
                          />
                          {changePinError && <p className="text-sm text-red-500 text-center">{changePinError}</p>}
                          <Button type="submit" className="w-full" disabled={changePinLoading || changePinNew.length !== 6 || !changePinPassword}>
                            {changePinLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Set PIN
                          </Button>
                        </form>
                      ) : (
                        <form
                          className="w-full space-y-3"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setWalletPinLoading(true);
                            setWalletPinError("");
                            try {
                              const res = await fetch("/api/admin/wallet-pin/verify", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
                                body: JSON.stringify({ pin: walletPinInput }),
                              });
                              const data = await res.json();
                              if (res.ok) {
                                setWalletUnlocked(true);
                                setWalletPinInput("");
                              } else if (data.message === "NO_PIN_SET") {
                                setNeedsSetPin(true);
                              } else {
                                setWalletPinError(data.message || "Incorrect PIN");
                              }
                            } catch { setWalletPinError("Failed to verify PIN"); }
                            finally { setWalletPinLoading(false); }
                          }}
                        >
                          <Input
                            type="password"
                            maxLength={6}
                            placeholder="Enter 6-digit PIN"
                            value={walletPinInput}
                            onChange={(e) => {
                              setWalletPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                              setWalletPinError("");
                            }}
                            className="text-center text-lg tracking-[0.5em] font-mono"
                            data-testid="input-wallet-pin"
                          />
                          {walletPinError && (
                            <p className="text-sm text-red-500 text-center" data-testid="text-pin-error">{walletPinError}</p>
                          )}
                          <Button type="submit" className="w-full" disabled={walletPinInput.length !== 6 || walletPinLoading} data-testid="button-unlock-wallets">
                            {walletPinLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Unlock
                          </Button>
                        </form>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
            <div className="space-y-6">
              {showChangePinForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Change Wallet Access PIN
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="max-w-sm space-y-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (changePinNew.length !== 6) { setChangePinError("PIN must be 6 digits"); return; }
                        if (changePinNew !== changePinConfirm) { setChangePinError("PINs do not match"); return; }
                        setChangePinLoading(true);
                        setChangePinError("");
                        try {
                          const res = await fetch("/api/admin/wallet-pin/change", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
                            body: JSON.stringify({ password: changePinPassword, newPin: changePinNew }),
                          });
                          const data = await res.json();
                          if (!res.ok) { setChangePinError(data.message || "Failed"); return; }
                          toast({ title: "PIN changed successfully" });
                          setShowChangePinForm(false);
                          setChangePinPassword("");
                          setChangePinNew("");
                          setChangePinConfirm("");
                        } catch { setChangePinError("Failed to change PIN"); }
                        finally { setChangePinLoading(false); }
                      }}
                    >
                      <div className="space-y-1">
                        <Label>Login Password</Label>
                        <Input
                          type="password"
                          placeholder="Enter your login password"
                          value={changePinPassword}
                          onChange={(e) => { setChangePinPassword(e.target.value); setChangePinError(""); }}
                          data-testid="input-change-pin-password"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>New PIN</Label>
                        <Input
                          type="password"
                          maxLength={6}
                          placeholder="New 6-digit PIN"
                          value={changePinNew}
                          onChange={(e) => { setChangePinNew(e.target.value.replace(/\D/g, "").slice(0, 6)); setChangePinError(""); }}
                          className="text-center text-lg tracking-[0.5em] font-mono"
                          data-testid="input-change-pin-new"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Confirm PIN</Label>
                        <Input
                          type="password"
                          maxLength={6}
                          placeholder="Confirm new PIN"
                          value={changePinConfirm}
                          onChange={(e) => { setChangePinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6)); setChangePinError(""); }}
                          className="text-center text-lg tracking-[0.5em] font-mono"
                          data-testid="input-change-pin-confirm"
                        />
                      </div>
                      {changePinError && <p className="text-sm text-red-500" data-testid="text-change-pin-error">{changePinError}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" disabled={changePinLoading || changePinNew.length !== 6 || !changePinPassword} data-testid="button-save-pin">
                          {changePinLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Save PIN
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { setShowChangePinForm(false); setChangePinPassword(""); setChangePinNew(""); setChangePinConfirm(""); setChangePinError(""); }}
                          data-testid="button-cancel-change-pin"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePinForm(!showChangePinForm)}
                  data-testid="button-change-pin"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Change PIN
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Add New Wallet Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    className="flex items-end gap-4 flex-wrap"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newWalletAddress.trim() || newWalletAddress.length < 10) {
                        toast({ title: "Address must be at least 10 characters", variant: "destructive" });
                        return;
                      }
                      const formData = new FormData();
                      formData.append("network", newWalletNetwork);
                      formData.append("address", newWalletAddress.trim());
                      formData.append("isActive", "true");
                      if (newWalletQrFile) {
                        formData.append("qrCodeImage", newWalletQrFile);
                      }
                      createWalletMutation.mutate(formData);
                    }}
                  >
                    <div className="space-y-2">
                      <Label>Network</Label>
                      <select
                        value={newWalletNetwork}
                        onChange={(e) => setNewWalletNetwork(e.target.value)}
                        className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        data-testid="select-wallet-network"
                      >
                        <option value="TRC20">TRC20</option>
                        <option value="ERC20">ERC20</option>
                        <option value="BEP20">BEP20</option>
                        <option value="USDC">USDC</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="BNB">BNB</option>
                        <option value="SOL">SOL</option>
                      </select>
                    </div>
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <Label>Wallet Address</Label>
                      <Input
                        value={newWalletAddress}
                        onChange={(e) => setNewWalletAddress(e.target.value)}
                        placeholder="Enter wallet address"
                        data-testid="input-wallet-address-admin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>QR Code Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewWalletQrFile(e.target.files?.[0] || null)}
                        className="text-xs"
                        data-testid="input-wallet-qr-image"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={createWalletMutation.isPending}
                      data-testid="button-add-wallet"
                    >
                      {createWalletMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><Plus className="w-4 h-4 mr-1" /> Add Wallet</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {loadingWallets ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <div className="bg-card border border-border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">ID</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Network</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Address</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">QR Code</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Updated</th>
                        <th className="px-4 py-3 text-right text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depositWalletsList.map((w) => (
                        <tr key={w.id} className="border-b border-border/50 last:border-0" data-testid={`row-wallet-${w.id}`}>
                          <td className="px-4 py-3 font-mono text-xs">{w.id}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {w.network}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs break-all max-w-[300px]" data-testid={`text-wallet-address-${w.id}`}>
                            {editingWalletId === w.id ? (
                              <Input
                                value={editingAddress}
                                onChange={(e) => setEditingAddress(e.target.value)}
                                className="font-mono text-xs"
                                data-testid={`input-edit-wallet-${w.id}`}
                              />
                            ) : (
                              w.address
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {w.qrCodeImage ? (
                              <img
                                src={w.qrCodeImage}
                                alt="QR"
                                className="w-10 h-10 rounded border border-border cursor-pointer bg-white p-0.5"
                                onClick={() => setPreviewImage(w.qrCodeImage)}
                                data-testid={`img-wallet-qr-${w.id}`}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              w.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                            )} data-testid={`text-wallet-status-${w.id}`}>
                              {w.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingWalletId === w.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateWalletMutation.mutate({ id: w.id, address: editingAddress })}
                                    disabled={updateWalletMutation.isPending || !editingAddress.trim()}
                                    data-testid={`button-save-wallet-${w.id}`}
                                  >
                                    <Save className="w-3.5 h-3.5 mr-1" /> Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setEditingWalletId(null); setEditingAddress(""); }}
                                    data-testid={`button-cancel-edit-wallet-${w.id}`}
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setEditingWalletId(w.id); setEditingAddress(w.address); }}
                                    data-testid={`button-edit-wallet-${w.id}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                  </Button>
                                  {!w.isActive && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-emerald-500 border-emerald-500/30"
                                      onClick={() => activateWalletMutation.mutate(w.id)}
                                      disabled={activateWalletMutation.isPending}
                                      data-testid={`button-activate-wallet-${w.id}`}
                                    >
                                      <Power className="w-3.5 h-3.5 mr-1" /> Activate
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500 border-red-500/30"
                                    onClick={() => deleteWalletMutation.mutate(w.id)}
                                    disabled={deleteWalletMutation.isPending}
                                    data-testid={`button-delete-wallet-${w.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {depositWalletsList.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No wallet addresses configured yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}
          </TabsContent>

          {/* SUPPORT TAB */}
          <TabsContent value="support">
            <AdminSupportChat />
          </TabsContent>

          {/* LOANS TAB */}
          <TabsContent value="loans">
            {loadingLoans ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="bg-card border border-border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">User ID</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Term</th>
                      <th className="px-4 py-3 text-left">Interest</th>
                      <th className="px-4 py-3 text-left">Service Fee</th>
                      <th className="px-4 py-3 text-left">Total Repay</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminLoans.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">No loan requests</td></tr>
                    ) : (
                      adminLoans.map((loan) => (
                        <tr key={loan.id} className="border-b border-border last:border-0" data-testid={`row-loan-${loan.id}`}>
                          <td className="px-4 py-3 font-mono text-xs">{loan.id}</td>
                          <td className="px-4 py-3">{loan.userId}</td>
                          <td className="px-4 py-3 font-medium">${parseFloat(loan.amount).toLocaleString()}</td>
                          <td className="px-4 py-3">{loan.term} days</td>
                          <td className="px-4 py-3">${parseFloat(loan.totalInterest).toFixed(2)}</td>
                          <td className="px-4 py-3">${parseFloat(loan.serviceFee).toFixed(2)}</td>
                          <td className="px-4 py-3 font-medium">${parseFloat(loan.totalRepayment).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              loan.status === "PENDING" && "bg-yellow-500/20 text-yellow-400",
                              loan.status === "APPROVED" && "bg-green-500/20 text-green-400",
                              loan.status === "REJECTED" && "bg-red-500/20 text-red-400",
                            )}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            {loan.status === "PENDING" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approveLoanMutation.mutate({ id: loan.id })}
                                  disabled={approveLoanMutation.isPending}
                                  data-testid={`button-approve-loan-${loan.id}`}
                                >
                                  {approveLoanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectLoanMutation.mutate({ id: loan.id })}
                                  disabled={rejectLoanMutation.isPending}
                                  data-testid={`button-reject-loan-${loan.id}`}
                                >
                                  {rejectLoanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <X className="w-3 h-3 mr-1" />}
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {loan.adminNote || "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* REFERRALS TAB */}
          <TabsContent value="referrals">
            <div className="space-y-6">
              {myReferrals?.referralCode && (
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-sm text-muted-foreground">Your Referral Code</p>
                        <p className="text-2xl font-bold text-primary font-mono" data-testid="text-my-referral-code">{myReferrals.referralCode}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Referred Users</p>
                        <p className="text-2xl font-bold" data-testid="text-total-referrals">{myReferrals.totalUsers}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(myReferrals.referralCode || "");
                          toast({ title: "Referral code copied to clipboard" });
                        }}
                        data-testid="button-copy-referral"
                      >
                        Copy Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-card border border-border rounded-md overflow-x-auto">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold">My Referred Users</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Total Balance</th>
                      <th className="px-4 py-3 text-left">KYC</th>
                      <th className="px-4 py-3 text-left">Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!myReferrals?.users || myReferrals.users.length === 0) ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No referred users yet</td></tr>
                    ) : (
                      myReferrals.users.map((u: any) => (
                        <tr key={u.id} className="border-b border-border last:border-0" data-testid={`row-referral-user-${u.id}`}>
                          <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                          <td className="px-4 py-3 font-medium">{u.username}</td>
                          <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                          <td className="px-4 py-3 font-mono">${getUserTotalBalance(u as User, livePrices).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              u.verificationStatus === "VERIFIED" && "bg-green-500/20 text-green-400",
                              u.verificationStatus === "PENDING" && "bg-yellow-500/20 text-yellow-400",
                              u.verificationStatus === "UNVERIFIED" && "bg-zinc-500/20 text-zinc-400",
                            )}>
                              {u.verificationStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {isSuperAdmin && referralStats.length > 0 && (
                <div className="bg-card border border-border rounded-md overflow-x-auto">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="font-semibold">All Admin Referral Performance</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                        <th className="px-4 py-3 text-left">Admin</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Role</th>
                        <th className="px-4 py-3 text-left">Referral Code</th>
                        <th className="px-4 py-3 text-left">Total Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralStats.map((stat) => (
                        <tr key={stat.adminId} className="border-b border-border last:border-0" data-testid={`row-admin-referral-${stat.adminId}`}>
                          <td className="px-4 py-3 font-medium">{stat.username}</td>
                          <td className="px-4 py-3 text-muted-foreground">{stat.email}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              stat.role === "SUPER_ADMIN" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                            )}>
                              {stat.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-primary">{stat.referralCode}</td>
                          <td className="px-4 py-3 font-bold">{stat.totalUsers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* SECURITY TAB */}
          {isSuperAdmin && <TabsContent value="security">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Filter by username or email..."
                  value={securityUserFilter}
                  onChange={e => setSecurityUserFilter(e.target.value)}
                  className="max-w-xs"
                  data-testid="input-security-filter"
                />
                <span className="text-sm text-muted-foreground">
                  {securityLogs.filter(l => {
                    if (!securityUserFilter) return true;
                    const u = allUsers.find(u => u.id === l.userId);
                    return u?.username.toLowerCase().includes(securityUserFilter.toLowerCase()) || u?.email.toLowerCase().includes(securityUserFilter.toLowerCase());
                  }).length} entries
                </span>
              </div>

              {loadingSecurityLogs ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : securityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No security logs yet. They appear when users register or log in.</div>
              ) : (
                <div className="bg-card border border-border rounded-md overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Time</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">User</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Action</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">IP Address</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Country</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">City</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Region</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">ISP</th>
                        <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityLogs
                        .filter(l => {
                          if (!securityUserFilter) return true;
                          const u = allUsers.find(u => u.id === l.userId);
                          return u?.username.toLowerCase().includes(securityUserFilter.toLowerCase()) || u?.email.toLowerCase().includes(securityUserFilter.toLowerCase());
                        })
                        .map(log => {
                          const user = allUsers.find(u => u.id === log.userId);
                          return (
                            <tr key={log.id} className={cn("border-b border-border/50 last:border-0", log.isSuspicious && "bg-red-500/5")} data-testid={`row-security-${log.id}`}>
                              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm">{user?.username ?? `#${log.userId}`}</div>
                                <div className="text-xs text-muted-foreground">{user?.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-xs font-medium px-2 py-0.5 rounded-full",
                                  log.action === "login" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-500"
                                )}>
                                  {log.action === "login" ? "LOGIN" : "REGISTER"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">{log.ip ?? "—"}</td>
                              <td className="px-4 py-3 text-sm">{log.country ?? "—"}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{log.city ?? "—"}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{log.region ?? "—"}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{log.isp ?? "—"}</td>
                              <td className="px-4 py-3">
                                {log.isSuspicious ? (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">⚠ Suspicious</span>
                                ) : (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Normal</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>}
        </Tabs>
      </main>

      {/* Edit Withdrawal Wallet Address Dialog */}
      <Dialog open={!!editingWithdrawalWallet} onOpenChange={(open) => { if (!open) { setEditingWithdrawalWallet(null); setNewWithdrawalAddress(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Withdrawal Wallet Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Current Address</Label>
              <p className="font-mono text-xs break-all text-muted-foreground bg-muted/50 rounded px-3 py-2">
                {editingWithdrawalWallet?.currentAddress}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-wallet-addr">New Wallet Address</Label>
              <Input
                id="new-wallet-addr"
                value={newWithdrawalAddress}
                onChange={(e) => setNewWithdrawalAddress(e.target.value)}
                placeholder="Enter corrected wallet address"
                className="font-mono text-xs"
                data-testid="input-new-withdrawal-wallet"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setEditingWithdrawalWallet(null); setNewWithdrawalAddress(""); }}
              data-testid="button-cancel-edit-wallet"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingWithdrawalWallet) {
                  updateWithdrawalWalletMutation.mutate({ id: editingWithdrawalWallet.id, walletAddress: newWithdrawalAddress });
                }
              }}
              disabled={updateWithdrawalWalletMutation.isPending || !newWithdrawalAddress.trim() || newWithdrawalAddress.trim() === editingWithdrawalWallet?.currentAddress}
              data-testid="button-confirm-edit-wallet"
            >
              {updateWithdrawalWalletMutation.isPending ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
