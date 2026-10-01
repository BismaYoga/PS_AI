import React from 'react';
import { InstrumentData } from '../types';
import { X, Building2, TrendingUp, DollarSign } from 'lucide-react';

interface StockDetailModalProps {
  stock: InstrumentData | null;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose }) => {
  if (!stock) return null;

  const fairVal = stock.fairValue || 0;
  const bearPrice = Math.round(fairVal * 0.85);
  const bullPrice = Math.round(fairVal * 1.15);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden'
            }}>
              <img
                src={`/logo-emiten/${stock.ticker}.svg`}
                alt={stock.ticker}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
              />
              <span style={{ fontWeight: 700, color: '#0e3465' }}>{stock.ticker.slice(0, 3)}</span>
            </div>

            <div>
              <h2 style={{ fontSize: 18, fontWeight: 750, color: '#0e3465' }}>
                {stock.ticker} · {stock.name}
              </h2>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {stock.sector || 'Sektor IDX'} · {stock.subsector || 'Subsektor'}
              </div>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Key Financial KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            background: '#f8fafc',
            padding: 16,
            borderRadius: 12,
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Harga Terakhir</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', marginTop: 2 }}>
                Rp {stock.price.toLocaleString('id-ID')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Harga Wajar</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#2563eb', marginTop: 2 }}>
                Rp {stock.fairValue ? stock.fairValue.toLocaleString('id-ID') : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Margin of Safety</div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: (stock.mos || 0) >= 0 ? '#059669' : '#dc2626',
                marginTop: 2
              }}>
                {stock.mos !== undefined ? `${stock.mos > 0 ? '+' : ''}${stock.mos.toFixed(1)}%` : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>PER (TTM)</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', marginTop: 2 }}>
                {stock.pe ? `${stock.pe.toFixed(1)}x` : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>PBV (Book Value)</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', marginTop: 2 }}>
                {stock.pb ? `${stock.pb.toFixed(2)}x` : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>ROE / Div. Yield</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', marginTop: 2 }}>
                {stock.roe ? `${(stock.roe * 100).toFixed(1)}%` : '—'} / {stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Valuasi 3 Skenario */}
          {stock.fairValue ? (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0e3465', marginBottom: 10 }}>
                📊 Analisis 3 Skenario Valuasi (Sensitivitas Graham)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>BEAR CASE (-15%)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', marginTop: 4 }}>
                    Rp {bearPrice.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 2 }}>Kondisi kontraksi industri</div>
                </div>

                <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>BASE CASE (Fair Value)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginTop: 4 }}>
                    Rp {fairVal.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: 11, color: '#1e3a8a', marginTop: 2 }}>Target PER normal industri</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>BULL CASE (+15%)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#166534', marginTop: 4 }}>
                    Rp {bullPrice.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: 11, color: '#14532d', marginTop: 2 }}>Kondisi ekspansi optimal</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Business Profile Description */}
          {stock.summary ? (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0e3465', marginBottom: 6 }}>
                🏢 Profil Bisnis & Keunggulan Kompetitif
              </h3>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                {stock.summary}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
