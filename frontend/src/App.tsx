import React, { useState, useEffect, useMemo } from 'react';
import { InstrumentData, EmitenItem, CorporateEvent, NewsItem, AIAnalysis } from './types';
import { fetchAllMarketData, fetchStockData, fetchNews, fetchAIAnalysis } from './services/api';
import { Header } from './components/Header';
import { InstrumentHero } from './components/InstrumentHero';
import { InteractiveChart } from './components/InteractiveChart';
import { AIAnalystSection } from './components/AIAnalystSection';
import { FundamentalTable } from './components/FundamentalTable';
import { CorporateEventsTable } from './components/CorporateEventsTable';
import { StockDetailModal } from './components/StockDetailModal';
import { MethodologyModal } from './components/MethodologyModal';

export function App() {
  const [marketData, setMarketData] = useState<Record<string, InstrumentData>>({});
  const [emitens, setEmitens] = useState<EmitenItem[]>([]);
  const [events, setEvents] = useState<CorporateEvent[]>([]);
  const [activeTicker, setActiveTicker] = useState<string>('IHSG');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [selectedStockDetail, setSelectedStockDetail] = useState<InstrumentData | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial dataset
  useEffect(() => {
    fetchAllMarketData()
      .then((data) => {
        setMarketData(data.market || {});
        setEmitens(data.emitens || []);
        setEvents(data.events || []);
      })
      .catch((err) => {
        console.error('Error loading initial data:', err);
        setErrorMsg('Gagal memuat bundle data awal.');
      });
  }, []);

  // Fetch news & AI insight when ticker changes
  useEffect(() => {
    if (!activeTicker) return;

    // Load news
    fetchNews(activeTicker).then((res) => {
      setNews(res.news || []);
    });

    // Check if we already have instrument data for AI
    const inst = marketData[activeTicker];
    const techData = {
      price: inst?.price || '—',
      change: inst?.changePct ? `${inst.changePct.toFixed(2)}%` : '—',
      period: '3M',
      rsi: '50'
    };

    setIsLoadingAI(true);
    fetchAIAnalysis(activeTicker, techData, false)
      .then((res) => {
        setAiAnalysis(res);
      })
      .catch((err) => {
        console.warn('AI analysis load error:', err);
      })
      .finally(() => {
        setIsLoadingAI(false);
      });
  }, [activeTicker]);

  // Handle single stock refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await fetchStockData(activeTicker);
      setMarketData((prev) => ({
        ...prev,
        [activeTicker]: updated
      }));
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle forced AI refresh
  const handleRefreshAI = async () => {
    const inst = marketData[activeTicker];
    const techData = {
      price: inst?.price || '—',
      change: inst?.changePct ? `${inst.changePct.toFixed(2)}%` : '—',
      period: '3M'
    };
    setIsLoadingAI(true);
    try {
      const res = await fetchAIAnalysis(activeTicker, techData, true);
      setAiAnalysis(res);
    } catch (err) {
      console.error('AI refresh error:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Select a ticker
  const handleSelectTicker = (ticker: string) => {
    setActiveTicker(ticker.toUpperCase().trim());
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeInstrument = marketData[activeTicker] || null;
  const stockList = useMemo(() => Object.values(marketData), [marketData]);
  const allTickerSymbols = useMemo(() => {
    const fromMarket = Object.keys(marketData);
    const fromEmitens = emitens.map(e => e.ticker);
    return Array.from(new Set(['IHSG', ...fromMarket, ...fromEmitens]));
  }, [marketData, emitens]);

  return (
    <div>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSearchSelect={handleSelectTicker}
        tickers={allTickerSymbols}
      />

      <main className="app-container">
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13
          }}>
            {errorMsg}
          </div>
        )}

        {/* Dashboard Tab: Hero + Chart + AI/News + Fundamental Summary */}
        {activeTab === 'dashboard' && (
          <>
            <InstrumentHero
              instrument={activeInstrument}
              emitens={emitens}
              activeTicker={activeTicker}
              onSelectTicker={handleSelectTicker}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              onOpenProfile={() => setSelectedStockDetail(activeInstrument)}
            />

            {activeInstrument && activeInstrument.ohlc && (
              <InteractiveChart
                ohlc={activeInstrument.ohlc}
                ticker={activeTicker}
              />
            )}

            <AIAnalystSection
              ticker={activeTicker}
              news={news}
              aiAnalysis={aiAnalysis}
              isLoadingAI={isLoadingAI}
              onRefreshAI={handleRefreshAI}
            />

            <FundamentalTable
              stocks={stockList}
              onSelectStock={handleSelectTicker}
              onOpenMethodology={() => setIsMethodologyOpen(true)}
            />

            <CorporateEventsTable
              events={events}
              onSelectStock={handleSelectTicker}
            />
          </>
        )}

        {/* Fundamental Tab */}
        {activeTab === 'fundamental' && (
          <FundamentalTable
            stocks={stockList}
            onSelectStock={handleSelectTicker}
            onOpenMethodology={() => setIsMethodologyOpen(true)}
          />
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <CorporateEventsTable
            events={events}
            onSelectStock={handleSelectTicker}
          />
        )}
      </main>

      {/* Modals */}
      <StockDetailModal
        stock={selectedStockDetail}
        onClose={() => setSelectedStockDetail(null)}
      />

      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </div>
  );
}

export default App;
