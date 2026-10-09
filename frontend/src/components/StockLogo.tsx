import React, { useState, useEffect } from 'react';
import { getStockLogoUrl } from '../utils';
import { TV_LOGOS } from '../constants';

interface StockLogoProps {
  ticker: string;
  mark?: string;
  color?: string;
  large?: boolean;
}

export const StockLogo: React.FC<StockLogoProps> = ({
  ticker,
  mark,
  color = 'var(--navy)',
  large = false,
}) => {
  const cleanTicker = (ticker || '').toUpperCase().trim();
  const displayMark = mark || cleanTicker.slice(0, 3);
  const [imgSrc, setImgSrc] = useState<string | null>(() => getStockLogoUrl(cleanTicker));
  const [fallbackStep, setFallbackStep] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(getStockLogoUrl(cleanTicker));
    setFallbackStep(0);
    setLoaded(false);
  }, [cleanTicker]);

  const handleError = () => {
    if (fallbackStep === 0) {
      // Step 1: Coba logo SVG lokal (/logo-emiten/)
      setFallbackStep(1);
      setImgSrc(`/logo-emiten/${cleanTicker}.svg`);
    } else if (fallbackStep === 1) {
      // Step 2: Coba TradingView jika ada pemetaan
      setFallbackStep(2);
      const tvId = TV_LOGOS[cleanTicker];
      if (tvId) {
        setImgSrc(`https://s3-symbol-logo.tradingview.com/${tvId}--big.svg`);
      } else {
        setImgSrc(`https://assets.stockbit.com/logos/companies/${cleanTicker}.png`);
      }
    } else if (fallbackStep === 2) {
      // Step 3: Coba Stockbit CDN
      setFallbackStep(3);
      setImgSrc(`https://assets.stockbit.com/logos/companies/${cleanTicker}.png`);
    } else {
      // Fallback terakhir: Sembunyikan gambar dan tampilkan teks monogram
      setImgSrc(null);
    }
  };

  return (
    <span
      className={`stock-logo ${large ? 'large' : ''}`}
      style={{ ['--logo-color' as any]: color }}
      title={`Logo ${cleanTicker}`}
      aria-label={`Logo ${cleanTicker}`}
    >
      <span className="stock-logo-text">{displayMark}</span>
      {imgSrc && (
        <img
          src={imgSrc}
          alt={cleanTicker}
          className="stock-logo-img"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </span>
  );
};
