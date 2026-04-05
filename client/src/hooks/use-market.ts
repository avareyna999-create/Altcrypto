import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useMarketPrices() {
  return useQuery({
    queryKey: [api.market.prices.path],
    queryFn: async () => {
      const res = await fetch(api.market.prices.path);
      if (!res.ok) throw new Error("Failed to fetch prices");
      return await res.json() as Record<string, string>;
    },
    refetchInterval: 1000, // High frequency polling for prices
  });
}
