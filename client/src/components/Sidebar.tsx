import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  UserCircle, 
  LogOut, 
  ShieldCheck,
  Lock,
  Landmark,
  RefreshCw,
  Menu,
  X,
  Users,
  History,
  Settings,
  Shield,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SidebarWalletWidget } from "@/components/ConnectWallet";

const NAV_GROUPS = [
  {
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    items: [
      { href: "/trading", icon: TrendingUp, label: "Trading" },
      { href: "/wallet", icon: Wallet, label: "Wallet" },
      { href: "/convert", icon: RefreshCw, label: "Convert" },
    ],
  },
  {
    heading: "ACCOUNT",
    items: [
      { href: "/profile", icon: UserCircle, label: "Profile" },
      { href: "/change-password", icon: Lock, label: "Security" },
      { href: "/kyc", icon: ShieldCheck, label: "Verification" },
      { href: "/referral", icon: Users, label: "Referral" },
    ],
  },
  {
    heading: "FINANCE",
    items: [
      { href: "/loan", icon: Landmark, label: "Loan" },
      { href: "/transactions", icon: History, label: "Transactions" },
    ],
  },
];

function NavItem({ href, icon: Icon, label, isActive, onClose }: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClose: () => void;
}) {
  return (
    <Link href={href}>
      <div
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer",
          isActive
            ? "active-neon text-primary"
            : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground hover:translate-x-0.5"
        )}
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Icon className={cn("w-5 h-5 shrink-0", isActive ? "stroke-[2.5px]" : "stroke-2")} />
        <span className="font-medium text-sm">{label}</span>
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        )}
      </div>
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: livePrices } = useQuery<any[]>({
    queryKey: ["/api/market/24hr"],
    refetchInterval: 30000,
  });

  const getPrice = (symbol: string): number => {
    const pair = livePrices?.find((p: any) => p.symbol === `${symbol}USDT`);
    return pair ? Number(pair.lastPrice) || 0 : 0;
  };

  const totalPortfolio = Number(user?.usdtBalance || 0)
    + Number(user?.btcBalance || 0) * getPrice("BTC")
    + Number(user?.ethBalance || 0) * getPrice("ETH")
    + Number(user?.bnbBalance || 0) * getPrice("BNB")
    + Number((user as any)?.usdcBalance || 0) * 1;

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const close = () => setMobileOpen(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[60] bg-card border border-border rounded-lg p-2 text-foreground"
        data-testid="button-mobile-menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-[70]"
          onClick={close}
          data-testid="overlay-sidebar"
        />
      )}

      <div className={cn(
        "w-64 h-screen sidebar-gradient flex flex-col fixed left-0 top-0 z-[80] transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <Link href={user ? "/dashboard" : "/"}>
            <div className="cursor-pointer" data-testid="link-logo">
              <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
                AltCrypto
              </h1>
              <p className="text-xs text-muted-foreground mt-1 tracking-wider">PREMIUM TRADING</p>
            </div>
          </Link>
          <button
            onClick={close}
            className="md:hidden text-muted-foreground"
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "pt-2" : ""}>
              {group.heading && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  {group.heading}
                </p>
              )}
              {group.items.map((link) => (
                <NavItem
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  isActive={location === link.href}
                  onClose={close}
                />
              ))}
            </div>
          ))}

          {isAdmin && (
            <div className="pt-2">
              <NavItem
                href="/admin"
                icon={Shield}
                label="Admin Panel"
                isActive={location === "/admin"}
                onClose={close}
              />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="rounded-xl p-4 mb-3 border border-primary/15"
            style={{
              background: "linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(20,184,166,0.05) 50%, rgba(59,130,246,0.06) 100%)",
            }}
          >
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Total Balance</p>
            <p className="font-mono text-xl font-bold text-foreground" data-testid="text-sidebar-balance">
              ${totalPortfolio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 h-[1px] bg-gradient-to-r from-primary/40 via-teal-400/20 to-transparent" />
          </div>

          <SidebarWalletWidget />

          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors mb-1"
            data-testid="button-sidebar-theme-toggle"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>

          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
