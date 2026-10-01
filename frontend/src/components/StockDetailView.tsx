import React, { useState } from 'react';
import { StockItem, Timeframe, ChartType, ValuationState, NewsItem } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { MainChart } from './MainChart';
import { AIBox } from './AIBox';
import { NewsSection } from './NewsSection';
import { Footer } from './Footer';
import { FIN_ROWS } from '../constants';
import {
  fmt,
  rp,
  pct,
  fmtDate,
  periodLabel,
  chartData,
  financialData,
  ChartCalculatedData,
} from '../utils';

interface StockDetailViewProps {
  stock: StockItem;
  favorites: Set<string>;
  onToggleFavorite: (ticker: string) => void;
  onOpenDrawer: (type: string, payload?: any) => void;
  onOpenNewsDrawer?: (news: NewsItem) => void;
  onOpenMethod: () => void;
  onOpenAbout: () => void;
  onNavigateHome: () => void;
  onNotify: (msg: string) => void;
}

export const StockDetailView: React.FC<StockDetailViewProps> = ({
  stock,
  favorites,
  onToggleFavorite,
  onOpenDrawer,
  onOpenNewsDrawer,
  onOpenMethod,
  onOpenAbout,
  onNavigateHome,
  onNotify,
}) => {
  const [period, setPeriod] = useState<Timeframe>('3M');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showFib, setShowFib] = useState<boolean>(true);
  const [finTab, setFinTab] = useState<'income' | 'balance' | 'cash'>('income');
  const [docFilter, setDocFilter] = useState<string>('all');
  const [chartCalc, setChartCalc] = useState<ChartCalculatedData>(() =>
    chartData(stock.ticker, stock.price, stock.change, '3M')
  );

  const [valuations, setValuations] = useState<ValuationState>({
    pe: stock.pe || 14,
    pb: stock.pb || 2.0,
  });

  const isFav = favorites.has(stock.ticker);
  const fin = financialData(stock);
  const latestFin = fin[4];
  const prevFin = fin[3];

  // Donut SVG generator matching legacy prototype
  const donutColors = ['#1a62bf', '#83aada', '#c0d3ea', '#dce6f2'];
  let cumAngle = 0;
  const donutCircles = stock.rev.map(([_, p], i) => {
    const dash = `${p - 0.9} ${100 - p + 0.9}`;
    const circle = (
      <circle
        key={i}
        cx="70"
        cy="70"
        r="49"
        fill="none"
        stroke={donutColors[i % donutColors.length]}
        strokeWidth="12"
        pathLength="100"
        strokeDasharray={dash}
        strokeDashoffset={-cumAngle}
        transform="rotate(-90 70 70)"
      />
    );
    cumAngle += p;
    return circle;
  });

  // Financial calculations
  const finKeys =
    finTab === 'income'
      ? ['revenue', 'net']
      : finTab === 'balance'
      ? ['assets', 'equity']
      : ['cfo', 'net'];
  const finLabels =
    finTab === 'income'
      ? ['Pendapatan FY2025', 'Laba bersih induk FY2025']
      : finTab === 'balance'
      ? ['Total aset FY2025', 'Ekuitas induk FY2025']
      : ['Arus kas operasi FY2025', 'Laba bersih induk FY2025'];
  const maxFinVal = Math.max(...fin.flatMap((d) => finKeys.map((k) => d[k]))) * 1.12;

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['DATA SIMULASI - BUKAN LAPORAN RESMI'],
      [stock.ticker, 'FY2021-FY2025', 'Rp triliun kecuali EPS/BVPS (Rp), rasio (%)'],
      ['Pos keuangan', ...fin.map((x) => x.year)],
      ...FIN_ROWS[finTab].map(([k, label]) => [
        label,
        ...fin.map((x) => Number(x[k].toFixed(6))),
      ]),
    ];
    const csv =
      '\uFEFF' +
      rows
        .map((row) =>
          row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';')
        )
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIMULASI_${stock.ticker}_${finTab}_FY2021-2025.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onNotify('CSV data laporan keuangan berhasil dibuat');
  };

  // Valuation card renderer matching prototype
  const renderValuationCard = (type: 'pe' | 'pb') => {
    const isPe = type === 'pe';
    const target = valuations[type];
    const base = isPe ? stock.eps || 100 : stock.bvps || 500;
    const fair = base ? base * target : stock.price;
    const low = fair * 0.8;
    const high = fair * 1.2;
    const m = fair ? ((1 - stock.price / fair) * 100) : 0;

    const min = Math.min(stock.price, low) * 0.83;
    const max = Math.max(stock.price, high) * 1.08;
    const pos = (v: number) => ((v - min) / (max - min || 1)) * 100;

    return (
      <div className="card valuation-card" id={`valuation-${type}`} key={type}>
        <div className="valuation-heading">
          <div>
            <h3>{isPe ? 'Price to Earnings (PER)' : 'Price to Book Value (PBV)'}</h3>
            <p>
              {isPe
                ? 'Nilai berdasarkan laba per saham (EPS riil).'
                : 'Nilai berdasarkan ekuitas per saham (BVPS riil).'}
            </p>
          </div>
          <span className="pill outline">Skenario</span>
        </div>

        <div className="flex between gap-12" style={{ alignItems: 'flex-end', marginTop: '12px' }}>
          <div>
            <div className="valuation-price mono">{fair ? rp(fair) : '—'}</div>
            <div className="valuation-price-note">Harga wajar skenario dasar</div>
          </div>
          <span
            className="mos-pill"
            style={
              m < 0
                ? { background: '#fcf1f2', color: 'var(--red)' }
                : m >= 25
                ? { background: '#e3f5eb', color: '#0e6945', fontWeight: 700 }
                : {}
            }
          >
            MOS {fmt(m, 1)}%
          </span>
        </div>

        <div
          className="valuation-range"
          role="img"
          aria-label={`Rentang harga wajar ${rp(low)} sampai ${rp(high)}, harga sekarang ${rp(stock.price)}`}
        >
          <div className="range-track"></div>
          <div
            className="range-band"
            style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }}
          ></div>
          <div className="range-marker" style={{ left: `${pos(stock.price)}%` }}>
            <span className="marker-label">Sekarang {rp(stock.price)}</span>
          </div>
          {[
            [low, 'Konservatif'],
            [fair, 'Dasar'],
            [high, 'Optimistis'],
          ].map(([v, l], i) => (
            <React.Fragment key={i}>
              <div
                className={`range-point ${i === 1 ? 'mid' : ''}`}
                style={{ left: `${pos(Number(v))}%` }}
              ></div>
              <div className="range-label" style={{ left: `${pos(Number(v))}%` }}>
                <span>{l}</span>
                <b>{rp(Number(v))}</b>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="valuation-controls">
          <div className="assumption">
            <label>
              {isPe ? 'EPS riil (TTM)' : 'BVPS riil'} · yfinance
            </label>
            <strong>{base ? `${rp(base)} / saham` : '—'}</strong>
          </div>
          <div className="assumption">
            <div className="assumption-heading">
              <label htmlFor={`slider-${type}`} style={{ margin: 0 }}>
                {isPe ? 'Target PER' : 'Target PBV'} dasar
              </label>
              <output htmlFor={`slider-${type}`} id={`output-${type}`}>
                {fmt(target, isPe ? 1 : 2)}×
              </output>
            </div>
            <input
              id={`slider-${type}`}
              type="range"
              min={isPe ? 4 : 0.3}
              max={isPe ? 40 : 7}
              step={isPe ? 0.5 : 0.05}
              value={target}
              aria-label={`Ubah asumsi ${isPe ? 'PER' : 'PBV'} dasar`}
              onChange={(e) => {
                const val = Number(e.target.value);
                setValuations((prev) => ({ ...prev, [type]: val }));
              }}
            />
          </div>
        </div>

        <div className="valuation-bottom">
          <span>{isPe ? 'EPS riil × PER target' : 'BVPS riil × PBV target'}</span>
          <span>Konservatif −20% · Optimistis +20%</span>
        </div>
      </div>
    );
  };

  const sampleDocs = [
    {
      id: 'action',
      type: 'action',
      title: `Contoh pemberitahuan aksi korporasi ${stock.ticker}`,
      label: 'Aksi korporasi',
      date: '2026-09-21',
      body: `Template ini menampilkan ringkasan aksi, tanggal penting, pihak terkait, serta risiko bagi pemegang saham. Belum ada dokumen emiten yang diunggah atau ditautkan.`,
    },
    {
      id: 'report',
      type: 'report',
      title: 'Contoh laporan keuangan tahunan FY2025',
      label: 'Laporan keuangan',
      date: '2026-03-30',
      body: 'Angka historis di dashboard ini dibuat secara sintetis dan konsisten secara aritmetika. Ini bukan isi laporan keuangan perusahaan.',
    },
    {
      id: 'disclosure',
      type: 'action',
      title: 'Contoh keterbukaan informasi: rencana ekspansi',
      label: 'Keterbukaan informasi',
      date: '2026-09-18',
      body: 'Contoh isi ringkasan: tujuan penggunaan dana, besaran investasi, sumber pendanaan, dan pengaruh yang mungkin timbul pada laba dan arus kas.',
    },
  ];

  const filteredDocs = sampleDocs.filter(
    (d) => docFilter === 'all' || d.type === docFilter
  );

  return (
    <>
      <div className="breadcrumb">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          Beranda
        </a>
        <Icon name="chevron" cls="sm" />
        <span>Emiten</span>
        <Icon name="chevron" cls="sm" />
        <span style={{ color: 'var(--ink)' }}>{stock.ticker}</span>
      </div>

      <div className="detail-header">
        <div className="company-head">
          <StockLogo
            ticker={stock.ticker}
            mark={stock.mark}
            color={stock.color}
            large={true}
          />
          <div>
            <h1>
              {stock.ticker} <span className="pill outline">IDX</span>
            </h1>
            <p>{stock.name}</p>
          </div>
        </div>

        <div className="filter-row">
          <button
            className="btn"
            onClick={() => onOpenDrawer('sources', { stock })}
          >
            <Icon name="file" cls="sm" /> Sumber &amp; asumsi
          </button>
          <button
            className={`btn ${isFav ? '' : 'primary'}`}
            id="detail-favorite"
            onClick={() => onToggleFavorite(stock.ticker)}
          >
            <Icon name={isFav ? 'check' : 'star'} cls="sm" />{' '}
            {isFav ? 'Di watchlist' : 'Tambah watchlist'}
          </button>
        </div>
      </div>

      {/* Two-column layout matching .detail-top */}
      <div className="detail-top">
        {/* Left Column: Profile Card */}
        <aside className="card profile-card">
          <div className="profile-main">
            <div className="profile-head">
              <Icon name="building" cls="sm" /> Profil perusahaan
            </div>
            <div className="stock-summary-strip">
              <span className="pill blue">{stock.sector}</span>
              <span className="pill outline">{stock.subsector}</span>
            </div>
            <p className="profile-description">{stock.description}</p>
            <div className="profile-grid">
              <div>
                <label>Kapitalisasi pasar</label>
                <strong>
                  {stock.marketCap
                    ? 'Rp' + fmt(stock.marketCap / 1e12, 1) + ' T'
                    : stock.shares
                    ? rp((stock.price * stock.shares) / 1000) + ' T'
                    : '—'}
                </strong>
              </div>
              <div>
                <label>EPS riil (TTM)</label>
                <strong>{stock.eps ? 'Rp' + fmt(stock.eps, 1) : '—'}</strong>
              </div>
              <div>
                <label>PER saat ini</label>
                <strong>
                  {stock.pe
                    ? fmt(stock.pe, 1) + '×'
                    : stock.eps
                    ? fmt(stock.price / stock.eps, 1) + '×'
                    : '—'}
                </strong>
              </div>
              <div>
                <label>PBV saat ini</label>
                <strong>
                  {stock.pb
                    ? fmt(stock.pb, 2) + '×'
                    : stock.bvps
                    ? fmt(stock.price / stock.bvps, 2) + '×'
                    : '—'}
                </strong>
              </div>
            </div>
          </div>

          <div className="revenue-section">
            <h3>Kontribusi pendapatan</h3>
            <div className="small muted">
              {stock.sector === 'Keuangan'
                ? 'Pendapatan operasional neto'
                : 'Pendapatan konsolidasian'}{' '}
              · simulasi
            </div>
            <div className="revenue-donut">
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                role="img"
                aria-label="Kontribusi pendapatan simulasi"
              >
                {donutCircles}
                <text
                  x="70"
                  y="66"
                  textAnchor="middle"
                  fontSize="21"
                  fontWeight="600"
                  fill="#172738"
                >
                  100%
                </text>
                <text
                  x="70"
                  y="85"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6d7988"
                >
                  FY 2025 · demo
                </text>
              </svg>
            </div>
            {stock.rev.map(([l, p], i) => (
              <div className="revenue-row" key={i}>
                <span className="rev-label">
                  <i
                    className="swatch"
                    style={{ background: donutColors[i % donutColors.length] }}
                  ></i>
                  {l}
                </span>
                <b>{p}%</b>
              </div>
            ))}
          </div>

          <div className="profile-note">
            Data pasar, valuasi, dan EPS/BVPS riil dari Yahoo Finance. Profil dan
            segmen adalah contoh demonstrasi.
          </div>
        </aside>

        {/* Right Column: Stock Chart Card */}
        <section
          className="card stock-chart-card"
          aria-label="Grafik teknikal emiten"
        >
          <div className="chart-top">
            <div>
              <div className="instrument">
                Pergerakan harga {stock.ticker} <span className="pill outline">IDR</span>{' '}
                {stock.isLive && (
                  <span className="pill green" style={{ fontSize: '9px' }}>
                    LIVE yfinance ({stock.ticker}.JK)
                  </span>
                )}
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateHome();
                  }}
                  className="btn small-btn"
                  style={{ padding: '2px 8px', fontSize: '10px', marginLeft: '4px' }}
                >
                  <Icon name="chart" cls="sm" /> Lihat IHSG
                </a>
              </div>
              <div className="quote-line">
                <span className="price-main mono">{rp(stock.price)}</span>
                <span
                  className={`quote-change ${
                    stock.change >= 0 ? 'positive' : 'negative'
                  }`}
                >
                  <Icon
                    name={stock.change >= 0 ? 'arrow-up-right' : 'down'}
                    cls="sm"
                  />{' '}
                  {pct(stock.change, 2)}
                </span>
              </div>
              <div className="quote-caption">
                Penutupan bursa · {stock.date || '01 Okt 2026'} · Sumber: Yahoo
                Finance ({stock.ticker}.JK)
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() =>
                onOpenDrawer('technical', { stock, chartCalc })
              }
              aria-label="Metodologi indikator teknikal"
            >
              <Icon name="info" cls="sm" />
            </button>
          </div>

          <div className="chart-toolbar">
            <div className="segmented" aria-label="Periode grafik">
              {(['1M', '3M', '6M', '1Y'] as Timeframe[]).map((p) => (
                <button
                  key={p}
                  className={period === p ? 'active' : ''}
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                >
                  {periodLabel(p)}
                </button>
              ))}
            </div>

            <div className="chart-type" aria-label="Jenis grafik">
              <button
                className={chartType === 'line' ? 'active' : ''}
                onClick={() => setChartType('line')}
                aria-label="Grafik garis"
              >
                <Icon name="line" cls="sm" />
              </button>
              <button
                className={chartType === 'candle' ? 'active' : ''}
                onClick={() => setChartType('candle')}
                aria-label="Grafik candlestick"
              >
                <Icon name="candles" cls="sm" />
              </button>
            </div>

            <label
              className="fib-toggle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--muted)',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              <input
                type="checkbox"
                id="fib-toggle"
                checked={showFib}
                onChange={(e) => setShowFib(e.target.checked)}
              />{' '}
              Tampilkan Fibonacci
            </label>
          </div>

          <MainChart
            ticker={stock.ticker}
            price={stock.price}
            change={stock.change}
            isStock={true}
            period={period}
            chartType={chartType}
            showFib={showFib}
            onChartCalculated={(c) => setChartCalc(c)}
          />

          <div className="chart-foot">
            <div className="chart-legend">
              <span className="legend-item">
                <i className="legend-line"></i> {stock.ticker}
              </span>
              <span className="legend-item">
                <i className="legend-line ma"></i> MA 20
              </span>
            </div>
            <span className="chart-source">Sumber: yfinance · Data pasar IDX</span>
          </div>

          {showFib && (
            <div className="fib-anchor" id="fib-anchor">
              Acuan Fibonacci {periodLabel(period)}: low {rp(chartCalc.lowD.low)} (
              {fmtDate(chartCalc.lowD.date)}) · high {rp(chartCalc.highD.high)} (
              {fmtDate(chartCalc.highD.date)}). Rentang periode, bukan swing yang
              divalidasi analis.
            </div>
          )}

          <AIBox
            stockOrIndex={stock}
            isStock={true}
            chartCalc={chartCalc}
            period={period}
            onOpenDrawer={onOpenDrawer}
            onNotify={onNotify}
          />
        </section>
      </div>

      {/* Financials Section */}
      <section className="section" id="financials">
        <div className="section-head">
          <div>
            <h2>Kinerja keuangan historis</h2>
            <p>Pahami pertumbuhan, kondisi neraca, dan kualitas arus kas.</p>
          </div>
          <button className="btn small-btn" onClick={handleExportCSV}>
            <Icon name="download" cls="sm" /> Unduh CSV
          </button>
        </div>

        <div className="card">
          <div className="financial-header">
            <div
              className="tabs"
              role="tablist"
              aria-label="Jenis laporan keuangan"
            >
              <button
                role="tab"
                id="tab-income"
                aria-controls="fin-content"
                aria-selected={finTab === 'income'}
                className={finTab === 'income' ? 'active' : ''}
                onClick={() => setFinTab('income')}
              >
                Income Statement
              </button>
              <button
                role="tab"
                id="tab-balance"
                aria-controls="fin-content"
                aria-selected={finTab === 'balance'}
                className={finTab === 'balance' ? 'active' : ''}
                onClick={() => setFinTab('balance')}
              >
                Balance Sheet
              </button>
              <button
                role="tab"
                id="tab-cash"
                aria-controls="fin-content"
                aria-selected={finTab === 'cash'}
                className={finTab === 'cash' ? 'active' : ''}
                onClick={() => setFinTab('cash')}
              >
                Cash Flow
              </button>
            </div>
            <span className="small muted">Tahunan · FY 2021—2025</span>
          </div>

          <div
            id="fin-content"
            role="tabpanel"
            aria-labelledby={`tab-${finTab}`}
          >
            <div className="financial-summary">
              <div>
                <div className="fin-stat-label">{finLabels[0]}</div>
                <div className="fin-stat-number mono">
                  Rp{fmt(latestFin[finKeys[0]], 2)}
                  <span style={{ fontSize: '15px', letterSpacing: 0 }}> T</span>
                </div>
                <div className="fin-stat-note positive">
                  {pct(
                    (latestFin[finKeys[0]] / prevFin[finKeys[0]] - 1) * 100,
                    1
                  )}{' '}
                  <span className="muted">vs tahun sebelumnya</span>
                </div>
              </div>

              <div>
                <div className="fin-stat-label">{finLabels[1]}</div>
                <div className="fin-stat-number mono">
                  Rp{fmt(latestFin[finKeys[1]], 2)}
                  <span style={{ fontSize: '15px', letterSpacing: 0 }}> T</span>
                </div>
                <div className="fin-stat-note positive">
                  {pct(
                    (latestFin[finKeys[1]] / prevFin[finKeys[1]] - 1) * 100,
                    1
                  )}{' '}
                  <span className="muted">vs tahun sebelumnya</span>
                </div>
              </div>

              <svg
                className="fin-chart"
                viewBox="0 0 340 108"
                role="img"
                aria-label="Grafik tren lima tahun"
              >
                {fin.map((d, i) => {
                  const x = 18 + i * 65;
                  return (
                    <g key={i}>
                      {finKeys.map((k, j) => {
                        const hVal = (d[k] / maxFinVal) * 66;
                        return (
                          <rect
                            key={j}
                            x={x + j * 17}
                            y={78 - hVal}
                            width="12"
                            height={hVal}
                            rx="2"
                            fill={j ? '#b8cde8' : '#1a62bf'}
                          />
                        );
                      })}
                      <text
                        x={x + 14}
                        y="96"
                        textAnchor="middle"
                        fill="#7b8998"
                        fontSize="10"
                      >
                        {d.year}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="table-scroll">
              <table className="data-table financial-table">
                <thead>
                  <tr>
                    <th>
                      Pos keuangan <span className="muted">· Rp triliun</span>
                    </th>
                    {fin.map((x) => (
                      <th className="number" key={x.year}>
                        {x.year}
                        {x.year === 2025 && (
                          <span
                            style={{
                              color: 'var(--blue)',
                              display: 'inline-flex',
                              verticalAlign: 'middle',
                              marginLeft: '3px',
                            }}
                          >
                            <Icon name="arrow-up-right" cls="sm" />
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FIN_ROWS[finTab].map(([k, label, d, emphasis]) => (
                    <tr className={emphasis ? 'emphasis' : ''} key={k}>
                      <td>{label}</td>
                      {fin.map((x) => (
                        <td
                          className={`number ${x[k] < 0 ? 'negative' : ''}`}
                          key={x.year}
                        >
                          {x[k] < 0 ? `(${fmt(-x[k], d)})` : fmt(x[k], d)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-note">
              <span>
                Data sintetis FY2021–FY2025 · Rp triliun, kecuali EPS / BVPS (Rp)
                dan rasio (%) · tidak ada kepentingan nonpengendali dalam model demo
              </span>
              <button
                className="link-btn"
                onClick={() => onOpenDrawer('sources', { stock })}
              >
                Sumber &amp; catatan <Icon name="arrow-up-right" cls="sm" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Valuation Section */}
      <section className="section" id="valuation">
        <div className="section-head">
          <div>
            <h2>Rentang harga wajar</h2>
            <p>
              Dua pendekatan, tiga skenario. Geser asumsi untuk melihat
              perbedaannya.
            </p>
          </div>
          <button
            className="link-btn"
            onClick={() => {
              setValuations({
                pe: stock.pe || 14,
                pb: stock.pb || 2.0,
              });
              onNotify('Asumsi valuasi dikembalikan ke default');
            }}
          >
            <Icon name="refresh" cls="sm" /> Reset asumsi
          </button>
        </div>

        <div className="valuation-grid">
          {renderValuationCard('pe')}
          {renderValuationCard('pb')}
        </div>

        <p className="valuation-warning">
          <Icon name="info" cls="sm" />
          Harga wajar dihitung dari EPS riil ({stock.eps ? 'Rp' + fmt(stock.eps) : '—'}) × Target PER. Geser slider untuk menguji skenario valuasi.
        </p>
      </section>

      {/* Disclosures Section */}
      <section className="section" id="disclosures">
        <div className="section-head">
          <div>
            <h2>Aksi korporasi &amp; keterbukaan informasi</h2>
            <p>
              Ikuti perubahan yang dapat memengaruhi bisnis dan nilai perusahaan.
            </p>
          </div>
          <select
            className="select"
            id="doc-filter"
            aria-label="Filter dokumen emiten"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
          >
            <option value="all">Semua dokumen</option>
            <option value="action">Aksi korporasi</option>
            <option value="report">Laporan keuangan</option>
          </select>
        </div>

        <div className="card" id="disclosure-content">
          <div className="disclosure-list">
            {filteredDocs.map((d) => (
              <div className="disclosure-row" key={d.id}>
                <span className="doc-icon">
                  <Icon name="file" />
                </span>
                <div className="grow">
                  <div className="doc-title">{d.title}</div>
                  <div className="doc-meta">
                    <span>{fmtDate(d.date)}</span>
                    <span>·</span>
                    <span>{d.label}</span>
                    <span className="pill outline">Dokumen contoh</span>
                  </div>
                </div>
                <button
                  className="link-btn"
                  onClick={() => onOpenDrawer('doc', { docItem: d, stock })}
                >
                  Lihat ringkasan <Icon name="arrow-up-right" cls="sm" />
                </button>
              </div>
            ))}
          </div>
          <div className="table-note">
            <span>
              Belum terhubung ke keterbukaan informasi BEI atau situs resmi
              emiten.
            </span>
          </div>
        </div>
      </section>

      {/* News Section for this stock */}
      <NewsSection
        activeTicker={stock.ticker}
        onOpenNewsDrawer={(item) =>
          onOpenNewsDrawer ? onOpenNewsDrawer(item) : onOpenDrawer('news', { newsItem: item })
        }
      />

      <Footer onOpenMethod={onOpenMethod} onOpenAbout={onOpenAbout} />
    </>
  );
};
