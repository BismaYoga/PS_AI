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
      setFallbackStep(1);
      // Fallback 1: Jika Stockbit CDN belum memiliki logo emiten ini, coba Invezgo icon
      if (!imgSrc?.includes('storage.invezgo.com')) {
        setImgSrc(`https://storage.invezgo.com/icon/${cleanTicker}.png`);
        return;
      }
    }
    // Fallback terakhir: Sembunyikan gambar dan tampilkan teks inisial monogram
    setImgSrc(null);
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
          loading="lazy"
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}
    </span>
  );
};
