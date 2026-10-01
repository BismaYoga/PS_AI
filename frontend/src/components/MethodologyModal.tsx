import React from 'react';
import { X, BookOpen, CheckCircle } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen size={20} style={{ color: '#0e3465' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0e3465' }}>
              Metodologi Valuasi & Margin of Safety (MOS)
            </h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <section>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0e3465', marginBottom: 6 }}>
              1. Prinsip Margin of Safety (Benjamin Graham)
            </h4>
            <p>
              Margin of Safety (MOS) adalah selisih antara nilai intrinsik / harga wajar suatu saham dengan harga pasar saat ini. Semakin besar diskon harga pasar terhadap harga wajarnya, semakin tinggi potensi keuntungan investasi sekaligus semakin rendah risiko kerugian modal.
            </p>
          </section>

          <section style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0e3465', marginBottom: 8 }}>
              2. Rumus Matematis
            </h4>
            <div style={{ fontFamily: 'monospace', background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 8 }}>
              Harga Wajar = EPS (TTM) × Target PER Industri
            </div>
            <div style={{ fontFamily: 'monospace', background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1' }}>
              Margin of Safety (%) = ((Harga Wajar - Harga Pasar) / Harga Wajar) × 100%
            </div>
          </section>

          <section>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0e3465', marginBottom: 8 }}>
              3. Klasifikasi Zona MOS
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mos-badge mos-great">≥ 25%</span>
                <span><strong>Sangat Menarik</strong> — Saham undervalued dengan batas pengaman tinggi.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mos-badge mos-good">10% - 25%</span>
                <span><strong>Menarik</strong> — Memberikan risk-reward rasional untuk akumulasi bertahap.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mos-badge mos-fair">0% - 10%</span>
                <span><strong>Fair Value</strong> — Harga pasar mencerminkan kinerja fundamental saat ini.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mos-badge mos-over">&lt; 0%</span>
                <span><strong>Overvalued / Premium</strong> — Harga pasar berada di atas harga wajar historis.</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
