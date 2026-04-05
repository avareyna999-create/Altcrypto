import PublicNavbar from "@/components/PublicNavbar";

export default function WhitePaper() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-4" data-testid="text-whitepaper-heading">White Paper</h1>
        <p className="text-muted-foreground mb-10">Altcryptotrade Platform Overview</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Abstract</h2>
            <p>Altcryptotrade is a fixed-time cryptocurrency trading platform that allows users to trade on the price movements of major digital assets. This document outlines the platform's architecture, trading mechanics, and risk management framework.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
            <p>The cryptocurrency market operates 24/7, providing continuous trading opportunities. Altcryptotrade simplifies participation by offering fixed-time trades — users predict whether an asset's price will rise or fall within a specified duration, ranging from 30 seconds to 5 minutes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Platform Architecture</h2>
            <p>The platform is built on a modern full-stack architecture with a React frontend and Express.js backend, backed by PostgreSQL for data persistence. Real-time market data is sourced directly from Binance, ensuring accurate and up-to-date pricing for all supported trading pairs.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Supported Assets</h2>
            <p>Altcryptotrade supports 10 major cryptocurrency pairs against USDT: Bitcoin (BTC), Ethereum (ETH), Binance Coin (BNB), Solana (SOL), Ripple (XRP), Cardano (ADA), Dogecoin (DOGE), Avalanche (AVAX), Polygon (MATIC), and Chainlink (LINK).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Trading Mechanics</h2>
            <p>Users select a trading pair, choose a trade duration, and specify a trade amount that meets the minimum threshold for that duration. The entry price is recorded at the moment of trade placement. Upon expiry, the exit price is fetched from Binance. If the user's prediction is correct, they receive their original amount plus a profit percentage determined by the trade duration.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-border/50 rounded-md">
                <thead>
                  <tr className="border-b border-border/50 bg-card/50">
                    <th className="text-left p-3 font-bold text-foreground">Duration</th>
                    <th className="text-left p-3 font-bold text-foreground">Min Amount (USDT)</th>
                    <th className="text-left p-3 font-bold text-foreground">Profit Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["30 seconds", "100", "10%"],
                    ["60 seconds", "1,000", "15%"],
                    ["90 seconds", "5,000", "20%"],
                    ["120 seconds", "20,000", "25%"],
                    ["180 seconds", "50,000", "30%"],
                    ["240 seconds", "100,000", "40%"],
                    ["300 seconds", "150,000", "50%"],
                  ].map(([dur, min, rate], i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0">
                      <td className="p-3">{dur}</td>
                      <td className="p-3">{min}</td>
                      <td className="p-3 text-primary font-bold">{rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Deposits and Withdrawals</h2>
            <p>The platform supports USDT deposits and withdrawals across three blockchain networks: TRC20 (Tron), ERC20 (Ethereum), and BEP20 (Binance Smart Chain). Deposits are manually reviewed for security. Withdrawals require a 6-digit security PIN and are processed after admin approval.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Security</h2>
            <p>User accounts are protected by email-verified registration, JWT-based authentication, and bcrypt-hashed passwords. Withdrawals require a separate 6-digit PIN. KYC verification is available for enhanced account security and higher withdrawal limits.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Risk Disclosure</h2>
            <p>Cryptocurrency trading carries significant risk. Market prices are highly volatile and unpredictable. Users should only trade with funds they can afford to lose. Past performance does not guarantee future results. Altcryptotrade does not provide financial advice.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
