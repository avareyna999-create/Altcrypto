import PublicNavbar from "@/components/PublicNavbar";

export default function LawEnforcement() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-law-enforcement-heading">Law Enforcement Request Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 2026</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Overview</h2>
            <p>Altcryptotrade is committed to cooperating with law enforcement agencies while protecting the privacy and rights of our users. This policy outlines how we handle requests for user information from law enforcement and government agencies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Types of Requests</h2>
            <p>We may respond to the following types of legal requests: subpoenas, court orders, search warrants, national security letters, and other legally binding requests from authorized law enforcement agencies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Information We May Disclose</h2>
            <p>Depending on the nature and scope of the request, we may provide: basic account information (name, email, registration date), transaction history, KYC documentation, IP addresses and login records, and account activity logs.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Request Requirements</h2>
            <p>All requests must be submitted in writing on official letterhead, include the requesting officer's contact information, specify the information sought, and cite the legal authority for the request. We review all requests for legal sufficiency before disclosing any information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">User Notification</h2>
            <p>Unless prohibited by law or court order, we will make reasonable efforts to notify affected users of law enforcement requests before disclosing their information, allowing them the opportunity to seek legal counsel.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Emergency Requests</h2>
            <p>In cases involving imminent threat of death or serious physical injury, we may voluntarily disclose information to law enforcement without a formal legal process, exercising good-faith judgment on a case-by-case basis.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
