import React, { useState } from 'react';
import { CorporateEvent, StockItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { fmtDate } from '../utils';

interface CorporateEventsSectionProps {
  events: CorporateEvent[];
  stocks: StockItem[];
  onSelectStock: (ticker: string) => void;
  onOpenEventDrawer: (event: CorporateEvent) => void;
}

export const CorporateEventsSection: React.FC<CorporateEventsSectionProps> = ({
  events,
  stocks,
  onSelectStock,
  onOpenEventDrawer,
}) => {
  const [eventType, setEventType] = useState<string>('Semua');
  const [eventMonth, setEventMonth] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const getStock = (t: string): StockItem => {
    const found = stocks.find((s) => s.ticker === t);
    if (found) return found;
    return {
      ticker: t,
      name: `PT ${t} Tbk`,
      short: t,
      sector: 'Umum',
      subsector: 'Investasi',
      color: '#1a62bf',
      mark: t.slice(0, 3),
      price: 1000,
      change: 0,
      eps: null,
      bvps: null,
      pe: 12,
      pb: 1.5,
      volume: '—',
      turnover: '—',
      date: null,
      isLive: false,
      shares: 10,
      margin: 0.15,
      equityRatio: 0.5,
      rev: [],
      description: '',
    };
  };

  // Filter list
  let list = events.filter((e) => {
    if (eventType !== 'Semua' && e.type !== eventType) return false;
    if (eventMonth !== 'all') {
      const mIdx = new Date(e.date + 'T12:00:00').getMonth();
      if (mNames[mIdx] !== eventMonth) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pagedList = list.slice(startIdx, startIdx + pageSize);

  const pagesToShow = new Set(
    [1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(
      (x) => x >= 1 && x <= totalPages
    )
  );
  const sortedPages = [...pagesToShow].sort((a, b) => a - b);

  return (
    <section className="section" id="corporate">
      <div className="section-head">
        <div>
          <h2>Kalender & Aksi Korporasi</h2>
          <p>
            Jadwal pembagian dividen tunai, laporan keuangan, RUPS, dan aksi korporasi emiten riil di BEI.
          </p>
        </div>
        <div className="filter-row">
          <select
            id="event-type"
            className="select"
            aria-label="Tipe peristiwa"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
          >
            <option value="Semua">Semua Aksi ({events.length} Peristiwa)</option>
            <option value="Dividen">Dividen Tunai</option>
            <option value="Laporan Keuangan">Laporan Keuangan</option>
            <option value="RUPS">RUPS / RUPSLB</option>
            <option value="Rights Issue">Rights Issue</option>
            <option value="Stock Split">Stock Split</option>
            <option value="Lainnya">Lainnya</option>
          </select>

          <select
            id="event-month"
            className="select"
            aria-label="Filter bulan"
            value={eventMonth}
            onChange={(e) => {
              setEventMonth(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Semua Bulan</option>
            {mNames.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div id="events-container">
        <div className="card">
          <div className="table-scroll">
            <table className="data-table calendar-table">
              <thead>
                <tr>
                  <th className="date-column">Tanggal</th>
                  <th>Emiten</th>
                  <th>Tipe aksi</th>
                  <th className="event-column">Ringkasan & nilai</th>
                  <th className="action-column">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pagedList.length ? (
                  pagedList.map((e) => {
                    const s = getStock(e.ticker);
                    const isEarn = e.type === 'Laporan Keuangan';
                    const isDiv = e.type === 'Dividen';

                    return (
                      <tr key={e.id}>
                        <td className="date-column">
                          <strong style={{ fontSize: '12px', display: 'block' }}>
                            {fmtDate(e.date)}
                          </strong>
                          <span className="small muted">
                            {new Date(e.date + 'T12:00:00').toLocaleDateString(
                              'id-ID',
                              { weekday: 'long' }
                            )}
                          </span>
                        </td>
                        <td>
                          <div className="stock-id">
                            <StockLogo ticker={s.ticker} mark={s.mark} color={s.color} />
                            <div>
                              <a
                                className="stock-symbol"
                                href={`#stock/${s.ticker}`}
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  onSelectStock(s.ticker);
                                }}
                              >
                                {s.ticker}
                              </a>
                              <span className="stock-company">{s.short}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              isEarn ? 'blue' : isDiv ? 'green' : 'outline'
                            }`}
                          >
                            {e.type}
                          </span>
                        </td>
                        <td className="event-column">
                          <strong>{e.title}</strong>
                          <div className="small muted">{e.sub}</div>
                        </td>
                        <td className="action-column">
                          <button
                            className="btn small-btn"
                            onClick={() => onOpenEventDrawer(e)}
                          >
                            Detail agenda
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <strong>Tidak ada agenda yang cocok</strong>
                        Coba ubah filter tipe aksi atau bulan.
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
                dari <b>{list.length}</b> agenda
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
                            key={`dots-ev-${pNum}`}
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
              {events.length} agenda aksi korporasi riil emiten IDX · Sumber:
              Yahoo Finance Feed (Corporate Calendar & Dividends)
            </span>
            <span>
              Halaman {currentPage} dari {totalPages}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
