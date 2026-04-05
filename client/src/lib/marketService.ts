const POPULARITY_ORDER = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","TRXUSDT","DOGEUSDT","ADAUSDT",
  "AVAXUSDT","LINKUSDT","DOTUSDT","LTCUSDT","SHIBUSDT","NEARUSDT","ATOMUSDT","APTUSDT",
  "FILUSDT","UNIUSDT","AAVEUSDT","MATICUSDT","OPUSDT","ARBUSDT","SUIUSDT","SEIUSDT",
  "FTMUSDT","STXUSDT","CRVUSDT","LDOUSDT","COMPUSDT","SNXUSDT","1INCHUSDT","DYDXUSDT",
  "FETUSDT","AGIXUSDT","OCEANUSDT","RNDRUSDT","ARKMUSDT","OKBUSDT","KCSUSDT",
  "SANDUSDT","MANAUSDT","AXSUSDT","GALAUSDT","IMXUSDT",
  "PEPEUSDT","FLOKIUSDT","BONKUSDT","WIFUSDT",
  "GRTUSDT","THETAUSDT",
];

export interface MarketCoin {
  symbol: string;
  price: number;
  priceChangePercent: number;
  volume: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  image?: string;
}

export async function fetchMarketData(): Promise<MarketCoin[]> {
  const res = await fetch("/api/market/24hr");
  if (!res.ok) throw new Error("Failed to fetch market data");
  const data = await res.json();

  return data
    .map((item: any) => ({
      symbol: item.symbol,
      price: parseFloat(item.lastPrice) || 0,
      priceChangePercent: parseFloat(item.priceChangePercent) || 0,
      volume: parseFloat(item.volume) || 0,
      highPrice: parseFloat(item.highPrice) || 0,
      lowPrice: parseFloat(item.lowPrice) || 0,
      quoteVolume: parseFloat(item.quoteVolume) || 0,
      image: item.image || "",
    }))
    .sort((a: MarketCoin, b: MarketCoin) => {
      const ia = POPULARITY_ORDER.indexOf(a.symbol);
      const ib = POPULARITY_ORDER.indexOf(b.symbol);
      const orderA = ia === -1 ? Infinity : ia;
      const orderB = ib === -1 ? Infinity : ib;
      return orderA - orderB;
    });
}

export function formatPrice(price: number | string | undefined | null): string {
  const n = Number(price);
  if (!n || isNaN(n)) return "0.00";
  if (n >= 1000) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(8).replace(/0+$/, "").padEnd(n < 0.0001 ? 10 : 6, "0");
}

export function formatVolume(volume: number | string | undefined | null): string {
  const n = Number(volume);
  if (!n || isNaN(n)) return "0.00";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(2);
}

export function getCoinLogoUrl(ticker: string): string {
  const t = ticker.toLowerCase();
  const localIcons: Record<string, boolean> = { near: true, apt: true, shib: true };
  if (localIcons[t]) return `/coin-icons/${t}.png`;
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${t}.png`;
}

export function getCoinName(symbol: string): string {
  const names: Record<string, string> = {
    BTCUSDT: "Bitcoin", ETHUSDT: "Ethereum", BNBUSDT: "BNB",
    SOLUSDT: "Solana", XRPUSDT: "XRP", ADAUSDT: "Cardano",
    DOGEUSDT: "Dogecoin", AVAXUSDT: "Avalanche", MATICUSDT: "Polygon",
    LINKUSDT: "Chainlink", DOTUSDT: "Polkadot", UNIUSDT: "Uniswap",
    LTCUSDT: "Litecoin", ATOMUSDT: "Cosmos", NEARUSDT: "NEAR Protocol",
    APTUSDT: "Aptos", FILUSDT: "Filecoin", AAVEUSDT: "Aave",
    TRXUSDT: "TRON", SHIBUSDT: "Shiba Inu",
    SUIUSDT: "Sui", SEIUSDT: "Sei", FTMUSDT: "Fantom",
    OPUSDT: "Optimism", ARBUSDT: "Arbitrum", STXUSDT: "Stacks",
    CRVUSDT: "Curve DAO", LDOUSDT: "Lido DAO", COMPUSDT: "Compound",
    SNXUSDT: "Synthetix", "1INCHUSDT": "1inch", DYDXUSDT: "dYdX",
    FETUSDT: "Fetch.ai", AGIXUSDT: "SingularityNET", OCEANUSDT: "Ocean Protocol",
    RNDRUSDT: "Render", ARKMUSDT: "Arkham", OKBUSDT: "OKB",
    KCSUSDT: "KuCoin Token", SANDUSDT: "The Sandbox", MANAUSDT: "Decentraland",
    AXSUSDT: "Axie Infinity", GALAUSDT: "Gala", IMXUSDT: "Immutable X",
    PEPEUSDT: "Pepe", FLOKIUSDT: "Floki", BONKUSDT: "Bonk",
    WIFUSDT: "dogwifhat", GRTUSDT: "The Graph", THETAUSDT: "Theta Network",
  };
  return names[symbol] || symbol.replace("USDT", "");
}

export function getCoinTicker(symbol: string): string {
  return symbol.replace("USDT", "");
}
