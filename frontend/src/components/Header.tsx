import React, { useState, useEffect, useRef } from 'react';
import { StockItem, Route } from '../types';
import { Icon } from './Icon';
import { StockLogo } from './StockLogo';
import { rp, pct } from '../utils';

interface HeaderProps {
  route: Route;
  watchlistCount: number;
  onNavigate: (route: Route, ticker?: string) => void;
  stocks: StockItem[];
  onOpenDrawer: (type: string, payload?: any) => void;
}

export const Header: React.FC<HeaderProps> = ({
  route,
  watchlistCount,
  onNavigate,
  stocks,
  onOpenDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            Beranda
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
            <div className="search-label">
              {cleanQuery ? 'HASIL PENCARIAN' : 'EMITEN CONTOH'} · DATA PASAR
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

        <button
          className="avatar"
          onClick={() => onOpenDrawer('about')}
          aria-label="Tentang preview ini"
        >
          PS
        </button>
      </div>
    </header>
  );
};
