import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Icon } from './Icon';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onNotify: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onNotify,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const cleanUser = username.trim().toLowerCase();

      if (!cleanUser) {
        setErrorMsg('Username atau email wajib diisi.');
        return;
      }
      if (!password || password.length < 4) {
        setErrorMsg('Password minimal 4 karakter.');
        return;
      }

      if (mode === 'login') {
        if (cleanUser === 'admin' && password === 'admin123') {
          const adminUser: UserProfile = {
            id: 'usr_admin',
            username: 'admin',
            name: 'Super Administrator',
            email: 'admin@pintarsaham.id',
            role: 'admin',
            tier: 'institutional',
            avatar: 'AD',
            createdAt: '2026-01-01',
          };
          onLoginSuccess(adminUser);
          onNotify('Berhasil login sebagai Super Admin! Akses Admin Console terbuka.');
          onClose();
        } else if (cleanUser === 'bisma' || cleanUser.includes('bisma')) {
          const proUser: UserProfile = {
            id: 'usr_bisma',
            username: 'bisma',
            name: 'Bisma Yoga',
            email: 'bismayoga432@gmail.com',
            role: 'user',
            tier: 'pro',
            avatar: 'BY',
            createdAt: '2026-02-15',
          };
          onLoginSuccess(proUser);
          onNotify('Selamat datang kembali, Bisma! Akun Pro Trader aktif.');
          onClose();
        } else {
          // Standard login
          const standardUser: UserProfile = {
            id: 'usr_' + Date.now().toString(36),
            username: cleanUser,
            name: cleanUser.toUpperCase(),
            email: `${cleanUser}@example.com`,
            role: 'user',
            tier: 'pro',
            avatar: cleanUser.slice(0, 2).toUpperCase(),
            createdAt: new Date().toISOString().slice(0, 10),
          };
          onLoginSuccess(standardUser);
          onNotify(`Selamat datang, ${cleanUser}! Berhasil masuk ke PintarSaham.`);
          onClose();
        }
      } else {
        // Register mode
        const newUser: UserProfile = {
          id: 'usr_' + Date.now().toString(36),
          username: cleanUser,
          name: name.trim() || cleanUser,
          email: email.trim() || `${cleanUser}@example.com`,
          role: 'user',
          tier: 'pro',
          avatar: (cleanUser[0] || 'U').toUpperCase(),
          createdAt: new Date().toISOString().slice(0, 10),
        };
        onLoginSuccess(newUser);
        onNotify(`Akun ${cleanUser} berhasil didaftarkan! Akses Pro diaktifkan.`);
        onClose();
      }
    }, 450);
  };

  const handleQuickDemo = (type: 'admin' | 'trader') => {
    if (type === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('bisma');
      setPassword('trader123');
    }
  };

  return (
    <div className="modal-layer open" style={{ zIndex: 160 }} onClick={onClose}>
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #ffffff)',
          color: 'var(--ink, #172738)',
          width: '92%',
          maxWidth: '430px',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--line, #e2e8f0)',
          margin: 'auto',
          position: 'relative',
        }}
      >
        <button
          className="icon-btn"
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px', borderRadius: '50%' }}
          aria-label="Tutup modal"
        >
          <Icon name="close" />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/logo-putih.png" alt="PintarSaham" style={{ height: '34px', background: 'var(--navy)', padding: '6px 14px', borderRadius: '8px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '12px' }}>
            {mode === 'login' ? 'Masuk ke PintarSaham' : 'Buat Akun Investor'}
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            {mode === 'login'
              ? 'Akses riset data pasar real-time, valuasi MOS & AI Trading Plan.'
              : 'Daftar sekarang untuk menyimpan watchlist dan personalisasi portofolio.'}
          </p>
        </div>

        {/* Tabs: Login / Register */}
        <div
          style={{
            display: 'flex',
            background: 'var(--soft, #f1f5f9)',
            borderRadius: '9px',
            padding: '3px',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: mode === 'login' ? 700 : 500,
              background: mode === 'login' ? 'var(--card-bg, #fff)' : 'transparent',
              color: mode === 'login' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: mode === 'register' ? 700 : 500,
              background: mode === 'register' ? 'var(--card-bg, #fff)' : 'transparent',
              color: mode === 'register' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            Daftar Akun
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              marginBottom: '14px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '5px' }}>
                NAMA LENGKAP
              </label>
              <input
                type="text"
                className="select"
                placeholder="cth. Bisma Yoga"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', fontSize: '12px', padding: '9px 12px' }}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '5px' }}>
              USERNAME / EMAIL
            </label>
            <input
              type="text"
              className="select"
              placeholder="Username atau alamat email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', fontSize: '12px', padding: '9px 12px' }}
              autoComplete="username"
              required
            />
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '5px' }}>
                ALAMAT EMAIL
              </label>
              <input
                type="email"
                className="select"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', fontSize: '12px', padding: '9px 12px' }}
                autoComplete="email"
                required
              />
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                PASSWORD
              </label>
              {mode === 'login' && (
                <span style={{ fontSize: '10px', color: 'var(--blue)', cursor: 'pointer' }}>
                  Lupa password?
                </span>
              )}
            </div>
            <input
              type="password"
              className="select"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', fontSize: '12px', padding: '9px 12px' }}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            style={{ width: '100%', padding: '11px', fontSize: '13px', fontWeight: 700, justifyContent: 'center' }}
          >
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun Baru'}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.8px', marginBottom: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Icon name="zap" cls="sm" style={{ color: '#eab308' }} /> AKUN DEMO CEPAT (KLIK UNTUK MENGISI)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn small-btn"
              onClick={() => handleQuickDemo('admin')}
              style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'center', gap: '5px' }}
            >
              <Icon name="crown" cls="sm" style={{ color: '#eab308' }} /> Super Admin
            </button>
            <button
              type="button"
              className="btn small-btn"
              onClick={() => handleQuickDemo('trader')}
              style={{ fontSize: '11px', padding: '6px 8px', justifyContent: 'center', gap: '5px' }}
            >
              <Icon name="star" cls="sm" style={{ color: '#38bdf8' }} /> Pro Trader (Bisma)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
