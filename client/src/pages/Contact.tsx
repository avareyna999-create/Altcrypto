import PublicNavbar from "@/components/PublicNavbar";
import { Mail, MessageSquare, Clock, Shield } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-sm font-medium mb-6">
            <MessageSquare className="w-4 h-4" />
            Get in Touch
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4" data-testid="text-contact-title">
            Contact Us
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Have a question or need help? Our support team is here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Email card */}
          <div className="glass-card rounded-2xl p-8 card-hover" data-testid="card-contact-email">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-foreground">Email Support</h2>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Send us an email and our team will get back to you as soon as possible.
            </p>
            <a
              href="mailto:support@altcryptotrading.com"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm"
              data-testid="link-support-email"
            >
              <Mail className="w-4 h-4" />
              support@altcryptotrading.com
            </a>
          </div>

          {/* Info cards column */}
          <div className="flex flex-col gap-6">
            <div className="glass-card rounded-2xl p-6 card-hover">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">Response Time</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We typically respond within 24 hours on business days.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 card-hover">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">Secure Communication</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Never share your password or private keys. Our team will never ask for them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* divider */}
        <div className="white-divider my-10" />

        {/* Common topics */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-foreground">Common Topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { topic: "Account & Login", desc: "Issues with signing in, account access, or MetaMask login." },
              { topic: "Deposits & Withdrawals", desc: "Questions about funding your account or withdrawing funds." },
              { topic: "KYC Verification", desc: "Help with identity verification and document submission." },
              { topic: "Trading Issues", desc: "Problems with trades, charts, or order execution." },
              { topic: "Security & PIN", desc: "Withdrawal PIN setup, password changes, or account security." },
              { topic: "Other Enquiries", desc: "Partnerships, press, or any other question not listed above." },
            ].map((item) => (
              <div key={item.topic} className="flex gap-3 p-4 rounded-xl bg-card/40 border border-border/50">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-foreground">{item.topic}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              For all enquiries, reach us at
            </p>
            <a
              href="mailto:support@altcryptotrading.com"
              className="text-primary font-bold hover:underline"
              data-testid="link-support-email-footer"
            >
              support@altcryptotrading.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
