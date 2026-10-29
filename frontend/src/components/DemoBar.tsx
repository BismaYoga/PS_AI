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
          <i className="dot" style={{ background: '#10b981' }}></i> LIVE INVEZGO · 909 EMITEN
        </span>
        <span className="demo-desc-desktop">
          Data pasar 909 emiten BEI, laporan keuangan kuartalan, pemegang saham KSEI, berita &amp; keterbukaan informasi tersimpan di DB lokal untuk hemat request API.
        </span>
        <span className="demo-desc-mobile">
          Data Pasar BEI &amp; SQLite DB Lokal
        </span>
        <button className="link-btn demo-link-btn" onClick={onOpenAbout}>
          Info data <Icon name="arrow-up-right" cls="sm" />
        </button>
      </div>
    </div>
  );
};

