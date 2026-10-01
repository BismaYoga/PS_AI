import React, { useState, useMemo } from 'react';
import { CorporateEvent } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Tag } from 'lucide-react';

interface CorporateEventsTableProps {
  events: CorporateEvent[];
  onSelectStock: (ticker: string) => void;
}

export const CorporateEventsTable: React.FC<CorporateEventsTableProps> = ({
  events,
  onSelectStock
}) => {
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Compute countdown / days difference
  const processedEvents = useMemo(() => {
    const today = new Date('2026-10-01'); // active reference

    return events.map(ev => {
      const evDate = new Date(ev.date);
      const diffTime = evDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let badge = '';
      let isUpcoming = diffDays >= 0;

      if (diffDays === 0) badge = 'Hari Ini';
      else if (diffDays > 0) badge = `${diffDays} hari lagi`;
      else badge = `${Math.abs(diffDays)} hari lalu`;

      return {
        ...ev,
        diffDays,
        badge,
        isUpcoming
      };
    });
  }, [events]);

  // Sort and filter
  const filteredEvents = useMemo(() => {
    let result = processedEvents;

    if (eventTypeFilter !== 'all') {
      result = result.filter(e => e.type === eventTypeFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.ticker.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.sub.toLowerCase().includes(q)
      );
    }

    // Sort: Upcoming ascending (closest first), then Past descending (recent first)
    result.sort((a, b) => {
      if (a.isUpcoming && b.isUpcoming) return a.diffDays - b.diffDays;
      if (a.isUpcoming && !b.isUpcoming) return -1;
      if (!a.isUpcoming && b.isUpcoming) return 1;
      return b.diffDays - a.diffDays;
    });

    return result;
  }, [processedEvents, eventTypeFilter, searchTerm]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const currentEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="table-card" id="events-section">
      <div className="table-toolbar">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#172738', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} style={{ color: '#0e3465' }} />
            <span>Jadwal & Aksi Korporasi Riil (Yahoo Finance)</span>
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Kalender terverifikasi jadwal rilis laporan keuangan kuartalan dan cum-dividend 69 emiten IDX.
          </p>
        </div>

        <div className="table-filters">
          <input
            type="text"
            placeholder="Cari kode saham/agenda..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="stock-selector"
            style={{ width: 200 }}
          />

          <select
            value={eventTypeFilter}
            onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
            className="stock-selector"
          >
            <option value="all">Semua Jenis Agenda</option>
            <option value="Laporan Keuangan">Laporan Keuangan (Earnings)</option>
            <option value="Dividen Tunai">Dividen Tunai</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="styled-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Status</th>
              <th>Emiten</th>
              <th>Kategori</th>
              <th>Rincian Agenda</th>
              <th style={{ textAlign: 'right' }}>Nilai / Estimasi</th>
            </tr>
          </thead>
          <tbody>
            {currentEvents.length > 0 ? (
              currentEvents.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {ev.date}
                  </td>

                  <td>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: ev.isUpcoming ? '#eff6ff' : '#f1f5f9',
                      color: ev.isUpcoming ? '#2563eb' : '#64748b'
                    }}>
                      {ev.badge}
                    </span>
                  </td>

                  <td>
                    <button
                      onClick={() => onSelectStock(ev.ticker)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0e3465',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Tag size={12} />
                      <span>{ev.ticker}</span>
                    </button>
                  </td>

                  <td>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: ev.type === 'Dividen Tunai' ? '#047857' : '#7c3aed'
                    }}>
                      {ev.type}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{ev.sub}</div>
                  </td>

                  <td style={{ textAlign: 'right', fontWeight: 650, fontFamily: 'monospace', color: '#0f172a' }}>
                    {ev.amount}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Tidak ada agenda korporasi yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-bar">
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Menampilkan {Math.min(filteredEvents.length, (page - 1) * pageSize + 1)}–{Math.min(filteredEvents.length, page * pageSize)} dari {filteredEvents.length} agenda
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
