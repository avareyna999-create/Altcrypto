import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Share2, Gift, Link as LinkIcon } from "lucide-react";

export default function Referral() {
  const { user } = useAuth();
  const { toast } = useToast();

  const referralCode = (user as any)?.referralCode ?? "";
  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : "";

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied to clipboard` });
    });
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 overflow-y-auto">
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display text-foreground" data-testid="text-referral-heading">
              Referral Program
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Invite friends and grow your network
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-emerald-500/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">How it works</h3>
                    <p className="text-sm text-muted-foreground">
                      Share your referral code or link with friends. When they register using your code, they become part of your network.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 border-border mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Your Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralCode ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted/30 border border-border rounded-lg px-4 py-3">
                    <p
                      className="font-mono text-xl font-bold tracking-widest text-foreground text-center"
                      data-testid="text-referral-code"
                    >
                      {referralCode}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copy(referralCode, "Referral code")}
                    className="h-12 w-12 shrink-0"
                    data-testid="button-copy-code"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No referral code assigned yet.</p>
              )}
            </CardContent>
          </Card>

          {referralLink && (
            <Card className="bg-card/50 border-border mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Referral Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted/30 border border-border rounded-lg px-4 py-3 overflow-hidden">
                    <p
                      className="text-sm text-muted-foreground truncate font-mono"
                      data-testid="text-referral-link"
                    >
                      {referralLink}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copy(referralLink, "Referral link")}
                    className="h-12 w-12 shrink-0"
                    data-testid="button-copy-link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  className="w-full mt-3 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                  variant="ghost"
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({ title: "Join AltCrypto", url: referralLink });
                    } else {
                      copy(referralLink, "Referral link");
                    }
                  }}
                  data-testid="button-share"
                >
                  <Share2 className="w-4 h-4" />
                  Share Referral Link
                </Button>
              </CardContent>
            </Card>
          )}

          {(user as any)?.referredBy && (
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Referrer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You joined using referral code:{" "}
                  <span className="font-mono font-semibold text-foreground" data-testid="text-referred-by">
                    {(user as any).referredBy}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
