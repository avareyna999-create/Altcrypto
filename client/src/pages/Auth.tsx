import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, KeyRound, Lock, Wallet } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+1", country: "US", name: "United States" },
  { code: "+1", country: "CA", name: "Canada" },
  { code: "+44", country: "GB", name: "United Kingdom" },
  { code: "+91", country: "IN", name: "India" },
  { code: "+86", country: "CN", name: "China" },
  { code: "+81", country: "JP", name: "Japan" },
  { code: "+82", country: "KR", name: "South Korea" },
  { code: "+49", country: "DE", name: "Germany" },
  { code: "+33", country: "FR", name: "France" },
  { code: "+39", country: "IT", name: "Italy" },
  { code: "+34", country: "ES", name: "Spain" },
  { code: "+351", country: "PT", name: "Portugal" },
  { code: "+31", country: "NL", name: "Netherlands" },
  { code: "+32", country: "BE", name: "Belgium" },
  { code: "+41", country: "CH", name: "Switzerland" },
  { code: "+43", country: "AT", name: "Austria" },
  { code: "+46", country: "SE", name: "Sweden" },
  { code: "+47", country: "NO", name: "Norway" },
  { code: "+45", country: "DK", name: "Denmark" },
  { code: "+358", country: "FI", name: "Finland" },
  { code: "+48", country: "PL", name: "Poland" },
  { code: "+420", country: "CZ", name: "Czech Republic" },
  { code: "+36", country: "HU", name: "Hungary" },
  { code: "+40", country: "RO", name: "Romania" },
  { code: "+380", country: "UA", name: "Ukraine" },
  { code: "+7", country: "RU", name: "Russia" },
  { code: "+90", country: "TR", name: "Turkey" },
  { code: "+966", country: "SA", name: "Saudi Arabia" },
  { code: "+971", country: "AE", name: "UAE" },
  { code: "+974", country: "QA", name: "Qatar" },
  { code: "+965", country: "KW", name: "Kuwait" },
  { code: "+973", country: "BH", name: "Bahrain" },
  { code: "+968", country: "OM", name: "Oman" },
  { code: "+972", country: "IL", name: "Israel" },
  { code: "+20", country: "EG", name: "Egypt" },
  { code: "+234", country: "NG", name: "Nigeria" },
  { code: "+27", country: "ZA", name: "South Africa" },
  { code: "+254", country: "KE", name: "Kenya" },
  { code: "+233", country: "GH", name: "Ghana" },
  { code: "+255", country: "TZ", name: "Tanzania" },
  { code: "+256", country: "UG", name: "Uganda" },
  { code: "+55", country: "BR", name: "Brazil" },
  { code: "+52", country: "MX", name: "Mexico" },
  { code: "+54", country: "AR", name: "Argentina" },
  { code: "+56", country: "CL", name: "Chile" },
  { code: "+57", country: "CO", name: "Colombia" },
  { code: "+51", country: "PE", name: "Peru" },
  { code: "+58", country: "VE", name: "Venezuela" },
  { code: "+61", country: "AU", name: "Australia" },
  { code: "+64", country: "NZ", name: "New Zealand" },
  { code: "+65", country: "SG", name: "Singapore" },
  { code: "+60", country: "MY", name: "Malaysia" },
  { code: "+62", country: "ID", name: "Indonesia" },
  { code: "+63", country: "PH", name: "Philippines" },
  { code: "+66", country: "TH", name: "Thailand" },
  { code: "+84", country: "VN", name: "Vietnam" },
  { code: "+880", country: "BD", name: "Bangladesh" },
  { code: "+92", country: "PK", name: "Pakistan" },
  { code: "+94", country: "LK", name: "Sri Lanka" },
  { code: "+977", country: "NP", name: "Nepal" },
  { code: "+95", country: "MM", name: "Myanmar" },
  { code: "+855", country: "KH", name: "Cambodia" },
  { code: "+856", country: "LA", name: "Laos" },
  { code: "+852", country: "HK", name: "Hong Kong" },
  { code: "+886", country: "TW", name: "Taiwan" },
  { code: "+353", country: "IE", name: "Ireland" },
  { code: "+354", country: "IS", name: "Iceland" },
  { code: "+30", country: "GR", name: "Greece" },
  { code: "+385", country: "HR", name: "Croatia" },
  { code: "+381", country: "RS", name: "Serbia" },
  { code: "+359", country: "BG", name: "Bulgaria" },
  { code: "+370", country: "LT", name: "Lithuania" },
  { code: "+371", country: "LV", name: "Latvia" },
  { code: "+372", country: "EE", name: "Estonia" },
  { code: "+212", country: "MA", name: "Morocco" },
  { code: "+216", country: "TN", name: "Tunisia" },
  { code: "+213", country: "DZ", name: "Algeria" },
  { code: "+237", country: "CM", name: "Cameroon" },
  { code: "+225", country: "CI", name: "Ivory Coast" },
  { code: "+221", country: "SN", name: "Senegal" },
];

export default function AuthPage({ defaultTab = "login" }: { defaultTab?: string }) {
  const { login, register, verifyOtp, resendOtp, isLoggingIn, isRegistering, isVerifyingOtp, isResendingOtp, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [selectedCountryIdx, setSelectedCountryIdx] = useState(0);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);
  const ccRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRY_CODES[selectedCountryIdx];
  const countryCode = selectedCountry.code;

  const [metamaskLoading, setMetamaskLoading] = useState(false);

  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "newpass" | null>(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtpValues, setForgotOtpValues] = useState(["", "", "", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ccRef.current && !ccRef.current.contains(e.target as Node)) {
        setCcDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (forgotCountdown > 0) {
      const timer = setTimeout(() => setForgotCountdown(forgotCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotCountdown]);

  const handleForgotSendOtp = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/send-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, type: "reset_password" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.message || "Failed to send OTP", variant: "destructive" });
        return;
      }
      toast({ title: "OTP sent to your email" });
      setForgotStep("otp");
      setForgotCountdown(60);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...forgotOtpValues];
    newValues[index] = value.slice(-1);
    setForgotOtpValues(newValues);
    if (value && index < 5) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotOtpValues[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newValues = [...forgotOtpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || "";
    }
    setForgotOtpValues(newValues);
    const nextEmpty = newValues.findIndex(v => !v);
    forgotOtpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleForgotVerifyOtp = () => {
    const otp = forgotOtpValues.join("");
    if (otp.length !== 6) return;
    setForgotStep("newpass");
  };

  const handleForgotResetPassword = async () => {
    if (forgotNewPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOtpValues.join(""),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.message || "Failed to reset password", variant: "destructive" });
        return;
      }
      toast({ title: "Password reset successfully! You can now log in." });
      setForgotStep(null);
      setForgotEmail("");
      setForgotOtpValues(["", "", "", "", "", ""]);
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotState = () => {
    setForgotStep(null);
    setForgotEmail("");
    setForgotOtpValues(["", "", "", "", "", ""]);
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotCountdown(0);
  };

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  const handleMetaMaskLogin = async () => {
    if (!(window as any).ethereum) {
      toast({ title: "MetaMask not detected", description: "Please install MetaMask browser extension to use this feature.", variant: "destructive" });
      return;
    }
    setMetamaskLoading(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const message = "Sign this message to login to AltCrypto";
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/auth/metamask-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, signature }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.message || "MetaMask login failed", variant: "destructive" });
        return;
      }
      localStorage.setItem("auth_token", data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err?.code === 4001) {
        toast({ title: "Signature rejected", description: "You must sign the message to log in.", variant: "destructive" });
      } else {
        toast({ title: "MetaMask login failed", description: err?.message || "An error occurred.", variant: "destructive" });
      }
    } finally {
      setMetamaskLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    login({
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const fullPhone = phoneDigits ? `${countryCode}${phoneDigits}` : undefined;
    try {
      const result = await register({
        username: formData.get("username") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        phoneNumber: fullPhone,
        referralCode: referralCode.trim() || undefined,
      });
      if (result?.requireOTP) {
        setOtpEmail(result.email);
        setOtpStep(true);
        setCountdown(60);
      }
    } catch {}
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || "";
    }
    setOtpValues(newValues);
    const nextEmpty = newValues.findIndex(v => !v);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleVerifyOtp = () => {
    const otp = otpValues.join("");
    if (otp.length !== 6) return;
    verifyOtp({ email: otpEmail, otp });
  };

  const handleResendOtp = () => {
    resendOtp({ email: otpEmail });
    setCountdown(60);
  };

  if (otpStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px]" />
        </div>

        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display font-bold text-foreground" data-testid="text-otp-title">
              Verify Your Email
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              We sent a 6-digit code to <span className="text-foreground font-medium" data-testid="text-otp-email">{otpEmail}</span>
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
              {otpValues.map((val, i) => (
                <Input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-background/50"
                  data-testid={`input-otp-${i}`}
                />
              ))}
            </div>

            <Button
              onClick={handleVerifyOtp}
              className="w-full bg-primary font-bold mb-4"
              disabled={otpValues.join("").length !== 6 || isVerifyingOtp}
              data-testid="button-verify-otp"
            >
              {isVerifyingOtp ? "Verifying..." : "Verify Email"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {countdown > 0 ? (
                <p data-testid="text-otp-countdown">Resend code in <span className="text-foreground font-medium">{countdown}s</span></p>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  data-testid="button-resend-otp"
                >
                  {isResendingOtp ? "Sending..." : "Resend Code"}
                </Button>
              )}
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtpStep(false);
                  setOtpValues(["", "", "", "", "", ""]);
                }}
                data-testid="button-back-register"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Register
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forgotStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px]" />
        </div>

        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border shadow-2xl relative z-10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              {forgotStep === "email" && <KeyRound className="w-7 h-7 text-primary" />}
              {forgotStep === "otp" && <Mail className="w-7 h-7 text-primary" />}
              {forgotStep === "newpass" && <Lock className="w-7 h-7 text-primary" />}
            </div>
            <CardTitle className="text-2xl font-display font-bold text-foreground" data-testid="text-forgot-title">
              {forgotStep === "email" && "Forgot Password"}
              {forgotStep === "otp" && "Enter Verification Code"}
              {forgotStep === "newpass" && "Set New Password"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {forgotStep === "email" && "Enter your email address to receive a reset code"}
              {forgotStep === "otp" && <>We sent a 6-digit code to <span className="text-foreground font-medium">{forgotEmail}</span></>}
              {forgotStep === "newpass" && "Create a new password for your account"}
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {forgotStep === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="bg-background/50"
                    data-testid="input-forgot-email"
                  />
                </div>
                <Button
                  onClick={handleForgotSendOtp}
                  className="w-full bg-primary font-bold"
                  disabled={forgotLoading || !forgotEmail}
                  data-testid="button-forgot-send"
                >
                  {forgotLoading ? "Sending..." : "Send Reset Code"}
                </Button>
              </div>
            )}

            {forgotStep === "otp" && (
              <div className="space-y-4">
                <div className="flex justify-center gap-2" onPaste={handleForgotOtpPaste}>
                  {forgotOtpValues.map((val, i) => (
                    <Input
                      key={i}
                      ref={(el) => { forgotOtpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleForgotOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleForgotOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold bg-background/50"
                      data-testid={`input-forgot-otp-${i}`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleForgotVerifyOtp}
                  className="w-full bg-primary font-bold"
                  disabled={forgotOtpValues.join("").length !== 6}
                  data-testid="button-forgot-verify"
                >
                  Verify Code
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {forgotCountdown > 0 ? (
                    <p>Resend code in <span className="text-foreground font-medium">{forgotCountdown}s</span></p>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { handleForgotSendOtp(); }}
                      disabled={forgotLoading}
                      data-testid="button-forgot-resend"
                    >
                      {forgotLoading ? "Sending..." : "Resend Code"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {forgotStep === "newpass" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-new-password">New Password</Label>
                  <Input
                    id="forgot-new-password"
                    type="password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="bg-background/50"
                    data-testid="input-forgot-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forgot-confirm-password">Confirm Password</Label>
                  <Input
                    id="forgot-confirm-password"
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="bg-background/50"
                    data-testid="input-forgot-confirm-password"
                  />
                </div>
                <Button
                  onClick={handleForgotResetPassword}
                  className="w-full bg-primary font-bold"
                  disabled={forgotLoading || forgotNewPassword.length < 6 || forgotNewPassword !== forgotConfirmPassword}
                  data-testid="button-forgot-reset"
                >
                  {forgotLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            )}

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetForgotState}
                data-testid="button-forgot-back"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-display font-bold bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">
            AltCrypto
          </CardTitle>
          <p className="text-sm text-muted-foreground">Professional Trading Platform</p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input id="login-username" name="username" required className="bg-background/50" data-testid="input-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" required className="bg-background/50" data-testid="input-password" />
                </div>
                <Button type="submit" className="w-full bg-primary font-bold" disabled={isLoggingIn} data-testid="button-login">
                  {isLoggingIn ? "Signing In..." : "Sign In"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotStep("email")}
                    className="text-sm text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-orange-500/40 hover:border-orange-500/70 hover:bg-orange-500/5"
                  onClick={handleMetaMaskLogin}
                  disabled={metamaskLoading}
                  data-testid="button-metamask-login"
                >
                  {metamaskLoading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 318.6 318.6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" points="274.1,35.5 174.6,109.4 193,65.8" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="44.4,35.5 143.1,110.1 125.6,65.8" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="103.6,138.2 87.8,162.1 144.1,164.6 142.1,104.1" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="214.9,138.2 175.9,103.4 174.6,164.6 230.8,162.1" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="106.8,247.4 140.6,230.9 111.4,208.1" />
                      <polygon fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" points="177.9,230.9 211.8,247.4 207.1,208.1" />
                    </svg>
                  )}
                  {metamaskLoading ? "Connecting..." : "Login with MetaMask"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input id="reg-username" name="username" required className="bg-background/50" data-testid="input-reg-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required className="bg-background/50" data-testid="input-reg-email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <div className="relative" ref={ccRef} data-testid="select-country-code">
                      <button
                        type="button"
                        onClick={() => setCcDropdownOpen(!ccDropdownOpen)}
                        className="flex items-center gap-1.5 bg-background/50 border border-input rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[120px] h-9"
                        data-testid="button-country-code"
                      >
                        <img
                          src={`https://flagcdn.com/20x15/${selectedCountry.country.toLowerCase()}.png`}
                          alt={selectedCountry.country}
                          className="w-5 h-[15px] object-cover rounded-[2px]"
                        />
                        <span>{selectedCountry.country} {selectedCountry.code}</span>
                        <svg className="w-3 h-3 ml-auto opacity-50" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      {ccDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-[220px] max-h-[240px] overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                          {COUNTRY_CODES.map((c, idx) => (
                            <button
                              key={`${c.country}-${c.code}`}
                              type="button"
                              onClick={() => { setSelectedCountryIdx(idx); setCcDropdownOpen(false); }}
                              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover-elevate ${idx === selectedCountryIdx ? "bg-primary/10 text-primary" : ""}`}
                              data-testid={`option-country-${c.country}`}
                            >
                              <img
                                src={`https://flagcdn.com/20x15/${c.country.toLowerCase()}.png`}
                                alt={c.country}
                                className="w-5 h-[15px] object-cover rounded-[2px] flex-shrink-0"
                              />
                              <span className="flex-1">{c.name}</span>
                              <span className="text-muted-foreground">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      type="tel"
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
                      placeholder="Phone number"
                      className="bg-background/50 flex-1"
                      data-testid="input-reg-phone"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" name="password" type="password" required className="bg-background/50" data-testid="input-reg-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-referral">Referral Code (Optional)</Label>
                  <Input
                    id="reg-referral"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="bg-background/50"
                    data-testid="input-reg-referral"
                  />
                </div>
                <Button type="submit" className="w-full bg-primary font-bold" disabled={isRegistering} data-testid="button-register">
                  {isRegistering ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
