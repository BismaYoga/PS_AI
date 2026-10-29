import React, { useState } from 'react';
import { StockItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { fmt, rp, pct, fairValue, mos, dividendYield } from '../utils';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockItem[];
  defaultTickerA?: string;
  defaultTickerB?: string;
  onSelectStock: (ticker: string) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  stocks,
  defaultTickerA = 'BBCA',
  defaultTickerB = 'BBRI',
  onSelectStock,
}) => {
  const [tickerA, setTickerA] = useState<string>(defaultTickerA);
  const [tickerB, setTickerB] = useState<string>(defaultTickerB);

  if (!isOpen) return null;

  const stockA = stocks.find((s) => s.ticker === tickerA) || stocks[0];
  const stockB = stocks.find((s) => s.ticker === tickerB) || stocks[1] || stocks[0];

  const fvA = fairValue(stockA);
  const fvB = fairValue(stockB);
  const mosA = mos(stockA);
  const mosB = mos(stockB);
  const dyA = dividendYield(stockA);
  const dyB = dividendYield(stockB);

  // Quick comparison pairs
  const quickPairs = [
    { a: 'BBCA', b: 'BBRI', label: 'BCA vs BRI (Perbankan)' },
    { a: 'BMRI', b: 'BBNI', label: 'Mandiri vs BNI' },
    { a: 'TLKM', b: 'ISAT', label: 'Telkom vs Indosat' },
    { a: 'ICBP', b: 'INDF', label: 'ICBP vs Indofood' },
    { a: 'ADRO', b: 'PTBA', label: 'Adaro vs Bukit Asam' },
    { a: 'ASII', b: 'UNTR', label: 'Astra vs United Tractors' },
  ];

  return (
    <div className="modal-layer open" style={{ zIndex: 150 }} onClick={onClose}>
      <div
        className="compare-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #ffffff)',
          color: 'var(--ink, #172738)',
          width: '94%',
          maxWidth: '820px',
          maxHeight: '90vh',
          borderRadius: '16px',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--line, #e2e8f0)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--blue)', letterSpacing: '1px' }}>
              KOMPARASI EMITEN HEAD-TO-HEAD
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
              Bandingkan Dua Saham BEI
            </h2>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Tutup komparasi"
            style={{ borderRadius: '50%' }}
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Quick Pair Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px' }}>
          {quickPairs.map((pair) => (
            <button
              key={pair.label}
              type="button"
              className="btn small-btn"
              onClick={() => {
                setTickerA(pair.a);
                setTickerB(pair.b);
              }}
              style={{
                fontSize: '10px',
                padding: '4px 10px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                background: tickerA === pair.a && tickerB === pair.b ? 'var(--navy)' : 'var(--soft)',
                color: tickerA === pair.a && tickerB === pair.b ? '#fff' : 'var(--ink)',
                borderColor: tickerA === pair.a && tickerB === pair.b ? 'var(--navy)' : 'var(--line)',
              }}
            >
              {pair.label}
            </button>
          ))}
        </div>

        {/* Emiten Selectors & Card Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* Stock A Box */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1.5px solid var(--line)',
              background: 'var(--soft, #f8fafc)',
            }}
          >
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              PILIH EMITEN A:
            </label>
            <select
              className="select"
              value={tickerA}
              onChange={(e) => setTickerA(e.target.value)}
              style={{ width: '100%', marginBottom: '14px', fontWeight: 600 }}
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} - {s.short}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <StockLogo ticker={stockA.ticker} mark={stockA.mark} color={stockA.color} large={true} />
              <div>
                <strong style={{ fontSize: '18px', display: 'block' }}>{stockA.ticker}</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{stockA.name}</span>
                <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600, marginTop: '2px' }}>
                  {stockA.sector}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{rp(stockA.price)}</span>
              <span className={`pill ${stockA.change >= 0 ? 'green' : 'red'}`} style={{ fontWeight: 650 }}>
                {pct(stockA.change, 2)}
              </span>
            </div>

            <button
              className="btn small-btn"
              onClick={() => {
                onSelectStock(stockA.ticker);
                onClose();
              }}
              style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
            >
              Lihat Detail {stockA.ticker} <Icon name="arrow-up-right" cls="sm" />
            </button>
          </div>

          {/* Stock B Box */}
          <div
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1.5px solid var(--line)',
              background: 'var(--soft, #f8fafc)',
            }}
          >
            <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
              PILIH EMITEN B:
            </label>
            <select
              className="select"
              value={tickerB}
              onChange={(e) => setTickerB(e.target.value)}
              style={{ width: '100%', marginBottom: '14px', fontWeight: 600 }}
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} - {s.short}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <StockLogo ticker={stockB.ticker} mark={stockB.mark} color={stockB.color} large={true} />
              <div>
                <strong style={{ fontSize: '18px', display: 'block' }}>{stockB.ticker}</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{stockB.name}</span>
                <div style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 600, marginTop: '2px' }}>
                  {stockB.sector}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700 }}>{rp(stockB.price)}</span>
              <span className={`pill ${stockB.change >= 0 ? 'green' : 'red'}`} style={{ fontWeight: 650 }}>
                {pct(stockB.change, 2)}
              </span>
            </div>

            <button
              className="btn small-btn"
              onClick={() => {
                onSelectStock(stockB.ticker);
                onClose();
              }}
              style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
            >
              Lihat Detail {stockB.ticker} <Icon name="arrow-up-right" cls="sm" />
            </button>
          </div>
        </div>

        {/* Head-to-Head Comparison Table */}
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <table className="data-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr style={{ background: 'var(--soft)' }}>
                <th style={{ width: '40%' }}>Metrik Valuasi &amp; Kinerja</th>
                <th style={{ width: '30%', textAlign: 'right' }}>{stockA.ticker}</th>
                <th style={{ width: '30%', textAlign: 'right' }}>{stockB.ticker}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Harga Pasar</strong></td>
                <td style={{ textAlign: 'right' }}>{rp(stockA.price)}</td>
                <td style={{ textAlign: 'right' }}>{rp(stockB.price)}</td>
              </tr>
              <tr>
                <td><strong>Harga Wajar (Fair Value)</strong></td>
                <td style={{ textAlign: 'right' }}>{fvA ? rp(fvA) : '—'}</td>
                <td style={{ textAlign: 'right' }}>{fvB ? rp(fvB) : '—'}</td>
              </tr>
              <tr>
                <td><strong>Margin of Safety (MOS)</strong></td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`pill ${mosA != null && mosA >= 20 ? 'green' : mosA != null && mosA < 0 ? 'red' : 'outline'}`}>
                    {mosA != null ? fmt(mosA, 1) + '%' : '—'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`pill ${mosB != null && mosB >= 20 ? 'green' : mosB != null && mosB < 0 ? 'red' : 'outline'}`}>
                    {mosB != null ? fmt(mosB, 1) + '%' : '—'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Price to Earnings (PER)</strong></td>
                <td style={{ textAlign: 'right', fontWeight: stockA.pe < stockB.pe ? 700 : 400 }}>
                  {stockA.pe.toFixed(1)}x {stockA.pe < stockB.pe && '✓'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: stockB.pe < stockA.pe ? 700 : 400 }}>
                  {stockB.pe.toFixed(1)}x {stockB.pe < stockA.pe && '✓'}
                </td>
              </tr>
              <tr>
                <td><strong>Price to Book (PBV)</strong></td>
                <td style={{ textAlign: 'right', fontWeight: stockA.pb < stockB.pb ? 700 : 400 }}>
                  {stockA.pb.toFixed(2)}x {stockA.pb < stockB.pb && '✓'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: stockB.pb < stockA.pb ? 700 : 400 }}>
                  {stockB.pb.toFixed(2)}x {stockB.pb < stockA.pb && '✓'}
                </td>
              </tr>
              <tr>
                <td><strong>Estimasi Dividend Yield</strong></td>
                <td style={{ textAlign: 'right', fontWeight: (dyA || 0) > (dyB || 0) ? 700 : 400 }}>
                  {dyA != null ? (
                    <span className="pill green">{fmt(dyA, 1)}%</span>
                  ) : '—'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: (dyB || 0) > (dyA || 0) ? 700 : 400 }}>
                  {dyB != null ? (
                    <span className="pill green">{fmt(dyB, 1)}%</span>
                  ) : '—'}
                </td>
              </tr>
              <tr>
                <td><strong>EPS Terakhir</strong></td>
                <td style={{ textAlign: 'right' }}>{stockA.eps != null ? `Rp${fmt(stockA.eps, 1)}` : '—'}</td>
                <td style={{ textAlign: 'right' }}>{stockB.eps != null ? `Rp${fmt(stockB.eps, 1)}` : '—'}</td>
              </tr>
              <tr>
                <td><strong>BVPS (Nilai Buku / Saham)</strong></td>
                <td style={{ textAlign: 'right' }}>{stockA.bvps != null ? `Rp${fmt(stockA.bvps, 0)}` : '—'}</td>
                <td style={{ textAlign: 'right' }}>{stockB.bvps != null ? `Rp${fmt(stockB.bvps, 0)}` : '—'}</td>
              </tr>
              <tr>
                <td><strong>Margin Laba Bersih</strong></td>
                <td style={{ textAlign: 'right' }}>{fmt(stockA.margin * 100, 1)}%</td>
                <td style={{ textAlign: 'right' }}>{fmt(stockB.margin * 100, 1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ minWidth: '100px' }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
