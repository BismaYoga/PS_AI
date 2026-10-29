import React, { useState, useMemo } from 'react';
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
  const [timeStatus, setTimeStatus] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'latest' | 'oldest'>('nearest');
  const [eventMonth, setEventMonth] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Current date string in YYYY-MM-DD format
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Compute countdown & status label for each event
  const getEventCountdown = (targetDateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDateStr + 'T00:00:00');
      const diffMs = target.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return { label: 'Hari ini', cls: 'pill green', isUpcoming: true };
      } else if (diffDays === 1) {
        return { label: 'Besok', cls: 'pill green', isUpcoming: true };
      } else if (diffDays > 1 && diffDays <= 3) {
        return { label: `H-${diffDays} (Segera)`, cls: 'pill green', isUpcoming: true };
      } else if (diffDays > 3 && diffDays <= 14) {
        return { label: `H-${diffDays}`, cls: 'pill blue', isUpcoming: true };
      } else if (diffDays > 14) {
        return { label: `H-${diffDays}`, cls: 'pill blue', isUpcoming: true };
      } else if (diffDays === -1) {
        return { label: 'Kemarin', cls: 'pill outline', isUpcoming: false };
      } else {
        return { label: 'Selesai', cls: 'pill outline', isUpcoming: false };
      }
    } catch {
      return { label: '—', cls: 'pill outline', isUpcoming: false };
    }
  };

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

  // Count upcoming vs past events
  const upcomingCount = useMemo(() => {
    return events.filter((e) => e.date >= todayStr).length;
  }, [events, todayStr]);

  // Filter and sort list
  const list = useMemo(() => {
    const filtered = events.filter((e) => {
      // 1. Tipe Aksi
      if (eventType !== 'Semua' && e.type !== eventType) return false;

      // 2. Bulan
      if (eventMonth !== 'all') {
        const mIdx = new Date(e.date + 'T12:00:00').getMonth();
        if (mNames[mIdx] !== eventMonth) return false;
      }

      // 3. Status Waktu (Mendatang vs Selesai)
      if (timeStatus === 'upcoming' && e.date < todayStr) return false;
      if (timeStatus === 'past' && e.date >= todayStr) return false;

      return true;
    });

    // 4. Sorting logic
    return filtered.sort((a, b) => {
      if (sortBy === 'nearest') {
        // Terdekat: Yang belum lewat (>= todayStr) diurutkan paling dekat (ASC).
        // Disusul yang sudah lewat (< todayStr) dari yang paling baru (DESC).
        const aUpcoming = a.date >= todayStr;
        const bUpcoming = b.date >= todayStr;

        if (aUpcoming && !bUpcoming) return -1;
        if (!aUpcoming && bUpcoming) return 1;
        if (aUpcoming && bUpcoming) {
          return a.date.localeCompare(b.date); // ASC (e.g. 27 Okt sebelum 29 Okt)
        }
        return b.date.localeCompare(a.date); // DESC for past (e.g. 22 Okt sebelum 20 Okt)
      } else if (sortBy === 'latest') {
        return b.date.localeCompare(a.date); // DESC
      } else if (sortBy === 'oldest') {
        return a.date.localeCompare(b.date); // ASC
      }
      return 0;
    });
  }, [events, eventType, eventMonth, timeStatus, sortBy, todayStr, mNames]);

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
      <div className="section-head wrap between">
        <div>
          <h2>Kalender &amp; Aksi Korporasi</h2>
          <p>
            Jadwal pembagian dividen tunai, laporan keuangan, RUPS, dan aksi korporasi resmi emiten BEI.
          </p>
        </div>
        <div className="filter-row wrap" style={{ gap: '8px' }}>
          {/* 1. Urutan Tanggal (Default: Terdekat dulu) */}
          <select
            id="event-sort"
            className="select"
            aria-label="Urutan tanggal"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            title="Urutan Tampilan"
          >
            <option value="nearest">Terdekat (Mendatang Dulu)</option>
            <option value="latest">Terbaru (Tanggal Terakhir)</option>
            <option value="oldest">Terlama (Arsip Tanggal)</option>
          </select>

          {/* 2. Filter Status Waktu */}
          <select
            id="event-time-status"
            className="select"
            aria-label="Status waktu"
            value={timeStatus}
            onChange={(e) => {
              setTimeStatus(e.target.value as any);
              setPage(1);
            }}
          >
            <option value="all">Semua Waktu ({events.length})</option>
            <option value="upcoming">Hanya Mendatang ({upcomingCount})</option>
            <option value="past">Riwayat / Selesai ({events.length - upcomingCount})</option>
          </select>

          {/* 3. Filter Tipe Aksi */}
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
            <option value="Semua">Semua Aksi</option>
            <option value="Dividen">Dividen Tunai</option>
            <option value="Laporan Keuangan">Laporan Keuangan</option>
            <option value="RUPS">RUPS / RUPSLB</option>
            <option value="Rights Issue">Rights Issue</option>
            <option value="Stock Split">Stock Split</option>
            <option value="Lainnya">Lainnya</option>
          </select>

          {/* 4. Filter Bulan */}
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
                  <th className="date-column">Tanggal &amp; Status</th>
                  <th>Emiten</th>
                  <th>Tipe aksi</th>
                  <th className="event-column">Ringkasan &amp; Nilai</th>
                  <th className="action-column">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pagedList.length ? (
                  pagedList.map((e) => {
                    const s = getStock(e.ticker);
                    const isEarn = e.type === 'Laporan Keuangan';
                    const isDiv = e.type === 'Dividen';
                    const countdown = getEventCountdown(e.date);

                    return (
                      <tr key={e.id}>
                        <td className="date-column">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '12px' }}>
                              {fmtDate(e.date)}
                            </strong>
                            <span
                              className={countdown.cls}
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              {countdown.label}
                            </span>
                          </div>
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
                        <Icon name="search" />
                        <p>Tidak ada peristiwa kalender yang cocok dengan filter yang dipilih.</p>
                        <button
                          className="link-btn"
                          onClick={() => {
                            setEventType('Semua');
                            setEventMonth('all');
                            setTimeStatus('all');
                            setSortBy('nearest');
                            setPage(1);
                          }}
                        >
                          Reset semua filter
                        </button>
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
                padding: '12px 18px',
                borderTop: '1px solid var(--line)',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div className="small muted">
                Menampilkan {startIdx + 1} - {Math.min(startIdx + pageSize, list.length)} dari {list.length} peristiwa
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="btn small-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  style={{ padding: '4px 9px', fontSize: '11px' }}
                >
                  <Icon name="left" cls="sm" /> Sebelumnya
                </button>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {(() => {
                    const elements: React.ReactNode[] = [];
                    let prev = 0;
                    for (const pNum of sortedPages) {
                      if (prev && pNum - prev > 1) {
                        elements.push(
                          <span
                            key={`dots-${pNum}`}
                            style={{
                              padding: '4px 6px',
                              fontSize: '11px',
                              color: 'var(--muted)',
                            }}
                          >
                            ...
                          </span>
                        );
                      }
                      elements.push(
                        <button
                          key={pNum}
                          className={`btn small-btn ${currentPage === pNum ? 'primary' : ''}`}
                          onClick={() => setPage(pNum)}
                          style={{
                            padding: '4px 9px',
                            minWidth: '28px',
                            fontSize: '11px',
                            fontWeight: currentPage === pNum ? 'bold' : 'normal',
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
              <strong>Sumber Data:</strong> Keterbukaan Informasi Resmi PT Bursa Efek Indonesia (BEI / IDX Disclosures) &amp; KSEI (Kustodian Sentral Efek Indonesia).
            </span>
            <span>
              Halaman {currentPage} dari {totalPages} · {list.length} agenda ditemukan
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
