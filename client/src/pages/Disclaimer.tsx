import PublicNavbar from "@/components/PublicNavbar";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-disclaimer-heading">Disclaimer</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">General Disclaimer</h2>
            <p>The information and services provided by Altcryptotrade are for general informational and trading purposes only. Nothing on this platform constitutes financial, investment, legal, or tax advice. You should consult with qualified professionals before making any financial decisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Trading Risks</h2>
            <p>Cryptocurrency trading involves substantial risk of loss. The value of digital assets is highly volatile and can fluctuate significantly in short periods. Past performance is not indicative of future results. You should only trade with funds you can afford to lose entirely.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">No Guarantees</h2>
            <p>We do not guarantee the accuracy, completeness, or timeliness of any market data, price information, or trading results displayed on our platform. Market data is sourced from third-party providers and may be subject to delays or inaccuracies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Platform Availability</h2>
            <p>We strive to maintain continuous platform availability but do not guarantee uninterrupted access. The platform may experience downtime due to maintenance, upgrades, or circumstances beyond our control. We are not liable for any losses resulting from platform unavailability.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Regulatory Compliance</h2>
            <p>Cryptocurrency regulations vary by jurisdiction and are subject to change. It is your sole responsibility to determine whether your use of our services complies with applicable laws in your jurisdiction. We make no representations regarding the legality of our services in any particular jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">External Links</h2>
            <p>Our platform may contain links to external websites or services. We are not responsible for the content, privacy practices, or availability of these external resources. Inclusion of any external link does not imply endorsement.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
