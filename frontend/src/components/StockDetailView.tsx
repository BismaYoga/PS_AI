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
  stocks?: StockItem[];
  favorites: Set<string>;
  marketCache?: Record<string, any>;
  onRefreshInstrument?: (ticker: string) => Promise<boolean>;
  onSelectStock?: (ticker: string) => void;
  onToggleFavorite: (ticker: string) => void;
  onOpenDrawer: (type: string, payload?: any) => void;
  onOpenNewsDrawer?: (news: NewsItem) => void;
  onOpenMethod: () => void;
  onOpenAbout: () => void;
  onNavigateHome: () => void;
  onNotify: (msg: string) => void;
  onOpenCompare?: (tickerA?: string) => void;
}

export const StockDetailView: React.FC<StockDetailViewProps> = ({
  stock,
  stocks = [],
  favorites,
  marketCache,
  onRefreshInstrument,
  onSelectStock,
  onToggleFavorite,
  onOpenDrawer,
  onOpenNewsDrawer,
  onOpenMethod,
  onOpenAbout,
  onNavigateHome,
  onNotify,
  onOpenCompare,
}) => {
  const [period, setPeriod] = useState<Timeframe>('3M');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showFib, setShowFib] = useState<boolean>(true);
  const [finTab, setFinTab] = useState<'income' | 'balance' | 'cash'>('income');
  const [finTimeframe, setFinTimeframe] = useState<'quarterly' | 'annual'>('annual');
  const [showYoY, setShowYoY] = useState<boolean>(true);
  const [docFilter, setDocFilter] = useState<string>('all');
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const [sidebarTab, setSidebarTab] = useState<'all' | 'watchlist'>('all');
  const [chartCalc, setChartCalc] = useState<ChartCalculatedData>(() =>
    chartData(stock.ticker, stock.price, stock.change, '3M', marketCache)
  );

  const [valuations, setValuations] = useState<ValuationState>({
    pe: stock.targetPe || stock.pe || 14,
    pb: stock.pb || 2.0,
  });

  const [companyDetail, setCompanyDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [finInsightData, setFinInsightData] = useState<any | null>(null);
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
  const [showAllInsights, setShowAllInsights] = useState<boolean>(false);

  const fetchFinancialInsight = async (force = false) => {
    setLoadingInsight(true);
    try {
      const res = await fetch(
        `/api/financial-insight?ticker=${encodeURIComponent(stock.ticker)}${force ? '&force=1' : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setFinInsightData(data);
      }
    } catch {
      // fallback
    } finally {
      setLoadingInsight(false);
    }
  };

  const fetchCompanyDetail = async (force = false) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/company-detail?ticker=${encodeURIComponent(stock.ticker)}${force ? '&force=1' : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompanyDetail(data);
        if (force) {
          fetchFinancialInsight(true);
          onNotify(`Data fundamental & keterbukaan ${stock.ticker} berhasil diperbarui ke DB!`);
        }
      }
    } catch {
      // fallback gracefully
    } finally {
      setLoadingDetail(false);
    }
  };

  React.useEffect(() => {
    setValuations({
      pe: stock.targetPe || stock.pe || 14,
      pb: stock.pb || 2.0,
    });
    fetchCompanyDetail(false);
    fetchFinancialInsight(false);
  }, [stock.ticker]);

  const isFav = favorites.has(stock.ticker);
  const hasRealQuarterly =
    companyDetail?.financials &&
    Array.isArray(companyDetail.financials) &&
    companyDetail.financials.length >= 2;
  const hasRealAnnual =
    companyDetail?.financialsAnnual &&
    Array.isArray(companyDetail.financialsAnnual) &&
    companyDetail.financialsAnnual.length >= 2;

  const hasRealFin = finTimeframe === 'annual' ? hasRealAnnual : hasRealQuarterly;
  const rawFin = finTimeframe === 'annual'
    ? (hasRealAnnual ? companyDetail.financialsAnnual : financialData(stock))
    : (hasRealQuarterly ? companyDetail.financials : financialData(stock));
  const fin = Array.isArray(rawFin) && rawFin.length > 0 ? rawFin : financialData(stock);
  const latestFin = fin[fin.length - 1];
  const prevFin = fin[Math.max(0, fin.length - 2)];
  const latestPeriodLabel = String(latestFin?.year || 'Terbaru');

  // Komposisi Pemegang Saham KSEI (Real) atau fallback
  const hasRealShareholders =
    companyDetail?.shareholders &&
    Array.isArray(companyDetail.shareholders) &&
    companyDetail.shareholders.length > 0;

  const donutItems: [string, number][] = hasRealShareholders
    ? (() => {
        const raw = companyDetail.shareholders.slice(0, 4).map((s: any) => [
          String(s.name),
          Number(s.percentage) || 0,
        ] as [string, number]);
        const sumPct = raw.reduce((acc: number, item: [string, number]) => acc + item[1], 0);
        if (sumPct < 99.2 && raw.length > 0) {
          raw.push(['Lainnya / Publik', Number((100 - sumPct).toFixed(2))]);
        }
        return raw;
      })()
    : stock.rev;

  // Donut SVG generator
  const donutColors = ['#1a62bf', '#4e86d4', '#83aada', '#b8cde8', '#dce6f2'];
  let cumAngle = 0;
  const donutCircles = donutItems.map(([_, p], i) => {
    const clampedP = Math.max(0.5, Math.min(100, p));
    const dash = `${ Math.max(0.2, clampedP - 0.8) } ${ 100 - Math.max(0.2, clampedP - 0.8) }`;
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
    cumAngle += clampedP;
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
      ? [`Pendapatan (${latestPeriodLabel})`, `Laba bersih (${latestPeriodLabel})`]
      : finTab === 'balance'
      ? [`Total aset (${latestPeriodLabel})`, `Total ekuitas (${latestPeriodLabel})`]
      : [`Arus kas operasi (${latestPeriodLabel})`, `Laba bersih (${latestPeriodLabel})`];
  const maxFinVal = Math.max(1, ...fin.flatMap((d: any) => finKeys.map((k) => Math.abs(Number(d[k]) || 0)))) * 1.15;

  // Helper to compute YoY growth for a period index
  const getCompPeriodLabel = (idx: number): string => {
    if (idx < 0 || idx >= fin.length) return '';
    if (finTimeframe === 'annual') {
      return idx > 0 ? String(fin[idx - 1]?.year || '') : '';
    }
    const curYearLabel = String(fin[idx]?.year || '');
    const match = curYearLabel.match(/(Q\d|FY)\s*(\d{4})/);
    if (match) {
      const tag = match[1];
      const yr = parseInt(match[2], 10);
      const target = fin.find((x: any) => String(x.year || '').includes(`${tag} ${yr - 1}`));
      return target ? String(target.year) : '';
    }
    return '';
  };

  const getYoYGrowth = (k: string, idx: number): number | null => {
    if (idx < 0 || idx >= fin.length) return null;
    const curItem = fin[idx];
    const curVal = Number(curItem?.[k]) || 0;

    let prevItem: any = null;
    if (finTimeframe === 'annual') {
      if (idx > 0) prevItem = fin[idx - 1];
    } else {
      const curYearLabel = String(curItem?.year || '');
      const match = curYearLabel.match(/(Q\d|FY)\s*(\d{4})/);
      if (match) {
        const tag = match[1];
        const yr = parseInt(match[2], 10);
        prevItem = fin.find((x: any) => String(x.year || '').includes(`${tag} ${yr - 1}`));
      }
    }

    if (!prevItem) return null;
    const prevVal = Number(prevItem?.[k]) || 0;
    if (Math.abs(prevVal) < 0.0001) return null;
    return ((curVal - prevVal) / Math.abs(prevVal)) * 100;
  };

  // Export CSV
  const handleExportCSV = () => {
    const periodRange = `${fin[0]?.year || ''} - ${latestPeriodLabel}`;
    const rows = [
      [hasRealFin ? 'DATA LAPORAN KEUANGAN RESMI BEI (YEAR ON YEAR) - PINTARSAHAM INTELLIGENCE' : 'DATA ESTIMASI'],
      [stock.ticker, `${finTimeframe === 'annual' ? 'Tahunan (FY) · Year on Year' : 'Kuartalan (Q)'} · ${periodRange}`, 'Rp triliun kecuali EPS/BVPS (Rp), rasio (%)'],
      ['Pos keuangan', ...fin.map((x: any) => x.year)],
      ...FIN_ROWS[finTab].flatMap(([k, label]) => {
        const valRow = [
          label,
          ...fin.map((x: any) => Number((Number(x[k]) || 0).toFixed(4))),
        ];
        const isGrowthCandidate = ['revenue', 'net', 'eps', 'assets', 'equity', 'cfo'].includes(k);
        if (showYoY && isGrowthCandidate) {
          const yoyRow = [
            `↳ Pertumbuhan ${label.split('(')[0].trim()} YoY (%)`,
            ...fin.map((_: any, idx: number) => {
              const y = getYoYGrowth(k, idx);
              return y !== null ? Number(y.toFixed(2)) : '—';
            }),
          ];
          return [valRow, yoyRow];
        }
        return [valRow];
      }),
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
    a.download = `${stock.ticker}_${finTimeframe}_YoY_${finTab}_${latestPeriodLabel.replace(/\s+/g, '_')}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onNotify('CSV data laporan keuangan berhasil diunduh');
  };

  // Valuation card renderer with negative EPS/BVPS protection
  const renderValuationCard = (type: 'pe' | 'pb') => {
    const isPe = type === 'pe';
    const target = valuations[type];
    const rawBase = isPe ? stock.eps : stock.bvps;
    const isInvalidBase = rawBase !== null && rawBase !== undefined && rawBase <= 0;
    const base = isInvalidBase ? 0 : rawBase || (isPe ? 100 : 500);
    const fair = base > 0 ? base * target : 0;
    const low = fair > 0 ? fair * 0.8 : stock.price * 0.8;
    const high = fair > 0 ? fair * 1.2 : stock.price * 1.2;
    const m = fair > 0 ? (1 - stock.price / fair) * 100 : -99.9;

    const min = Math.min(stock.price, low) * 0.83;
    const max = Math.max(stock.price, high) * 1.08;
    const pos = (v: number) => Math.max(2, Math.min(98, ((v - min) / (max - min || 1)) * 100));

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
            <div className="valuation-price mono">
              {isInvalidBase ? 'N/A (Rugi)' : fair ? rp(fair) : '—'}
            </div>
            <div className="valuation-price-note">
              {isInvalidBase
                ? isPe
                  ? 'Emiten mencatat rugi bersih (EPS negatif)'
                  : 'Ekuitas negatif (defisiensi modal)'
                : 'Harga wajar skenario dasar'}
            </div>
          </div>
          <span
            className="mos-pill"
            style={
              isInvalidBase || m < 0
                ? { background: '#fcf1f2', color: 'var(--red)' }
                : m >= 25
                ? { background: '#e3f5eb', color: '#0e6945', fontWeight: 700 }
                : {}
            }
          >
            {isInvalidBase ? 'Tidak Berlaku' : `MOS ${fmt(m, 1)}%`}
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
            style={{ left: `${pos(low)}%`, width: `${Math.max(2, pos(high) - pos(low))}%` }}
          ></div>
          <div className="range-marker" style={{ left: `${pos(stock.price)}%` }}>
            <span className="marker-label">Sekarang {rp(stock.price)}</span>
          </div>
          {[
            [low, 'Konservatif'],
            [fair > 0 ? fair : stock.price, 'Dasar'],
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
              {isPe ? 'EPS riil (TTM)' : 'BVPS riil'} · BEI Official
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

  const realDisclosures =
    companyDetail?.disclosures && Array.isArray(companyDetail.disclosures)
      ? companyDetail.disclosures.map((d: any, idx: number) => {
          const lower = String(d.title || '').toLowerCase();
          const isReport =
            lower.includes('laporan keuangan') ||
            lower.includes('keuangan interim') ||
            lower.includes('audit') ||
            lower.includes('tahunan');
          const attNames = (d.attachments || [])
            .map((a: any) => a.name)
            .join(', ');
          return {
            id: `disc-${idx}`,
            type: isReport ? 'report' : 'action',
            title: d.title,
            label: isReport ? 'Laporan keuangan BEI' : 'Keterbukaan informasi BEI',
            date: d.rawDate || d.date || 'Terbaru',
            displayDate: d.date || fmtDate(d.rawDate || '2026-10-16'),
            url: d.url || '',
            attachments: d.attachments || [],
            body: `Dokumen resmi Keterbukaan Informasi BEI untuk ${stock.ticker} (${
              d.date || ''
            }). ${
              attNames ? 'Lampiran resmi: ' + attNames + '.' : ''
            }`,
            isReal: true,
          };
        })
      : [];

  const sampleDocs = [
    {
      id: 'action',
      type: 'action',
      title: `Pemberitahuan keterbukaan informasi ${stock.ticker}`,
      label: 'Aksi korporasi',
      date: '2026-09-21',
      displayDate: fmtDate('2026-09-21'),
      url: '',
      attachments: [],
      body: `Belum ada dokumen keterbukaan informasi terbaru untuk ${stock.ticker} di database.`,
      isReal: false,
    },
  ];

  const activeDocs = realDisclosures.length > 0 ? realDisclosures : sampleDocs;
  const filteredDocs = activeDocs.filter(
    (d: any) => docFilter === 'all' || d.type === docFilter
  );

  const realProfile = companyDetail?.profile;
  const totalKseiShares = hasRealShareholders
    ? companyDetail.shareholders.reduce(
        (acc: number, s: any) => acc + (Number(s.shares) || 0),
        0
      )
    : 0;
  const computedMarketCapT =
    stock.marketCap && stock.marketCap > 0
      ? stock.marketCap / 1e12
      : totalKseiShares > 0
      ? (stock.price * totalKseiShares) / 1e12
      : stock.shares
      ? (stock.price * stock.shares) / 1000
      : null;

  const TRENDING_TICKERS = React.useMemo(() => [
    'BBCA', 'BBRI', 'BMRI', 'BBNI', 'TLKM',
    'ASII', 'AMMN', 'ADRO', 'ICBP', 'GOTO'
  ], []);

  // Top Foreign state (di-fetch 1x per hari dari cache Invezgo top_foreign.json)
  const [topForeignTickers, setTopForeignTickers] = React.useState<string[]>([]);
  const [foreignTradingDate, setForeignTradingDate] = React.useState<string>('');

  React.useEffect(() => {
    let isMounted = true;
    fetch('/data/top_foreign.json')
      .then((r) => {
        if (!r.ok) return fetch('/api/top-foreign').then((r2) => r2.json());
        return r.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && Array.isArray(data.top_tickers) && data.top_tickers.length > 0) {
          setTopForeignTickers(data.top_tickers.slice(0, 10));
          if (data.trading_date) {
            setForeignTradingDate(data.trading_date);
          }
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat top_foreign.json, fallback default', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter sidebar emiten: Cukup 10 Top Foreign dulu secara default, muat seluruh 900+ emiten saat user mengetik di search bar
  const filteredSidebarStocks = React.useMemo(() => {
    // 1. Tab Watchlist
    if (sidebarTab === 'watchlist') {
      let list = stocks.filter((s) => favorites.has(s.ticker));
      if (sidebarSearch.trim()) {
        const q = sidebarSearch.toLowerCase().trim();
        list = list.filter(
          (s) =>
            s.ticker.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.short.toLowerCase().includes(q)
        );
      }
      return list;
    }

    // 2. Tab Semua: Jika user mengetik di kotak search, cari dari seluruh 900+ emiten
    if (sidebarSearch.trim()) {
      const q = sidebarSearch.toLowerCase().trim();
      return stocks
        .filter(
          (s) =>
            s.ticker.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.short.toLowerCase().includes(q)
        )
        .slice(0, 30); // Batasi hasil instan agar DOM tetap ringan
    }

    // 3. Default saat masuk: 10 emiten Top Foreign Invezgo (atau fallback ke trending populer)
    const activeTopList = topForeignTickers.length > 0 ? topForeignTickers : TRENDING_TICKERS;
    const defaultStocks = activeTopList
      .map((t) => stocks.find((s) => s.ticker === t))
      .filter((s): s is StockItem => Boolean(s));

    // Pastikan emiten yang sedang aktif dilihat tetap muncul di list jika di luar top list
    if (stock && !defaultStocks.some((s) => s.ticker === stock.ticker)) {
      return [stock, ...defaultStocks];
    }

    return defaultStocks;
  }, [stocks, sidebarTab, favorites, sidebarSearch, TRENDING_TICKERS, topForeignTickers, stock]);

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

      <div className="stockbit-layout">
        {/* SIDEBAR STOCKBIT: PEMILIHAN EMITEN & WATCHLIST */}
        <aside className="stockbit-sidebar" aria-label="Daftar Emiten & Watchlist">
          {/* 1. Kotak Pencarian Real-Time by Ticker / Nama */}
          <div className="stockbit-search-box">
            <div className="stockbit-search-input-wrap">
              <Icon name="search" cls="stockbit-search-icon" />
              <input
                type="text"
                className="stockbit-search-input"
                placeholder="Cari ticker / nama emiten..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
              />
              {sidebarSearch && (
                <button
                  onClick={() => setSidebarSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Hapus pencarian"
                >
                  <Icon name="close" cls="sm" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Tabs Switcher: Top Foreign/Hasil Cari vs Watchlist */}
          <div className="stockbit-tabs">
            <button
              className={`stockbit-tab-btn ${sidebarTab === 'all' ? 'active' : ''}`}
              onClick={() => setSidebarTab('all')}
            >
              {sidebarSearch.trim()
                ? `Hasil Cari (${filteredSidebarStocks.length})`
                : `Top Foreign (${Math.min(10, filteredSidebarStocks.length)})`}
            </button>
            <button
              className={`stockbit-tab-btn ${sidebarTab === 'watchlist' ? 'active' : ''}`}
              onClick={() => setSidebarTab('watchlist')}
            >
              Watchlist ({favorites.size})
            </button>
          </div>

          {/* Sub-header info status */}
          <div
            style={{
              padding: '6px 14px',
              fontSize: '10px',
              color: 'var(--muted)',
              background: 'var(--soft)',
              borderBottom: '1px solid var(--line-light, rgba(226, 232, 240, 0.6))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {sidebarTab === 'watchlist'
                ? `${filteredSidebarStocks.length} Saham di Watchlist`
                : sidebarSearch.trim()
                ? `Menampilkan ${filteredSidebarStocks.length} emiten`
                : `Top Akumulasi Asing${foreignTradingDate ? ` (${foreignTradingDate})` : ''}`}
            </span>
            {!sidebarSearch && sidebarTab === 'all' && (
              <span style={{ fontSize: '9px', color: 'var(--blue)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Icon name="search" cls="sm" style={{ width: '10px', height: '10px' }} /> Cari 900+ emiten
              </span>
            )}
          </div>

          {/* 3. Scrollable List of Emitens */}
          <div className="stockbit-stock-list">
            {filteredSidebarStocks.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                {sidebarTab === 'watchlist'
                  ? 'Belum ada emiten di watchlist.'
                  : 'Emiten tidak ditemukan.'}
              </div>
            ) : (
              filteredSidebarStocks.map((s) => {
                const isSelected = s.ticker === stock.ticker;
                const isSaved = favorites.has(s.ticker);
                const isPositive = s.change >= 0;
                return (
                  <div
                    key={s.ticker}
                    className={`stockbit-item ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectStock && onSelectStock(s.ticker)}
                  >
                    <div className="stockbit-item-left">
                      <StockLogo
                        ticker={s.ticker}
                        mark={s.mark}
                        color={s.color}
                        large={false}
                      />
                      <div className="stockbit-item-info">
                        <div className="stockbit-item-ticker">
                          {s.ticker}
                        </div>
                        <div className="stockbit-item-name" title={s.name}>
                          {s.short || s.name}
                        </div>
                      </div>
                    </div>

                    <div className="stockbit-item-right">
                      <span className="stockbit-item-price">
                        {rp(s.price)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className={`stockbit-item-chg ${isPositive ? 'pos' : 'neg'}`}>
                          {pct(s.change, 1)}
                        </span>
                        <button
                          className={`stockbit-star-btn ${isSaved ? 'saved' : ''}`}
                          title={isSaved ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(s.ticker);
                          }}
                        >
                          <Icon name="star" cls="sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* MAIN DETAIL PANEL */}
        <div className="stockbit-main-content">
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
                  {stock.ticker} <span className="pill outline">IDX</span>{' '}
                  {realProfile?.board && (
                    <span className="pill blue" style={{ fontSize: '10px' }}>
                      Papan {realProfile.board}
                    </span>
                  )}
                </h1>
                <p>{realProfile?.name || stock.name}</p>
              </div>
            </div>

            <div className="filter-row detail-action-row">
              <button
                className="btn"
                onClick={() => fetchCompanyDetail(true)}
                disabled={loadingDetail}
                title="Sinkronkan ulang data kuartalan & keterbukaan informasi dari Invezgo API ke SQLite DB"
              >
                <Icon name="refresh" cls="sm" />{' '}
                {loadingDetail ? 'Memuat DB...' : 'Sinkronkan DB'}
              </button>
              <button
                className="btn"
                onClick={() => onOpenDrawer('sources', { stock, companyDetail })}
              >
                <Icon name="file" cls="sm" /> Sumber &amp; profil
              </button>
              {onOpenCompare && (
                <button
                  className="btn"
                  onClick={() => onOpenCompare(stock.ticker)}
                  title={`Bandingkan ${stock.ticker} dengan emiten lain`}
                >
                  <Icon name="compare" cls="sm" /> Bandingkan
                </button>
              )}
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

      {/* Mobile Quick Section Jump Chips */}
      <nav className="mobile-section-chips" aria-label="Navigasi bagian saham">
        <button
          type="button"
          className="section-chip active"
          onClick={() => {
            const el = document.getElementById('chart-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Icon name="chart" cls="sm" /> Grafik &amp; AI
        </button>
        <button
          type="button"
          className="section-chip"
          onClick={() => {
            const el = document.getElementById('profile-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Icon name="building" cls="sm" /> Profil
        </button>
        <button
          type="button"
          className="section-chip"
          onClick={() => {
            const el = document.getElementById('financials');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Icon name="coins" cls="sm" /> Keuangan
        </button>
        <button
          type="button"
          className="section-chip"
          onClick={() => {
            const el = document.getElementById('valuation');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Icon name="sparkles" cls="sm" /> Valuasi MOS
        </button>
        <button
          type="button"
          className="section-chip"
          onClick={() => {
            const el = document.getElementById('disclosures');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <Icon name="file" cls="sm" /> Dokumen
        </button>
      </nav>

      {/* Two-column layout matching .detail-top */}
      <div className="detail-top">
        {/* Left Column: Profile Card */}
        <aside className="card profile-card" id="profile-section">
          <div className="profile-main">
            <div className="profile-head" style={{ justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="building" cls="sm" /> Profil perusahaan
              </span>
              {companyDetail && (
                <span
                  className="pill green"
                  style={{ fontSize: '9px' }}
                  title={
                    companyDetail.cachedDb
                      ? 'Dimuat langsung dari SQLite DB lokal (0 API request)'
                      : 'Baru diambil dari Invezgo API & disimpan ke SQLite DB'
                  }
                >
                  {companyDetail.cachedDb ? 'SQLite DB (0 Req)' : 'Tersimpan di DB'}
                </span>
              )}
            </div>
            <div className="stock-summary-strip">
              <span className="pill blue">{realProfile?.sector || stock.sector}</span>
              <span className="pill outline">{realProfile?.subsector || stock.subsector}</span>
            </div>
            <p className="profile-description" style={{ maxHeight: '115px', overflowY: 'auto' }}>
              {realProfile?.activity
                ? realProfile.activity
                : stock.description}
            </p>
            {realProfile && (realProfile.listingDate || realProfile.website) && (
              <div
                className="small muted"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '10px',
                  fontSize: '11px',
                }}
              >
                {realProfile.listingDate && (
                  <span>IPO: {fmtDate(realProfile.listingDate)}</span>
                )}
                {realProfile.website && (
                  <a
                    href={
                      realProfile.website.startsWith('http')
                        ? realProfile.website
                        : `https://${realProfile.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--blue)', textDecoration: 'underline' }}
                  >
                    {realProfile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
            <div className="profile-grid">
              <div>
                <label>Kapitalisasi pasar</label>
                <strong>
                  {computedMarketCapT
                    ? 'Rp' + fmt(computedMarketCapT, 1) + ' T'
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
            <h3>
              {hasRealShareholders
                ? 'Komposisi pemegang saham'
                : 'Kontribusi pendapatan'}
            </h3>
            <div className="small muted">
              {hasRealShareholders
                ? 'Kepemilikan Efek Resmi KSEI (Data BEI)'
                : `${
                    stock.sector === 'Keuangan'
                      ? 'Pendapatan operasional neto'
                      : 'Pendapatan konsolidasian'
                  } · estimasi`}
            </div>
            <div className="revenue-donut">
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                role="img"
                aria-label="Komposisi pemegang saham KSEI"
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
                  {hasRealShareholders ? 'Data KSEI · BEI' : 'Estimasi'}
                </text>
              </svg>
            </div>
            {donutItems.map(([l, p], i) => (
              <div className="revenue-row" key={i}>
                <span className="rev-label">
                  <i
                    className="swatch"
                    style={{ background: donutColors[i % donutColors.length] }}
                  ></i>
                  {l}
                </span>
                <b>{fmt(p, 2)}%</b>
              </div>
            ))}
          </div>

          {realProfile &&
            ((Array.isArray(realProfile.directors) && realProfile.directors.length > 0) ||
              (Array.isArray(realProfile.commissioners) && realProfile.commissioners.length > 0)) && (
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: '12px',
                  marginTop: '12px',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>
                    Manajemen &amp; Entitas
                  </strong>
                  <button
                    className="link-btn"
                    style={{ fontSize: '11px' }}
                    onClick={() => onOpenDrawer('sources', { stock, companyDetail })}
                  >
                    Jajaran lengkap <Icon name="arrow-up-right" cls="sm" />
                  </button>
                </div>
                {realProfile.directors?.[0] && (
                  <div className="revenue-row" style={{ padding: '3px 0' }}>
                    <span className="muted">Direktur Utama</span>
                    <b style={{ textAlign: 'right', maxWidth: '60%' }}>
                      {realProfile.directors[0].name}
                    </b>
                  </div>
                )}
                {realProfile.commissioners?.[0] && (
                  <div className="revenue-row" style={{ padding: '3px 0' }}>
                    <span className="muted">Komisaris Utama</span>
                    <b style={{ textAlign: 'right', maxWidth: '60%' }}>
                      {realProfile.commissioners[0].name}
                    </b>
                  </div>
                )}
                {Array.isArray(realProfile.subsidiaries) &&
                  realProfile.subsidiaries.length > 0 && (
                    <div className="revenue-row" style={{ padding: '3px 0' }}>
                      <span className="muted">Entitas Anak Tercatat</span>
                      <b>{realProfile.subsidiaries.length} Perusahaan</b>
                    </div>
                  )}
              </div>
            )}

          <div className="profile-note">
            Profil resmi emiten tercatat di Bursa Efek Indonesia (BEI), struktur kepemilikan KSEI, dan laporan kuartalan terkini.
          </div>
        </aside>

        {/* Right Column: Stock Chart Card */}
        <section
          className="card stock-chart-card"
          id="chart-section"
          aria-label="Grafik teknikal emiten"
        >
          <div className="chart-top">
            <div>
              <div className="instrument">
                Pergerakan harga {stock.ticker} <span className="pill outline">IDR</span>
                <button
                  onClick={async () => {
                    onNotify(`Memperbarui data ${stock.ticker}...`);
                    if (onRefreshInstrument) {
                      const ok = await onRefreshInstrument(stock.ticker);
                      onNotify(
                        ok
                          ? `Data ${stock.ticker} berhasil diperbarui!`
                          : `Gagal memperbarui ${stock.ticker}`
                      );
                      return;
                    }
                    try {
                      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(stock.ticker)}`);
                      if (res.ok) {
                        onNotify(`Data ${stock.ticker} berhasil diperbarui!`);
                        window.location.reload();
                      } else {
                        onNotify(`Gagal memperbarui ${stock.ticker}`);
                      }
                    } catch {
                      onNotify(`Koneksi server gagal saat memperbarui ${stock.ticker}`);
                    }
                  }}
                  className="btn small-btn"
                  style={{ padding: '2px 8px', fontSize: '10px', marginLeft: '6px' }}
                  title="Perbarui data saham"
                >
                  <Icon name="refresh" cls="sm" /> Perbarui
                </button>
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
                Penutupan bursa · {stock.date || '16 Okt 2026'} · Data Resmi BEI
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
              {(['1D', '1M', '3M', '6M', '1Y'] as Timeframe[]).map((p) => (
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
            marketCache={marketCache}
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
            <span className="chart-source">Sumber: Data Resmi Bursa Efek Indonesia (IDX)</span>
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
            <h2>Kinerja keuangan historis ({stock.ticker})</h2>
            <p>
              {hasRealFin
                ? `Data laporan keuangan ${finTimeframe === 'annual' ? 'tahunan fiskal (FY 2019–2025)' : 'kuartalan berurutan (Q2 2024–Q3 2026, Q4 dilaporkan via FY)'} resmi BEI · Tersimpan di SQLite DB.`
                : 'Pahami pertumbuhan, kondisi neraca, dan kualitas arus kas.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn small-btn" onClick={handleExportCSV}>
              <Icon name="download" cls="sm" /> Unduh CSV
            </button>
          </div>
        </div>

        {/* Smart Financial Summary & Insight Card */}
        {finInsightData?.insight && (
          <div className="card" style={{ marginBottom: '18px', padding: '18px 22px', border: '1px solid rgba(2, 132, 199, 0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Icon name="sparkles" cls="sm" style={{ color: '#0284c7', width: '18px', height: '18px' }} />
                <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Rangkuman & Insight Keuangan
                </span>
                <span style={{
                  background: 'rgba(2, 132, 199, 0.08)',
                  color: '#0284c7',
                  border: '1px solid rgba(2, 132, 199, 0.2)',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                }}>
                  {finTimeframe === 'annual' ? 'Basis Data Tahunan (YoY)' : 'Basis Data Kuartalan'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Icon name={finInsightData.cached ? 'zap' : 'sparkles'} cls="sm" style={{ width: '13px', height: '13px', color: '#0284c7' }} />
                  {finInsightData.cached ? 'Tersimpan di SQLite' : 'Baru Dianalisis'} ({finInsightData.period_tag?.replace('_', ' · ')})
                </span>
                <button
                  className="btn small-btn"
                  style={{ padding: '3px 9px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => fetchFinancialInsight(true)}
                  disabled={loadingInsight}
                  title="Analisis Ulang Laporan Keuangan"
                >
                  <Icon name="refresh" cls="sm" style={{ width: '11px', height: '11px' }} />
                  {loadingInsight ? 'Menganalisis...' : 'Update'}
                </button>
              </div>
            </div>

            {/* Executive Verdict Banner */}
            {finInsightData.insight.verdict && (
              <div style={{
                background: 'var(--bg-subtle, rgba(2, 132, 199, 0.05))',
                borderLeft: '4px solid #0284c7',
                padding: '12px 16px',
                borderRadius: '4px 8px 8px 4px',
                marginBottom: '14px',
                fontSize: '13.5px',
                lineHeight: '1.6',
                color: 'var(--text-main, #0f172a)'
              }}>
                <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: '3px', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon name="info" cls="sm" style={{ width: '14px', height: '14px' }} />
                  <span>Ringkasan Eksekutif</span>
                </div>
                <p style={{ margin: 0, fontWeight: 500 }}>{finInsightData.insight.verdict}</p>
              </div>
            )}

            {/* Quick Key Metrics Pills */}
            {finInsightData.insight.key_metrics && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <div style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border, #e2e8f0)' }}>
                  DER: <strong style={{ color: '#0284c7' }}>{finInsightData.insight.key_metrics.der}</strong>
                </div>
                <div style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border, #e2e8f0)' }}>
                  NPM: <strong style={{ color: '#10b981' }}>{finInsightData.insight.key_metrics.npm}</strong>
                </div>
                <div style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border, #e2e8f0)' }}>
                  ROE: <strong style={{ color: '#0284c7' }}>{finInsightData.insight.key_metrics.roe}</strong>
                </div>
                <div style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border, #e2e8f0)' }}>
                  CFO / Laba Bersih: <strong style={{ color: '#8b5cf6' }}>{finInsightData.insight.key_metrics.cfo_to_net}</strong>
                </div>
                {finInsightData.insight.key_metrics.cagr_rev_3y !== '-' && (
                  <div style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border, #e2e8f0)' }}>
                    CAGR Omzet 3Y: <strong style={{ color: '#0284c7' }}>{finInsightData.insight.key_metrics.cagr_rev_3y}</strong>
                  </div>
                )}
                <div style={{ background: 'var(--bg-subtle, #f1f5f9)', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid var(--border, #e2e8f0)' }}>
                  Free Cash Flow: <strong style={{ color: '#10b981' }}>{finInsightData.insight.key_metrics.fcf_t}</strong>
                </div>
              </div>
            )}

            {/* Context-Aware Tab Insight or All Insights Grid */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {showAllInsights ? 'Detail Tiga Pilar Laporan Keuangan' : `Fokus Tab Aktif: ${finTab === 'balance' ? 'Neraca (Balance Sheet)' : finTab === 'cash' ? 'Arus Kas (Cash Flow)' : 'Laba Rugi (Income Statement)'}`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllInsights(!showAllInsights)}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showAllInsights ? 'Sembunyikan Pilar Lain' : 'Tampilkan Semua Pilar (3 Laporan)'}
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: showAllInsights ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
                gap: '12px'
              }}>
                {/* 1. Balance Sheet Card */}
                {(showAllInsights || finTab === 'balance') && finInsightData.insight.balance_sheet && (
                  <div style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main, #0f172a)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="building" cls="sm" style={{ width: '16px', height: '16px', color: '#0284c7' }} />
                        <span>Neraca & Solvabilitas</span>
                      </span>
                      <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        {finInsightData.insight.balance_sheet.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-sub, #475569)', lineHeight: '1.5', marginBottom: '10px' }}>
                      {finInsightData.insight.balance_sheet.summary}
                    </p>
                    {Array.isArray(finInsightData.insight.balance_sheet.highlights) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {finInsightData.insight.balance_sheet.highlights.map((pt: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-sub, #64748b)', lineHeight: '1.45' }}>
                            <Icon name="check" cls="sm" style={{ width: '13px', height: '13px', color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Income Statement Card */}
                {(showAllInsights || finTab === 'income') && finInsightData.insight.income_statement && (
                  <div style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main, #0f172a)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="chart" cls="sm" style={{ width: '16px', height: '16px', color: '#10b981' }} />
                        <span>Kinerja Laba Rugi</span>
                      </span>
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        {finInsightData.insight.income_statement.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-sub, #475569)', lineHeight: '1.5', marginBottom: '10px' }}>
                      {finInsightData.insight.income_statement.summary}
                    </p>
                    {Array.isArray(finInsightData.insight.income_statement.highlights) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {finInsightData.insight.income_statement.highlights.map((pt: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-sub, #64748b)', lineHeight: '1.45' }}>
                            <Icon name="check" cls="sm" style={{ width: '13px', height: '13px', color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Cash Flow Card */}
                {(showAllInsights || finTab === 'cash') && finInsightData.insight.cash_flow && (
                  <div style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main, #0f172a)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="coins" cls="sm" style={{ width: '16px', height: '16px', color: '#8b5cf6' }} />
                        <span>Realita Arus Kas</span>
                      </span>
                      <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        {finInsightData.insight.cash_flow.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-sub, #475569)', lineHeight: '1.5', marginBottom: '10px' }}>
                      {finInsightData.insight.cash_flow.summary}
                    </p>
                    {Array.isArray(finInsightData.insight.cash_flow.highlights) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {finInsightData.insight.cash_flow.highlights.map((pt: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-sub, #64748b)', lineHeight: '1.45' }}>
                            <Icon name="check" cls="sm" style={{ width: '13px', height: '13px', color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="financial-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', background: 'var(--bg-subtle, #f1f5f9)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setFinTimeframe('annual')}
                  style={{
                    padding: '4px 11px',
                    fontSize: '11.5px',
                    fontWeight: finTimeframe === 'annual' ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: finTimeframe === 'annual' ? 'var(--blue)' : 'transparent',
                    color: finTimeframe === 'annual' ? '#fff' : 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  Year on Year / Tahunan ({companyDetail?.financialsAnnual?.length || 7} FY)
                </button>
                <button
                  type="button"
                  onClick={() => setFinTimeframe('quarterly')}
                  style={{
                    padding: '4px 11px',
                    fontSize: '11.5px',
                    fontWeight: finTimeframe === 'quarterly' ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: finTimeframe === 'quarterly' ? 'var(--blue)' : 'transparent',
                    color: finTimeframe === 'quarterly' ? '#fff' : 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  Kuartalan ({companyDetail?.financials?.length || fin.length} Periode)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowYoY(!showYoY)}
                title="Tampilkan atau sembunyikan baris persentase pertumbuhan Year on Year"
                style={{
                  padding: '4px 9px',
                  fontSize: '11.5px',
                  fontWeight: showYoY ? 700 : 500,
                  borderRadius: '5px',
                  border: '1px solid ' + (showYoY ? 'var(--blue)' : 'var(--border, #cbd5e1)'),
                  background: showYoY ? 'rgba(26, 98, 191, 0.1)' : 'transparent',
                  color: showYoY ? 'var(--blue)' : 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Icon name="sparkles" cls="sm" /> YoY Growth (%)
              </button>

              <span className="small muted">
                {finTimeframe === 'annual'
                  ? `Tahunan (FY) · ${fin[0]?.year} — ${latestPeriodLabel}`
                  : `Kuartalan · ${fin[0]?.year} — ${latestPeriodLabel}`}
              </span>
            </div>
          </div>

          <div
            id="fin-content"
            role="tabpanel"
            aria-labelledby={`tab-${finTab}`}
          >
            <div style={{ padding: '8px 14px', background: 'var(--bg-subtle, rgba(26, 98, 191, 0.05))', borderRadius: '6px', margin: '0 16px 12px', fontSize: '12px', color: 'var(--text-muted, #555)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="info" cls="sm" />
              <span>
                <strong>Tampilan Year on Year (YoY):</strong> Menampilkan perbandingan kinerja jangka panjang ({finTimeframe === 'annual' ? '7 tahun fiskal 2019–2025' : 'kuartalan berurutan'}) lengkap dengan persentase pertumbuhan tahunan (YoY). {finTimeframe === 'annual' ? 'Klik Kuartalan jika ingin melihat rincian triwulan.' : 'Di BEI, kuartal IV dilaporkan sebagai Laporan Tahunan (FY).'}
              </span>
            </div>
            <div className="financial-summary">
              {(() => {
                const latestYoY0 = getYoYGrowth(finKeys[0], fin.length - 1);
                const compLabel0 = getCompPeriodLabel(fin.length - 1);
                const latestYoY1 = getYoYGrowth(finKeys[1], fin.length - 1);
                const compLabel1 = getCompPeriodLabel(fin.length - 1);

                return (
                  <>
                    <div>
                      <div className="fin-stat-label">{finLabels[0]}</div>
                      <div className="fin-stat-number mono">
                        Rp{fmt(Number(latestFin?.[finKeys[0]]) || 0, 2)}
                        <span style={{ fontSize: '15px', letterSpacing: 0 }}> T</span>
                      </div>
                      <div
                        className={`fin-stat-note ${
                          latestYoY0 !== null && latestYoY0 < 0 ? 'negative' : 'positive'
                        }`}
                      >
                        {latestYoY0 !== null ? `${latestYoY0 > 0 ? '+' : ''}${latestYoY0.toFixed(1)}%` : '0.0%'}{' '}
                        <span className="muted">
                          YoY vs {finTimeframe === 'annual' ? 'tahun sebelumnya' : 'kuartal sama tahun lalu'} {compLabel0 ? `(${compLabel0})` : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="fin-stat-label">{finLabels[1]}</div>
                      <div className="fin-stat-number mono">
                        Rp{fmt(Number(latestFin?.[finKeys[1]]) || 0, 2)}
                        <span style={{ fontSize: '15px', letterSpacing: 0 }}> T</span>
                      </div>
                      <div
                        className={`fin-stat-note ${
                          latestYoY1 !== null && latestYoY1 < 0 ? 'negative' : 'positive'
                        }`}
                      >
                        {latestYoY1 !== null ? `${latestYoY1 > 0 ? '+' : ''}${latestYoY1.toFixed(1)}%` : '0.0%'}{' '}
                        <span className="muted">
                          YoY vs {finTimeframe === 'annual' ? 'tahun sebelumnya' : 'kuartal sama tahun lalu'} {compLabel1 ? `(${compLabel1})` : ''}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}

              <svg
                className="fin-chart"
                viewBox={`0 0 ${Math.max(340, 24 + fin.length * 44)} 108`}
                role="img"
                aria-label="Grafik tren periode"
              >
                {fin.map((d: any, i: number) => {
                  const chartW = Math.max(340, 24 + fin.length * 44);
                  const step = (chartW - 28) / Math.max(1, fin.length);
                  const x = 14 + i * step;
                  return (
                    <g key={i}>
                      {finKeys.map((k, j) => {
                        const rawVal = Number(d[k]) || 0;
                        const hVal = Math.max(2, Math.min(68, (Math.abs(rawVal) / maxFinVal) * 66));
                        return (
                          <rect
                            key={j}
                            x={x + j * 13}
                            y={78 - hVal}
                            width="10"
                            height={hVal}
                            rx="2"
                            fill={rawVal < 0 ? '#d9534f' : j ? '#b8cde8' : '#1a62bf'}
                          />
                        );
                      })}
                      <text
                        x={x + 11}
                        y="96"
                        textAnchor="middle"
                        fill="#7b8998"
                        fontSize="8.5"
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
                    {fin.map((x: any, idx: number) => (
                      <th className="number" key={x.year}>
                        {x.year}
                        {idx === fin.length - 1 && (
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
                  {FIN_ROWS[finTab].map(([k, label, d, emphasis]) => {
                    const isGrowthCandidate = ['revenue', 'net', 'eps', 'assets', 'equity', 'cfo'].includes(k);
                    return (
                      <React.Fragment key={k}>
                        <tr className={emphasis ? 'emphasis' : ''}>
                          <td>{label}</td>
                          {fin.map((x: any) => {
                            const val = Number(x[k]) || 0;
                            return (
                              <td
                                className={`number ${val < 0 ? 'negative' : ''}`}
                                key={x.year}
                              >
                                {val < 0 ? `(${fmt(-val, d)})` : fmt(val, d)}
                              </td>
                            );
                          })}
                        </tr>
                        {showYoY && isGrowthCandidate && (
                          <tr className="yoy-row" style={{ background: 'rgba(0,0,0,0.018)', fontSize: '12px' }}>
                            <td style={{ paddingLeft: '22px', color: 'var(--text-muted, #64748b)' }}>
                              ↳ Pertumbuhan {label.split('(')[0].trim()} YoY
                            </td>
                            {fin.map((x: any, idx: number) => {
                              const yoy = getYoYGrowth(k, idx);
                              return (
                                <td
                                  className={`number ${yoy !== null && yoy < 0 ? 'negative' : yoy !== null && yoy > 0 ? 'positive' : ''}`}
                                  key={x.year}
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    color: yoy === null ? 'var(--text-muted, #94a3b8)' : yoy < 0 ? 'var(--red, #d9534f)' : 'var(--green, #2e7d32)'
                                  }}
                                >
                                  {yoy !== null ? `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-note">
              <span>
                {hasRealFin
                  ? `Data laporan keuangan ${finTimeframe === 'annual' ? 'tahunan fiskal (hingga 8 tahun)' : 'kuartalan (hingga 8 kuartal)'} resmi BEI (${fin[0]?.year}–${latestPeriodLabel}) tersimpan di SQLite DB.`
                  : 'Memuat laporan keuangan...'}
              </span>
              <button
                className="link-btn"
                onClick={() => onOpenDrawer('sources', { stock, companyDetail })}
              >
                Sumber &amp; jajaran manajemen <Icon name="arrow-up-right" cls="sm" />
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
                pe: stock.targetPe || stock.pe || 14,
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
            <h2>Aksi korporasi &amp; keterbukaan informasi ({stock.ticker})</h2>
            <p>
              Dokumen resmi Keterbukaan Informasi BEI yang tersimpan di database lokal.
            </p>
          </div>
          <select
            className="select"
            id="doc-filter"
            aria-label="Filter dokumen emiten"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
          >
            <option value="all">Semua dokumen ({activeDocs.length})</option>
            <option value="action">Keterbukaan informasi &amp; aksi</option>
            <option value="report">Laporan keuangan</option>
          </select>
        </div>

        <div className="card" id="disclosure-content">
          <div className="disclosure-list">
            {filteredDocs.map((d: any) => (
              <div className="disclosure-row" key={d.id}>
                <span className="doc-icon">
                  <Icon name="file" />
                </span>
                <div className="grow">
                  <div className="doc-title">{d.title}</div>
                  <div className="doc-meta">
                    <span>{d.displayDate}</span>
                    <span>·</span>
                    <span>{d.label}</span>
                    <span className={`pill ${d.isReal ? 'green' : 'outline'}`}>
                      {d.isReal ? 'Resmi BEI (PDF)' : 'Info'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn small-btn"
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      Buka PDF BEI <Icon name="arrow-up-right" cls="sm" />
                    </a>
                  )}
                  <button
                    className="link-btn"
                    onClick={() => onOpenDrawer('doc', { docItem: d, stock })}
                  >
                    Ringkasan <Icon name="arrow-up-right" cls="sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="table-note">
            <span>
              {realDisclosures.length > 0
                ? `Menampilkan ${filteredDocs.length} dokumen Keterbukaan Informasi resmi BEI untuk ${stock.ticker} (disimpan di SQLite DB lokal).`
                : `Memuat dokumen Keterbukaan Informasi BEI untuk ${stock.ticker}...`}
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
        </div> {/* End of .stockbit-main-content */}
      </div> {/* End of .stockbit-layout */}

      <Footer onOpenMethod={onOpenMethod} onOpenAbout={onOpenAbout} />
    </>
  );
};
