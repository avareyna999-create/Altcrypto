import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wallet, ChevronDown, Copy, LogOut, AlertTriangle } from "lucide-react";

// ── Network helpers ──────────────────────────────────────────────────────────

const NETWORK_NAMES: Record<number, string> = {
  1:     "Ethereum",
  56:    "BNB Chain",
  137:   "Polygon",
  43114: "Avalanche",
  42161: "Arbitrum",
  10:    "Optimism",
  8453:  "Base",
  250:   "Fantom",
};

const NETWORK_COLORS: Record<number, string> = {
  1:     "bg-blue-500",
  56:    "bg-yellow-500",
  137:   "bg-violet-500",
  43114: "bg-red-500",
  42161: "bg-sky-500",
  10:    "bg-red-400",
  8453:  "bg-blue-400",
  250:   "bg-blue-600",
};

function getNetworkName(chainId: number) {
  return NETWORK_NAMES[chainId] ?? `Chain ${chainId}`;
}

function getNetworkColor(chainId: number) {
  return NETWORK_COLORS[chainId] ?? "bg-gray-500";
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Core hook ────────────────────────────────────────────────────────────────

interface WalletState {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

const STORAGE_KEY = "web3_wallet_address";

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
    connecting: false,
    error: null,
  });

  const hasMetaMask = typeof window !== "undefined" && !!(window as any).ethereum;

  const connect = useCallback(async () => {
    if (!hasMetaMask) {
      setState(s => ({ ...s, error: "MetaMask not detected. Please install the MetaMask extension." }));
      return;
    }
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      const eth = (window as any).ethereum;
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const chainIdHex: string = await eth.request({ method: "eth_chainId" });
      const address = accounts[0];
      const chainId = parseInt(chainIdHex, 16);
      localStorage.setItem(STORAGE_KEY, address);
      setState({ address, chainId, connected: true, connecting: false, error: null });
    } catch (err: any) {
      const msg = err?.code === 4001
        ? "Connection rejected. Please approve the request in MetaMask."
        : "Failed to connect wallet. Please try again.";
      setState(s => ({ ...s, connecting: false, error: msg }));
    }
  }, [hasMetaMask]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ address: null, chainId: null, connected: false, connecting: false, error: null });
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || !hasMetaMask) return;
    const eth = (window as any).ethereum;
    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.includes(saved)) {
        eth.request({ method: "eth_chainId" }).then((chainIdHex: string) => {
          setState({ address: saved, chainId: parseInt(chainIdHex, 16), connected: true, connecting: false, error: null });
        });
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }).catch(() => {});
  }, [hasMetaMask]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!hasMetaMask) return;
    const eth = (window as any).ethereum;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        localStorage.setItem(STORAGE_KEY, accounts[0]);
        setState(s => ({ ...s, address: accounts[0] }));
      }
    };

    const onChainChanged = (chainIdHex: string) => {
      setState(s => ({ ...s, chainId: parseInt(chainIdHex, 16) }));
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);
    return () => {
      eth.removeListener("accountsChanged", onAccountsChanged);
      eth.removeListener("chainChanged", onChainChanged);
    };
  }, [hasMetaMask, disconnect]);

  return { ...state, hasMetaMask, connect, disconnect };
}

// ── Compact button for navbar ────────────────────────────────────────────────

export function ConnectWalletButton({ className }: { className?: string }) {
  const { address, chainId, connected, connecting, error, hasMetaMask, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!connected) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={connect}
          disabled={connecting}
          className="border-primary/30 text-primary hover:bg-primary/10 gap-2"
          data-testid="button-connect-wallet"
        >
          <Wallet className="w-3.5 h-3.5" />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </Button>
        {error && (
          <div className="absolute top-full mt-2 right-0 z-50 w-64 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex gap-2 shadow-lg" data-testid="text-wallet-error">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>
    );
  }

  const networkName = chainId ? getNetworkName(chainId) : "Unknown";
  const netColor = chainId ? getNetworkColor(chainId) : "bg-gray-500";

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-sm"
        data-testid="button-wallet-connected"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-emerald-400 text-xs font-medium">{shortenAddress(address!)}</span>
        </span>
        <ChevronDown className={cn("w-3 h-3 text-emerald-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-60 rounded-xl bg-card border border-border/60 shadow-xl shadow-black/30 overflow-hidden" data-testid="dropdown-wallet">
            {/* Network badge */}
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", netColor)} />
              <span className="text-xs text-muted-foreground">{networkName}</span>
            </div>

            {/* Full address */}
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1">Connected Address</p>
              <p className="font-mono text-xs break-all text-foreground" data-testid="text-wallet-address">{address}</p>
            </div>

            {/* Actions */}
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-white/5 transition-colors"
              data-testid="button-copy-address"
            >
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              data-testid="button-disconnect-wallet"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar compact widget ────────────────────────────────────────────────────

export function SidebarWalletWidget() {
  const { address, chainId, connected, connecting, error, connect, disconnect } = useWallet();

  if (!connected) {
    return (
      <div className="mb-3">
        <button
          onClick={connect}
          disabled={connecting}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          data-testid="button-connect-wallet-sidebar"
        >
          <Wallet className="w-4 h-4" />
          <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
        </button>
        {error && (
          <p className="text-[10px] text-destructive mt-1 px-1">{error}</p>
        )}
      </div>
    );
  }

  const networkName = chainId ? getNetworkName(chainId) : "Unknown";
  const netColor = chainId ? getNetworkColor(chainId) : "bg-gray-500";

  return (
    <div className="mb-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3" data-testid="widget-wallet-connected">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wide">Wallet Connected</span>
        </div>
        <button
          onClick={disconnect}
          className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
          data-testid="button-disconnect-wallet-sidebar"
        >
          Disconnect
        </button>
      </div>
      <p className="font-mono text-xs text-foreground truncate" data-testid="text-sidebar-wallet-address">
        {shortenAddress(address!)}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className={cn("w-1.5 h-1.5 rounded-full", netColor)} />
        <span className="text-[10px] text-muted-foreground">{networkName}</span>
      </div>
    </div>
  );
}
