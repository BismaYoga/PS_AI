import React, { useEffect } from 'react';
import { StockItem, CorporateEvent, NewsItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { fmt, fmtDate, rp, periodLabel } from '../utils';

export interface DrawerPayload {
  type: 'about' | 'method' | 'technical' | 'sources' | 'news' | 'event' | 'doc' | string;
  stock?: StockItem;
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
              <span className="drawer-eyebrow">TENTANG PREVIEW</span>
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
              <h2>Riset lebih terstruktur. Tampilan lebih sederhana.</h2>
              <p>
                Prototipe PintarSaham Intelligence ini dibuat untuk mencoba alur
                dari kondisi pasar menuju analisis sebuah emiten.
              </p>
              <div className="notice">
                <strong>Bukan data pasar aktual.</strong>
                <br />
                Nama dan ticker dipakai sebagai label navigasi. Harga, laporan
                keuangan, komposisi pendapatan, berita, serta agenda sepenuhnya
                simulasi. Logo perusahaan adalah monogram placeholder.
              </div>
              <h3>Yang bisa dicoba</h3>
              <p>
                Cari BBCA, BBRI, TLKM, ASII, ICBP, atau MIKA. Ganti periode dan
                jenis grafik, tampilkan Fibonacci, buka tab laporan keuangan,
                geser asumsi PER/PBV, simpan watchlist, dan buka ringkasan
                dokumen.
              </p>
              <h3>Belum terhubung</h3>
              <p>
                Belum ada API harga saham, berita, data BEI, dokumen emiten, login
                pengguna, atau model AI. Ringkasan AI adalah narasi contoh dari
                aturan lokal, bukan analisis oleh model bahasa.
              </p>
              <h3>Privasi &amp; penyimpanan</h3>
              <p>
                Tidak ada data yang dikirim ke server. Watchlist disimpan di
                browser ini. Pada beberapa browser, penyimpanan dapat terbatas saat
                file dibuka langsung atau dalam mode privat.
              </p>
              <h3>Cara navigasi</h3>
              <p>
                Ketik kode atau nama di pencarian, lalu tekan Enter. Tombol /
                memfokuskan pencarian; Esc menutup hasil pencarian atau panel.
                Klik logo PintarSaham untuk kembali ke beranda.
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
              <h2>Data fundamental riil dari Yahoo Finance (yfinance)</h2>
              <p>
                Metodologi penentuan harga wajar (fair value) dan Margin of Safety
                (MOS) dihitung langsung dari data keuangan riil audited emiten
                Bursa Efek Indonesia.
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
              <span className="drawer-eyebrow">DASAR ANALISIS</span>
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
              <h2>Indikator yang dapat ditelusuri.</h2>
              <div className="notice">
                Data OHLC adalah data historis/simulasi. Ringkasan menggunakan
                indikator teknikal matematis untuk panduan momentum.
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
        if (!s) return null;
        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">SUMBER &amp; ASUMSI</span>
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
              <h2>{s.ticker}: status data preview</h2>
              <div className="notice">
                Data ditarik dari feed publik bursa efek dan kalkulasi lokal.
              </div>
              <div className="detail-pair">
                <span>Harga Pasar</span>
                <b>{rp(s.price)} · yfinance</b>
              </div>
              <div className="detail-pair">
                <span>Laporan historis</span>
                <b>Sintetis FY2021–FY2025</b>
              </div>
              <div className="detail-pair">
                <span>Kontribusi pendapatan</span>
                <b>Simulasi FY2025</b>
              </div>
              <div className="detail-pair">
                <span>EPS &amp; BVPS valuasi</span>
                <b>{s.eps ? `EPS: ${rp(s.eps)} · BVPS: ${rp(s.bvps || 0)}` : 'Estimasi wajar'}</b>
              </div>
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
                BERITA {n.url ? 'LIVE' : 'CONTOH'} · {n.ticker || 'IHSG'}
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
                Berita diproses secara otomatis via Feed Pasar · Selalu verifikasi
                ke sumber resmi sebelum mengambil keputusan investasi.
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
              <span className="drawer-eyebrow">AGENDA PASAR RIIL (YFINANCE)</span>
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
                <strong>Data Peristiwa Riil dari Yahoo Finance ({e.ticker}.JK):</strong>
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
                <b>Yahoo Finance Official Feed ({e.ticker}.JK)</b>
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
        return (
          <>
            <div className="drawer-top">
              <span className="drawer-eyebrow">DOKUMEN CONTOH</span>
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
                <span className="pill outline">{fmtDate(d.date)} · simulasi</span>
              </div>
              <div className="notice">
                Ini bukan dokumen resmi {s ? s.ticker : ''}. Tidak ada file PDF
                atau pengumuman emiten aktual yang tersedia dalam preview.
              </div>
              <h3>Isi ringkasan</h3>
              <p>{d.body}</p>
              <h3>Yang akan tampil saat data terhubung</h3>
              <p>
                Nama dokumen, tanggal publikasi, halaman sumber, perubahan
                utama, potensi dampak pada bisnis, serta tautan ke dokumen asli.
              </p>
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
