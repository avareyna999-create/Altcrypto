import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Landmark, ArrowRight, Clock, DollarSign, Percent, AlertCircle } from "lucide-react";
import type { Loan } from "@shared/schema";

export default function LoanPage() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const { data: loans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const createLoan = useMutation({
    mutationFn: async (data: { amount: number; term: string }) => {
      const res = await apiRequest("POST", "/api/loans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setAmount("");
      setTerm("");
      setAgreed(false);
      toast({ title: "Loan request submitted", description: "Your loan request is under review." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to submit loan request", variant: "destructive" });
    },
  });

  const dailyInterestRate = 0.05;
  const parsedAmount = parseFloat(amount) || 0;
  const termDays = parseInt(term) || 0;
  const totalInterest = parseFloat((parsedAmount * dailyInterestRate / 100 * termDays).toFixed(2));
  const serviceFee = parseFloat((parsedAmount * 0.01).toFixed(2));
  const totalRepayment = parseFloat((parsedAmount + totalInterest + serviceFee).toFixed(2));

  const approvedLoans = loans.filter(l => l.status === "APPROVED");
  const totalBorrowed = approvedLoans.reduce((sum, l) => sum + parseFloat(l.amount), 0);
  const totalDue = approvedLoans.reduce((sum, l) => sum + parseFloat(l.totalRepayment), 0);

  const handleSubmit = () => {
    if (!parsedAmount || parsedAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (!term) {
      toast({ title: "Select term", description: "Please select a loan term", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "Agreement required", description: "Please agree to the loan terms", variant: "destructive" });
      return;
    }
    createLoan.mutate({ amount: parsedAmount, term });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2" data-testid="text-loan-heading">
                <Landmark className="w-6 h-6 text-primary" />
                Financial Loan
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Flexible lending, flexible financing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card className="bg-primary/10 border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Accumulated Borrowing</span>
                </div>
                <p className="text-2xl font-bold font-mono" data-testid="text-total-borrowed">{totalBorrowed.toFixed(2)} USDT</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Amount Due</span>
                </div>
                <p className="text-2xl font-bold font-mono" data-testid="text-amount-due">{totalDue.toFixed(2)} USDT</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Borrow Funds</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Number of borrowed coins</label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pr-16"
                        data-testid="input-loan-amount"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">USDT</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Loan term</label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger data-testid="select-loan-term">
                        <SelectValue placeholder="Select loan term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 accent-primary"
                      data-testid="checkbox-loan-agree"
                    />
                    <span className="text-xs text-muted-foreground">
                      I have agreed to the{" "}
                      <a href="/user-agreement" className="text-primary hover:underline">loan agreement</a>,{" "}
                      <a href="/disclaimer" className="text-primary hover:underline">explanation of loan rules</a>, and{" "}
                      <a href="/aml-policy" className="text-primary hover:underline">legal liability</a>
                    </span>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={createLoan.isPending || !agreed || !parsedAmount || !term}
                    className="w-full"
                    data-testid="button-submit-loan"
                  >
                    {createLoan.isPending ? "Submitting..." : "Immediately borrow currency"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Loan Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Percent className="w-3.5 h-3.5" /> Daily interest
                    </span>
                    <span className="text-sm font-mono">{dailyInterestRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total service fee</span>
                    <span className="text-sm font-mono">{serviceFee.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total interest</span>
                    <span className="text-sm font-mono">{totalInterest.toFixed(2)} USDT</span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Expected to be repaid</span>
                    <span className="text-sm font-mono font-bold text-primary">{totalRepayment.toFixed(2)} USDT</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Loan History
              </h3>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-5 bg-muted/50 rounded w-40 mb-2" />
                      <div className="h-4 bg-muted/50 rounded w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : loans.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center">
                  <Landmark className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No loan requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <Card key={loan.id} className="bg-card/50 border-border/50" data-testid={`card-loan-${loan.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono">{parseFloat(loan.amount).toFixed(2)} USDT</span>
                            <Badge
                              variant={loan.status === "APPROVED" ? "default" : loan.status === "REJECTED" ? "destructive" : "secondary"}
                              data-testid={`badge-loan-status-${loan.id}`}
                            >
                              {loan.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Term: {loan.term} days | Repayment: {parseFloat(loan.totalRepayment).toFixed(2)} USDT
                          </p>
                          {loan.adminNote && (
                            <p className="text-xs text-muted-foreground">Note: {loan.adminNote}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
