import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, Sun, Moon, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/queryClient";
import { ConnectWalletButton } from "@/components/ConnectWallet";
import { useTheme } from "@/hooks/use-theme";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export default function PublicNavbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = !!getAuthToken();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, triggerInstall } = usePwaInstall();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/market", label: "Market" },
    { href: "/trading", label: "Trading" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.07] bg-background/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home-logo">
              <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center logo-glow">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold font-display bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
                Altcryptotrade
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    location === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-white"
                  )}
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {canInstall && (
              <button
                onClick={triggerInstall}
                className="btn-white-outline min-h-9 rounded-md px-3 text-xs font-medium inline-flex items-center gap-1.5"
                data-testid="button-install-app"
              >
                <Download className="w-3.5 h-3.5" />
                Install
              </button>
            )}
            <ConnectWalletButton />
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button className="btn-primary-glow" data-testid="button-go-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="btn-white-outline min-h-9 rounded-md px-4 text-sm font-medium" data-testid="button-login">Log In</button>
                </Link>
                <Link href="/register">
                  <Button className="btn-primary-glow" data-testid="button-register">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "block px-4 py-2 rounded-md text-sm font-medium cursor-pointer",
                    location === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </div>
              </Link>
            ))}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                data-testid="button-theme-toggle-mobile"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              </button>
              <ConnectWalletButton className="w-full" />
              {isLoggedIn ? (
                <Link href="/dashboard">
                  <Button className="w-full" onClick={() => setMobileOpen(false)}>Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full" onClick={() => setMobileOpen(false)}>Log In</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full" onClick={() => setMobileOpen(false)}>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
