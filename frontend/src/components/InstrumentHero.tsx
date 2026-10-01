import React from 'react';
import { InstrumentData, EmitenItem } from '../types';
import { RefreshCw, Building, TrendingUp, TrendingDown } from 'lucide-react';

interface InstrumentHeroProps {
  instrument: InstrumentData | null;
  emitens: EmitenItem[];
  activeTicker: string;
  onSelectTicker: (ticker: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenProfile: () => void;
}

const TOP_PILLS = ['IHSG', 'BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'ICBP', 'BBNI', 'ADRO', 'GOTO', 'MIKA'];

export const InstrumentHero: React.FC<InstrumentHeroProps> = ({
  instrument,
  emitens,
  activeTicker,
  onSelectTicker,
  onRefresh,
  isRefreshing,
  onOpenProfile,
}) => {
  if (!instrument) {
    return <div className="hero-card">Memuat data instrumen...</div>;
  }

  const isUp = instrument.change >= 0;
  const changeFormatted = `${isUp ? '+' : ''}${instrument.change.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const changePctFormatted = `${isUp ? '+' : ''}${instrument.changePct.toFixed(2)}%`;

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString('id-ID');
  };

  const formatTurnover = (turnover?: number) => {
    if (!turnover) return '—';
    if (turnover >= 1e12) return `Rp ${(turnover / 1e12).toFixed(2)} Triliun`;
    if (turnover >= 1e9) return `Rp ${(turnover / 1e9).toFixed(2)} Miliar`;
    if (turnover >= 1e6) return `Rp ${(turnover / 1e6).toFixed(2)} Juta`;
    return `Rp ${turnover.toLocaleString('id-ID')}`;
  };

  const highPrice = instrument.ohlc && instrument.ohlc.length > 0 ? instrument.ohlc[instrument.ohlc.length - 1].high : instrument.price;
  const lowPrice = instrument.ohlc && instrument.ohlc.length > 0 ? instrument.ohlc[instrument.ohlc.length - 1].low : instrument.price;

  return (
    <div className="hero-card">
      <div className="hero-top">
        <div className="instrument-profile">
          <div className="instrument-logo">
            {instrument.ticker === 'IHSG' ? (
              <img src="/logo-emiten/IHSG.svg" alt="IHSG" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
            ) : (
              <img
                src={`/logo-emiten/${instrument.ticker}.svg`}
                alt={instrument.ticker}
                onError={(e) => {
                  // Fallback to text monogram
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            )}
            <span>{instrument.ticker.slice(0, 4)}</span>
          </div>

          <div className="instrument-title">
            <h1>
              <span>{instrument.ticker}</span>
              {instrument.sector && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 4 }}>
                  {instrument.sector}
                </span>
              )}
            </h1>
            <p>{instrument.name}</p>
          </div>
        </div>

        <div className="price-display">
          <div className="price-main" style={{ color: isUp ? '#059669' : '#dc2626' }}>
            {formatNumber(instrument.price)}
          </div>
          <div className={`price-change-pill ${isUp ? 'pill-up' : 'pill-down'}`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{changeFormatted} ({changePctFormatted})</span>
          </div>
        </div>
      </div>

      {/* Quick Pills & Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="quick-pills-bar">
          {TOP_PILLS.map((ticker) => (
            <button
              key={ticker}
              className={`quick-pill ${activeTicker === ticker ? 'active' : ''}`}
              onClick={() => onSelectTicker(ticker)}
            >
              {ticker === 'IHSG' ? '📊 IHSG' : ticker}
            </button>
          ))}

          <select
            className="stock-selector"
            value={activeTicker}
            onChange={(e) => onSelectTicker(e.target.value)}
          >
            <option value="" disabled>Pilih Emiten Lain...</option>
            {emitens.map((e) => (
              <option key={e.ticker} value={e.ticker}>
                {e.ticker} — {e.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {instrument.ticker !== 'IHSG' && (
            <button className="btn-secondary" onClick={onOpenProfile}>
              <Building size={14} />
              <span>Profil Perusahaan</span>
            </button>
          )}

          <button
            className="btn-secondary"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="hero-stats-grid">
        <div className="stat-box">
          <div className="stat-label">Prev. Close</div>
          <div className="stat-val">{formatNumber(instrument.previousClose)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Tertinggi (High)</div>
          <div className="stat-val" style={{ color: '#059669' }}>{formatNumber(highPrice)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Terendah (Low)</div>
          <div className="stat-val" style={{ color: '#dc2626' }}>{formatNumber(lowPrice)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Volume Saham</div>
          <div className="stat-val">{formatNumber(instrument.volume)}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Estimasi Turnover</div>
          <div className="stat-val">{formatTurnover(instrument.turnover)}</div>
        </div>
        {instrument.fairValue ? (
          <div className="stat-box">
            <div className="stat-label">Harga Wajar / MOS</div>
            <div className="stat-val" style={{ color: (instrument.mos || 0) >= 0 ? '#059669' : '#dc2626' }}>
              Rp {formatNumber(instrument.fairValue)} ({instrument.mos !== undefined ? `${instrument.mos.toFixed(1)}%` : '—'})
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
