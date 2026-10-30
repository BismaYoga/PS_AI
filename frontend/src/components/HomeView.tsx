import React, { useState } from 'react';
import { StockItem, IndexItem, CorporateEvent, Timeframe, ChartType, NewsItem } from '../types';
import { Icon } from './Icon';
import { MainChart } from './MainChart';
import { AIBox } from './AIBox';
import { NewsSection } from './NewsSection';
import { FundamentalSection } from './FundamentalSection';
import { CorporateEventsSection } from './CorporateEventsSection';
import { Footer } from './Footer';
import { chartData, fmt, rp, pct, ChartCalculatedData } from '../utils';

interface HomeViewProps {
  indexData: IndexItem;
  stocks: StockItem[];
  events: CorporateEvent[];
  favorites: Set<string>;
  activeInstrument: string;
  marketCache?: Record<string, any>;
  onRefreshInstrument?: (ticker: string) => Promise<boolean>;
  onRefreshAll?: () => Promise<void>;
  onSelectInstrument: (ticker: string) => void;
  onSelectStockDetail: (ticker: string) => void;
  onToggleFavorite: (ticker: string) => void;
  onOpenDrawer: (type: string, payload?: any) => void;
  onOpenNewsDrawer: (news: NewsItem) => void;
  onOpenEventDrawer: (event: CorporateEvent) => void;
  onOpenMethod: () => void;
  onOpenAbout: () => void;
  onNotify: (msg: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  indexData,
  stocks,
  events,
  favorites,
  activeInstrument: _activeInstrument,
  marketCache,
  onRefreshInstrument,
  onRefreshAll,
  onSelectInstrument: _onSelectInstrument,
  onSelectStockDetail,
  onToggleFavorite,
  onOpenDrawer,
  onOpenNewsDrawer,
  onOpenEventDrawer,
  onOpenMethod,
  onOpenAbout,
  onNotify,
}) => {
  const [period, setPeriod] = useState<Timeframe>('3M');
  const [chartType, setChartType] = useState<ChartType>('line');

  // Dashboard berfokus secara eksklusif pada instrumen acuan pasar: IHSG
  const activeInstrument = 'IHSG';
  const isIHSG = true;

  const curPrice = indexData.price;
  const curChange = indexData.change;
  const chgAbs = Math.abs(indexData.changeAbs);

  const curDate = indexData.date;
  const curVolume = indexData.volume;
  const curTurnover = indexData.turnover;
  const isLive = indexData.isLive;

  const [chartCalc, setChartCalc] = useState<ChartCalculatedData>(() =>
    chartData(
      'IHSG',
      curPrice,
      curChange,
      period,
      marketCache
    )
  );

  return (
    <>
      <div className="page-hero">
        <div>
          <div className="eyebrow">RINGKASAN PASAR MODAL INDONESIA</div>
          <h1>IHSG (Indeks Harga Saham Gabungan)</h1>
          <p className="hero-subtitle">
            Pantau arah pergerakan pasar bursa efek, likuiditas transaksi harian, serta evaluasi kelayakan iklim investasi pasar modal via Gemini AI.
          </p>
        </div>
        <div className="date-block">
          {curDate}
        </div>
      </div>

      <section className="card" aria-label="Grafik IHSG">
        <div className="chart-top">
          <div>
            <div className="instrument">
              <span>IHSG</span>
              <span className="pill outline">Indeks Acuan BEI</span>
              {onRefreshInstrument && (
                <button
                  onClick={async () => {
                    onNotify('Memperbarui data IHSG...');
                    const ok = await onRefreshInstrument('IHSG');
                    onNotify(
                      ok
                        ? 'Data IHSG berhasil diperbarui!'
                        : 'Gagal memperbarui data IHSG'
                    );
                  }}
                  className="btn small-btn"
                  style={{ padding: '3px 10px', fontSize: '11px', marginLeft: '8px', gap: '4px' }}
                  title="Perbarui data IHSG"
                >
                  <Icon name="refresh" cls="sm" /> Refresh Data
                </button>
              )}
            </div>
            <div className="quote-line">
              <span className="price-main mono">
                {fmt(curPrice, 2)}
              </span>
              <div
                className={`small ${
                  curChange >= 0 ? 'positive' : 'negative'
                } quote-change`}
              >
                {pct(curChange, 2)} ({fmt(chgAbs, 2)})
              </div>
            </div>
          </div>

          <div className="market-metrics">
            <div className="metric">
              <span className="metric-label">Turnover</span>
              <strong className="mono">{curTurnover}</strong>
            </div>
            <div className="metric">
              <span className="metric-label">Volume</span>
              <strong className="mono">{curVolume}</strong>
            </div>
            <div className="metric">
              <span className="metric-label">Naik / Turun</span>
              <div>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                  {indexData.gainers}
                </span>{' '}
                <span style={{ color: 'var(--muted)' }}>·</span>{' '}
                <span style={{ color: 'var(--red)', fontWeight: 700 }}>
                  {indexData.losers}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-toolbar">
          <div className="segmented" aria-label="Periode grafik">
            {(['1D', '1M', '3M', '6M', '1Y'] as Timeframe[]).map((p) => (
              <button
                key={p}
                className={period === p ? 'active' : ''}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
              >
                {p === '1D'
                  ? '1 hari'
                  : p === '1M'
                  ? '1 bulan'
                  : p === '3M'
                  ? '3 bulan'
                  : p === '6M'
                  ? '6 bulan'
                  : '1 tahun'}
              </button>
            ))}
          </div>

          <div className="chart-type" aria-label="Jenis grafik">
            <button
              className={chartType === 'line' ? 'active' : ''}
              onClick={() => setChartType('line')}
              aria-label="Grafik garis"
            >
              <Icon name="line" cls="sm" />
            </button>
            <button
              className={chartType === 'candle' ? 'active' : ''}
              onClick={() => setChartType('candle')}
              aria-label="Grafik candlestick"
            >
              <Icon name="candles" cls="sm" />
            </button>
          </div>
        </div>

        <MainChart
          ticker={activeInstrument}
          price={curPrice}
          change={curChange}
          isStock={!isIHSG}
          period={period}
          chartType={chartType}
          marketCache={marketCache}
          onChartCalculated={(c) => setChartCalc(c)}
        />

        <div className="chart-foot">
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-line ma"></span> MA 20 sesi
            </span>
            <span className="legend-item">
              <span className="legend-bar"></span> Volume harian
            </span>
          </div>
          <span className="chart-source">
            Sumber: Bursa Efek Indonesia (IDX)
          </span>
        </div>

        <AIBox
          stockOrIndex={indexData}
          isStock={false}
          chartCalc={chartCalc}
          period={period}
          onOpenDrawer={onOpenDrawer}
          onNotify={onNotify}
        />
      </section>

      {/* News Section */}
      <NewsSection
        activeTicker={activeInstrument}
        onOpenNewsDrawer={onOpenNewsDrawer}
      />

      {/* Fundamental Table Section */}
      <FundamentalSection
        stocks={stocks}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onSelectStock={onSelectStockDetail}
        onOpenMethod={onOpenMethod}
        onRefreshAll={onRefreshAll}
        onlySaved={false}
      />

      {/* Corporate Events Section */}
      <CorporateEventsSection
        events={events}
        stocks={stocks}
        onSelectStock={onSelectStockDetail}
        onOpenEventDrawer={onOpenEventDrawer}
      />

      <Footer onOpenMethod={onOpenMethod} onOpenAbout={onOpenAbout} />
    </>
  );
};
