import { useState, useEffect, useCallback, useMemo } from 'react';
import { Route, StockItem, IndexItem, CorporateEvent } from './types';
import {
  PRESET_STOCKS,
  INITIAL_EMITENS,
  INITIAL_EVENTS,
} from './constants';
import { Header } from './components/Header';
import { DemoBar } from './components/DemoBar';
import { HomeView } from './components/HomeView';
import { WatchlistView } from './components/WatchlistView';
import { StockDetailView } from './components/StockDetailView';
import { DrawerModal, DrawerPayload } from './components/DrawerModal';
import { Toast } from './components/Toast';

export default function App() {
  // Parse initial route from URL hash
  const parseHash = (): { route: Route; ticker: string } => {
    const hash = window.location.hash || '#home';
    if (hash.startsWith('#stock/')) {
      const t = hash.replace('#stock/', '').trim().toUpperCase();
      return { route: 'stock', ticker: t || 'BBCA' };
    }
    if (hash === '#watchlist') {
      return { route: 'watchlist', ticker: 'BBCA' };
    }
    return { route: 'home', ticker: 'BBCA' };
  };

  const initialRouteInfo = parseHash();
  const [route, setRoute] = useState<Route>(initialRouteInfo.route);
  const [selectedStockTicker, setSelectedStockTicker] = useState<string>(
    initialRouteInfo.ticker
  );
  const [activeInstrument, setActiveInstrument] = useState<string>('IHSG');

  // Favorites state persisted to localStorage (matching legacy key 'ps-preview-watchlist')
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('ps-preview-watchlist') || '["BBCA","TLKM"]'
      );
      return new Set(Array.isArray(saved) ? saved : ['BBCA', 'TLKM']);
    } catch {
      return new Set(['BBCA', 'TLKM']);
    }
  });

  // Drawer & Toast states
  const [drawerPayload, setDrawerPayload] = useState<DrawerPayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Market & Events data
  const [marketBundle, setMarketBundle] = useState<Record<string, any>>({});
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>(INITIAL_EVENTS);

  // Toast notification helper
  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Fetch live market data bundle
  useEffect(() => {
    const loadMarketBundle = async () => {
      try {
        const res = await fetch('/api/market-data');
        if (res.ok) {
          const bundle = await res.json();
          if (bundle.market) setMarketBundle(bundle.market);
          if (bundle.events && bundle.events.length) setCorporateEvents(bundle.events);
          return;
        }
      } catch (err) {
        console.warn('API /api/market-data failed, trying static /data/market_data.json:', err);
      }

      // Static fallback
      try {
        const res2 = await fetch('/data/market_data.json');
        if (res2.ok) {
          const bundle2 = await res2.json();
          if (bundle2.market) setMarketBundle(bundle2.market);
          if (bundle2.events && bundle2.events.length) setCorporateEvents(bundle2.events);
        }
      } catch (err2) {
        console.warn('Static data load failed:', err2);
      }
    };
    loadMarketBundle();
  }, []);

  // Listen to hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const info = parseHash();
      setRoute(info.route);
      if (info.route === 'stock') {
        setSelectedStockTicker(info.ticker);
      }
      setDrawerPayload(null);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update document title
  useEffect(() => {
    if (route === 'stock') {
      document.title = `${selectedStockTicker} — PintarSaham Intelligence`;
    } else if (route === 'watchlist') {
      document.title = 'Watchlist — PintarSaham Intelligence';
    } else {
      document.title = 'Beranda — PintarSaham Intelligence';
    }
  }, [route, selectedStockTicker]);

  // Construct StockItems from initial emitens and live market bundle
  const stocks: StockItem[] = useMemo(() => {
    return INITIAL_EMITENS.map((e) => {
      const p = PRESET_STOCKS[e.ticker] || {};
      const m = marketBundle[e.ticker] || null;
      const shortName = e.name.replace(/^PT\s+/i, '').replace(/\s+Tbk$/i, '');

      return {
        ticker: e.ticker,
        name: e.name,
        short: shortName,
        sector: e.sector,
        subsector: e.subsector,
        color: p.color || '#1a62bf',
        mark: p.mark || e.ticker.slice(0, 3),
        price: m ? m.price : 1000,
        change: m ? m.changePct : 0,
        eps: m && m.eps != null ? m.eps : null,
        bvps: m && m.bvps != null ? m.bvps : null,
        pe: m && m.targetPe != null ? m.targetPe : 12,
        pb: m && m.pb != null ? m.pb : 1.5,
        roe: m && m.roe != null ? m.roe : null,
        dividendYield: m && m.dividendYield != null ? m.dividendYield : null,
        marketCap: m && m.marketCap != null ? m.marketCap : null,
        volume: m ? m.volume : '—',
        turnover: m ? m.turnover : '—',
        date: m ? m.date : null,
        isLive: !!(m && m.ohlc),
        shares: p.shares || 10.0,
        margin: p.margin || 0.15,
        equityRatio: p.equityRatio || 0.5,
        rev: p.rev || [
          ['Operasional Utama', 75],
          ['Jasa & Lainnya', 25],
        ],
        description:
          p.description ||
          `Profil emiten ${e.name} yang beroperasi di sektor ${e.sector}.`,
      };
    });
  }, [marketBundle]);

  // Construct IndexItem (IHSG)
  const indexData: IndexItem = useMemo(() => {
    const live = marketBundle['IHSG'] || {};
    return {
      ticker: 'IHSG',
      name: 'Indeks Harga Saham Gabungan',
      price: live.price != null ? live.price : 6277.62,
      previousClose: live.previousClose != null ? live.previousClose : 6384.77,
      change: live.changePct != null ? live.changePct : -1.68,
      changeAbs: live.change != null ? live.change : -107.15,
      date: live.date || '22 Sep 2026',
      turnover: live.turnover || 'Rp11,75 T',
      volume: live.volume || '18,4 miliar',
      gainers: live.gainers || 285,
      losers: live.losers || 264,
      isLive: !!(live.ohlc && live.ohlc.length),
    };
  }, [marketBundle]);

  // Navigation handlers
  const handleNavigate = (newRoute: Route, ticker?: string) => {
    if (newRoute === 'stock' && ticker) {
      window.location.hash = `#stock/${ticker}`;
    } else if (newRoute === 'watchlist') {
      window.location.hash = '#watchlist';
    } else {
      window.location.hash = '#home';
    }
  };

  // Watchlist toggle handler
  const handleToggleFavorite = (ticker: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const isSaved = next.has(ticker);
      if (isSaved) {
        next.delete(ticker);
        notify(`${ticker} dihapus dari watchlist`);
      } else {
        next.add(ticker);
        notify(`${ticker} ditambahkan ke watchlist`);
      }
      try {
        localStorage.setItem(
          'ps-preview-watchlist',
          JSON.stringify([...next])
        );
      } catch (e) {
        console.error('Failed to save watchlist to localStorage', e);
      }
      return next;
    });
  };

  // Current stock for detail view
  const currentStock = useMemo(() => {
    const found = stocks.find((s) => s.ticker === selectedStockTicker);
    if (found) return found;
    return (
      stocks[0] || {
        ticker: selectedStockTicker,
        name: `PT ${selectedStockTicker} Tbk`,
        short: selectedStockTicker,
        sector: 'Umum',
        subsector: 'Investasi',
        color: '#1a62bf',
        mark: selectedStockTicker.slice(0, 3),
        price: 1000,
        change: 0,
        eps: 100,
        bvps: 500,
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
      }
    );
  }, [stocks, selectedStockTicker]);

  return (
    <div className="app-root">
      {/* 1. Header (Identical 1:1, NO ADMIN LINK) */}
      <Header
        route={route}
        watchlistCount={favorites.size}
        onNavigate={handleNavigate}
        stocks={stocks}
        onOpenDrawer={(type) => setDrawerPayload({ type })}
      />

      {/* 2. Demo Bar */}
      <DemoBar onOpenAbout={() => setDrawerPayload({ type: 'about' })} />

      {/* 3. Main Views */}
      <main id="app" className="main">
        {route === 'home' && (
          <HomeView
            indexData={indexData}
            stocks={stocks}
            events={corporateEvents}
            favorites={favorites}
            activeInstrument={activeInstrument}
            onSelectInstrument={(sym) => setActiveInstrument(sym)}
            onSelectStockDetail={(sym) => handleNavigate('stock', sym)}
            onToggleFavorite={handleToggleFavorite}
            onOpenDrawer={(type, payload) => setDrawerPayload({ type, ...payload })}
            onOpenNewsDrawer={(newsItem) => setDrawerPayload({ type: 'news', newsItem })}
            onOpenEventDrawer={(eventItem) => setDrawerPayload({ type: 'event', eventItem })}
            onOpenMethod={() => setDrawerPayload({ type: 'method' })}
            onOpenAbout={() => setDrawerPayload({ type: 'about' })}
            onNotify={notify}
          />
        )}

        {route === 'watchlist' && (
          <WatchlistView
            stocks={stocks}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectStock={(sym) => handleNavigate('stock', sym)}
            onOpenMethod={() => setDrawerPayload({ type: 'method' })}
            onOpenAbout={() => setDrawerPayload({ type: 'about' })}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {route === 'stock' && (
          <StockDetailView
            stock={currentStock}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onOpenDrawer={(type, payload) => setDrawerPayload({ type, ...payload })}
            onOpenMethod={() => setDrawerPayload({ type: 'method' })}
            onOpenAbout={() => setDrawerPayload({ type: 'about' })}
            onNavigateHome={() => handleNavigate('home')}
            onNotify={notify}
          />
        )}
      </main>

      {/* 4. Slide-in Drawer Modal */}
      <DrawerModal
        payload={drawerPayload}
        onClose={() => setDrawerPayload(null)}
        onNavigateToStock={(ticker) => handleNavigate('stock', ticker)}
        onOpenMethod={() => setDrawerPayload({ type: 'method' })}
        onOpenWatchlist={() => handleNavigate('watchlist')}
      />

      {/* 5. Toast Notifications */}
      <Toast message={toastMessage} />
    </div>
  );
}
