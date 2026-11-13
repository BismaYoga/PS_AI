import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Icon } from './Icon';

interface WelcomeLoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNotify: (msg: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenContactAdmin: () => void;
}

export const WelcomeLoginView: React.FC<WelcomeLoginViewProps> = ({
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
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      setErrorMsg(err.message || 'Gagal autentikasi menggunakan akun Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
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
  }, [googleClientId]);

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

  const handleManualSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali kredensial Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="welcome-page-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── TOP NAV BAR (WARNA BIRU) ── */}
      <header
        style={{
          height: '60px',
          background: '#0e3465',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(14, 52, 101, 0.15)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo-putih.png"
            alt="PintarSaham"
            style={{
              height: '34px',
              display: 'block',
            }}
          />
        </div>
      </header>

      {/* ── MAIN CENTERED LOGIN CONTAINER ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(14, 52, 101, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
            padding: '32px 28px',
          }}
        >
          {/* Header Title */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#0e3465',
                letterSpacing: '-0.5px',
                margin: 0,
              }}
            >
              {tab === 'login' ? 'Masuk ke PintarSaham' : 'Daftar Akun Baru'}
            </h2>
            <p
              style={{
                fontSize: '12.5px',
                color: '#64748b',
                marginTop: '6px',
                lineHeight: 1.5,
              }}
            >
              {tab === 'login'
                ? 'Pilih metode masuk untuk mengakses platform riset saham.'
                : 'Pendaftaran akun instan melalui verifikasi Akun Google.'}
            </p>
          </div>

          {/* Tab Selector: Masuk / Daftar Akun */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: '9px',
              padding: '4px',
              marginBottom: '22px',
            }}
          >
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(''); }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '7px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: tab === 'login' ? 700 : 500,
                background: tab === 'login' ? '#ffffff' : 'transparent',
                color: tab === 'login' ? '#0e3465' : '#64748b',
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
                padding: '8px 0',
                borderRadius: '7px',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: tab === 'register' ? 700 : 500,
                background: tab === 'register' ? '#ffffff' : 'transparent',
                color: tab === 'register' ? '#0e3465' : '#64748b',
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
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '18px',
                lineHeight: 1.45,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* ── TAB 1: MASUK (LOGIN) ── */}
          {tab === 'login' && (
            <div>
              {/* Single Clean Google Login Button */}
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
                  gap: '12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9px',
                  color: '#1e293b',
                  fontSize: '13.5px',
                  fontWeight: 650,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: googleLoading ? 'wait' : 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9c0 1.45.347 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                <span>{googleLoading ? 'Menghubungkan ke Google...' : 'Masuk dengan Google'}</span>
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '20px 0 16px',
                  color: '#94a3b8',
                  fontSize: '10.5px',
                }}
              >
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                <span
                  style={{
                    padding: '0 10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    fontWeight: 650,
                  }}
                >
                  atau kredensial manual
                </span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              </div>

              {/* Manual Credentials Form */}
              <form onSubmit={handleManualSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 650,
                      color: '#475569',
                      marginBottom: '6px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    USERNAME / EMAIL
                  </label>
                  <input
                    type="text"
                    className="select"
                    placeholder="Masukkan username atau email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      fontSize: '13px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                    autoComplete="username"
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 650,
                      color: '#475569',
                      marginBottom: '6px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    className="select"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      fontSize: '13px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                    }}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '44px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    justifyContent: 'center',
                    background: '#0e3465',
                    borderColor: '#0e3465',
                  }}
                >
                  <Icon name="check" cls="sm" /> {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
                </button>
              </form>
            </div>
          )}

          {/* ── TAB 2: DAFTAR AKUN (GOOGLE AUTH ONLY) ── */}
          {tab === 'register' && (
            <div>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  color: '#475569',
                  marginBottom: '20px',
                }}
              >
                Pendaftaran akun PintarSaham diproses secara eksklusif menggunakan <strong>Akun Google</strong> untuk memastikan keaslian email dan verifikasi akun yang aman.
              </div>

              {/* Single Clean Google Register Button */}
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
                  gap: '12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '9px',
                  color: '#1e293b',
                  fontSize: '13.5px',
                  fontWeight: 650,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  cursor: googleLoading ? 'wait' : 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9c0 1.45.347 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                <span>{googleLoading ? 'Menghubungkan ke Google...' : 'Daftar dengan Akun Google'}</span>
              </button>

              <div
                style={{
                  marginTop: '16px',
                  fontSize: '11px',
                  color: '#64748b',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Akun baru akan langsung aktif secara otomatis setelah berhasil login melalui Google.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b',
          background: '#ffffff',
        }}
      >
        © 2026 PintarSaham. Platform Riset &amp; Analisis Saham Terpadu.
      </footer>
    </div>
  );
};
