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
  activeInstrument,
  onSelectInstrument,
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

  const isIHSG = activeInstrument === 'IHSG';
  const curStock = isIHSG
    ? null
    : stocks.find((s) => s.ticker === activeInstrument) || stocks[0];

  const curPrice = isIHSG ? indexData.price : curStock?.price || 1000;
  const curChange = isIHSG ? indexData.change : curStock?.change || 0;
  const chgAbs = isIHSG
    ? Math.abs(indexData.changeAbs)
    : Math.abs(curPrice * (curChange / 100));

  const curDate = isIHSG ? indexData.date : curStock?.date || indexData.date;
  const curVolume = isIHSG ? indexData.volume : curStock?.volume || '—';
  const curTurnover = isIHSG ? indexData.turnover : curStock?.turnover || '—';
  const isLive = isIHSG ? indexData.isLive : !!curStock?.isLive;

  const [chartCalc, setChartCalc] = useState<ChartCalculatedData>(() =>
    chartData(
      activeInstrument,
      curPrice,
      curChange,
      period
    )
  );

  const quickList = [
    'IHSG',
    'BBCA',
    'BBRI',
    'BMRI',
    'TLKM',
    'ASII',
    'ICBP',
    'BBNI',
    'ADRO',
    'GOTO',
    'MIKA',
  ];

  return (
    <>
      <div className="page-hero">
        <div>
          <div className="eyebrow">RINGKASAN PASAR &amp; SAHAM</div>
          <h1>Pasar &amp; Saham, dalam satu pandangan.</h1>
          <p className="hero-subtitle">
            Beralih fleksibel antara indeks acuan IHSG dan chart saham emiten individual berbasis data real-time.
          </p>
        </div>
        <div className="date-block">
          {curDate}
          {isLive ? (
            <span className="pill green" style={{ marginTop: '6px' }}>
              <i className="dot"></i> Data Live yfinance (
              {isIHSG ? '^JKSE' : `${activeInstrument}.JK`})
            </span>
          ) : (
            <span className="demo-session">
              <i className="dot"></i> Sesi contoh
            </span>
          )}
        </div>
      </div>

      <section className="card" aria-label="Grafik IHSG dan Saham IDX">
        <div
          className="instrument-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '12px 24px',
            borderBottom: '1px solid var(--line)',
            background: '#fafbfc',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--muted)',
                letterSpacing: '0.5px',
                marginRight: '2px',
              }}
            >
              GANTI INSTRUMEN:
            </span>
            {quickList.map((sym) => (
              <button
                key={sym}
                className={`btn small-btn ${
                  activeInstrument === sym ? 'primary' : ''
                }`}
                onClick={() => onSelectInstrument(sym)}
                style={{ padding: '4px 9px', fontSize: '11px', fontWeight: 600 }}
              >
                {sym === 'IHSG' ? (
                  <>
                    <Icon name="chart" cls="sm" /> IHSG
                  </>
                ) : (
                  sym
                )}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              id="emiten-dropdown"
              className="select"
              value={activeInstrument}
              onChange={(e) => {
                if (e.target.value) onSelectInstrument(e.target.value);
              }}
              style={{
                fontSize: '11px',
                padding: '5px 28px 5px 9px',
                maxWidth: '240px',
              }}
            >
              <option value="">— Cari &amp; Ganti Saham ({stocks.length} Emiten IDX) —</option>
              <option value="IHSG">IHSG - Indeks Harga Saham Gabungan</option>
              <optgroup label="Emiten Bursa Efek Indonesia (IDX)">
                {stocks.map((e) => (
                  <option key={e.ticker} value={e.ticker}>
                    {e.ticker} - {e.short}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="chart-top">
          <div>
            <div className="instrument">
              {isIHSG ? (
                <span>IHSG</span>
              ) : (
                <a
                  className="stock-symbol"
                  href={`#stock/${activeInstrument}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectStockDetail(activeInstrument);
                  }}
                >
                  {activeInstrument}
                </a>
              )}
              <span className="pill outline">{isIHSG ? 'Indeks' : 'IDX'}</span>
            </div>
            <div className="quote-line">
              <span className="price-main mono">
                {isIHSG ? fmt(curPrice, 2) : rp(curPrice)}
              </span>
              <div
                className={`small ${
                  curChange >= 0 ? 'positive' : 'negative'
                } quote-change`}
              >
                {pct(curChange, 2)} ({isIHSG ? fmt(chgAbs, 2) : rp(chgAbs)})
              </div>
              <span className="quote-caption">
                {isLive ? 'Data live yfinance' : 'Sesi contoh 22 Sep 2026'}
              </span>
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
            {isIHSG && (
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
            )}
          </div>
        </div>

        <div className="chart-toolbar">
          <div className="segmented" aria-label="Periode grafik">
            {(['1M', '3M', '6M', '1Y'] as Timeframe[]).map((p) => (
              <button
                key={p}
                className={period === p ? 'active' : ''}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
              >
                {p === '1M'
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
            Sumber: yfinance · Data pasar historis IDX
          </span>
        </div>

        <AIBox
          stockOrIndex={isIHSG ? indexData : curStock!}
          isStock={!isIHSG}
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
