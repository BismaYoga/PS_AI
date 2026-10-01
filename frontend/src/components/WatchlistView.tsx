import React from 'react';
import { StockItem } from '../types';
import { Icon } from './Icon';
import { FundamentalSection } from './FundamentalSection';
import { Footer } from './Footer';

interface WatchlistViewProps {
  stocks: StockItem[];
  favorites: Set<string>;
  onToggleFavorite: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  onOpenMethod: () => void;
  onOpenAbout: () => void;
  onNavigateHome: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  stocks,
  favorites,
  onToggleFavorite,
  onSelectStock,
  onOpenMethod,
  onOpenAbout,
  onNavigateHome,
}) => {
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
        <span>Watchlist</span>
      </div>

      <div className="page-hero watch-hero">
        <div>
          <div className="eyebrow">PANTAU LEBIH TERARAH</div>
          <h1>Watchlist Anda.</h1>
          <p className="hero-subtitle">
            Simpan emiten yang ingin dipelajari, tanpa kehilangan konteks.
          </p>
        </div>
        <a
          href="#home"
          className="btn"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          Kembali ke beranda <Icon name="right" cls="sm" />
        </a>
      </div>

      <FundamentalSection
        stocks={stocks}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onSelectStock={onSelectStock}
        onOpenMethod={onOpenMethod}
        onlySaved={true}
      />

      <Footer onOpenMethod={onOpenMethod} onOpenAbout={onOpenAbout} />
    </>
  );
};
