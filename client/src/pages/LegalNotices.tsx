import PublicNavbar from "@/components/PublicNavbar";

export default function LegalNotices() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-legal-heading">Legal Notices</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Company Information</h2>
            <p>Altcryptotrade is a cryptocurrency trading platform operated in compliance with applicable laws and regulations. Our services are provided on an "as is" and "as available" basis.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Intellectual Property</h2>
            <p>All content, trademarks, logos, and intellectual property displayed on this platform are the property of Altcryptotrade or its licensors. Unauthorized reproduction, distribution, or modification of any content is strictly prohibited without prior written consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Third-Party Services</h2>
            <p>Our platform integrates with third-party services including Binance for market data and various blockchain networks for transaction processing. We are not responsible for the availability, accuracy, or performance of these third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Jurisdictional Restrictions</h2>
            <p>Our services may not be available in all jurisdictions. It is your responsibility to ensure that your use of our platform complies with the laws and regulations applicable in your jurisdiction. We reserve the right to restrict access from certain regions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Dispute Resolution</h2>
            <p>Any disputes arising from the use of our platform shall be resolved through good-faith negotiation. If a resolution cannot be reached, disputes will be submitted to binding arbitration in accordance with applicable arbitration rules.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Altcryptotrade shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to loss of profits, data, or other intangible losses.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
