import { StockItem, OHLCPoint, FinancialYearData, Timeframe, ValuationState } from './types';
import { TV_LOGOS } from './constants';

export const fmt = (n: number, d: number = 0): string =>
  new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

export const rp = (n: number): string => 'Rp' + fmt(n);

export const pct = (n: number, d: number = 1): string =>
  (n > 0 ? '+' : '') + fmt(n, d) + '%';

export const fmtDate = (s: string): string => {
  try {
    const d = new Date(s.includes('T') ? s : s + 'T12:00:00');
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return s;
  }
};

export const periodLabel = (p: Timeframe): string => {
  switch (p) {
    case '1M': return '1 bulan';
    case '3M': return '3 bulan';
    case '6M': return '6 bulan';
    case '1Y': return '1 tahun';
    default: return p;
  }
};

export const getStockLogoUrl = (ticker: string): string => {
  const clean = String(ticker || '').toUpperCase().trim();
  const tvId = TV_LOGOS[clean];
  if (tvId) return `https://s3-symbol-logo.tradingview.com/${tvId}--big.svg`;
  return `/logo-emiten/${clean}.svg`;
};

// Deterministic Pseudo-Random Number Generator for smooth simulated OHLC
export const rng = (seed: number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const chartCache: Record<string, OHLCPoint[]> = {};

export const getOHLCData = (
  ticker: string,
  price: number,
  change: number,
  marketCache?: Record<string, any>
): OHLCPoint[] => {
  if (chartCache[ticker]) return chartCache[ticker];

  if (marketCache && marketCache[ticker]?.ohlc && marketCache[ticker].ohlc.length) {
    chartCache[ticker] = marketCache[ticker].ohlc;
    return chartCache[ticker];
  }

  // Fallback to window.MARKET_DATA if in browser
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (ticker === 'IHSG' && win.IHSG_LIVE_DATA?.ohlc?.length) {
      chartCache[ticker] = win.IHSG_LIVE_DATA.ohlc;
      return chartCache[ticker];
    }
    if (win.MARKET_DATA && win.MARKET_DATA[ticker]?.ohlc?.length) {
      chartCache[ticker] = win.MARKET_DATA[ticker].ohlc;
      return chartCache[ticker];
    }
  }

  // Deterministic generator matching legacy prototype
  const r = rng([...ticker].reduce((a, c) => a + c.charCodeAt(0), 47));
  const n = 260;
  const days: string[] = [];
  const date = new Date('2026-09-22T12:00:00Z');
  while (days.length < n) {
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) {
      days.unshift(date.toISOString().slice(0, 10));
    }
    date.setUTCDate(date.getUTCDate() - 1);
  }

  const anchor = [
    [0, 0.70],
    [0.13, 0.79],
    [0.27, 0.735],
    [0.43, 0.87],
    [0.58, 0.84],
    [0.71, 0.97],
    [0.81, 1.075],
    [0.9, 0.955],
    [1, 1],
  ];

  let previous = price * 0.7;
  const arr: OHLCPoint[] = days.map((d, i) => {
    const t = i / (n - 1);
    let idx = anchor.findIndex((a) => a[0] >= t);
    if (idx <= 0) idx = 1;
    const a = anchor[idx - 1];
    const b = anchor[idx];
    const u = (t - a[0]) / (b[0] - a[0]);
    const base = a[1] + (b[1] - a[1]) * u;
    const close =
      price *
      (base +
        Math.sin(i * 0.81) * 0.008 +
        Math.sin(i * 0.31) * 0.01 +
        (r() - 0.5) * 0.014);
    const open = previous * (1 + (r() - 0.5) * 0.007);
    const high = Math.max(open, close) * (1 + 0.002 + r() * 0.011);
    const low = Math.min(open, close) * (1 - 0.002 - r() * 0.011);
    previous = close;
    return {
      date: d,
      open,
      high,
      low,
      close,
      volume: Math.round((30 + r() * 75) * 1000000),
    };
  });

  if (arr.length >= 2) {
    arr[n - 2].close = price / (1 + change / 100);
    arr[n - 2].high = Math.max(arr[n - 2].high, arr[n - 2].close * 1.005);
    arr[n - 2].low = Math.min(arr[n - 2].low, arr[n - 2].close * 0.995);
    arr[n - 1].open = arr[n - 2].close;
    arr[n - 1].close = price;
    arr[n - 1].high = Math.max(arr[n - 1].open, price) * 1.007;
    arr[n - 1].low = Math.min(arr[n - 1].open, price) * 0.993;
  }

  chartCache[ticker] = arr;
  return arr;
};

export const movingAverage = (
  data: OHLCPoint[],
  n: number,
  index: number
): number | null => {
  if (index + 1 < n) return null;
  let sum = 0;
  for (let i = index - n + 1; i <= index; i++) sum += data[i].close;
  return sum / n;
};

export const rsi = (data: OHLCPoint[], n: number = 14): number => {
  if (data.length <= n) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const ch = data[i].close - data[i - 1].close;
    gain += Math.max(ch, 0);
    loss += Math.max(-ch, 0);
  }
  gain /= n;
  loss /= n;
  for (let i = n + 1; i < data.length; i++) {
    const ch = data[i].close - data[i - 1].close;
    gain = (gain * (n - 1) + Math.max(ch, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-ch, 0)) / n;
  }
  return gain === 0 && loss === 0 ? 50 : loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
};

export interface ChartCalculatedData {
  full: OHLCPoint[];
  data: OHLCPoint[];
  start: number;
  levels: { ratio: number; value: number }[];
  lowD: OHLCPoint;
  highD: OHLCPoint;
}

export const chartData = (
  ticker: string,
  price: number,
  change: number,
  period: Timeframe,
  marketCache?: Record<string, any>
): ChartCalculatedData => {
  const full = getOHLCData(ticker, price, change, marketCache);
  const count = { '1M': 22, '3M': 66, '6M': 132, '1Y': 260 }[period];
  const start = Math.max(0, full.length - count);
  const data = full.slice(start);
  const lowD = data.reduce((a, b) => (a.low < b.low ? a : b), data[0]);
  const highD = data.reduce((a, b) => (a.high > b.high ? a : b), data[0]);
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((r) => ({
    ratio: r,
    value: highD.high - r * (highD.high - lowD.low),
  }));
  return { full, data, start, levels, lowD, highD };
};

export const financialData = (s: StockItem): FinancialYearData[] => {
  const eps = s.eps != null ? s.eps : 100;
  const bvps = s.bvps != null ? s.bvps : 500;
  const shares = s.shares || 10;
  const margin = s.margin || 0.15;
  const equityRatio = s.equityRatio || 0.5;

  const growth = [0.61, 0.70, 0.80, 0.90, 1.0];
  let previousCash = ((bvps * shares) / 1000 / equityRatio) * 0.08 * 0.61;

  return growth.map((g, i) => {
    const net = ((eps * shares) / 1000) * g;
    const revenue = net / (margin - (4 - i) * 0.007);
    const equity = ((bvps * shares) / 1000) * (0.64 + i * 0.09);
    const assets = equity / equityRatio;
    const cfo = net * [1.02, 1.08, 0.97, 1.16, 1.2][i];
    const cfi = -net * [0.51, 0.54, 0.6, 0.49, 0.52][i];
    const cff = -net * 0.43;
    const netCash = cfo + cfi + cff;
    const begin = previousCash;
    const cash = begin + netCash;
    previousCash = cash;

    return {
      year: 2021 + i,
      revenue,
      net,
      pretax: net / 0.8,
      margin: (net / revenue) * 100,
      eps: (net / shares) * 1000,
      assets,
      equity,
      liabilities: assets - equity,
      cash,
      bvps: (equity / shares) * 1000,
      cfo,
      cfi,
      cff,
      netCash,
      begin,
      end: cash,
      conversion: (cfo / net) * 100,
    };
  });
};

export const fairValue = (
  s: StockItem,
  customVal?: ValuationState
): number | null => {
  const eps = s.eps != null ? s.eps : null;
  if (!eps || eps <= 0) return null;
  const targetPe = customVal ? customVal.pe : (s.pe || s.targetPe || 12);
  return eps * targetPe;
};

export const mos = (
  s: StockItem,
  customVal?: ValuationState
): number | null => {
  const fv = fairValue(s, customVal);
  if (!fv || fv <= 0) return null;
  return ((1 - s.price / fv) * 100);
};
