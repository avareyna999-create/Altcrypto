import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound, Mail, Loader2 } from "lucide-react";

export default function ChangePassword() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const [resetMode, setResetMode] = useState<"password" | "pin" | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewValue, setResetNewValue] = useState("");
  const [resetConfirmValue, setResetConfirmValue] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "otp">("email");
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetValue, setShowResetValue] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Error", description: parsed || "Failed to change password", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(pin)) {
      toast({ title: "Error", description: "PIN must be exactly 6 digits", variant: "destructive" });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: "Error", description: "PINs do not match", variant: "destructive" });
      return;
    }

    setPinLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/set-withdrawal-pin", {
        pin,
        currentPassword: pinPassword,
      });
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      setPin("");
      setConfirmPin("");
      setPinPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Error", description: parsed || "Failed to set PIN", variant: "destructive" });
    } finally {
      setPinLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!resetEmail) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
      return;
    }

    setResetLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/send-reset-otp", {
        email: resetEmail,
        type: resetMode === "pin" ? "reset_pin" : "reset_password",
      });
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      setResetStep("otp");
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Error", description: parsed || "Failed to send OTP", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!resetOtp || !resetNewValue) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (resetMode === "password") {
      if (resetNewValue.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
        return;
      }
      if (resetNewValue !== resetConfirmValue) {
        toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
        return;
      }
    } else {
      if (!/^\d{6}$/.test(resetNewValue)) {
        toast({ title: "Error", description: "PIN must be exactly 6 digits", variant: "destructive" });
        return;
      }
      if (resetNewValue !== resetConfirmValue) {
        toast({ title: "Error", description: "PINs do not match", variant: "destructive" });
        return;
      }
    }

    setResetLoading(true);
    try {
      const endpoint = resetMode === "pin" ? "/api/auth/reset-withdrawal-pin" : "/api/auth/reset-password";
      const body = resetMode === "pin"
        ? { email: resetEmail, otp: resetOtp, newPin: resetNewValue }
        : { email: resetEmail, otp: resetOtp, newPassword: resetNewValue };

      const res = await apiRequest("POST", endpoint, body);
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      closeResetModal();
      if (resetMode === "pin") {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    } catch (err: any) {
      const msg = err.message?.includes(":") ? err.message.split(": ").slice(1).join(": ") : err.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Error", description: parsed || "Reset failed", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setResetMode(null);
    setResetEmail("");
    setResetOtp("");
    setResetNewValue("");
    setResetConfirmValue("");
    setResetStep("email");
    setShowResetValue(false);
  };

  const hasPin = !!(user as any)?.hasWithdrawalPin;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Security Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your password and withdrawal PIN</p>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <KeyRound className="w-4 h-4" /> Change Password
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetMode("password")}
                data-testid="button-forgot-password"
              >
                Forgot?
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      data-testid="input-current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowCurrent(!showCurrent)}
                      data-testid="button-toggle-current"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      data-testid="input-new-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowNew(!showNew)}
                      data-testid="button-toggle-new"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      data-testid="input-confirm-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowConfirm(!showConfirm)}
                      data-testid="button-toggle-confirm"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-change-password"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</> : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4" /> Withdrawal PIN
              </CardTitle>
              {hasPin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetMode("pin")}
                  data-testid="button-reset-pin"
                >
                  Reset PIN
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {hasPin ? (
                <div className="text-center py-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Your withdrawal PIN is set</p>
                  <p className="text-xs text-muted-foreground">You can reset it using email verification</p>
                </div>
              ) : (
                <form onSubmit={handleSetPin} className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Set a 6-digit PIN to secure your withdrawals
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="pin">6-Digit PIN</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      data-testid="input-set-pin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">Confirm PIN</Label>
                    <Input
                      id="confirmPin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Re-enter 6-digit PIN"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      data-testid="input-confirm-pin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pinPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="pinPassword"
                        type={showPinPassword ? "text" : "password"}
                        placeholder="Verify with your password"
                        value={pinPassword}
                        onChange={(e) => setPinPassword(e.target.value)}
                        required
                        data-testid="input-pin-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPinPassword(!showPinPassword)}
                        data-testid="button-toggle-pin-password"
                      >
                        {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pinLoading}
                    data-testid="button-set-pin"
                  >
                    {pinLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting PIN...</> : "Set Withdrawal PIN"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {resetMode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="modal-reset">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <Mail className="w-4 h-4" />
                {resetMode === "password" ? "Reset Password" : "Reset Withdrawal PIN"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetStep === "email" ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter your registered email to receive a verification code.
                  </p>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      data-testid="input-reset-email"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={closeResetModal} data-testid="button-reset-cancel">
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleSendResetOtp} disabled={resetLoading} data-testid="button-send-otp">
                      {resetLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send OTP"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to {resetEmail}
                  </p>
                  <div className="space-y-2">
                    <Label>Verification Code</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      data-testid="input-reset-otp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{resetMode === "password" ? "New Password" : "New 6-Digit PIN"}</Label>
                    <div className="relative">
                      <Input
                        type={showResetValue ? "text" : "password"}
                        inputMode={resetMode === "pin" ? "numeric" : undefined}
                        maxLength={resetMode === "pin" ? 6 : undefined}
                        placeholder={resetMode === "password" ? "Min 6 characters" : "Enter 6-digit PIN"}
                        value={resetNewValue}
                        onChange={(e) => {
                          if (resetMode === "pin") {
                            setResetNewValue(e.target.value.replace(/\D/g, "").slice(0, 6));
                          } else {
                            setResetNewValue(e.target.value);
                          }
                        }}
                        data-testid="input-reset-new-value"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowResetValue(!showResetValue)}
                        data-testid="button-toggle-reset-value"
                      >
                        {showResetValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{resetMode === "password" ? "Confirm Password" : "Confirm PIN"}</Label>
                    <Input
                      type={showResetValue ? "text" : "password"}
                      inputMode={resetMode === "pin" ? "numeric" : undefined}
                      maxLength={resetMode === "pin" ? 6 : undefined}
                      placeholder={resetMode === "password" ? "Confirm password" : "Re-enter PIN"}
                      value={resetConfirmValue}
                      onChange={(e) => {
                        if (resetMode === "pin") {
                          setResetConfirmValue(e.target.value.replace(/\D/g, "").slice(0, 6));
                        } else {
                          setResetConfirmValue(e.target.value);
                        }
                      }}
                      data-testid="input-reset-confirm-value"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={closeResetModal} data-testid="button-reset-cancel-2">
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleResetSubmit} disabled={resetLoading} data-testid="button-reset-submit">
                      {resetLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</> : "Reset"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
