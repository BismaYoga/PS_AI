import React, { useState, useMemo } from 'react';
import { InstrumentData } from '../types';
import { Layers, ChevronLeft, ChevronRight, BarChart2, BookOpen } from 'lucide-react';

interface FundamentalTableProps {
  stocks: InstrumentData[];
  onSelectStock: (ticker: string) => void;
  onOpenMethodology: () => void;
}

const SECTORS = [
  'Semua Sektor',
  'Keuangan',
  'Konsumer Non-Siklikal',
  'Konsumer Siklikal',
  'Energi',
  'Bahan Baku',
  'Kesehatan',
  'Infrastruktur',
  'Komunikasi',
  'Properti & Real Estat',
  'Teknologi',
  'Perindustrian',
  'Utilitas'
];

export const FundamentalTable: React.FC<FundamentalTableProps> = ({
  stocks,
  onSelectStock,
  onOpenMethodology
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('Semua Sektor');
  const [mosFilter, setMosFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'mos' | 'pe' | 'pb' | 'price' | 'ticker'>('mos');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    let result = stocks.filter(s => s.ticker !== 'IHSG');

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.ticker.toLowerCase().includes(q) ||
        (s.name && s.name.toLowerCase().includes(q))
      );
    }

    // Sector filter
    if (selectedSector !== 'Semua Sektor') {
      result = result.filter(s => s.sector === selectedSector);
    }

    // MOS filter
    if (mosFilter === 'great') {
      result = result.filter(s => (s.mos || 0) >= 25);
    } else if (mosFilter === 'good') {
      result = result.filter(s => (s.mos || 0) >= 10 && (s.mos || 0) < 25);
    } else if (mosFilter === 'fair') {
      result = result.filter(s => (s.mos || 0) >= 0 && (s.mos || 0) < 10);
    } else if (mosFilter === 'over') {
      result = result.filter(s => (s.mos || 0) < 0);
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'mos') {
        valA = a.mos !== undefined ? a.mos : -999;
        valB = b.mos !== undefined ? b.mos : -999;
      }

      if (valA === undefined || valA === null) valA = -999;
      if (valB === undefined || valB === null) valB = -999;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [stocks, searchTerm, selectedSector, mosFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredStocks.length / pageSize) || 1;
  const currentStocks = filteredStocks.slice((page - 1) * pageSize, page * pageSize);

  const getMosBadgeClass = (mos?: number) => {
    if (mos === undefined || mos === null) return 'mos-fair';
    if (mos >= 25) return 'mos-great';
    if (mos >= 10) return 'mos-good';
    if (mos >= 0) return 'mos-fair';
    return 'mos-over';
  };

  return (
    <div className="table-card" id="fundamental-section">
      <div className="table-toolbar">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#172738', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={20} style={{ color: '#0e3465' }} />
            <span>Katalog Saham Fundamental & Margin of Safety (MOS)</span>
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Valuasi Benjamin Graham berbasis EPS (TTM), BVPS, dan target rasio industri dari Yahoo Finance.
          </p>
        </div>

        <button className="btn-secondary" onClick={onOpenMethodology}>
          <BookOpen size={14} />
          <span>Rumus Metodologi MOS</span>
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="table-filters">
        <input
          type="text"
          placeholder="Filter kode/nama emiten..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="stock-selector"
          style={{ width: 220 }}
        />

        <select
          value={selectedSector}
          onChange={(e) => { setSelectedSector(e.target.value); setPage(1); }}
          className="stock-selector"
        >
          {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={mosFilter}
          onChange={(e) => { setMosFilter(e.target.value); setPage(1); }}
          className="stock-selector"
        >
          <option value="all">Semua MOS</option>
          <option value="great">Sangat Menarik (≥ 25%)</option>
          <option value="good">Menarik (10% - 25%)</option>
          <option value="fair">Fair Value (0% - 10%)</option>
          <option value="over">Overvalued (&lt; 0%)</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split('-') as [any, any];
            setSortBy(sb);
            setSortOrder(so);
          }}
          className="stock-selector"
        >
          <option value="mos-desc">MOS Tertinggi ke Terendah</option>
          <option value="mos-asc">MOS Terendah ke Tertinggi</option>
          <option value="pe-asc">PER Terendah (Valuasi Murah)</option>
          <option value="pb-asc">PBV Terendah</option>
          <option value="price-desc">Harga Tertinggi</option>
          <option value="ticker-asc">Abjad Emiten (A-Z)</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Emiten</th>
              <th>Sektor</th>
              <th style={{ textAlign: 'right' }}>Harga Terakhir</th>
              <th style={{ textAlign: 'right' }}>Harga Wajar</th>
              <th style={{ textAlign: 'center' }}>Margin of Safety</th>
              <th style={{ textAlign: 'right' }}>PER</th>
              <th style={{ textAlign: 'right' }}>PBV</th>
              <th style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentStocks.length > 0 ? (
              currentStocks.map((stock) => (
                <tr key={stock.ticker}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                        fontWeight: 700,
                        fontSize: 11,
                        color: '#0e3465'
                      }}>
                        <img
                          src={`/logo-emiten/${stock.ticker}.svg`}
                          alt={stock.ticker}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                        <span>{stock.ticker.slice(0, 3)}</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0e3465' }}>{stock.ticker}</div>
                        <div style={{ fontSize: 11, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {stock.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span style={{ fontSize: 12, color: '#475569' }}>{stock.sector || '—'}</span>
                  </td>

                  <td style={{ textAlign: 'right', fontWeight: 650, fontFamily: 'monospace' }}>
                    Rp {stock.price.toLocaleString('id-ID')}
                  </td>

                  <td style={{ textAlign: 'right', fontWeight: 650, fontFamily: 'monospace', color: '#1e3a8a' }}>
                    {stock.fairValue ? `Rp ${stock.fairValue.toLocaleString('id-ID')}` : '—'}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={`mos-badge ${getMosBadgeClass(stock.mos)}`}>
                      {stock.mos !== undefined ? `${stock.mos > 0 ? '+' : ''}${stock.mos.toFixed(1)}%` : '—'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {stock.pe ? `${stock.pe.toFixed(1)}x` : '—'}
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {stock.pb ? `${stock.pb.toFixed(2)}x` : '—'}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => onSelectStock(stock.ticker)}
                    >
                      <BarChart2 size={12} />
                      <span>Analisis</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Tidak ada saham yang sesuai dengan filter pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-bar">
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Menampilkan {Math.min(filteredStocks.length, (page - 1) * pageSize + 1)}–{Math.min(filteredStocks.length, page * pageSize)} dari {filteredStocks.length} emiten
        </div>

        <div className="pagination-pages">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
              return (
                <button
                  key={p}
                  className={`page-btn ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return <span key={p} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>;
            }
            return null;
          })}

          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
