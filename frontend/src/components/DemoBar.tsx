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
          <i className="dot"></i> PREVIEW INTERAKTIF
        </span>
        <span>Seluruh angka, profil, berita, dan agenda adalah simulasi.</span>
        <button className="link-btn" onClick={onOpenAbout}>
          Tentang data <Icon name="arrow-up-right" cls="sm" />
        </button>
      </div>
    </div>
  );
};
