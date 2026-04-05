import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { Loader2 } from "lucide-react";

import Homepage from "@/pages/Homepage";
import Market from "@/pages/Market";
import Dashboard from "@/pages/Dashboard";
import Trading from "@/pages/Trading";
import Wallet from "@/pages/Wallet";
import Kyc from "@/pages/Kyc";
import AdminPanel from "@/pages/AdminPanel";
import ChangePassword from "@/pages/ChangePassword";
import AuthPage from "@/pages/Auth";
import AboutUs from "@/pages/AboutUs";
import UserAgreement from "@/pages/UserAgreement";
import WhitePaper from "@/pages/WhitePaper";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import LegalNotices from "@/pages/LegalNotices";
import LawEnforcement from "@/pages/LawEnforcement";
import Disclaimer from "@/pages/Disclaimer";
import AmlPolicy from "@/pages/AmlPolicy";
import LoanPage from "@/pages/Loan";
import Convert from "@/pages/Convert";
import Profile from "@/pages/Profile";
import Transactions from "@/pages/Transactions";
import Referral from "@/pages/Referral";
import DownloadPage from "@/pages/Download";
import ContactPage from "@/pages/Contact";
import NotFound from "@/pages/not-found";
import { SupportChatWidget } from "@/components/SupportChatWidget";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !user) {
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/market" component={Market} />
      <Route path="/login">{() => <AuthPage defaultTab="login" />}</Route>
      <Route path="/register">{() => <AuthPage defaultTab="register" />}</Route>
      <Route path="/auth">{() => <AuthPage />}</Route>
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/trading" component={() => <ProtectedRoute component={Trading} />} />
      <Route path="/wallet" component={() => <ProtectedRoute component={Wallet} />} />
      <Route path="/kyc" component={() => <ProtectedRoute component={Kyc} />} />
      <Route path="/change-password" component={() => <ProtectedRoute component={ChangePassword} />} />
      <Route path="/loan" component={() => <ProtectedRoute component={LoanPage} />} />
      <Route path="/convert" component={() => <ProtectedRoute component={Convert} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={Transactions} />} />
      <Route path="/referral" component={() => <ProtectedRoute component={Referral} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} />} />
      <Route path="/download" component={DownloadPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/about" component={AboutUs} />
      <Route path="/user-agreement" component={UserAgreement} />
      <Route path="/white-paper" component={WhitePaper} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/legal-notices" component={LegalNotices} />
      <Route path="/law-enforcement" component={LawEnforcement} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/aml-policy" component={AmlPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <SupportChatWidget />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
