import React, { useState, useEffect, useRef } from 'react';
import { StockItem, Route, UserProfile } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { rp, pct } from '../utils';

interface HeaderProps {
  route: Route;
  currentTicker?: string;
  watchlistCount: number;
  onNavigate: (route: Route, ticker?: string) => void;
  stocks: StockItem[];
  onOpenDrawer: (type: string, payload?: any) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenCompare?: () => void;
  user?: UserProfile | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  route,
  currentTicker = 'BBCA',
  watchlistCount,
  onNavigate,
  stocks,
  onOpenDrawer,
  theme = 'light',
  onToggleTheme,
  onOpenCompare,
  user,
  onOpenLogin,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem('ps-recent-searches') || '["BBCA","BBRI","TLKM"]');
      return Array.isArray(s) ? s : ['BBCA', 'BBRI', 'TLKM'];
    } catch {
      return ['BBCA', 'BBRI', 'TLKM'];
    }
  });

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveRecentSearch = (ticker: string) => {
    setRecentSearches((prev) => {
      const updated = [ticker, ...prev.filter((t) => t !== ticker)].slice(0, 6);
      try {
        localStorage.setItem('ps-recent-searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const hotTickers = ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'BBNI', 'ICBP'];

  const cleanQuery = searchQuery.trim().toLowerCase();
  const searchMatches = stocks.filter((s) => {
    if (!cleanQuery) return true;
    return `${s.ticker} ${s.name} ${s.short}`.toLowerCase().includes(cleanQuery);
  });

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      if (searchMatches.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % searchMatches.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      if (searchMatches.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchMatches[selectedIndex]) {
        const selected = searchMatches[selectedIndex];
        onNavigate('stock', selected.ticker);
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelectStock = (ticker: string) => {
    saveRecentSearch(ticker);
    onNavigate('stock', ticker);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  return (
    <header className="app-header">
      <div className="header-inner">
        <a
          className="brand"
          href="#home"
          aria-label="PintarSaham, kembali ke beranda"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
        >
          <img src="/logo-putih.png" alt="PintarSaham" className="brand-logo-img" />
        </a>

        <nav className="nav" aria-label="Navigasi utama">
          <a
            href="#home"
            id="nav-home"
            className={route === 'home' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
          >
            Dashboard
          </a>
          <a
            href={`#stock/${currentTicker}`}
            id="nav-stock"
            className={route === 'stock' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('stock', currentTicker);
            }}
          >
            Emiten
          </a>
          <a
            href="#watchlist"
            id="nav-watchlist"
            className={route === 'watchlist' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('watchlist');
            }}
          >
            Watchlist <span className="nav-count" id="watch-count">{watchlistCount}</span>
          </a>
          <a
            href="#compare"
            id="nav-compare"
            className={route === 'compare' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              onNavigate('compare');
            }}
          >
            Bandingkan
          </a>
          {user?.role === 'admin' && (
            <a
              href="#admin"
              id="nav-admin"
              className={route === 'admin' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                onNavigate('admin');
              }}
              style={{
                color: '#fde047',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name="crown" cls="sm" style={{ color: '#fde047' }} /> Admin
            </a>
          )}
        </nav>

        <div className="search-wrap" id="search-wrap" ref={searchWrapRef}>
          <div className="search-bar">
            <span id="search-icon">
              <Icon name="search" cls="sm" />
            </span>
            <label className="sr-only" htmlFor="stock-search">
              Cari nama atau kode emiten
            </label>
            <input
              ref={inputRef}
              id="stock-search"
              type="search"
              autoComplete="off"
              placeholder="Cari nama atau kode emiten..."
              role="combobox"
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-expanded={isOpen}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleInputKeyDown}
            />
            <kbd className="shortcut">/</kbd>
          </div>

          <div
            className={`search-results ${isOpen ? 'open' : ''}`}
            id="search-results"
            role="listbox"
            aria-label="Hasil pencarian emiten"
          >
            {!cleanQuery && (
              <div style={{ padding: '12px 14px 6px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon name="flame" cls="sm" style={{ color: '#ef4444' }} /> SAHAM POPULER (HOT TICKERS)
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {hotTickers.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="btn small-btn"
                      onClick={() => handleSelectStock(t)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '6px',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {recentSearches.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="clock" cls="sm" /> PENCARIAN TERAKHIR
                      </span>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setRecentSearches([]);
                          localStorage.removeItem('ps-recent-searches');
                        }}
                        style={{ fontSize: '10px', color: 'var(--muted)' }}
                      >
                        Hapus
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {recentSearches.map((r) => (
                        <button
                          key={r}
                          type="button"
                          className="btn small-btn"
                          onClick={() => handleSelectStock(r)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            color: 'var(--navy)',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="search-label">
              {cleanQuery ? 'HASIL PENCARIAN' : 'SEMUA EMITEN'} · DATA PASAR
            </div>
            {searchMatches.length ? (
              searchMatches.slice(0, 15).map((s, i) => (
                <div
                  key={s.ticker}
                  className={`search-result ${i === selectedIndex ? 'selected' : ''}`}
                  role="option"
                  aria-selected={i === selectedIndex}
                  id={`result-${i}`}
                  onClick={() => handleSelectStock(s.ticker)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <StockLogo ticker={s.ticker} mark={s.mark} color={s.color} />
                  <div>
                    <strong>{s.ticker}</strong>
                    <span className="result-name">{s.short}</span>
                  </div>
                  <div className="quote">
                    {rp(s.price)}
                    <div className={`tiny ${s.change >= 0 ? 'positive' : 'negative'}`}>
                      {pct(s.change, 2)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="search-empty">
                Emiten tidak ditemukan. Coba BBCA, BBRI, BMRI, TLKM, ASII, ICBP, atau MIKA.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleTheme && (
            <button
              className="icon-btn theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
              title={theme === 'dark' ? 'Mode Gelap (klik untuk Mode Terang)' : 'Mode Terang (klik untuk Mode Gelap)'}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                borderRadius: '50%',
              }}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} cls="sm" />
            </button>
          )}

          {user ? (
            <div className="user-menu-wrap" ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="avatar"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  background: user.role === 'admin' ? 'linear-gradient(135deg, #eab308, #ca8a04)' : 'rgba(255, 255, 255, 0.2)',
                  borderColor: user.role === 'admin' ? '#fde047' : 'rgba(255, 255, 255, 0.35)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
                title={`Akun: ${user.name} (${user.tier.toUpperCase()})`}
              >
                {user.avatar || user.name.slice(0, 2).toUpperCase()}
              </button>

              {userDropdownOpen && (
                <div
                  className="user-dropdown-panel"
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '220px',
                    background: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--line, #e2e8f0)',
                    borderRadius: '12px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                    padding: '12px',
                    zIndex: 100,
                    color: 'var(--ink, #172738)',
                  }}
                >
                  <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--line)', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{user.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{user.email}</div>
                    <span
                      className={`pill ${user.tier === 'institutional' ? 'green' : 'blue'}`}
                      style={{ fontSize: '9px', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {user.role === 'admin' ? (
                        <>
                          <Icon name="crown" cls="sm" /> SUPER ADMIN
                        </>
                      ) : (
                        <>
                          <Icon name="star" cls="sm" /> {user.tier.toUpperCase()} INVESTOR
                        </>
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={() => {
                        onNavigate('home');
                        setUserDropdownOpen(false);
                      }}
                      style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px' }}
                    >
                      <Icon name="chart" cls="sm" /> Dashboard
                    </button>
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={() => {
                        onNavigate('stock', currentTicker);
                        setUserDropdownOpen(false);
                      }}
                      style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px' }}
                    >
                      <Icon name="candles" cls="sm" /> Halaman Emiten
                    </button>
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={() => {
                        onNavigate('watchlist');
                        setUserDropdownOpen(false);
                      }}
                      style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px' }}
                    >
                      <Icon name="star" cls="sm" /> Watchlist
                    </button>
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={() => {
                        onNavigate('compare');
                        setUserDropdownOpen(false);
                      }}
                      style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px' }}
                    >
                      <Icon name="compare" cls="sm" /> Bandingkan
                    </button>
                    {user.role === 'admin' && (
                      <button
                        type="button"
                        className="btn small-btn"
                        onClick={() => {
                          onNavigate('admin');
                          setUserDropdownOpen(false);
                        }}
                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px', color: '#b45309', fontWeight: 650 }}
                      >
                        <Icon name="crown" cls="sm" /> Admin Console
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={() => {
                        onOpenDrawer('about');
                        setUserDropdownOpen(false);
                      }}
                      style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px' }}
                    >
                      <Icon name="info" cls="sm" /> Tentang Data
                    </button>
                    <button
                      type="button"
                      className="btn small-btn"
                      onClick={() => {
                        if (onLogout) onLogout();
                        setUserDropdownOpen(false);
                      }}
                      style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '6px 8px', color: 'var(--red)' }}
                    >
                      <Icon name="close" cls="sm" /> Keluar (Logout)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {onOpenLogin && (
                <button
                  type="button"
                  className="btn small-btn"
                  onClick={onOpenLogin}
                  style={{
                    background: 'rgba(255, 255, 255, 0.16)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 650,
                    padding: '5px 12px',
                    borderRadius: '8px',
                  }}
                >
                  Masuk
                </button>
              )}
              <button
                className="avatar"
                onClick={() => onOpenDrawer('about')}
                aria-label="Tentang preview ini"
              >
                PS
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
