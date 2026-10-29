import React from 'react';
import { StockItem, IndexItem, UserProfile } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { rp, pct, fmt } from '../utils';

interface LandingPageProps {
  indexData: IndexItem;
  stocks: StockItem[];
  user: UserProfile | null;
  onOpenLogin: () => void;
  onOpenCompare: () => void;
  onNavigateDashboard: () => void;
  onSelectStock: (ticker: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  indexData,
  stocks,
  user,
  onOpenLogin,
  onOpenCompare,
  onNavigateDashboard,
  onSelectStock,
}) => {
  const topStocks = stocks.slice(0, 6);

  const features = [
    {
      icon: 'chart',
      title: 'Data Pasar Live 909 Emiten BEI',
      desc: 'Pantau grafik intraday hingga multi-tahun seluruh emiten tercatat di Bursa Efek Indonesia secara real-time via Invezgo API.',
    },
    {
      icon: 'sparkles',
      title: 'Gemini AI Market Strategist',
      desc: 'Sintesis cerdas menggabungkan indikator teknikal (MA20, MA50, RSI 14) dengan ratusan berita pasar terkini untuk rekomendasi konkret.',
    },
    {
      icon: 'coins',
      title: 'Valuasi Margin of Safety (MOS)',
      desc: 'Hitung nilai wajar saham (Fair Value) berbasis EPS riil dan Graham formula untuk menemukan saham berfundamental sehat yang undervalued.',
    },
    {
      icon: 'compare',
      title: 'Komparasi Emiten Head-to-Head',
      desc: 'Bandingkan dua saham dalam sektor yang sama secara berdampingan untuk menentukan pilihan investasi terbaik.',
    },
    {
      icon: 'calendar',
      title: 'Kalender Aksi Korporasi & Dividen',
      desc: 'Jadwal dividen tunai, ex-date, cum-date, RUPS, dan rilis laporan keuangan resmi kuartalan tanpa tertinggal info penting.',
    },
    {
      icon: 'download',
      title: 'Export Data CSV & SQLite DB',
      desc: 'Download data watchlist dan rasio valuasi ke spreadsheet serta nikmati akses kilat 0 detik berkat SQLite DB cache lokal.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free Starter',
      price: 'Rp0',
      period: 'Gratis Selamanya',
      desc: 'Cocok untuk investor pemula yang ingin memantau pergerakan pasar saham Indonesia.',
      features: [
        'Akses grafik 909 emiten BEI',
        'Kalender dividen & aksi korporasi',
        'Watchlist hingga 5 saham',
        'Data ringkasan pasar harian',
      ],
      highlight: false,
      btnText: 'Mulai Gratis',
      btnAction: onNavigateDashboard,
    },
    {
      name: 'Pro Trader & Investor',
      price: 'Rp99.000',
      period: '/ bulan',
      desc: 'Solusi lengkap bagi trader aktif dan value investor yang mengandalkan analisis AI & fundamental.',
      features: [
        'Semua fitur Free Starter',
        'AI Trading Plan (Entry, TP1, TP2, Stop Loss)',
        'Kalkulator Valuasi MOS & Fair Value',
        'Estimasi Dividend Yield & Payout',
        'Komparasi Saham Head-to-Head',
        'Export CSV Watchlist tanpa batas',
      ],
      highlight: true,
      btnText: user?.tier === 'pro' || user?.tier === 'institutional' ? 'Paket Aktif' : 'Pilih Pro Trader',
      btnAction: () => {
        if (!user) onOpenLogin();
        else onNavigateDashboard();
      },
    },
    {
      name: 'Institutional',
      price: 'Rp499.000',
      period: '/ bulan',
      desc: 'Didesain untuk fund manager, analis riset, dan entitas sekuritas profesional.',
      features: [
        'Semua fitur Pro Trader',
        'Akses penuh Admin Console & API DB',
        'Sinkronisasi DB Kuartalan Prioritas',
        'Pre-seed caching 100+ emiten',
        'Dukungan dedicated engineering 24/7',
      ],
      highlight: false,
      btnText: user?.tier === 'institutional' ? 'Paket Aktif' : 'Pilih Institutional',
      btnAction: () => {
        if (!user) onOpenLogin();
        else onNavigateDashboard();
      },
    },
  ];

  const faqs = [
    {
      q: 'Dari mana sumber data harga dan laporan keuangan PintarSaham?',
      a: 'PintarSaham terhubung langsung ke Invezgo API (penyedia data resmi BEI/IDX) untuk grafik real-time, order book, berita keterbukaan informasi, dan laporan keuangan kuartalan.',
    },
    {
      q: 'Bagaimana cara kerja analisis Gemini AI?',
      a: 'Gemini AI membaca indikator teknikal (MA20, MA50, RSI 14, Support/Resistance) dan merangkum benang merah berita pasar terkini untuk menghasilkan rekomendasi Entry Zone, Target Price (TP1/TP2), dan batasan Stop Loss.',
    },
    {
      q: 'Apakah bisa digunakan di smartphone (layar mobile)?',
      a: 'Ya! Antarmuka PintarSaham telah dioptimasi dengan gaya clean minimalist, chart-first order, dan bottom navigation bar yang nyaman diakses melalui browser HP iOS maupun Android.',
    },
  ];

  return (
    <div className="landing-page-root" style={{ color: 'var(--ink)' }}>
      {/* ── HERO SECTION ── */}
      <section
        style={{
          padding: '50px 20px 40px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(14, 52, 101, 0.05) 0%, transparent 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div style={{ maxWidth: '860px', margin: 'auto' }}>
          <div
            className="pill blue"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.8px',
              padding: '6px 14px',
              borderRadius: '999px',
              marginBottom: '18px',
              display: 'inline-flex',
            }}
          >
            <i className="dot" style={{ background: '#10b981' }}></i> PLATFORM RISET SAHAM BEI &amp; GEMINI AI TERPADU
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 48px)',
              lineHeight: 1.2,
              letterSpacing: '-1.5px',
              fontWeight: 800,
              color: 'var(--ink)',
              marginBottom: '16px',
            }}
          >
            Investasi Cerdas dengan Data Real-Time BEI &amp; Analisis Saham AI
          </h1>

          <p
            style={{
              fontSize: 'clamp(14px, 1.8vw, 17px)',
              lineHeight: 1.7,
              color: 'var(--muted)',
              maxWidth: '680px',
              margin: '0 auto 28px',
            }}
          >
            Satu platform riset komprehensif untuk 909 emiten Indonesia. Dapatkan estimasi Margin of Safety (MOS), sinyal teknikal harian, dan trading plan terukur dalam hitungan detik.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '36px',
            }}
          >
            <button
              className="btn primary"
              onClick={onNavigateDashboard}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(14, 52, 101, 0.25)',
              }}
            >
              <Icon name="chart" cls="sm" /> Buka Dashboard Sekarang
            </button>
            <button
              className="btn"
              onClick={onOpenCompare}
              style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '10px' }}
            >
              <Icon name="compare" cls="sm" /> Bandingkan Saham
            </button>
            {!user && (
              <button
                className="btn"
                onClick={onOpenLogin}
                style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 600, borderRadius: '10px' }}
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>

        {/* ── LIVE TICKER CAROUSEL STRIP ── */}
        <div
          style={{
            maxWidth: '1100px',
            margin: 'auto',
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            padding: '12px 6px',
            scrollbarWidth: 'none',
          }}
        >
          {/* IHSG Pill */}
          <div
            onClick={onNavigateDashboard}
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '10px 16px',
              minWidth: '150px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '13px' }}>IHSG</strong>
              <span className={`pill ${indexData.change >= 0 ? 'green' : 'red'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                {pct(indexData.change, 2)}
              </span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
              {fmt(indexData.price, 2)}
            </div>
            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Indeks Komposit</span>
          </div>

          {/* Top Stocks */}
          {topStocks.map((s) => (
            <div
              key={s.ticker}
              onClick={() => onSelectStock(s.ticker)}
              style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                padding: '10px 16px',
                minWidth: '150px',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '13px' }}>{s.ticker}</strong>
                <span className={`pill ${s.change >= 0 ? 'green' : 'red'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                  {pct(s.change, 2)}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px' }}>
                {rp(s.price)}
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.short}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CORE PILLARS / FEATURES ── */}
      <section style={{ padding: '60px 20px', maxWidth: '1200px', margin: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="eyebrow">FITUR UNGGULAN</div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.8px' }}>
            Semua yang Anda Butuhkan untuk Riset Saham BEI
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '560px', margin: '8px auto 0' }}>
            Kombinasi analisis teknikal modern, kalkulasi fundamental konservatif, dan kecerdasan artifisial.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: '24px',
                borderRadius: '14px',
                transition: 'transform .18s ease, box-shadow .18s ease',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--soft)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--blue)',
                  marginBottom: '16px',
                }}
              >
                <Icon name={f.icon} cls="md" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '12.5px', lineHeight: 1.65, color: 'var(--muted)', margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING TIERS ── */}
      <section
        style={{
          padding: '60px 20px',
          background: 'var(--soft, #f8fafc)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="eyebrow">PAKET &amp; INVESTASI</div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', letterSpacing: '-0.8px' }}>
              Pilih Paket Sesuai Kebutuhan Riset Anda
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>
              Transparan tanpa komitmen tersembunyi. Tingkatkan akurasi trading dan investasi Anda.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className="card"
                style={{
                  padding: '28px',
                  borderRadius: '16px',
                  border: plan.highlight ? '2px solid var(--blue)' : '1px solid var(--line)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: plan.highlight ? '0 12px 30px rgba(26, 98, 191, 0.12)' : 'none',
                }}
              >
                {plan.highlight && (
                  <span
                    className="pill blue"
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '24px',
                      fontSize: '10px',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    PALING DIMINATI
                  </span>
                )}

                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{plan.name}</h3>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', minHeight: '34px' }}>
                  {plan.desc}
                </p>

                <div style={{ margin: '18px 0 20px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800 }}>{plan.price}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '4px' }}>
                    {plan.period}
                  </span>
                </div>

                <div style={{ flex: 1, marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.8px', marginBottom: '12px' }}>
                    FITUR YANG DIDAPAT:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--green)' }}>✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className={`btn ${plan.highlight ? 'primary' : ''}`}
                  onClick={plan.btnAction}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    justifyContent: 'center',
                  }}
                >
                  {plan.btnText}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section style={{ padding: '60px 20px', maxWidth: '820px', margin: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="eyebrow">PERTANYAAN UMUM</div>
          <h2 style={{ fontSize: '26px' }}>Frequently Asked Questions</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="card"
              style={{ padding: '20px 22px', borderRadius: '12px' }}
            >
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
                {faq.q}
              </h4>
              <p style={{ fontSize: '12.5px', lineHeight: 1.65, color: 'var(--muted)', margin: 0 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: '48px',
            padding: '32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0e3465 0%, #1a62bf 100%)',
            color: '#fff',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
            Siap Mengambil Keputusan Investasi Lebih Terukur?
          </h3>
          <p style={{ fontSize: '13px', opacity: 0.9, maxWidth: '520px', margin: '0 auto 20px' }}>
            Buka dashboard sekarang dan eksplorasi seluruh data pasar, analisis AI, dan Margin of Safety 909 emiten BEI.
          </p>
          <button
            className="btn"
            onClick={onNavigateDashboard}
            style={{
              background: '#fff',
              color: '#0e3465',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
            }}
          >
            Masuk ke Dashboard Gratis <Icon name="arrow-up-right" cls="sm" />
          </button>
        </div>
      </section>
    </div>
  );
};
