import React, { useState, useMemo } from 'react';
import { StockItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { Footer } from './Footer';
import { fmt, rp, pct, fairValue, mos, dividendYield } from '../utils';

interface CompareViewProps {
  stocks: StockItem[];
  defaultTickerA?: string;
  defaultTickerB?: string;
  onSelectStockDetail: (ticker: string) => void;
  onOpenMethod: () => void;
  onOpenAbout: () => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  stocks,
  defaultTickerA = 'BBCA',
  defaultTickerB = 'BBRI',
  onSelectStockDetail,
  onOpenMethod,
  onOpenAbout,
}) => {
  const [tickerA, setTickerA] = useState<string>(defaultTickerA);
  const [tickerB, setTickerB] = useState<string>(defaultTickerB);

  const [searchA, setSearchA] = useState<string>('');
  const [searchB, setSearchB] = useState<string>('');
  const [openDropdownA, setOpenDropdownA] = useState<boolean>(false);
  const [openDropdownB, setOpenDropdownB] = useState<boolean>(false);

  const stockA = useMemo(
    () => stocks.find((s) => s.ticker === tickerA) || stocks[0] || ({} as StockItem),
    [stocks, tickerA]
  );
  const stockB = useMemo(
    () => stocks.find((s) => s.ticker === tickerB) || stocks[1] || stocks[0] || ({} as StockItem),
    [stocks, tickerB]
  );

  // Search filter list for selector A
  const filteredStocksA = useMemo(() => {
    if (!searchA.trim()) return stocks.slice(0, 15);
    const q = searchA.toLowerCase().trim();
    return stocks
      .filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [stocks, searchA]);

  // Search filter list for selector B
  const filteredStocksB = useMemo(() => {
    if (!searchB.trim()) return stocks.slice(0, 15);
    const q = searchB.toLowerCase().trim();
    return stocks
      .filter((s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [stocks, searchB]);

  const fvA = fairValue(stockA) ?? 0;
  const fvB = fairValue(stockB) ?? 0;
  const mosA = mos(stockA) ?? -99.9;
  const mosB = mos(stockB) ?? -99.9;
  const dyA = dividendYield(stockA) ?? 0;
  const dyB = dividendYield(stockB) ?? 0;

  // Swap function
  const handleSwap = () => {
    const temp = tickerA;
    setTickerA(tickerB);
    setTickerB(temp);
  };

  return (
    <>
      {/* Page Hero */}
      <div className="page-hero">
        <div>
          <div className="eyebrow">RISET &amp; VALUASI PASAR</div>
          <h1>Komparasi Emiten Head-to-Head</h1>
          <p className="hero-subtitle">
            Pilih dan bandingkan 2 saham Bursa Efek Indonesia secara objektif berdasarkan metrik valuasi, profitabilitas, dividen, dan margin of safety.
          </p>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Selector Emiten A */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
              Pilih Emiten Pertama (A):
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '8px 12px',
                background: 'var(--soft)',
                cursor: 'pointer',
              }}
              onClick={() => setOpenDropdownA(!openDropdownA)}
            >
              <StockLogo ticker={stockA.ticker} mark={stockA.mark} color={stockA.color} large={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{stockA.ticker}</strong>
                <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stockA.name}
                </div>
              </div>
              <Icon name="down" cls="sm" />
            </div>

            {/* Dropdown Menu A */}
            {openDropdownA && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 40,
                  marginTop: '6px',
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
                  <input
                    type="text"
                    placeholder="Ketik ticker atau nama emiten..."
                    value={searchA}
                    onChange={(e) => setSearchA(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--soft)',
                      color: 'var(--ink)',
                      outline: 'none',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredStocksA.map((s) => (
                    <div
                      key={s.ticker}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--line-light, #f1f5f9)',
                      }}
                      onClick={() => {
                        setTickerA(s.ticker);
                        setOpenDropdownA(false);
                        setSearchA('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{s.ticker}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.short}</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{rp(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={handleSwap}
              className="btn small-btn"
              style={{
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              title="Tukar posisi Emiten A & B"
            >
              <Icon name="compare" cls="sm" />
            </button>
          </div>

          {/* Selector Emiten B */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
              Pilih Emiten Kedua (B):
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '8px 12px',
                background: 'var(--soft)',
                cursor: 'pointer',
              }}
              onClick={() => setOpenDropdownB(!openDropdownB)}
            >
              <StockLogo ticker={stockB.ticker} mark={stockB.mark} color={stockB.color} large={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{stockB.ticker}</strong>
                <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stockB.name}
                </div>
              </div>
              <Icon name="down" cls="sm" />
            </div>

            {/* Dropdown Menu B */}
            {openDropdownB && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 40,
                  marginTop: '6px',
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
                  <input
                    type="text"
                    placeholder="Ketik ticker atau nama emiten..."
                    value={searchB}
                    onChange={(e) => setSearchB(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--line)',
                      background: 'var(--soft)',
                      color: 'var(--ink)',
                      outline: 'none',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredStocksB.map((s) => (
                    <div
                      key={s.ticker}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--line-light, #f1f5f9)',
                      }}
                      onClick={() => {
                        setTickerB(s.ticker);
                        setOpenDropdownB(false);
                        setSearchB('');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{s.ticker}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.short}</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{rp(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Cards & Metric Matrix */}
      <div className="card" style={{ padding: '24px' }}>
        {/* Emiten Summary Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--line)',
            marginBottom: '20px',
          }}
        >
          {/* Card A */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--soft)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <StockLogo ticker={stockA.ticker} mark={stockA.mark} color={stockA.color} large={true} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{stockA.ticker}</h3>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{stockA.sector}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '20px', fontWeight: 800 }}>{rp(stockA.price)}</span>
              <span className={`small ${stockA.change >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 700 }}>
                {pct(stockA.change, 2)}
              </span>
            </div>
            <button
              onClick={() => onSelectStockDetail(stockA.ticker)}
              className="link-btn"
              style={{ fontSize: '11px', marginTop: '8px' }}
            >
              Lihat Detail {stockA.ticker} <Icon name="arrow-up-right" cls="sm" />
            </button>
          </div>

          {/* Card B */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--soft)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <StockLogo ticker={stockB.ticker} mark={stockB.mark} color={stockB.color} large={true} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{stockB.ticker}</h3>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{stockB.sector}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '20px', fontWeight: 800 }}>{rp(stockB.price)}</span>
              <span className={`small ${stockB.change >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 700 }}>
                {pct(stockB.change, 2)}
              </span>
            </div>
            <button
              onClick={() => onSelectStockDetail(stockB.ticker)}
              className="link-btn"
              style={{ fontSize: '11px', marginTop: '8px' }}
            >
              Lihat Detail {stockB.ticker} <Icon name="arrow-up-right" cls="sm" />
            </button>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--navy)' }}>
          Tabel Komparasi Metrik Valuasi &amp; Kinerja
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table className="compare-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'var(--soft)', borderBottom: '1.5px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', width: '36%', color: 'var(--muted)' }}>Metrik Analisis</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', width: '32%', fontWeight: 800 }}>{stockA.ticker}</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', width: '32%', fontWeight: 800 }}>{stockB.ticker}</th>
              </tr>
            </thead>
            <tbody>
              {/* PER */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Price to Earnings (PER)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>
                  {stockA.pe.toFixed(1)}x {stockA.pe < stockB.pe && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>
                  {stockB.pe.toFixed(1)}x {stockB.pe < stockA.pe && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
              </tr>

              {/* PBV */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Price to Book Value (PBV)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>
                  {stockA.pb.toFixed(2)}x {stockA.pb < stockB.pb && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>
                  {stockB.pb.toFixed(2)}x {stockB.pb < stockA.pb && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
              </tr>

              {/* Fair Value */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Estimasi Nilai Wajar (Fair Value)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>{rp(fvA)}</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>{rp(fvB)}</td>
              </tr>

              {/* MOS */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Margin of Safety (MOS)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                  <span className="mos-pill" style={{
                    background: mosA >= 20 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                    color: mosA >= 20 ? '#059669' : '#dc2626',
                    fontWeight: 700,
                  }}>
                    {fmt(mosA, 1)}% {mosA > mosB && <Icon name="check" cls="sm" />}
                  </span>
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                  <span className="mos-pill" style={{
                    background: mosB >= 20 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                    color: mosB >= 20 ? '#059669' : '#dc2626',
                    fontWeight: 700,
                  }}>
                    {fmt(mosB, 1)}% {mosB > mosA && <Icon name="check" cls="sm" />}
                  </span>
                </td>
              </tr>

              {/* Dividend Yield */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Estimasi Dividend Yield</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: 'var(--green)' }}>
                  {fmt(dyA, 1)}% {dyA > dyB && <Icon name="check" cls="sm" />}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: 'var(--green)' }}>
                  {fmt(dyB, 1)}% {dyB > dyA && <Icon name="check" cls="sm" />}
                </td>
              </tr>

              {/* EPS */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Laba per Saham (EPS TTM)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>{stockA.eps ? rp(stockA.eps) : '—'}</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>{stockB.eps ? rp(stockB.eps) : '—'}</td>
              </tr>

              {/* BVPS */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Nilai Buku per Saham (BVPS)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>{stockA.bvps ? rp(stockA.bvps) : '—'}</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>{stockB.bvps ? rp(stockB.bvps) : '—'}</td>
              </tr>

              {/* ROE */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Return on Equity (ROE)</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>
                  {stockA.roe ? `${fmt(stockA.roe, 1)}%` : '—'}{' '}
                  {stockA.roe && stockB.roe && stockA.roe > stockB.roe && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700 }}>
                  {stockB.roe ? `${fmt(stockB.roe, 1)}%` : '—'}{' '}
                  {stockA.roe && stockB.roe && stockB.roe > stockA.roe && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
              </tr>

              {/* Profit Margin */}
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Net Profit Margin</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>
                  {pct(stockA.margin * 100, 1)} {stockA.margin > stockB.margin && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>
                  {pct(stockB.margin * 100, 1)} {stockB.margin > stockA.margin && <Icon name="check" cls="sm" style={{ color: 'var(--green)' }} />}
                </td>
              </tr>

              {/* Volume & Turnover */}
              <tr>
                <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>Turnover Harian</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>{stockA.turnover || '—'}</td>
                <td style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 600 }}>{stockB.turnover || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ringkasan Insight */}
        <div
          style={{
            marginTop: '24px',
            padding: '14px 18px',
            background: 'var(--soft)',
            borderRadius: '10px',
            border: '1px solid var(--line)',
            fontSize: '12px',
            color: 'var(--ink)',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="info" cls="sm" /> Catatan Analisis Komparasi:
          </div>
          <div>
            {mosA > mosB
              ? `${stockA.ticker} menawarkan Margin of Safety lebih tebal (${fmt(mosA, 1)}% vs ${fmt(mosB, 1)}%). `
              : `${stockB.ticker} menawarkan Margin of Safety lebih tebal (${fmt(mosB, 1)}% vs ${fmt(mosA, 1)}%). `}
            {stockA.pe < stockB.pe
              ? `Dari sisi valuasi laba, ${stockA.ticker} diperdagangkan dengan PER lebih murah (${stockA.pe.toFixed(1)}x). `
              : `Dari sisi valuasi laba, ${stockB.ticker} diperdagangkan dengan PER lebih murah (${stockB.pe.toFixed(1)}x). `}
            {dyA > dyB
              ? `Bagi pemburu dividen, ${stockA.ticker} memberikan estimasi imbal hasil lebih menarik (${fmt(dyA, 1)}%).`
              : `Bagi pemburu dividen, ${stockB.ticker} memberikan estimasi imbal hasil lebih menarik (${fmt(dyB, 1)}%).`}
          </div>
        </div>
      </div>

      <Footer onOpenMethod={onOpenMethod} onOpenAbout={onOpenAbout} />
    </>
  );
};
