import PublicNavbar from "@/components/PublicNavbar";
import { Shield, Users, Globe, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-about-heading">About Us</h1>
        <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
          Altcryptotrade is a professional cryptocurrency trading platform designed for both beginners and experienced traders.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              We are committed to providing a secure, transparent, and user-friendly trading environment. Our mission is to make cryptocurrency trading accessible to everyone, offering advanced tools and real-time market data to help traders make informed decisions.
            </p>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Security First</h3>
                  <p className="text-sm text-muted-foreground">Advanced encryption and multi-layer security protect your funds and personal data at all times.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Fast Execution</h3>
                  <p className="text-sm text-muted-foreground">Execute trades in seconds with real-time market data and instant order processing.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Global Access</h3>
                  <p className="text-sm text-muted-foreground">Trade from anywhere in the world with support for multiple networks including TRC20, ERC20, and BEP20.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">24/7 Support</h3>
                  <p className="text-sm text-muted-foreground">Our dedicated support team is available around the clock to assist you with any questions or issues.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="text-2xl font-bold mb-4">Why Choose Us</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">-</span>
                <span>10+ cryptocurrency trading pairs with real-time Binance market data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">-</span>
                <span>Fixed-time trading with flexible durations from 30 seconds to 5 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">-</span>
                <span>Competitive profit rates up to 50% on successful trades</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">-</span>
                <span>Fast and secure deposits and withdrawals via USDT (TRC20, ERC20, BEP20)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">-</span>
                <span>KYC verification for enhanced account security</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
