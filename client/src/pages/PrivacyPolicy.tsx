import PublicNavbar from "@/components/PublicNavbar";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-privacy-heading">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p>We collect personal information that you provide during account registration, including your name, email address, and phone number. We also collect identity verification documents as part of our KYC process, transaction records, and usage data related to your interactions with our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>Your personal information is used to provide and maintain our services, verify your identity, process transactions, communicate with you about your account, comply with legal obligations, and improve our platform's security and functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Data Security</h2>
            <p>We implement industry-standard security measures to protect your personal data, including encryption of sensitive information, secure data storage, and regular security audits. Passwords are hashed using bcrypt and withdrawal PINs are stored securely.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal information to third parties. We may share information with law enforcement agencies when required by law, with service providers who assist in operating our platform, and with regulatory authorities as part of compliance obligations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Cookies and Tracking</h2>
            <p>We use essential cookies and local storage to maintain your session, store authentication tokens, and provide a seamless user experience. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide services. Transaction records are retained for compliance purposes. You may request deletion of your account data by contacting our support team.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You may also request a copy of your data or object to certain processing activities. To exercise these rights, please contact our support team.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any significant changes via email or through a notice on our platform. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
