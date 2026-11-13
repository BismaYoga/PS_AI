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
              <h2>Riset saham terstruktur dengan data riil bursa &amp; kecerdasan analitik.</h2>
              <p>
                PintarSaham Intelligence menghubungkan data pasar real-time Bursa
                Efek Indonesia (BEI / IDX), rangkuman kinerja laporan keuangan emiten,
                keterbukaan informasi resmi, serta analisis pasar cerdas untuk membantu
                pengambilan keputusan investasi yang objektif.
              </p>
              <div className="notice">
                <strong>Terhubung ke Data Resmi Pasar Modal Indonesia.</strong>
                <br />
                Seluruh 900+ emiten aktif BEI, grafik harga harian &amp; tren pergerakan,
                rasio valuasi (EPS, BVPS, PER, PBV, ROE, MOS), laporan keuangan berkala,
                komposisi pemegang saham pengendali KSEI, berita pasar, dan
                dokumen resmi Keterbukaan Informasi BEI disajikan secara komprehensif.
              </div>
              <h3>Pembaruan Data &amp; Kecepatan Akses</h3>
              <p>
                Sistem mengoptimalkan penyajian data pasar secara instan tanpa jeda,
                memastikan investor dapat meninjau grafik, rasio fundamental, dan ringkasan
                analisis dengan performa optimal di setiap sesi perdagangan.
              </p>
              <h3>Penyimpanan Watchlist &amp; Privasi</h3>
              <p>
                Daftar pantau (Watchlist) dan preferensi analisis Anda tersimpan
                secara aman pada perangkat Anda, menjaga privasi riset investasi Anda.
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
              <span className="drawer-eyebrow">METODOLOGI HARGA WAJAR &amp; MARGIN OF SAFETY</span>
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
              <h2>Metodologi Valuasi Intrinsik &amp; Margin of Safety (MOS)</h2>
              <p>
                Penentuan harga wajar (fair value) dan Margin of Safety (MOS) di PintarSaham
                dihitung secara sistematis menggunakan formula baku fundamental institusional
                yang ditarik langsung dari laporan keuangan resmi emiten Bursa Efek Indonesia (Invezgo API).
              </p>

              <div className="notice" style={{ background: 'var(--bg-subtle, #f0f7ff)', borderColor: 'var(--blue)' }}>
                <strong>
                  <Icon name="book" cls="sm" /> Dokumentasi Fundamental Lengkap:
                </strong>
                <br />
                Rincian kalkulasi matematis, studi kasus, dan pembuktian empiris tersimpan pada repositori:
                <code>/root/PS_AI/perhitungan_fundamental_mos.md</code>.
              </div>

              <h3>1. Apa itu Harga Wajar (Fair Value)?</h3>
              <p>
                Harga wajar adalah estimasi nilai intrinsik riil suatu saham berdasarkan kapasitas fundamental perusahaan
                dalam mencetak laba bersih dan membukukan kekayaan ekuitas, terlepas dari fluktuasi sentimen jangka pendek di pasar modal.
                Mengikuti prinsip investasi nilai (Value Investing) Benjamin Graham dan Warren Buffett, membeli saham di bawah harga wajarnya
                memberikan potensi imbal hasil optimal dengan risiko penurunan yang terkendali.
              </p>

              <h3>2. Apa itu Target PER (Price to Earnings Ratio)?</h3>
              <p>
                <strong>PER (Price to Earnings Ratio)</strong> adalah rasio valuasi pasar yang membandingkan harga per lembar saham dengan laba bersih per lembar (EPS).
                Secara sederhana, PER menunjukkan berapa rupiah yang rela dibayar investor untuk setiap Rp1 laba bersih yang dihasilkan perusahaan dalam setahun.
              </p>
              <p>
                <strong>Target PER</strong> adalah tolok ukur kelipatan valuasi wajar yang layak disematkan pada suatu emiten. Target PER ditentukan berdasarkan tiga pilar utama:
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
                <li>
                  <strong>Rata-rata Historis (Historical Mean PER):</strong> Rerata valuasi PER saham selama siklus 3 hingga 5 tahun terakhir saat kondisi pasar normal.
                </li>
                <li>
                  <strong>Median Industri &amp; Sektor (Peer Benchmark):</strong> Rata-rata valuasi emiten sejenis di sektor yang sama (misal perbankan tier-1, konsumen primer, energi).
                </li>
                <li>
                  <strong>Ekspektasi Pertumbuhan Laba (PEG Ratio = 1):</strong> Perusahaan dengan pertumbuhan laba (CAGR) 15% per tahun secara wajar dihargai pada kisaran PER 15x.
                </li>
              </ul>
              <p className="small muted">
                Slider Target PER pada aplikasi memberikan keleluasaan bagi analis dan investor untuk melakukan simulasi (stress test) bila emiten mengalami ekspansi valuasi (re-rating) atau kontraksi kelipatan laba.
              </p>

              <h3>3. Formula Valuasi Kelipatan Laba (PER Multiplier)</h3>
              <div className="notice" style={{ fontWeight: 600, fontSize: '13px' }}>
                Harga Wajar = EPS (TTM) × Target PER
                <br />
                MOS (%) = ((Harga Wajar − Harga Pasar) / Harga Wajar) × 100%
              </div>
              <p>
                <strong>EPS TTM (Trailing Twelve Months):</strong> Laba bersih per lembar saham yang diakumulasikan dari 4 kuartal pembukuan berurutan terakhir (Q1+Q2+Q3+Q4) dibagi total saham beredar. Menggunakan data TTM menghilangkan anomali musiman (seasonality) dan mencerminkan kekuatan profitabilitas aktual terkini.
              </p>

              <h3>4. Konsep Margin of Safety (MOS)</h3>
              <p>
                <strong>Margin of Safety (MOS)</strong> adalah persentase diskon harga pasar terhadap nilai wajar intrinsiknya. MOS berfungsi sebagai bantalan pengaman jika analisis laba masa depan meleset atau terjadi gejolak makroekonomi.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>
                <li>
                  <strong>MOS &gt; +20% (Undervalued / Diskon):</strong> Harga saham diperdagangkan jauh di bawah nilai wajarnya, menawarkan proteksi risiko penurunan yang kuat dan ruang apresiasi modal tinggi.
                </li>
                <li>
                  <strong>MOS −10% s.d. +20% (Fair Value):</strong> Harga saham berada di sekitar area nilai wajarnya (konsolidasi wajar).
                </li>
                <li>
                  <strong>MOS &lt; −10% (Overvalued / Premium):</strong> Harga pasar melampaui harga wajar fundamentalnya sehingga profil risiko beli relatif lebih tinggi.
                </li>
              </ul>

              <h3>5. Pendekatan Nilai Buku (PBV &amp; BVPS)</h3>
              <div className="notice" style={{ fontWeight: 600, fontSize: '13px' }}>
                Harga Wajar PBV = BVPS riil × Target PBV dasar
              </div>
              <p>
                <strong>BVPS (Book Value Per Share):</strong> Nilai buku ekuitas bersih per saham (Total Ekuitas dibagi Lembar Saham). Pendekatan PBV sangat relevan untuk emiten institusi finansial (perbankan, asuransi) dan industri berbasis aset fisik berat (properti, pertambangan).
              </p>

              <h3>6. Rentang Sensitivitas Tiga Skenario</h3>
              <p>
                PintarSaham menyajikan matriks valuasi sensitif untuk mengantisipasi ketidakpastian kondisi pasar:
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', lineHeight: 1.6 }}>
                <li>
                  <strong>Konservatif (Bear Scenario):</strong> Target kelipatan −20% di bawah asumsi dasar (mengantisipasi tekanan perlambatan ekonomi atau koreksi laba).
                </li>
                <li>
                  <strong>Dasar (Base Case):</strong> Target kelipatan standar industri atau posisi slider aktif yang dipilih investor.
                </li>
                <li>
                  <strong>Optimis (Bull Scenario):</strong> Target kelipatan +20% di atas asumsi dasar (mengakomodasi lonjakan pertumbuhan laba dan sentimen pasar bergairah).
                </li>
              </ul>
            </div>
          </>
        );

      case 'technical': {
        const c = payload.chartCalc || {};
        const s = payload.stock || { ticker: payload.ticker || 'IHSG' };
        const ticker = s.ticker || payload.ticker || 'IHSG';
        const lowVal = c.lowD?.low != null ? fmt(c.lowD.low) : '—';
        const lowDate = c.lowD?.date ? fmtDate(c.lowD.date) : '';
        const highVal = c.highD?.high != null ? fmt(c.highD.high) : '—';
        const highDate = c.highD?.date ? fmtDate(c.highD.date) : '';
        const levels = Array.isArray(c.levels) ? c.levels : [];

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
                Data candlestick harian (OHLC) dan pergerakan harga ditarik langsung
                dari sumber resmi Bursa Efek Indonesia (BEI) dan diverifikasi berkala.
              </div>
              <div className="detail-pair">
                <span>Instrumen / periode</span>
                <b>
                  {ticker} / {periodLabel(payload.chartCalc?.period || '3M')}
                </b>
              </div>
              <div className="detail-pair">
                <span>Low periode</span>
                <b>
                  {lowVal}
                  {lowDate && <><br />{lowDate}</>}
                </b>
              </div>
              <div className="detail-pair">
                <span>High periode</span>
                <b>
                  {highVal}
                  {highDate && <><br />{highDate}</>}
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
              {levels.length > 0 ? (
                levels.map((l: any, i: number) => (
                  <div className="detail-pair" key={i}>
                    <span>Retracement {fmt(l.ratio * 100, 1)}%</span>
                    <b>{fmt(l.value)}</b>
                  </div>
                ))
              ) : (
                <div className="detail-pair">
                  <span>Retracement</span>
                  <b>Dihitung otomatis saat grafik aktif</b>
                </div>
              )}
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
        const finAnnualList = Array.isArray(cd?.financialsAnnual) ? cd.financialsAnnual : [];
        const shList = Array.isArray(cd?.shareholders) ? cd.shareholders : [];
        const prof = cd?.profile;
        const periodSpanQ = finList.length >= 2 ? `${finList[0].year}–${finList[finList.length - 1].year} (${finList.length} Kuartal)` : '';
        const periodSpanFY = finAnnualList.length >= 2 ? `${finAnnualList[0].year}–${finAnnualList[finAnnualList.length - 1].year} (${finAnnualList.length} Tahun)` : '';
        const periodSpan = [periodSpanQ, periodSpanFY].filter(Boolean).join(' & ') || 'Laporan Keuangan Kuartalan & Tahunan BEI';

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
                informasi ditarik dari <strong>Sistem Pasar Modal Resmi BEI</strong>{' '}
                dan disimpan permanen di database lokal <code>data/pintarsaham.db</code>.
              </div>
              <div className="detail-pair">
                <span>Harga Pasar</span>
                <b>{rp(s.price)} · Pasar Modal BEI Realtime</b>
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
                    : 'Data Resmi KSEI'}
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
                <span>Status Verifikasi</span>
                <b>Terverifikasi Resmi BEI</b>
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
                BERITA PASAR · {n.ticker || 'IHSG'}
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
        const officialDocUrl =
          e.url ||
          (Array.isArray(e.attachments) && e.attachments.length > 0 ? e.attachments[0].url : '') ||
          `https://www.idx.co.id/id/perusahaan-tercatat/keterbukaan-informasi/`;

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
              {e.ai_summary && (
                <div
                  style={{
                    margin: '18px 0',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(26, 98, 191, 0.06) 0%, rgba(25, 129, 93, 0.06) 100%)',
                    border: '1px solid rgba(26, 98, 191, 0.22)',
                  }}
                >
                  <div className="flex between" style={{ marginBottom: '10px' }}>
                    <div className="flex gap-8">
                      <Icon name="sparkles" cls="sm" style={{ color: 'var(--blue)' }} />
                      <strong style={{ fontSize: '13px', color: 'var(--navy)' }}>
                        Analisis Cerdas AI PintarSaham
                      </strong>
                    </div>
                    {e.ai_sentiment && (
                      <span
                        className={`pill ${
                          e.ai_sentiment === 'Positif'
                            ? 'green'
                            : e.ai_sentiment === 'Waspada'
                            ? 'red'
                            : 'blue'
                        }`}
                        style={{ fontWeight: 650 }}
                      >
                        {e.ai_sentiment}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: e.ai_impact ? '10px' : '0' }}>
                    {e.ai_summary}
                  </p>
                  {e.ai_impact && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'var(--soft, #f8fafc)',
                        border: '1px solid var(--line, #e2e8f0)',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: 'var(--ink)',
                      }}
                    >
                      <strong style={{ color: 'var(--navy)' }}>Katalis Utama Investor:</strong> {e.ai_impact}
                    </div>
                  )}
                </div>
              )}
              <h3>Ringkasan peristiwa</h3>
              <p>{e.note}</p>
              <h3>Ketentuan penting bagi investor</h3>
              <p>
                {isEarn
                  ? 'Tanggal rilis kinerja keuangan merupakan proyeksi resmi bursa dan dapat berubah sesuai jadwal audit independen perusahaan.'
                  : 'Dividen tunai hanya berhak diperoleh bagi pemegang saham yang tercatat sebelum Cum Date berakhir di pasar reguler.'}
              </p>

              <div style={{ marginTop: '22px', marginBottom: '8px' }}>
                <a
                  href={officialDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '9px',
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#f0f5fc',
                    color: 'var(--navy)',
                    border: '1px solid #c9dff7',
                    fontWeight: 650,
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxShadow: '0 1px 3px rgba(14,52,101,0.06)',
                  }}
                >
                  <Icon name="file" cls="sm" style={{ color: 'var(--blue)' }} />
                  <span>Buka Dokumen Resmi (PDF/BEI)</span>
                  <Icon name="arrow-up-right" cls="sm" style={{ color: 'var(--blue)', marginLeft: 'auto' }} />
                </a>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', textAlign: 'center' }}>
                  {e.url || (Array.isArray(e.attachments) && e.attachments.length > 0)
                    ? 'Tautan langsung ke file PDF / keterbukaan informasi bursa.'
                    : `Verifikasi keterbukaan informasi dan prospektus resmi PT ${e.ticker} Tbk di portal BEI.`}
                </div>
              </div>

              {Array.isArray(e.attachments) && e.attachments.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {e.attachments.map((att: any, idx: number) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn small-btn"
                      style={{ justifyContent: 'space-between', fontSize: '11px' }}
                    >
                      <span>
                        <Icon name="file" cls="sm" /> {att.name || `Lampiran_${idx + 1}.pdf`}
                      </span>
                      <Icon name="arrow-up-right" cls="sm" />
                    </a>
                  ))}
                </div>
              )}

              {onNavigateToStock && (
                <button
                  className="btn primary"
                  onClick={() => {
                    onClose();
                    onNavigateToStock(e.ticker);
                  }}
                  style={{ marginTop: '12px', width: '100%' }}
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
                Pengumuman ini ditarik dari feed Keterbukaan Informasi resmi BEI
                dan tersimpan pada arsip dokumen perusahaan.
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
