import React from 'react';
import { Icon } from './Icon';

interface DemoBarProps {
  onOpenAbout: () => void;
}

export const DemoBar: React.FC<DemoBarProps> = ({ onOpenAbout }) => {
  return (
    <div className="demo-bar">
      <div className="demo-inner">
        <span className="demo-tag">
          <i className="dot" style={{ background: '#10b981' }}></i> LIVE BEI · 900+ EMITEN
        </span>
        <span className="demo-desc-desktop">
          Data pasar resmi 900+ emiten BEI, laporan keuangan kuartalan, pemegang saham KSEI, berita pasar, dan dokumen keterbukaan informasi bursa.
        </span>
        <span className="demo-desc-mobile">
          Data Pasar Resmi Bursa Efek Indonesia (BEI)
        </span>
        <button className="link-btn demo-link-btn" onClick={onOpenAbout}>
          Info data <Icon name="arrow-up-right" cls="sm" />
        </button>
      </div>
    </div>
  );
};

