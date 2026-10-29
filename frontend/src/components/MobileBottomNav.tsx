import React from 'react';
import { Route } from '../types';
import { Icon } from './Icon';

interface MobileBottomNavProps {
  route: Route;
  watchlistCount: number;
  onNavigate: (route: Route, ticker?: string) => void;
  onOpenDrawer: (type: string, payload?: any) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  route,
  watchlistCount,
  onNavigate,
  onOpenDrawer,
}) => {
  const handleScrollTo = (sectionId: string) => {
    if (route !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi bawah mobile">
      <button
        type="button"
        className={`mobile-nav-item ${route === 'home' ? 'active' : ''}`}
        onClick={() => {
          onNavigate('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Beranda"
      >
        <Icon name="chart" cls="mobile-nav-icon" />
        <span>Beranda</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${route === 'stock' ? 'active' : ''}`}
        onClick={() => onNavigate('stock')}
        aria-label="Halaman Emiten & Watchlist"
      >
        <Icon name="candles" cls="mobile-nav-icon" />
        <span>Emiten</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${route === 'watchlist' ? 'active' : ''}`}
        onClick={() => onNavigate('watchlist')}
        aria-label="Watchlist"
      >
        <div className="mobile-nav-icon-wrap">
          <Icon name="star" cls="mobile-nav-icon" />
          {watchlistCount > 0 && (
            <span className="mobile-nav-badge">{watchlistCount}</span>
          )}
        </div>
        <span>Watchlist</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${route === 'compare' ? 'active' : ''}`}
        onClick={() => onNavigate('compare')}
        aria-label="Komparasi Saham Head-to-Head"
      >
        <Icon name="compare" cls="mobile-nav-icon" />
        <span>Bandingkan</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={() => handleScrollTo('fundamental')}
        aria-label="Valuasi Saham Margin of Safety"
      >
        <Icon name="coins" cls="mobile-nav-icon" />
        <span>Valuasi MOS</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={() => handleScrollTo('corporate')}
        aria-label="Kalender Aksi Korporasi"
      >
        <Icon name="calendar" cls="mobile-nav-icon" />
        <span>Kalender</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={() => onOpenDrawer('about')}
        aria-label="Tentang PintarSaham"
      >
        <Icon name="info" cls="mobile-nav-icon" />
        <span>Tentang</span>
      </button>
    </nav>
  );
};
