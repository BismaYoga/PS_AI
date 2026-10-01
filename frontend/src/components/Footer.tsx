import React from 'react';

interface FooterProps {
  onOpenMethod: () => void;
  onOpenAbout: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenMethod,
  onOpenAbout,
}) => {
  return (
    <footer className="footer">
      <div>
        <div className="footer-brand">pintarsaham. intelligence</div>
        Data simulasi untuk preview antarmuka. Bukan rekomendasi beli atau jual.
      </div>
      <div className="footer-links">
        <button onClick={onOpenMethod}>Metodologi & asumsi</button>
        <button onClick={onOpenAbout}>Tentang preview</button>
      </div>
    </footer>
  );
};
