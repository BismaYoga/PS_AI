export interface OHLCBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InstrumentData {
  ticker: string;
  name: string;
  sector: string | null;
  subsector: string | null;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  date: string;
  rawDate?: string;
  volume: number;
  turnover: number;
  gainers?: number;
  losers?: number;
  totalBars?: number;
  source?: string;
  isStock?: boolean;
  ohlc: OHLCBar[];
  eps?: number;
  bvps?: number;
  pe?: number;
  pb?: number;
  targetPe?: number;
  fairValue?: number;
  mos?: number;
  roe?: number;
  dividendYield?: number;
  marketCap?: number;
  summary?: string;
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
  diffDays?: number;
  badge?: string;
}

export interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  time: string;
  ago: string;
  sentiment: 'positive' | 'negative' | 'neutral' | string;
  snippet: string;
}

export interface AIAnalysis {
  ticker: string;
  timestamp: string;
  stance: 'BULLISH' | 'BEARISH' | 'NETRAL' | string;
  technical: {
    rsi: string;
    ma_status: string;
    support: string;
    resistance: string;
  };
  news_catalyst: string;
  summary: string;
  key_factors?: string[];
  recommendation?: string;
  source?: string;
  cached?: boolean;
  error?: string;
}

export type Timeframe = '1M' | '3M' | '6M' | '1Y';
export type ChartType = 'candlestick' | 'line';
