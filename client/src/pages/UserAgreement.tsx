import PublicNavbar from "@/components/PublicNavbar";

export default function UserAgreement() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-agreement-heading">User Agreement</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the Altcryptotrade platform, you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, you must not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Eligibility</h2>
            <p>You must be at least 18 years old to use our platform. By registering an account, you confirm that you meet this age requirement and that you have the legal capacity to enter into a binding agreement.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Account Registration</h2>
            <p>You are required to provide accurate and complete information during the registration process. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. KYC Verification</h2>
            <p>To comply with regulatory requirements, we may require you to complete identity verification (KYC). You agree to provide valid identification documents when requested. Failure to complete KYC may result in limitations on your account functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Trading</h2>
            <p>Fixed-time trading involves significant risk. You acknowledge that cryptocurrency prices are volatile and that past performance is not indicative of future results. You are solely responsible for your trading decisions and any resulting profits or losses.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Deposits and Withdrawals</h2>
            <p>Deposits and withdrawals are processed in USDT via supported networks (TRC20, ERC20, BEP20). You are responsible for ensuring the accuracy of wallet addresses. Transactions sent to incorrect addresses cannot be recovered. Withdrawal processing times may vary.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Prohibited Activities</h2>
            <p>You agree not to use our platform for any unlawful purposes, including but not limited to money laundering, fraud, or market manipulation. We reserve the right to suspend or terminate accounts engaged in prohibited activities.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>Altcryptotrade shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability is limited to the amount of funds in your account at the time of the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Modifications</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email or platform notification.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Contact</h2>
            <p>If you have questions about this agreement, please contact our support team through the in-app support widget.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
