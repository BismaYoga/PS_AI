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
          <i className="dot" style={{ background: '#0e6945' }}></i> LIVE INVEZGO API + SQLITE DB
        </span>
        <span>
          Data pasar 909 emiten BEI, laporan keuangan kuartalan, pemegang saham KSEI, berita &amp; keterbukaan informasi tersimpan di DB lokal untuk hemat request API.
        </span>
        <button className="link-btn" onClick={onOpenAbout}>
          Tentang data <Icon name="arrow-up-right" cls="sm" />
        </button>
      </div>
    </div>
  );
};

