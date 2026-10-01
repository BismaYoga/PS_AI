import { InstrumentData, EmitenItem, CorporateEvent, NewsItem, AIAnalysis } from '../types';

export interface InitialDataResponse {
  market: Record<string, InstrumentData>;
  emitens: EmitenItem[];
  events: CorporateEvent[];
}

export async function fetchAllMarketData(): Promise<InitialDataResponse> {
  // First try API endpoint
  try {
    const res = await fetch('/api/market-data');
    if (res.ok) {
      const data = await res.json();
      if (data && data.market) return data;
    }
  } catch (err) {
    console.warn('API /api/market-data not available, using static fallback:', err);
  }

  // Fallback to static JSON bundle
  const res = await fetch('/data/market_data.json');
  if (!res.ok) {
    throw new Error('Gagal memuat bundle data pasar dari static JSON');
  }
  return await res.json();
}

export async function fetchStockData(ticker: string): Promise<InstrumentData> {
  const url = `/api/chart?ticker=${encodeURIComponent(ticker)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal memperbarui data ${ticker}`);
  }
  return await res.json();
}

export async function fetchNews(ticker: string): Promise<{ news: NewsItem[]; total: number; source: string }> {
  try {
    const res = await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Error fetching news:', err);
  }
  return { news: [], total: 0, source: 'offline' };
}

export async function fetchAIAnalysis(
  ticker: string,
  technicalData: Record<string, any>,
  force: boolean = false
): Promise<AIAnalysis> {
  try {
    const res = await fetch('/api/ai-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        technical: technicalData,
        force
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('POST /api/ai-analysis error, trying GET fallback:', err);
  }

  // Fallback to GET
  const params = new URLSearchParams({
    ticker,
    force: force ? '1' : '0',
    price: String(technicalData.price || ''),
    rsi: String(technicalData.rsi || '50'),
    ma20: String(technicalData.ma20 || ''),
    ma50: String(technicalData.ma50 || '')
  });
  const res2 = await fetch(`/api/ai-analysis?${params.toString()}`);
  if (res2.ok) {
    return await res2.json();
  }
  throw new Error('Gagal menghasilkan analisis AI');
}
