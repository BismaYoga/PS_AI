import { useState, useEffect, useCallback, useMemo } from 'react';
import { Route, StockItem, IndexItem, CorporateEvent, UserProfile } from './types';
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
import { ChatView } from './components/ChatView';
import { AdminView } from './components/AdminView';
import { LoginModal } from './components/LoginModal';
import { DrawerModal, DrawerPayload } from './components/DrawerModal';
import { Toast } from './components/Toast';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AIChatWidget } from './components/AIChatWidget';
import { WelcomeLoginView } from './components/WelcomeLoginView';
import { ContactAdminModal } from './components/ContactAdminModal';
import { isUserProOrAdmin } from './utils';

// Nilai acuan penutupan terakhir resmi BEI dari database lokal SQLite (mencegah loncatan angka lawas 6277 saat delay request awal)
const DEFAULT_IHSG_DATA = {
  ticker: 'IHSG',
  name: 'Indeks Harga Saham Gabungan',
  price: 5096.83,
  previousClose: 5057.05,
  change: 39.78,
  changePct: 0.79,
  date: '02 Nov 2026',
  rawDate: '2026-11-02',
  turnover: 'Rp12,42 T',
  volume: '34,6 miliar',
  gainers: 365,
  losers: 341,
  isLive: true,
};

export default function App() {
  // Theme state: dark / light
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ps-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ps-theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const defaultAdminUser: UserProfile = {
    id: 'usr_admin',
    username: 'admin',
    name: 'Super Administrator',
    email: 'admin@pintarsaham.id',
    role: 'super admin',
    tier: 'institutional',
    avatar: 'AD',
    createdAt: '2025-01-01',
    monthlyTokens: 100,
    additionalTokens: 50,
  };

  // User Authentication state
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ps-auth-user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.username || parsed.email)) return parsed;
      }
      return defaultAdminUser;
    } catch {
      return defaultAdminUser;
    }
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [proMonthlyTokens, setProMonthlyTokens] = useState<number>(30);

  useEffect(() => {
    fetch('/api/settings/contact')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.proMonthlyTokens !== undefined) {
          setProMonthlyTokens(Number(d.proMonthlyTokens));
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = useCallback((usr: UserProfile) => {
    setUser(usr);
    try {
      localStorage.setItem('ps-auth-user', JSON.stringify(usr));
    } catch {}
  }, []);

  // Handle Google OAuth callback from URL redirect params
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('login') === 'google') {
        const email = searchParams.get('email') || '';
        const name = searchParams.get('name') || email;
        const avatar = searchParams.get('avatar') || '';
        const role = (searchParams.get('role') || 'user') as any;
        const tier = (searchParams.get('tier') || 'starter') as any;
        const id = searchParams.get('id') || ('usr_g_' + Date.now().toString(36));
        const monthlyTokens = parseInt(searchParams.get('monthly_tokens') || '0', 10);
        const additionalTokens = parseInt(searchParams.get('additional_tokens') || '0', 10);

        const googleUser: UserProfile = {
          id,
          username: email.split('@')[0],
          name,
          email,
          role,
          tier,
          avatar: avatar || name.slice(0, 2).toUpperCase(),
          createdAt: new Date().toISOString().slice(0, 10),
          monthlyTokens,
          additionalTokens,
        };
        handleLoginSuccess(googleUser);
        setToastMessage(`Selamat datang, ${name}! Berhasil masuk via Akun Google.`);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      } else if (searchParams.get('auth_error')) {
        setToastMessage(`Gagal login Google: ${searchParams.get('auth_error')}`);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      }
    } catch (e) {
      console.warn('OAuth URL parse error:', e);
    }
  }, [handleLoginSuccess]);

  // Sync live user profile & tokens from database periodically or on load
  useEffect(() => {
    if (!user?.id && !user?.email) return;
    const fetchLiveProfile = async () => {
      try {
        const param = user.id ? `id=${encodeURIComponent(user.id)}` : `email=${encodeURIComponent(user.email)}`;
        const res = await fetch(`/api/user/profile?${param}`);
        if (res.ok) {
          const liveData = await res.json();
          setUser((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              role: liveData.role || prev.role,
              tier: liveData.tier || prev.tier,
              monthlyTokens: liveData.monthlyTokens !== undefined ? liveData.monthlyTokens : prev.monthlyTokens,
              additionalTokens: liveData.additionalTokens !== undefined ? liveData.additionalTokens : prev.additionalTokens,
            };
            localStorage.setItem('ps-auth-user', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (e) {
        console.warn('Sync profile error:', e);
      }
    };
    fetchLiveProfile();
  }, [user?.id, user?.email, proMonthlyTokens]);

  const handleUpdateTokens = useCallback((rem: { monthly?: number; additional?: number; total?: number }) => {
    if (!rem) return;
    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        monthlyTokens: rem.monthly !== undefined ? rem.monthly : prev.monthlyTokens,
        additionalTokens: rem.additional !== undefined ? rem.additional : prev.additionalTokens,
      };
      try {
        localStorage.setItem('ps-auth-user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('ps-auth-user');
    } catch {}
    setToastMessage('Anda telah keluar (logout).');
  }, []);

  // Parse initial route from URL hash
  const parseHash = (): { route: Route; ticker: string } => {
    const hash = window.location.hash || '#home';
    if (hash === '#chat') {
      return { route: 'chat', ticker: 'BBCA' };
    }
    if (hash === '#admin') {
      return { route: 'admin', ticker: 'BBCA' };
    }
    if (hash === '#stock' || hash.startsWith('#stock/')) {
      const t = hash.replace(/^#stock\/?/, '').trim().toUpperCase();
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

  // Market & Events data (dimuat dari cache lokal / data penutupan terakhir DB agar tidak ada loncatan angka lawas 6277)
  const [marketBundle, setMarketBundle] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('ps_market_bundle_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.IHSG && parsed.IHSG.price) {
          return parsed;
        }
      }
    } catch {}
    return { IHSG: DEFAULT_IHSG_DATA };
  });
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>(INITIAL_EVENTS);
  const [allEmitens, setAllEmitens] = useState<any[]>(INITIAL_EMITENS);

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

  // Keep window.MARKET_DATA synced with React state for chart utilities
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(marketBundle).length > 0) {
      (window as any).MARKET_DATA = marketBundle;
      if (marketBundle['IHSG']) {
        (window as any).IHSG_LIVE_DATA = marketBundle['IHSG'];
      }
    }
  }, [marketBundle]);

  const refreshSingleInstrument = useCallback(async (ticker: string, force: boolean = false) => {
    const clean = ticker.toUpperCase().trim();
    try {
      const authQuery = user ? `&user_id=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}` : '';
      const tsQuery = force ? `&_t=${Date.now()}` : '';
      const res = await fetch(
        `/api/stock?ticker=${encodeURIComponent(clean)}${force ? '&force=1' : ''}${authQuery}${tsQuery}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          setMarketBundle((prev) => {
            const next = { ...prev, [clean]: data };
            try {
              localStorage.setItem('ps_market_bundle_cache', JSON.stringify(next));
            } catch {}
            return next;
          });
          return true;
        }
      }
    } catch (err) {
      console.warn(`Live fetch failed for ${clean}:`, err);
    }
    return false;
  }, [user]);

  const refreshAllMarket = useCallback(async () => {
    notify('Memperbarui data fundamental & MOS seluruh emiten...');
    try {
      const authQuery = user ? `&user_id=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}` : '';
      const res = await fetch(`/api/market-data?refresh=1&_t=${Date.now()}${authQuery}`);
      if (res.ok) {
        const bundle = await res.json();
        if (bundle.market) {
          setMarketBundle(bundle.market);
          try {
            localStorage.setItem('ps_market_bundle_cache', JSON.stringify(bundle.market));
          } catch {}
        }
        if (bundle.events && bundle.events.length) setCorporateEvents(bundle.events);
        if (bundle.emitens && bundle.emitens.length) setAllEmitens(bundle.emitens);
        notify('Data fundamental & MOS berhasil diperbarui!');
        return;
      }
    } catch (err) {
      console.warn('Refresh all market data failed:', err);
    }
    notify('Gagal memperbarui data pasar');
  }, [notify, user]);

  // Fetch live market data bundle & complete 976 emitens catalog
  const [bundleLoaded, setBundleLoaded] = useState<boolean>(false);

  useEffect(() => {
    const loadMarketBundle = async () => {
      try {
        const res = await fetch('/api/market-data');
        if (res.ok) {
          const bundle = await res.json();
          if (bundle.market) {
            setMarketBundle(bundle.market);
            try {
              localStorage.setItem('ps_market_bundle_cache', JSON.stringify(bundle.market));
            } catch {}
          }
          if (bundle.events && bundle.events.length) setCorporateEvents(bundle.events);
          if (bundle.emitens && bundle.emitens.length) setAllEmitens(bundle.emitens);
          setBundleLoaded(true);
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
          if (bundle2.emitens && bundle2.emitens.length) setAllEmitens(bundle2.emitens);
        }
      } catch (err2) {
        console.warn('Static data load failed:', err2);
      }

      // Also ensure full emitens catalog is loaded
      try {
        const resE = await fetch('/data/emitens.json');
        if (resE.ok) {
          const emitensData = await resE.json();
          if (Array.isArray(emitensData) && emitensData.length > 0) {
            setAllEmitens(emitensData);
          }
        }
      } catch (e) {
        console.warn('Failed to load /data/emitens.json:', e);
      }
      setBundleLoaded(true);
    };
    loadMarketBundle();
  }, []);

  // On-demand live fetch via Invezgo API when user selects a stock that doesn't have full 1-year OHLC yet
  // Khusus Pro Trader / Admin: Akun Starter TIDAK memicu live fetch ke Invezgo API
  useEffect(() => {
    if (!bundleLoaded) return;
    const isPro = isUserProOrAdmin(user);
    if (!isPro) return;
    const targetTicker = route === 'stock' ? selectedStockTicker : activeInstrument;
    if (!targetTicker) return;
    const existing = marketBundle[targetTicker];
    if (!existing || !existing.ohlc || existing.ohlc.length < 2) {
      refreshSingleInstrument(targetTicker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleLoaded, route, selectedStockTicker, activeInstrument, user]);

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
    } else if (route === 'chat') {
      document.title = 'Chat AI — PintarSaham Intelligence';
    } else if (route === 'admin') {
      document.title = 'Admin Console — PintarSaham Intelligence';
    } else {
      document.title = 'Beranda — PintarSaham Intelligence';
    }
  }, [route, selectedStockTicker]);

  // Construct StockItems from complete emitens catalog and live market bundle
  const stocks: StockItem[] = useMemo(() => {
    return allEmitens.map((e) => {
      const p = PRESET_STOCKS[e.ticker] || {};
      const m = marketBundle[e.ticker] || null;
      const shortName = (e.name || e.ticker).replace(/^PT\s+/i, '').replace(/\s+Tbk$/i, '');

      return {
        ticker: e.ticker,
        name: e.name || e.ticker,
        short: shortName,
        sector: e.sector || 'Lainnya',
        subsector: e.subsector || e.sector || 'Umum',
        color: p.color || '#1a62bf',
        mark: p.mark || e.ticker.slice(0, 3),
        price: m ? m.price : 1000,
        change: m ? m.changePct : 0,
        eps: m && m.eps != null ? m.eps : null,
        bvps: m && m.bvps != null ? m.bvps : null,
        pe: m && m.pe != null ? m.pe : (m && m.targetPe != null ? m.targetPe : 12),
        targetPe: m && m.targetPe != null ? m.targetPe : 12,
        pb: m && m.pb != null ? m.pb : 1.5,
        roe: m && m.roe != null ? m.roe : null,
        dividendYield: m && m.dividendYield != null ? m.dividendYield : null,
        marketCap: m && m.marketCap != null ? m.marketCap : null,
        volume: m ? m.volume : '—',
        turnover: m ? m.turnover : '—',
        date: m ? m.date : null,
        isLive: !!(m && (m.ohlc || (m.source && String(m.source).includes('Invezgo')))),
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
  }, [allEmitens, marketBundle]);

  // Construct IndexItem (IHSG)
  const indexData: IndexItem = useMemo(() => {
    const live = marketBundle['IHSG'] || DEFAULT_IHSG_DATA;
    return {
      ticker: 'IHSG',
      name: 'Indeks Harga Saham Gabungan',
      price: live.price != null ? live.price : DEFAULT_IHSG_DATA.price,
      previousClose: live.previousClose != null ? live.previousClose : DEFAULT_IHSG_DATA.previousClose,
      change: live.changePct != null ? live.changePct : DEFAULT_IHSG_DATA.changePct,
      changeAbs: live.change != null ? live.change : DEFAULT_IHSG_DATA.change,
      date: live.date || DEFAULT_IHSG_DATA.date,
      turnover: live.turnover || DEFAULT_IHSG_DATA.turnover,
      volume: live.volume || DEFAULT_IHSG_DATA.volume,
      gainers: live.gainers != null ? live.gainers : DEFAULT_IHSG_DATA.gainers,
      losers: live.losers != null ? live.losers : DEFAULT_IHSG_DATA.losers,
      isLive: !!(live.ohlc && live.ohlc.length),
    };
  }, [marketBundle]);

  // Navigation handlers
  const handleNavigate = (newRoute: Route, ticker?: string) => {
    if (newRoute === 'stock') {
      const targetTicker = ticker || selectedStockTicker || 'BBCA';
      window.location.hash = `#stock/${targetTicker}`;
    } else if (newRoute === 'watchlist') {
      window.location.hash = '#watchlist';
    } else if (newRoute === 'chat') {
      window.location.hash = '#chat';
    } else if (newRoute === 'admin') {
      const isAdmin = user?.role === 'admin' || user?.role === 'super admin';
      if (!isAdmin) {
        notify('Akses Admin terbatas: Silakan masuk sebagai akun Admin atau Super Admin.');
        setLoginModalOpen(true);
        return;
      }
      window.location.hash = '#admin';
    } else {
      window.location.hash = '#home';
    }
  };

  // Guard admin route on logout or direct access
  useEffect(() => {
    const isAdmin = user?.role === 'admin' || user?.role === 'super admin';
    if (route === 'admin' && !isAdmin) {
      notify('Akses Admin memerlukan kredensial Admin atau Super Admin.');
      window.location.hash = '#home';
    }
  }, [route, user, notify]);

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
      {!user ? (
        <>
          {/* Welcome & Login 1-Page Experience for Non-Logged-in Visitors */}
          <WelcomeLoginView
            onLoginSuccess={handleLoginSuccess}
            onNotify={notify}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenContactAdmin={() => setContactModalOpen(true)}
          />

          <ContactAdminModal
            isOpen={contactModalOpen}
            onClose={() => setContactModalOpen(false)}
            user={null}
            featureTitle="Aktivasi Akun & Kuota Token"
          />
        </>
      ) : (
        <>
          {/* 1. Header */}
          <Header
            route={route}
            currentTicker={selectedStockTicker}
            watchlistCount={favorites.size}
            onNavigate={handleNavigate}
            stocks={stocks}
            onOpenDrawer={(type) => setDrawerPayload({ type })}
            theme={theme}
            onToggleTheme={toggleTheme}
            user={user}
            onOpenLogin={() => setLoginModalOpen(true)}
            onLogout={handleLogout}
            proMonthlyTokens={proMonthlyTokens}
          />

          {/* 2. Main Views */}
          <main id="app" className={`main ${route === 'chat' ? 'chat-page-main' : ''}`}>
            {route === 'admin' && (
              <AdminView
                currentUser={user}
                stocks={stocks}
                onNotify={notify}
                onNavigateHome={() => handleNavigate('home')}
                onUpdateProTokens={(val) => setProMonthlyTokens(val)}
              />
            )}

            {route === 'chat' && (
              <ChatView
                stocks={stocks}
                onSelectStock={(sym) => handleNavigate('stock', sym)}
                onNotify={notify}
                onNavigateHome={() => handleNavigate('home')}
                currentUser={user}
                onUpdateTokens={handleUpdateTokens}
                proMonthlyTokens={proMonthlyTokens}
              />
            )}

            {route === 'home' && (
              <HomeView
                indexData={indexData}
                stocks={stocks}
                events={corporateEvents}
                favorites={favorites}
                activeInstrument={activeInstrument}
                marketCache={marketBundle}
                onRefreshInstrument={(t) => refreshSingleInstrument(t, true)}
                onRefreshAll={refreshAllMarket}
                onSelectInstrument={(sym) => setActiveInstrument(sym)}
                onSelectStockDetail={(sym) => handleNavigate('stock', sym)}
                onToggleFavorite={handleToggleFavorite}
                onOpenDrawer={(type, payload) => setDrawerPayload({ type, ...payload })}
                onOpenNewsDrawer={(newsItem) => setDrawerPayload({ type: 'news', newsItem })}
                onOpenEventDrawer={(eventItem) => setDrawerPayload({ type: 'event', eventItem })}
                onOpenMethod={() => setDrawerPayload({ type: 'method' })}
                onOpenAbout={() => setDrawerPayload({ type: 'about' })}
                onNotify={notify}
                currentUser={user}
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
                stocks={stocks}
                onSelectStock={(sym) => handleNavigate('stock', sym)}
                favorites={favorites}
                marketCache={marketBundle}
                onRefreshInstrument={(t) => refreshSingleInstrument(t, true)}
                onToggleFavorite={handleToggleFavorite}
                onOpenDrawer={(type, payload) => setDrawerPayload({ type, ...payload })}
                onOpenNewsDrawer={(newsItem) => setDrawerPayload({ type: 'news', newsItem })}
                onOpenMethod={() => setDrawerPayload({ type: 'method' })}
                onOpenAbout={() => setDrawerPayload({ type: 'about' })}
                onNavigateHome={() => handleNavigate('home')}
                onNotify={notify}
                currentUser={user}
                onUpdateTokens={handleUpdateTokens}
                proMonthlyTokens={proMonthlyTokens}
              />
            )}
          </main>

          {/* 4. Mobile Bottom Navigation Bar */}
          <MobileBottomNav
            route={route}
            watchlistCount={favorites.size}
            onNavigate={handleNavigate}
            onOpenDrawer={(type) => setDrawerPayload({ type })}
          />

          {/* 5. Login Modal (if opened within session) */}
          <LoginModal
            isOpen={loginModalOpen}
            onClose={() => setLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
            onNotify={notify}
          />

          {/* 6. Slide-in Drawer Modal */}
          <DrawerModal
            payload={drawerPayload}
            onClose={() => setDrawerPayload(null)}
            onNavigateToStock={(ticker) => handleNavigate('stock', ticker)}
            onOpenMethod={() => setDrawerPayload({ type: 'method' })}
            onOpenWatchlist={() => handleNavigate('watchlist')}
          />

          {/* 7. AI Assistant Chatbot (Draggable, Pojok Kiri Bawah) */}
          <AIChatWidget currentUser={user} onUpdateTokens={handleUpdateTokens} proMonthlyTokens={proMonthlyTokens} />
        </>
      )}

      {/* Toast Notifications (Always rendered) */}
      <Toast message={toastMessage} />
    </div>
  );
}
