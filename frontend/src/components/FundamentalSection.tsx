import React, { useState } from 'react';
import { StockItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { fmt, rp, pct, fairValue, mos, getOHLCData } from '../utils';

interface FundamentalSectionProps {
  stocks: StockItem[];
  favorites: Set<string>;
  onToggleFavorite: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  onOpenMethod: () => void;
  onlySaved?: boolean;
}

export const FundamentalSection: React.FC<FundamentalSectionProps> = ({
  stocks,
  favorites,
  onToggleFavorite,
  onSelectStock,
  onOpenMethod,
  onlySaved = false,
}) => {
  const [sector, setSector] = useState<string>('all');
  const [minMos, setMinMos] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('mos');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Filter list
  let list = stocks.filter(
    (s) =>
      (!onlySaved || favorites.has(s.ticker)) &&
      (sector === 'all' || s.sector === sector) &&
      (minMos === 0 || (mos(s) !== null && (mos(s) as number) >= minMos))
  );

  // Sort list
  list.sort((a, b) =>
    sortBy === 'ticker'
      ? a.ticker.localeCompare(b.ticker)
      : (mos(b) || -999) - (mos(a) || -999)
  );

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedList = list.slice(startIdx, startIdx + pageSize);

  // Sparkline path generator
  const getSparklinePath = (s: StockItem) => {
    const ohlc = getOHLCData(s.ticker, s.price, s.change);
    const vals = ohlc.slice(-28).map((x) => x.close);
    if (!vals.length) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return vals
      .map(
        (v, i) =>
          `${i ? 'L' : 'M'}${(
            (i / (vals.length - 1)) * 103 +
            1
          ).toFixed(1)},${(25 - ((v - min) / (max - min || 1)) * 22).toFixed(1)}`
      )
      .join(' ');
  };

  // Pagination buttons
  const pagesToShow = new Set(
    [1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(
      (x) => x >= 1 && x <= totalPages
    )
  );
  const sortedPages = [...pagesToShow].sort((a, b) => a - b);

  return (
    <section
      className="section"
      id="fundamental"
      style={onlySaved ? { marginTop: '22px' } : undefined}
    >
      <div className="section-head">
        <div>
          <h2>
            {onlySaved
              ? 'Emiten dalam pantauan'
              : 'Saham fundamental dengan MOS menarik'}
          </h2>
          <p>
            {onlySaved
              ? 'Saham tersimpan di browser ini. Klik emiten untuk membuka analisis.'
              : 'Bandingkan harga sekarang dengan estimasi harga wajar.'}
          </p>
        </div>
        <div className="filter-row">
          <select
            id="sector-filter"
            className="select"
            aria-label="Filter sektor"
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Semua sektor ({stocks.length} Saham)</option>
            {[...new Set(stocks.map((s) => s.sector))].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            id="mos-filter"
            className="select"
            aria-label="Minimum margin of safety"
            value={minMos}
            onChange={(e) => {
              setMinMos(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="0">Semua MOS</option>
            <option value="20">MOS ≥ 20%</option>
            <option value="25">MOS ≥ 25%</option>
          </select>

          <select
            id="sort-filter"
            className="select"
            aria-label="Urutkan emiten"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="mos">MOS tertinggi</option>
            <option value="ticker">Kode A–Z</option>
          </select>
        </div>
      </div>

      <div id="stocks-container">
        <div className="card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emiten</th>
                  <th className="sector-column">Sektor</th>
                  <th className="number">Harga sekarang</th>
                  <th className="number">
                    Harga wajar{' '}
                    <span
                      title="EPS riil × Target PER"
                      style={{ display: 'inline-flex', verticalAlign: 'middle' }}
                    >
                      <Icon name="info" cls="sm" />
                    </span>
                  </th>
                  <th className="number mos-column">MOS</th>
                  <th className="number trend-column">Tren 1 bulan</th>
                  <th>
                    <span className="sr-only">Watchlist</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedList.length ? (
                  pagedList.map((s) => {
                    const fv = fairValue(s);
                    const mVal = mos(s);
                    const mosStyle: React.CSSProperties =
                      mVal === null
                        ? {}
                        : mVal < 0
                        ? { background: '#fcf1f2', color: 'var(--red)' }
                        : mVal >= 25
                        ? { background: '#e3f5eb', color: '#0e6945', fontWeight: 700 }
                        : {};

                    const isFav = favorites.has(s.ticker);

                    return (
                      <tr
                        key={s.ticker}
                        data-stock={s.ticker}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSelectStock(s.ticker)}
                      >
                        <td>
                          <div className="stock-id">
                            <StockLogo ticker={s.ticker} mark={s.mark} color={s.color} />
                            <div>
                              <a
                                className="stock-symbol"
                                href={`#stock/${s.ticker}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  onSelectStock(s.ticker);
                                }}
                              >
                                {s.ticker}
                              </a>
                              <span className="stock-company">{s.short}</span>
                            </div>
                          </div>
                        </td>
                        <td className="sector-column">
                          <span className="pill outline">{s.sector}</span>
                        </td>
                        <td className="number price-cell">
                          {rp(s.price)}
                          <div
                            className={`small ${
                              s.change >= 0 ? 'positive' : 'negative'
                            }`}
                          >
                            {pct(s.change, 2)}
                          </div>
                        </td>
                        <td className="number fair-value">
                          {fv ? rp(fv) : <span className="muted">—</span>}
                        </td>
                        <td className="number">
                          <span className="mos-pill" style={mosStyle}>
                            {mVal !== null ? fmt(mVal, 1) + '%' : '—'}
                          </span>
                        </td>
                        <td className="trend-column">
                          <svg
                            className="sparkline"
                            viewBox="0 0 105 28"
                            aria-hidden="true"
                          >
                            <path
                              d={getSparklinePath(s)}
                              fill="none"
                              stroke={s.change >= 0 ? '#4a917c' : '#be7d85'}
                              strokeWidth="1.4"
                            />
                          </svg>
                        </td>
                        <td>
                          <button
                            className={`star-button ${isFav ? 'saved' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(s.ticker);
                            }}
                            aria-label={`${
                              isFav ? 'Hapus' : 'Tambahkan'
                            } ${s.ticker} ${isFav ? 'dari' : 'ke'} watchlist`}
                            aria-pressed={isFav}
                            title={`${
                              isFav ? 'Hapus dari' : 'Tambahkan ke'
                            } watchlist`}
                          >
                            <Icon name="star" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <strong>
                          {onlySaved && !favorites.size
                            ? 'Watchlist masih kosong'
                            : 'Tidak ada emiten yang cocok'}
                        </strong>
                        {onlySaved && !favorites.size
                          ? 'Cari emiten di kolom atas, lalu tekan ikon bintang.'
                          : 'Coba ubah filter sektor atau minimum MOS.'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              className="pagination-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 20px',
                borderTop: '1px solid var(--line)',
                background: '#fafbfc',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Menampilkan{' '}
                <b>
                  {startIdx + 1}–{Math.min(startIdx + pageSize, list.length)}
                </b>{' '}
                dari <b>{list.length}</b> emiten
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <button
                  className="btn small-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{ padding: '4px 9px', fontSize: '11px' }}
                >
                  <Icon name="chevron" cls="sm" /> Sebelumnya
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {(() => {
                    const elements = [];
                    let prev = 0;
                    for (const pNum of sortedPages) {
                      if (prev && pNum - prev > 1) {
                        elements.push(
                          <span
                            key={`dots-${pNum}`}
                            style={{
                              color: 'var(--muted)',
                              padding: '0 2px',
                              fontSize: '11px',
                            }}
                          >
                            …
                          </span>
                        );
                      }
                      elements.push(
                        <button
                          key={pNum}
                          className={`btn small-btn ${
                            pNum === currentPage ? 'primary' : ''
                          }`}
                          onClick={() => setPage(pNum)}
                          style={{
                            minWidth: '28px',
                            padding: '4px 7px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {pNum}
                        </button>
                      );
                      prev = pNum;
                    }
                    return elements;
                  })()}
                </div>
                <button
                  className="btn small-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ padding: '4px 9px', fontSize: '11px' }}
                >
                  Selanjutnya <Icon name="right" cls="sm" />
                </button>
              </div>
            </div>
          )}

          <div className="table-note">
            <span>
              {list.length} emiten · Harga wajar: EPS riil × Target PER · MOS = (1
              − harga / harga wajar) × 100% · Sumber: yfinance
            </span>
            <span>
              Halaman {currentPage} dari {totalPages}
              <button
                className="link-btn"
                onClick={onOpenMethod}
                style={{ marginLeft: '8px' }}
              >
                Lihat metodologi <Icon name="arrow-up-right" cls="sm" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
