import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/lib/queryClient";
import type { Trade } from "@shared/schema";

type CreateTradeInput = z.infer<typeof api.trades.create.input>;

export function useTrades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trades, isLoading } = useQuery({
    queryKey: [api.trades.list.path],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(api.trades.list.path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch trades");
      return await res.json() as Trade[];
    },
    refetchInterval: 3000,
  });

  const createTradeMutation = useMutation({
    mutationFn: async (data: CreateTradeInput) => {
      const token = getAuthToken();
      const res = await fetch(api.trades.create.path, {
        method: api.trades.create.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to place trade");
      }
      return await res.json() as Trade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trades.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Trade Placed",
        description: "Your position has been opened successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Trade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    trades: trades || [],
    isLoading,
    createTrade: createTradeMutation.mutate,
    isCreating: createTradeMutation.isPending,
  };
}
