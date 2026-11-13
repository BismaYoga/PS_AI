import React, { useState, useEffect } from 'react';
import { getStockLogoUrl } from '../utils';

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

  useEffect(() => {
    setImgSrc(getStockLogoUrl(cleanTicker));
    setFallbackStep(0);
  }, [cleanTicker]);

  const handleError = () => {
    // Multi-tier fallback cascade:
    // Step 0: /logos/{clean}.webp failed -> try /logos/{clean}.png
    // Step 1: /logos/{clean}.png failed -> try /logo-emiten/{clean}.svg
    // Step 2: /logo-emiten/{clean}.svg failed -> try invezgo icon
    // Step 3: invezgo icon failed -> try stockbit CDN
    // Step 4: All failed -> set null (show monogram text)
    if (fallbackStep === 0) {
      setFallbackStep(1);
      setImgSrc(`/logos/${cleanTicker}.png`);
    } else if (fallbackStep === 1) {
      setFallbackStep(2);
      setImgSrc(`/logo-emiten/${cleanTicker}.svg`);
    } else if (fallbackStep === 2) {
      setFallbackStep(3);
      setImgSrc(`https://storage.invezgo.com/icon/${cleanTicker}.png`);
    } else if (fallbackStep === 3) {
      setFallbackStep(4);
      setImgSrc(`https://assets.stockbit.com/logos/companies/${cleanTicker}.png`);
    } else {
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
          style={{ opacity: 1 }}
          loading="lazy"
          onError={handleError}
        />
      )}
    </span>
  );
};
