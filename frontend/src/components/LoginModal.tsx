import React, { useState, useEffect } from 'react';
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
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [googleClientId, setGoogleClientId] = useState(
    '662334087321-41g1tqlsl372oapv5nl3dfo246s7aonl.apps.googleusercontent.com'
  );

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) return;
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Verifikasi login Google gagal.');
      }
      onLoginSuccess(data.user);
      onNotify(`Selamat datang, ${data.user.name}! Berhasil masuk via Akun Google.`);
      onClose();
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      setErrorMsg(err.message || 'Gagal login menggunakan akun Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const google = (window as any).google;
    if (google?.accounts?.id && googleClientId) {
      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (e) {
        console.warn('GIS init error:', e);
      }
    }
  }, [isOpen, googleClientId]);

  const handleGoogleClick = () => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          window.location.href = '/api/auth/google/login';
        }
      });
    } else {
      window.location.href = '/api/auth/google/login';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanUser = username.trim();

    if (!cleanUser) {
      setErrorMsg('Username atau email wajib diisi.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMsg('Password minimal 4 karakter.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/manual-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Username atau password salah.');
      }
      onLoginSuccess(data.user);
      onNotify(`Selamat datang kembali, ${data.user.name}!`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali kredensial Anda.');
    } finally {
      setLoading(false);
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
          <img
            src="/logo-putih.png"
            alt="PintarSaham"
            style={{ height: '34px', background: 'var(--navy)', padding: '6px 14px', borderRadius: '8px' }}
          />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '12px' }}>
            {tab === 'login' ? 'Masuk ke PintarSaham' : 'Daftar Akun Baru'}
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            {tab === 'login'
              ? 'Gunakan Akun Google resmi atau kredensial terdaftar untuk melanjutkan.'
              : 'Pendaftaran akun instan melalui verifikasi Akun Google.'}
          </p>
        </div>

        {/* Tab Selector: Masuk / Daftar Akun */}
        <div
          style={{
            display: 'flex',
            background: 'var(--soft, #f1f5f9)',
            borderRadius: '9px',
            padding: '4px',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: tab === 'login' ? 700 : 500,
              background: tab === 'login' ? 'var(--card-bg, #fff)' : 'transparent',
              color: tab === 'login' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: tab === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '7px',
              border: 'none',
              fontSize: '12px',
              fontWeight: tab === 'register' ? 700 : 500,
              background: tab === 'register' ? 'var(--card-bg, #fff)' : 'transparent',
              color: tab === 'register' ? 'var(--ink)' : 'var(--muted)',
              boxShadow: tab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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

        {/* ── TAB 1: MASUK (LOGIN) ── */}
        {tab === 'login' && (
          <div>
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleLoading}
              style={{
                width: '100%',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#1e293b',
                fontSize: '13px',
                fontWeight: 650,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                cursor: googleLoading ? 'wait' : 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9c0 1.45.347 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>{googleLoading ? 'Menghubungkan ke Google...' : 'Masuk dengan Google'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0 14px', color: 'var(--muted)', fontSize: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              <span style={{ padding: '0 8px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                atau kredensial manual
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 650, color: 'var(--muted)', marginBottom: '5px' }}>
                  USERNAME / EMAIL
                </label>
                <input
                  type="text"
                  className="select"
                  placeholder="Username atau email terdaftar"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', fontSize: '12.5px', padding: '9px 12px' }}
                  autoComplete="username"
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 650, color: 'var(--muted)', marginBottom: '5px' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  className="select"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', fontSize: '12.5px', padding: '9px 12px' }}
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
                {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 2: DAFTAR AKUN (GOOGLE AUTH ONLY) ── */}
        {tab === 'register' && (
          <div>
            <div
              style={{
                background: 'var(--soft, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '11.5px',
                lineHeight: 1.5,
                color: 'var(--muted)',
                marginBottom: '16px',
              }}
            >
              Pendaftaran akun baru saat ini dibuka eksklusif menggunakan <strong>Akun Google</strong> untuk verifikasi instan.
            </div>

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleLoading}
              style={{
                width: '100%',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#1e293b',
                fontSize: '13px',
                fontWeight: 650,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                cursor: googleLoading ? 'wait' : 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9c0 1.45.347 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>{googleLoading ? 'Menghubungkan ke Google...' : 'Daftar dengan Akun Google'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
