import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSearchSelect: (ticker: string) => void;
  tickers: string[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSearchSelect,
  tickers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [clock, setClock] = useState('');

  // Clock in WIB (UTC+7)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const wib = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
      const hours = String(wib.getHours()).padStart(2, '0');
      const mins = String(wib.getMinutes()).padStart(2, '0');
      const secs = String(wib.getSeconds()).padStart(2, '0');
      setClock(`${hours}:${mins}:${secs} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('header-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = tickers.filter(t => t.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
    setSuggestions(filtered);
  };

  const handleSelectTicker = (ticker: string) => {
    onSearchSelect(ticker);
    setSearchQuery('');
    setSuggestions([]);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-section">
          <img
            src="/logo-putih.png"
            alt="PintarSaham AI"
            className="brand-logo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/logo-putih.png';
            }}
          />
          <span className="brand-badge">2.0 AI PRO</span>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'fundamental' ? 'active' : ''}`}
            onClick={() => setActiveTab('fundamental')}
          >
            Fundamental & MOS
          </button>
          <button
            className={`nav-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Aksi Korporasi
          </button>
          <a
            href="/admin.html"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-btn"
            title="Buka Admin Console"
          >
            <ShieldAlert size={15} />
            Admin Console
          </a>
        </nav>

        <div className="header-right">
          <div className="header-search">
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)' }} />
            <input
              id="header-search-input"
              type="text"
              placeholder="Cari emiten (cth: BBCA)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
              style={{ paddingLeft: 32 }}
            />
            <span className="kbd-shortcut">/</span>

            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 6,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                zIndex: 60,
                overflow: 'hidden'
              }}>
                {suggestions.map((t) => (
                  <div
                    key={t}
                    onClick={() => handleSelectTicker(t)}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="market-clock">
            <div className="live-dot" />
            <span>{clock}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
