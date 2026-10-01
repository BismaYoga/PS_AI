export interface PresetStock {
  color: string;
  mark: string;
  shares: number;
  margin: number;
  equityRatio: number;
  rev: [string, number][];
  description: string;
}

export interface EmitenItem {
  ticker: string;
  name: string;
  sector: string;
  subsector: string;
}

export interface CorporateEvent {
  id: string;
  ticker: string;
  date: string;
  type: string;
  title: string;
  sub: string;
  amount: string;
  note: string;
}

export interface NewsItem {
  category: string;
  icon: string;
  title: string;
  desc: string;
  impact: string;
  bias: string;
  body: string;
  watch: string;
  date?: string;
  source?: string;
  url?: string;
  ticker?: string;
  error?: string;
}

export interface OHLCPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockItem {
  ticker: string;
  name: string;
  short: string;
  sector: string;
  subsector: string;
  color: string;
  mark: string;
  price: number;
  change: number;
  eps: number | null;
  bvps: number | null;
  pe: number;
  pb: number;
  roe?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  volume: string | number;
  turnover: string | number;
  date: string | null;
  isLive: boolean;
  shares: number;
  margin: number;
  equityRatio: number;
  rev: [string, number][];
  description: string;
  targetPe?: number;
  ohlc?: OHLCPoint[];
}

export interface IndexItem {
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changeAbs: number;
  date: string;
  turnover: string;
  volume: string;
  gainers: number;
  losers: number;
  isLive: boolean;
}

export interface FinancialYearData {
  year: number;
  revenue: number;
  net: number;
  pretax: number;
  margin: number;
  eps: number;
  assets: number;
  equity: number;
  liabilities: number;
  cash: number;
  bvps: number;
  cfo: number;
  cfi: number;
  cff: number;
  netCash: number;
  begin: number;
  end: number;
  conversion: number;
  [key: string]: number;
}

export interface ValuationState {
  pe: number;
  pb: number;
}

export interface AIAnalysisResult {
  executive_summary: string;
  sentiment_bias?: string;
  sentiment?: string;
  technical_insight?: string;
  catalyst_insight?: string;
  actionable_plan?: string;
  key_levels?: {
    support?: string;
    resistance?: string;
    rsi?: string;
    ma_status?: string;
  };
  timestamp?: string;
  error?: string;
}

export type Timeframe = '1M' | '3M' | '6M' | '1Y';
export type ChartType = 'line' | 'candle';
export type Route = 'home' | 'watchlist' | 'stock';
