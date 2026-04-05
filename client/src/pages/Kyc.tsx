import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";

export default function Kyc() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitKyc = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(api.kyc.submit.path, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("KYC submission failed");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "KYC Submitted", description: "Your documents are under review." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    submitKyc.mutate(formData);
  };

  const statusColors = {
    UNVERIFIED: "text-red-500",
    PENDING: "text-yellow-500",
    VERIFIED: "text-emerald-500",
    REJECTED: "text-red-500"
  };

  const StatusIcon = {
    UNVERIFIED: AlertTriangle,
    PENDING: Clock,
    VERIFIED: ShieldCheck,
    REJECTED: AlertTriangle
  }[user?.verificationStatus || "UNVERIFIED"];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
        <h1 className="text-3xl font-display font-bold mb-8">Identity Verification</h1>

        <Card className="max-w-2xl bg-card border-border shadow-lg">
          <CardHeader className="border-b border-border/50">
            <div className="flex justify-between items-center">
              <CardTitle>KYC Application</CardTitle>
              <div className={`flex items-center gap-2 font-bold ${statusColors[user?.verificationStatus || "UNVERIFIED"]}`}>
                <StatusIcon className="w-5 h-5" />
                {user?.verificationStatus}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {user?.verificationStatus === "UNVERIFIED" || user?.verificationStatus === "REJECTED" ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input name="fullName" required placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input name="phone" required placeholder="+1 234..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Full Address</Label>
                  <Input name="address" required placeholder="123 Street, City, Country" />
                </div>

                <div className="space-y-2">
                  <Label>ID Number (Passport / National ID)</Label>
                  <Input name="idNumber" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ID Document (Front)</Label>
                    <Input name="idImage" type="file" accept="image/*" required className="cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Selfie with ID</Label>
                    <Input name="selfieImage" type="file" accept="image/*" required className="cursor-pointer" />
                  </div>
                </div>

                {user?.verificationStatus === "REJECTED" && (
                   <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                     <strong>Previous Application Rejected:</strong> {user.kycData?.rejectionReason || "Details not provided."}
                   </div>
                )}

                <Button type="submit" className="w-full" disabled={submitKyc.isPending}>
                  {submitKyc.isPending ? "Submitting..." : "Submit for Review"}
                </Button>
              </form>
            ) : (
              <div className="text-center py-12 space-y-4">
                <StatusIcon className={`w-16 h-16 mx-auto ${statusColors[user?.verificationStatus || "UNVERIFIED"]}`} />
                <h3 className="text-xl font-bold">
                  {user?.verificationStatus === "PENDING" ? "Under Review" : "You are Verified!"}
                </h3>
                <p className="text-muted-foreground">
                  {user?.verificationStatus === "PENDING" 
                    ? "Our team is reviewing your documents. This usually takes 24 hours." 
                    : "You now have full access to all platform features including unlimited withdrawals."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
