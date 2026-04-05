import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/queryClient";
import type { Deposit, Withdrawal } from "@shared/schema";

export function useDeposits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deposits, isLoading } = useQuery({
    queryKey: [api.deposits.list.path],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(api.deposits.list.path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch deposits");
      return await res.json() as Deposit[];
    },
  });

  const createDeposit = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = getAuthToken();
      const res = await fetch(api.deposits.create.path, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Deposit submission failed" }));
        throw new Error(err.message || "Deposit submission failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deposits.list.path] });
      toast({ title: "Deposit Submitted", description: "Waiting for admin approval." });
    },
    onError: (err: Error) => {
      toast({ title: "Deposit Failed", description: err.message, variant: "destructive" });
    },
  });

  return { deposits: deposits || [], isLoading, createDeposit };
}

export function useWithdrawals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: [api.withdrawals.list.path],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(api.withdrawals.list.path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      return await res.json() as Withdrawal[];
    },
  });

  const createWithdrawal = useMutation({
    mutationFn: async (data: any) => {
      const token = getAuthToken();
      const res = await fetch(api.withdrawals.create.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Withdrawal request failed" }));
        throw new Error(err.message || "Withdrawal request failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.withdrawals.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Withdrawal Requested", description: "Your request is being processed." });
    },
    onError: (err: Error) => {
      toast({ title: "Withdrawal Failed", description: err.message, variant: "destructive" });
    },
  });

  return { withdrawals: withdrawals || [], isLoading, createWithdrawal };
}
