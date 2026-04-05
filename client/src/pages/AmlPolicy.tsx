import PublicNavbar from "@/components/PublicNavbar";

export default function AmlPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-aml-heading">Anti-Money Laundering Agreement</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Purpose</h2>
            <p>This Anti-Money Laundering (AML) policy outlines Altcryptotrade's commitment to preventing the use of our platform for money laundering, terrorist financing, and other illicit financial activities. We comply with applicable AML laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Know Your Customer (KYC)</h2>
            <p>All users are required to complete identity verification before accessing certain platform features. This includes providing government-issued identification documents and a selfie for identity confirmation. Enhanced due diligence may be required for high-value transactions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Transaction Monitoring</h2>
            <p>We continuously monitor transactions for suspicious activity, including unusual transaction patterns, rapid movement of funds, transactions inconsistent with a user's profile, and attempts to structure transactions to avoid reporting thresholds.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Suspicious Activity Reporting</h2>
            <p>When suspicious activity is identified, we will file appropriate reports with relevant authorities, may temporarily freeze the associated account pending investigation, and will cooperate fully with law enforcement agencies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Prohibited Activities</h2>
            <p>The following activities are strictly prohibited on our platform: money laundering or attempting to launder proceeds of crime, terrorist financing, fraud or fraudulent transactions, market manipulation, sanctions evasion, and any other activity that violates applicable laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Record Keeping</h2>
            <p>We maintain comprehensive records of all user identification documents, transaction histories, and suspicious activity reports for the period required by applicable law. These records are stored securely and are available for inspection by regulatory authorities.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Staff Training</h2>
            <p>Our team receives regular training on AML compliance, including identifying suspicious activities, understanding reporting obligations, and staying current with evolving regulatory requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Consequences of Violation</h2>
            <p>Users found to be in violation of this AML policy may have their accounts suspended or terminated, funds frozen pending investigation, and information reported to appropriate law enforcement and regulatory authorities.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
