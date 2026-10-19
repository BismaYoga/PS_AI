import React, { useEffect } from 'react';
import { StockItem, CorporateEvent, NewsItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { fmt, fmtDate, rp, periodLabel } from '../utils';

export interface DrawerPayload {
  type: 'about' | 'method' | 'technical' | 'sources' | 'news' | 'event' | 'doc' | string;
  stock?: StockItem;
  companyDetail?: any;
  ticker?: string;
  chartCalc?: any;
  newsItem?: NewsItem;
  eventItem?: CorporateEvent;
  docItem?: any;
}

interface DrawerModalProps {
  payload: DrawerPayload | null;
  onClose: () => void;
  onNavigateToStock?: (ticker: string) => void;
  onOpenMethod?: () => void;
  onOpenWatchlist?: () => void;
}

export const DrawerModal: React.FC<DrawerModalProps> = ({
  payload,
  onClose,
  onNavigateToStock,
  onOpenMethod,
  onOpenWatchlist,
}) => {
  const isOpen = !!payload;

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!payload) return null;

  const renderContent = () => {
    switch (payload.type) {
      case 'about':
        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">TENTANG DATA &amp; ARSITEKTUR</span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>Riset saham terstruktur dengan data riil BEI &amp; AI.</h2>
              <p>
                PintarSaham Intelligence menghubungkan data pasar real-time Bursa
                Efek Indonesia (BEI / IDX) melalui <strong>Invezgo API</strong>,
                penyimpanan lokal <strong>SQLite Database</strong> yang hemat
                kuota request, serta analisis cerdas <strong>Gemini AI</strong>.
              </p>
              <div className="notice">
                <strong>Terhubung Penuh ke Data Resmi BEI (Invezgo API).</strong>
                <br />
                Seluruh 909 emiten aktif BEI, grafik harian &amp; intraday 1 hari,
                rasio valuasi (EPS, BVPS, PER, PBV, ROE, MOS), laporan keuangan 5
                kuartal terakhir, komposisi pemegang saham KSEI, berita pasar, dan
                dokumen PDF Keterbukaan Informasi BEI menggunakan data riil.
              </div>
              <h3>Arsitektur Hemat Request (SQLite DB Lokal)</h3>
              <p>
                Untuk menghemat kuota request Invezgo API yang berbayar per
                request, seluruh data yang bersifat periodik disimpan otomatis di{' '}
                <code>data/pintarsaham.db</code>:
                <br />• <strong>Laporan Keuangan Kuartalan, Profil, &amp; KSEI</strong>:
                Disimpan selama 90 hari (1 kuartal) — kunjungan berikutnya memakai{' '}
                <strong>0 request API</strong>.
                <br />• <strong>Keterbukaan Informasi BEI (PDF)</strong>: Disimpan
                selama 7 hari per emiten.
                <br />• <strong>Berita Pasar &amp; Emiten</strong>: Ditarik 1 kali
                request (50 berita terkurasi) saat tombol ditekan, menampilkan Top
                3 di layar dan mengirimkan seluruh 50 berita ke Gemini AI.
              </p>
              <h3>Penyimpanan Watchlist &amp; Privasi</h3>
              <p>
                Watchlist Anda disimpan secara lokal di browser
                (<code>localStorage</code>) sedangkan cache fundamental dan
                dokumen BEI tersimpan di database SQLite lokal pada perangkat server
                Anda.
              </p>
              <h3>Pintasan Navigasi</h3>
              <p>
                Ketik kode atau nama dari 909 emiten BEI di kolom pencarian atas,
                lalu tekan Enter. Tombol <code>/</code> memfokuskan pencarian;{' '}
                <code>Esc</code> menutup panel samping.
              </p>
              {onOpenWatchlist && (
                <button
                  className="btn"
                  onClick={() => {
                    onClose();
                    onOpenWatchlist();
                  }}
                  style={{ marginTop: '20px' }}
                >
                  Buka watchlist <Icon name="right" cls="sm" />
                </button>
              )}
            </div>
          </>
        );

      case 'method':
        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">METODOLOGI VALUASI &amp; MOS</span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>Data fundamental riil dari Invezgo API</h2>
              <p>
                Metodologi penentuan harga wajar (fair value) dan Margin of Safety
                (MOS) dihitung langsung dari data keuangan riil emiten Bursa Efek
                Indonesia.
              </p>
              <div className="notice">
                <strong>
                  <Icon name="book" cls="sm" /> Dokumentasi Lengkap Tersedia:
                </strong>
                <br />
                Seluruh pembuktian rumus, komponen data, dan studi kasus langkah
                demi langkah dapat dibaca di file{' '}
                <code>perhitungan_fundamental_mos.md</code>.
              </div>
              <h3>1. Pendekatan Kelipatan Laba (PER)</h3>
              <div className="notice">
                Harga Wajar = EPS riil (TTM) × Target PER dasar
                <br />
                MOS (%) = (1 − Harga Sekarang / Harga Wajar) × 100%
              </div>
              <p>
                EPS (Earnings Per Share) ditarik dari laba bersih riil 12 bulan
                terakhir (Trailing Twelve Months). Target PER mencerminkan
                rata-rata wajar historis industri yang dapat disesuaikan melalui
                slider.
              </p>
              <h3>2. Pendekatan Nilai Buku (PBV)</h3>
              <div className="notice">
                Harga Wajar = BVPS riil × Target PBV dasar
              </div>
              <p>
                BVPS (Book Value Per Share) ditarik dari total ekuitas bersih neraca
                keuangan riil dibagi jumlah saham beredar.
              </p>
              <h3>3. Rentang Sensitivitas Tiga Skenario</h3>
              <p>
                • <strong>Konservatif (Bear)</strong>: Target PER −20% di bawah
                asumsi dasar.
                <br />• <strong>Dasar (Base)</strong>: Target PER wajar industri
                atau posisi slider aktif.
                <br />• <strong>Optimis (Bull)</strong>: Target PER +20% di atas
                asumsi dasar.
              </p>
            </div>
          </>
        );

      case 'technical': {
        const c = payload.chartCalc;
        const s = payload.stock;
        if (!c || !s) return null;
        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">DASAR ANALISIS TEKNIKAL</span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>Indikator teknikal dari data pasar riil BEI.</h2>
              <div className="notice">
                Data candlestick harian (OHLC) dan pergerakan intraday 1 hari
                ditarik langsung dari <strong>Invezgo API (BEI Official)</strong>{' '}
                dan disimpan di cache SQLite lokal untuk efisiensi request.
              </div>
              <div className="detail-pair">
                <span>Instrumen / periode</span>
                <b>
                  {s.ticker} / {periodLabel(payload.chartCalc?.period || '3M')}
                </b>
              </div>
              <div className="detail-pair">
                <span>Low periode</span>
                <b>
                  {fmt(c.lowD.low)}
                  <br />
                  {fmtDate(c.lowD.date)}
                </b>
              </div>
              <div className="detail-pair">
                <span>High periode</span>
                <b>
                  {fmt(c.highD.high)}
                  <br />
                  {fmtDate(c.highD.date)}
                </b>
              </div>

              <h3>Fibonacci retracement</h3>
              <p>
                Menggunakan rentang high–low OHLC pada periode terpilih. Acuan
                ini berubah ketika periode grafik diganti. Penentuan swing yang
                relevan tetap memerlukan validasi analis.
              </p>
              <div className="notice">
                Level = high − rasio retracement × (high − low)
              </div>
              {c.levels?.map((l: any, i: number) => (
                <div className="detail-pair" key={i}>
                  <span>Retracement {fmt(l.ratio * 100, 1)}%</span>
                  <b>{fmt(l.value)}</b>
                </div>
              ))}
              <p>
                Support dan resistance yang ditampilkan adalah level terdekat di
                bawah dan di atas harga terakhir. Level 50% adalah referensi
                retracement yang lazim dipakai, bukan rasio Fibonacci murni.
              </p>
            </div>
          </>
        );
      }

      case 'sources': {
        const s = payload.stock;
        const cd = payload.companyDetail;
        if (!s) return null;
        const finList = Array.isArray(cd?.financials) ? cd.financials : [];
        const shList = Array.isArray(cd?.shareholders) ? cd.shareholders : [];
        const prof = cd?.profile;
        const periodSpan =
          finList.length >= 2
            ? `${finList[0].year} – ${finList[finList.length - 1].year} (Resmi BEI)`
            : 'Kuartalan Resmi BEI (Invezgo)';

        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">SUMBER DATA &amp; PROFIL RESMI</span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>{s.ticker}: sumber data &amp; penyimpanan DB</h2>
              <div className="notice">
                Seluruh data fundamental, kepemilikan saham KSEI, dan keterbukaan
                informasi ditarik dari <strong>Invezgo API (BEI Official)</strong>{' '}
                dan disimpan di database lokal <code>data/pintarsaham.db</code>.
              </div>
              <div className="detail-pair">
                <span>Harga Pasar</span>
                <b>{rp(s.price)} · Invezgo (BEI)</b>
              </div>
              <div className="detail-pair">
                <span>Laporan Keuangan Historis</span>
                <b>{periodSpan}</b>
              </div>
              <div className="detail-pair">
                <span>Komposisi Pemegang Saham</span>
                <b>
                  {shList.length > 0
                    ? `Data Resmi KSEI (${shList.length} pihak tercatat)`
                    : 'Data Resmi KSEI · Invezgo'}
                </b>
              </div>
              <div className="detail-pair">
                <span>EPS &amp; BVPS Riil</span>
                <b>
                  {s.eps
                    ? `EPS: ${rp(s.eps)} · BVPS: ${rp(s.bvps || 0)}`
                    : 'Dihitung dari laporan kuartal terbaru'}
                </b>
              </div>
              <div className="detail-pair">
                <span>Status Cache Database</span>
                <b>
                  {cd?.cachedDb
                    ? 'Tersimpan di SQLite DB (0 Request API)'
                    : 'Disinkronkan ke SQLite DB (TTL 90 Hari)'}
                </b>
              </div>

              {prof?.address && (
                <>
                  <h3>Alamat Kantor Pusat</h3>
                  <p style={{ fontSize: '12.5px' }}>{prof.address}</p>
                </>
              )}

              {Array.isArray(prof?.directors) && prof.directors.length > 0 && (
                <>
                  <h3>Jajaran Direksi ({s.ticker})</h3>
                  {prof.directors.slice(0, 6).map((dir: any, idx: number) => (
                    <div className="detail-pair" key={idx}>
                      <span>{dir.role || 'Direktur'}</span>
                      <b>{dir.name}</b>
                    </div>
                  ))}
                </>
              )}

              {Array.isArray(prof?.commissioners) && prof.commissioners.length > 0 && (
                <>
                  <h3>Dewan Komisaris ({s.ticker})</h3>
                  {prof.commissioners.slice(0, 6).map((com: any, idx: number) => (
                    <div className="detail-pair" key={idx}>
                      <span>{com.role || 'Komisaris'}</span>
                      <b>{com.name}</b>
                    </div>
                  ))}
                </>
              )}

              {onOpenMethod && (
                <button
                  className="btn"
                  onClick={() => {
                    onClose();
                    onOpenMethod();
                  }}
                  style={{ marginTop: '20px' }}
                >
                  Lihat metode valuasi <Icon name="right" cls="sm" />
                </button>
              )}
            </div>
          </>
        );
      }

      case 'news': {
        const n = payload.newsItem;
        if (!n) return null;
        const biasColor =
          n.bias === 'positif'
            ? 'var(--green)'
            : n.bias === 'negatif'
            ? 'var(--red)'
            : undefined;

        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">
                BERITA {n.url ? 'LIVE INVEZGO' : 'PASAR'} · {n.ticker || 'IHSG'}
              </span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>{n.title}</h2>
              <div className="flex gap-8 wrap" style={{ marginBottom: '14px' }}>
                <span className="pill blue">{n.category}</span>
                <span className="pill outline">
                  {n.date || 'Hari ini'} · {n.source || 'Bursa Efek'}
                </span>
                <span
                  className={`pill ${
                    n.bias === 'positif'
                      ? 'green'
                      : n.bias === 'negatif'
                      ? 'red'
                      : 'outline'
                  }`}
                >
                  {n.bias || 'netral'}
                </span>
              </div>
              <p>{n.body || n.desc}</p>
              <h3>Dampak ke Pasar / Sektor</h3>
              <div className="notice" style={{ color: biasColor }}>
                {n.impact}
              </div>
              {n.watch && (
                <>
                  <h3>Yang Perlu Dipantau</h3>
                  <p>{n.watch}</p>
                </>
              )}
              {n.url && (
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-btn"
                  style={{ marginTop: '16px', display: 'inline-flex' }}
                >
                  <Icon name="arrow-up-right" cls="sm" /> Baca artikel asli
                </a>
              )}
              <div
                style={{
                  marginTop: '20px',
                  fontSize: '11px',
                  color: 'var(--muted)',
                }}
              >
                Berita diproses secara otomatis via Invezgo Market Feed · Selalu
                verifikasi ke sumber resmi sebelum mengambil keputusan investasi.
              </div>
            </div>
          </>
        );
      }

      case 'event': {
        const e = payload.eventItem;
        if (!e) return null;
        const isEarn = e.type === 'Laporan Keuangan';

        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">AGENDA PASAR RIIL (BEI / INVEZGO)</span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>{e.title}</h2>
              <div className="flex gap-12" style={{ marginBottom: '14px' }}>
                <div className="stock-id">
                  <StockLogo ticker={e.ticker} />
                  <div>
                    <span className="stock-symbol">{e.ticker}</span>
                  </div>
                </div>
                <span className={`pill ${isEarn ? 'blue' : 'green'}`}>
                  {e.type}
                </span>
              </div>
              <div className="notice">
                <strong>Data Peristiwa Riil dari Invezgo / IDX ({e.ticker}):</strong>
                <br />
                {isEarn
                  ? 'Perkiraan tanggal rilis laporan keuangan resmi kuartal berjalan emiten di Bursa Efek Indonesia.'
                  : 'Jadwal distribusi dividen tunai riil per lembar saham kepada investor yang berhak.'}
              </div>
              <div className="detail-pair">
                <span>Tanggal resmi</span>
                <b>{fmtDate(e.date)}</b>
              </div>
              <div className="detail-pair">
                <span>Nilai / Estimasi konsensus</span>
                <b>{e.amount}</b>
              </div>
              <div className="detail-pair">
                <span>Sumber verifikasi</span>
                <b>Invezgo &amp; IDX Official Feed ({e.ticker})</b>
              </div>
              <h3>Ringkasan peristiwa</h3>
              <p>{e.note}</p>
              <h3>Ketentuan penting bagi investor</h3>
              <p>
                {isEarn
                  ? 'Tanggal rilis kinerja keuangan merupakan proyeksi resmi bursa dan dapat berubah sesuai jadwal audit independen perusahaan.'
                  : 'Dividen tunai hanya berhak diperoleh bagi pemegang saham yang tercatat sebelum Cum Date berakhir di pasar reguler.'}
              </p>
              {onNavigateToStock && (
                <button
                  className="btn primary"
                  onClick={() => {
                    onClose();
                    onNavigateToStock(e.ticker);
                  }}
                  style={{ marginTop: '24px' }}
                >
                  Buka profil &amp; valuasi {e.ticker}{' '}
                  <Icon name="right" cls="sm" />
                </button>
              )}
            </div>
          </>
        );
      }

      case 'doc': {
        const d = payload.docItem;
        const s = payload.stock;
        if (!d) return null;
        const attachments = Array.isArray(d.attachments) ? d.attachments : [];

        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">
                KETERBUKAAN INFORMASI RESMI BEI · {s ? s.ticker : ''}
              </span>
              <button
                className="icon-btn"
                id="drawer-close"
                onClick={onClose}
                aria-label="Tutup panel"
              >
                <Icon name="close" />
              </button>
            </div>
            <div id="drawer-content">
              <h2>{d.title}</h2>
              <div className="flex gap-8 wrap" style={{ marginBottom: '14px' }}>
                <span className="pill blue">{d.label}</span>
                <span className="pill green">
                  {d.displayDate || fmtDate(d.date)} · Resmi BEI (IDX)
                </span>
              </div>
              <div className="notice">
                <strong>Dokumen Resmi Bursa Efek Indonesia ({s ? s.ticker : 'IDX'}).</strong>
                <br />
                Pengumuman ini ditarik dari feed Keterbukaan Informasi BEI melalui
                Invezgo API dan disimpan di database SQLite lokal.
              </div>
              <h3>Ringkasan Dokumen</h3>
              <p>{d.body}</p>

              {attachments.length > 0 && (
                <>
                  <h3>Lampiran Dokumen Resmi PDF ({attachments.length} File)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {attachments.map((att: any, idx: number) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{
                          justifyContent: 'space-between',
                          textAlign: 'left',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                          <Icon name="file" cls="sm" /> {att.name || `Lampiran_${idx + 1}.pdf`}
                        </span>
                        <Icon name="arrow-up-right" cls="sm" />
                      </a>
                    ))}
                  </div>
                </>
              )}

              {d.url && attachments.length === 0 && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn primary"
                  style={{ marginTop: '18px', display: 'inline-flex' }}
                >
                  Buka Dokumen PDF Resmi BEI <Icon name="arrow-up-right" cls="sm" />
                </a>
              )}
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={`modal-layer ${isOpen ? 'open' : ''}`}
      id="modal-layer"
      aria-hidden={!isOpen}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        {renderContent()}
      </aside>
    </div>
  );
};
