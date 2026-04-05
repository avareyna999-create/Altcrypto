import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Copy, UserCircle, Mail, Wallet, Users, ShieldCheck, Calendar, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function copyToClipboard(text: string, label: string, toast: ReturnType<typeof useToast>["toast"]) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: `${label} copied` });
  });
}

function InfoRow({ icon: Icon, label, value, onCopy, badge }: {
  icon: React.ElementType;
  label: string;
  value: string;
  onCopy?: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground break-all" data-testid={`text-profile-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {badge}
        {onCopy && (
          <button
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            data-testid={`button-copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  const verificationBadge = {
    VERIFIED: <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Verified</Badge>,
    PENDING: <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pending</Badge>,
    REJECTED: <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>,
    UNVERIFIED: <Badge variant="outline" className="text-muted-foreground">Unverified</Badge>,
  }[user.verificationStatus] ?? null;

  const statusBadge = {
    active: <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>,
    frozen: <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Frozen</Badge>,
    blocked: <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Blocked</Badge>,
  }[(user as any).accountStatus] ?? null;

  const walletAddress = (user as any).walletAddress;
  const createdAt = (user as any).createdAt
    ? new Date((user as any).createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display text-foreground" data-testid="text-profile-heading">Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Your account information and settings</p>
          </div>

          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <UserCircle className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground" data-testid="text-profile-username">{user.username}</p>
              <p className="text-sm text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
            </div>
            <div className="flex gap-2">
              {statusBadge}
              {verificationBadge}
            </div>
          </div>

          <Card className="bg-card/50 border-border mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow
                icon={UserCircle}
                label="Username"
                value={user.username}
                onCopy={() => copyToClipboard(user.username, "Username", toast)}
              />
              <InfoRow
                icon={Mail}
                label="Email"
                value={(user as any).email?.endsWith("@metamask.local") ? "Not set (MetaMask account)" : ((user as any).email ?? "—")}
                onCopy={(user as any).email && !(user as any).email.endsWith("@metamask.local")
                  ? () => copyToClipboard((user as any).email, "Email", toast)
                  : undefined}
              />
              {(user as any).phoneNumber && (
                <InfoRow
                  icon={Phone}
                  label="Phone Number"
                  value={(user as any).phoneNumber}
                />
              )}
              <InfoRow
                icon={Calendar}
                label="Member Since"
                value={createdAt}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Web3 Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              {walletAddress ? (
                <InfoRow
                  icon={Wallet}
                  label="Connected Wallet"
                  value={`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                  onCopy={() => copyToClipboard(walletAddress, "Wallet address", toast)}
                />
              ) : (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Connected Wallet</p>
                      <p className="text-sm text-muted-foreground italic">No wallet connected</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">Not linked</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Referral</CardTitle>
            </CardHeader>
            <CardContent>
              {(user as any).referralCode ? (
                <InfoRow
                  icon={Users}
                  label="Your Referral Code"
                  value={(user as any).referralCode}
                  onCopy={() => copyToClipboard((user as any).referralCode, "Referral code", toast)}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">No referral code assigned.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href="/change-password">
                <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-goto-security">
                  <ShieldCheck className="w-4 h-4" />
                  Change Password / PIN
                </Button>
              </Link>
              <Link href="/kyc">
                <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-goto-kyc">
                  <UserCircle className="w-4 h-4" />
                  KYC Verification
                  <span className="ml-auto">{verificationBadge}</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
