import PublicNavbar from "@/components/PublicNavbar";
import { Button } from "@/components/ui/button";
import { Monitor, Apple, Terminal, Smartphone, Download, CheckCircle2 } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://altcryptotrading.com&bgcolor=0b0f19&color=00ff9c&qzone=2&format=png";

const DESKTOP_DOWNLOADS = [
  {
    icon: Monitor,
    label: "Download for Windows",
    subtitle: "Windows 10 / 11 — .exe installer",
    href: "/downloads/AltCrypto-Setup.exe",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Apple,
    label: "Download for macOS",
    subtitle: "macOS 12+ — .dmg disk image",
    href: "/downloads/AltCrypto.dmg",
    color: "text-white",
    bg: "bg-white/5",
    border: "border-white/10",
  },
  {
    icon: Terminal,
    label: "Download for Linux",
    subtitle: "Ubuntu / Debian — .AppImage",
    href: "/downloads/AltCrypto.AppImage",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
];

const FEATURES = [
  "Real-time market data",
  "Secure local session",
  "Native OS notifications",
  "Offline-ready dashboard",
  "Auto-updates",
];

export default function DownloadPage() {
  const { canInstall, isInstalled, triggerInstall } = usePwaInstall();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-sm font-medium mb-6">
            <Download className="w-4 h-4" />
            Native App Experience
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4" data-testid="text-download-title">
            Download AltCrypto App
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Get the full trading experience as a native app on any device — mobile, desktop, or install directly from your browser.
          </p>
        </div>

        {/* ── MOBILE — QR + Browser Install ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* QR Code panel */}
          <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center card-hover" data-testid="card-qr-install">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">Install on Mobile</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Scan the QR code with your phone camera to open AltCrypto and add it to your home screen.
            </p>

            <div className="rounded-2xl overflow-hidden border border-white/10 p-2 bg-[#0b0f19] mb-4">
              <img
                src={QR_URL}
                alt="QR code to install AltCrypto"
                width={200}
                height={200}
                className="rounded-lg"
                data-testid="img-qr-code"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Points to{" "}
              <a
                href="https://altcryptotrading.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                altcryptotrading.com
              </a>
            </p>
          </div>

          {/* Browser install panel */}
          <div className="glass-card rounded-2xl p-8 flex flex-col card-hover" data-testid="card-browser-install">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-1">Install from Browser</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add AltCrypto directly to your home screen or taskbar — no app store required. Works on Chrome, Edge, and Safari.
            </p>

            <ul className="space-y-2 mb-8 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isInstalled ? (
              <div className="flex items-center gap-2 justify-center py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                App is installed
              </div>
            ) : canInstall ? (
              <Button
                className="w-full btn-primary-glow"
                onClick={triggerInstall}
                data-testid="button-browser-install"
              >
                <Download className="w-4 h-4 mr-2" />
                Install App Now
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-3 rounded-xl border border-white/8 bg-white/[0.02]">
                Open this page in Chrome or Edge to install the app, or use the QR code on mobile.
              </div>
            )}
          </div>
        </div>

        {/* ── white section divider ── */}
        <div className="white-divider my-12" />

        {/* ── DESKTOP DOWNLOADS ── */}
        <div className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-2 text-center" data-testid="text-desktop-heading">
            Desktop App
          </h2>
          <p className="text-muted-foreground text-sm text-center mb-8">
            Full-featured Electron desktop application. Trade without opening a browser.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DESKTOP_DOWNLOADS.map((d) => (
              <a
                key={d.label}
                href={d.href}
                download
                className={`glass-card rounded-2xl p-6 flex flex-col items-center text-center card-hover border ${d.border} group`}
                data-testid={`button-download-${d.label.split(" ").pop()?.toLowerCase()}`}
              >
                <div className={`w-12 h-12 rounded-xl ${d.bg} border ${d.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <d.icon className={`w-6 h-6 ${d.color}`} />
                </div>
                <p className="font-bold text-sm mb-1">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.subtitle}</p>
              </a>
            ))}
          </div>
        </div>

        {/* ── white section divider ── */}
        <div className="white-divider my-12" />

        {/* ── Setup instructions ── */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">How to install on mobile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Scan the QR code", desc: "Open your camera app and point it at the QR code above." },
              { step: "2", title: "Open in browser", desc: "Tap the link that appears to open AltCrypto in your mobile browser." },
              { step: "3", title: "Add to Home Screen", desc: 'Tap the share icon and choose "Add to Home Screen" or "Install App".' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
