import React, { useState } from 'react';
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
  const [imgSrc, setImgSrc] = useState<string | null>(getStockLogoUrl(cleanTicker));
  const [fallbackStep, setFallbackStep] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean>(false);

  const handleError = () => {
    if (fallbackStep === 0) {
      setFallbackStep(1);
      setImgSrc(`/logo-emiten/${cleanTicker}.svg`);
    } else if (fallbackStep === 1) {
      setFallbackStep(2);
      setImgSrc(`https://assets.stockbit.com/logos/companies/${cleanTicker}.png`);
    } else {
      setImgSrc(null); // remove img and reveal monogram text
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
