import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Icon } from './Icon';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  featureTitle?: string;
}

export const ContactAdminModal: React.FC<ContactAdminModalProps> = ({
  isOpen,
  onClose,
  user,
  featureTitle,
}) => {
  const [contactInfo, setContactInfo] = useState<{
    whatsapp: string;
    whatsappDisplay: string;
    email: string;
    waMessageTemplate: string;
    proMonthlyTokens: number;
  }>({
    whatsapp: '6281234567890',
    whatsappDisplay: '+62 812-3456-7890',
    email: 'admin@pintarsaham.id',
    waMessageTemplate: '',
    proMonthlyTokens: 30,
  });

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings/contact')
      .then((r) => r.json())
      .then((d) => {
        if (d && d.whatsapp) {
          setContactInfo({
            whatsapp: d.whatsapp,
            whatsappDisplay: d.whatsappDisplay || d.whatsapp,
            email: d.email || 'admin@pintarsaham.id',
            waMessageTemplate: d.waMessageTemplate || '',
            proMonthlyTokens: d.proMonthlyTokens !== undefined ? Number(d.proMonthlyTokens) : 30,
          });
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const adminWa = contactInfo.whatsapp.replace(/[^0-9]/g, '');
  const adminWaDisplay = contactInfo.whatsappDisplay;
  const adminEmail = contactInfo.email;
  const proQuota = contactInfo.proMonthlyTokens;

  const userEmail = user?.email || 'tamu';
  const userName = user?.name || 'Investor';
  const monthlyTokens = user?.monthlyTokens ?? (user?.tier === 'pro' ? proQuota : (user?.tier === 'institutional' ? 100 : 0));
  const addTokens = user?.additionalTokens || 0;

  const template = contactInfo.waMessageTemplate || 
    `Halo Admin PintarSaham, saya ingin menambah token / upgrade akun ke Pro Trader.\nNama: {name}\nEmail: {email}\nFitur: {feature}`;

  const messageText = encodeURIComponent(
    template
      .replace('{name}', userName)
      .replace('{email}', userEmail)
      .replace('{feature}', featureTitle || 'Akses AI & Kuota Token')
  );

  const waUrl = `https://wa.me/${adminWa}?text=${messageText}`;

  const copyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      alert(`${label} berhasil disalin ke clipboard!`);
    } catch {
      // fallback
    }
  };

  return (
    <div className="modal-layer open" style={{ zIndex: 180 }} onClick={onClose}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '92%',
          maxWidth: '460px',
          margin: 'auto',
          padding: '26px',
          borderRadius: '20px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--line)',
          background: 'var(--card-bg, #ffffff)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0e3465, #0284c7)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Icon name="sparkles" cls="sm" style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Tambah Token &amp; Upgrade
              </h3>
              <p className="small muted" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                Akses Kuota AI &amp; Layanan Pro Trader
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn small-btn"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', padding: '6px', color: 'var(--muted)', cursor: 'pointer' }}
          >
            <Icon name="close" cls="sm" />
          </button>
        </div>

        {/* Feature Notice if triggered by locked feature */}
        {featureTitle && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Icon name="lock" cls="sm" style={{ color: '#d97706', flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.4 }}>
              Fitur <strong>{featureTitle}</strong> membutuhkan kuota token aktif atau status <strong>Pro Trader</strong>.
            </div>
          </div>
        )}

        {/* Current User Status Box */}
        <div
          style={{
            background: 'var(--soft, #f8fafc)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="small muted" style={{ fontWeight: 600 }}>STATUS AKUN SAAT INI</span>
            <span className={`pill ${user?.tier === 'pro' || user?.tier === 'institutional' ? 'green' : 'gray'}`} style={{ fontSize: '10px' }}>
              {user?.tier ? user.tier.toUpperCase() : 'STARTER (FREE)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
            <div style={{ background: 'var(--card-bg, #fff)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div className="small muted" style={{ fontSize: '10.5px' }}>Kuota Bulanan</div>
              <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px', color: monthlyTokens > 0 ? 'var(--primary)' : 'var(--muted)' }}>
                {monthlyTokens} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)' }}>/ {user?.tier === 'pro' ? proQuota : (user?.tier === 'institutional' ? 100 : 0)}</span>
              </div>
            </div>

            <div style={{ background: 'var(--card-bg, #fff)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div className="small muted" style={{ fontSize: '10.5px' }}>Token Tambahan</div>
              <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px', color: addTokens > 0 ? '#10b981' : 'var(--muted)' }}>
                +{addTokens} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--muted)' }}>token</span>
              </div>
            </div>
          </div>

          <div className="small muted" style={{ marginTop: '10px', fontSize: '11px', lineHeight: 1.5 }}>
            {user?.tier === 'starter' || !user?.tier || user?.tier === 'free' ? (
              <span>Pengguna <strong>Starter</strong> memiliki 0 token AI dan tidak dapat melakukan refresh data live. Beralih ke <strong>Pro Trader</strong> untuk mendapatkan {proQuota} token/bulan.</span>
            ) : (
              <span>Kuota bulanan di-reset otomatis setiap bulan. Token tambahan diisi manual oleh administrator.</span>
            )}
          </div>
        </div>

        {/* Benefits list */}
        <div style={{ marginBottom: '20px' }}>
          <div className="small muted" style={{ fontWeight: 650, marginBottom: '8px' }}>KEUNTUNGAN PRO TRADER:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
              <span><strong>{proQuota} Token AI Setiap Bulan</strong> untuk riset emiten &amp; konsultasi</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
              <span><strong>On-Demand Real-Time Refresh</strong> data emiten BEI langsung dari bursa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
              <span><strong>Insight Keuangan Kuantitatif Otomatis</strong> &amp; Valuasi MOS Multi-Skenario</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              background: '#25D366',
              borderColor: '#25D366',
              color: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
            }}
          >
            Hubungi Admin via WhatsApp
          </a>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => copyToClipboard(adminWaDisplay, 'Nomor WhatsApp Admin')}
              style={{ fontSize: '11px', justifyContent: 'center' }}
            >
              Salin No. WhatsApp
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => copyToClipboard(adminEmail, 'Email Support Admin')}
              style={{ fontSize: '11px', justifyContent: 'center' }}
            >
              Salin Email Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
