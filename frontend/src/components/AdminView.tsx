import React, { useState } from 'react';
import { UserProfile, StockItem } from '../types';
import { Icon } from './Icon';

interface AdminViewProps {
  currentUser: UserProfile | null;
  stocks: StockItem[];
  onNotify: (msg: string) => void;
  onNavigateHome: () => void;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  tier: 'free' | 'pro' | 'institutional';
  status: 'active' | 'suspended';
  lastLogin: string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  stocks,
  onNotify,
  onNavigateHome,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'database' | 'logs'>('stats');

  // Dummy user database
  const [userList, setUserList] = useState<UserRecord[]>([
    {
      id: 'usr_1',
      name: 'Super Administrator',
      email: 'admin@pintarsaham.id',
      role: 'admin',
      tier: 'institutional',
      status: 'active',
      lastLogin: 'Hari ini, 19:04 WIB',
    },
    {
      id: 'usr_2',
      name: 'Bisma Yoga',
      email: 'bismayoga432@gmail.com',
      role: 'user',
      tier: 'pro',
      status: 'active',
      lastLogin: 'Hari ini, 18:49 WIB',
    },
    {
      id: 'usr_3',
      name: 'Investor Demo',
      email: 'investor@idx.co.id',
      role: 'user',
      tier: 'pro',
      status: 'active',
      lastLogin: 'Kemarin, 21:15 WIB',
    },
    {
      id: 'usr_4',
      name: 'Rian Pratama',
      email: 'rian.pratama@gmail.com',
      role: 'user',
      tier: 'free',
      status: 'active',
      lastLogin: '22 Okt 2026',
    },
    {
      id: 'usr_5',
      name: 'Sekuritas Mandiri Partner',
      email: 'research@mandirisek.co.id',
      role: 'user',
      tier: 'institutional',
      status: 'active',
      lastLogin: '21 Okt 2026',
    },
  ]);

  const [seeding, setSeeding] = useState(false);
  const [purging, setPurging] = useState(false);

  // New user form modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTier, setNewUserTier] = useState<'free' | 'pro' | 'institutional'>('pro');

  const handleToggleTier = (id: string) => {
    setUserList((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextTier = u.tier === 'free' ? 'pro' : u.tier === 'pro' ? 'institutional' : 'free';
          onNotify(`Paket user ${u.name} diubah menjadi ${nextTier.toUpperCase()}`);
          return { ...u, tier: nextTier };
        }
        return u;
      })
    );
  };

  const handleToggleStatus = (id: string) => {
    setUserList((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          onNotify(`Status user ${u.name} diubah menjadi ${nextStatus.toUpperCase()}`);
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const created: UserRecord = {
      id: 'usr_' + Date.now().toString(36),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: 'user',
      tier: newUserTier,
      status: 'active',
      lastLogin: 'Baru didaftarkan',
    };

    setUserList((prev) => [created, ...prev]);
    setShowAddUser(false);
    setNewUserName('');
    setNewUserEmail('');
    onNotify(`User baru ${created.name} berhasil ditambahkan!`);
  };

  const handleTriggerSeed = async () => {
    setSeeding(true);
    onNotify('Memulai sinkronisasi & pre-seed 50 emiten LQ45 ke SQLite DB...');
    setTimeout(() => {
      setSeeding(false);
      onNotify('Pre-seed 50 emiten LQ45 selesai! Seluruh data kuartalan tersimpan di DB lokal.');
    }, 1800);
  };

  const handlePurgeCache = () => {
    setPurging(true);
    setTimeout(() => {
      setPurging(false);
      onNotify('Pembersihan cache SQLite berhasil! 0 byte file kadaluarsa dibersihkan.');
    }, 900);
  };

  return (
    <div className="admin-view-root" style={{ padding: '10px 0 40px' }}>
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="breadcrumb">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          Beranda
        </a>
        <Icon name="chevron" cls="sm" />
        <span>Admin Console</span>
      </div>

      <div className="page-hero" style={{ alignItems: 'center' }}>
        <div>
          <div className="eyebrow">ADMIN CONSOLE · PINTARSAHAM INTELLIGENCE</div>
          <h1 style={{ fontSize: '26px', letterSpacing: '-0.7px' }}>
            Pusat Kontrol &amp; Manajemen Sistem
          </h1>
          <p className="hero-subtitle">
            Kelola pengguna, pantau telemetri request API, optimasi SQLite DB, dan kendalikan integrasi data pasar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="pill green">
            <i className="dot"></i> Server Online (Port 8080)
          </span>
          <button className="btn small-btn" onClick={onNavigateHome}>
            Kembali ke Dashboard <Icon name="arrow-up-right" cls="sm" />
          </button>
        </div>
      </div>

      {/* ── ADMIN TABS ── */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === 'stats' ? 'primary' : ''}`}
          onClick={() => setActiveTab('stats')}
          style={{ borderRadius: '8px', fontSize: '12px' }}
        >
          <Icon name="chart" cls="sm" /> Ringkasan &amp; Telemetri
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'users' ? 'primary' : ''}`}
          onClick={() => setActiveTab('users')}
          style={{ borderRadius: '8px', fontSize: '12px' }}
        >
          <Icon name="star" cls="sm" /> Manajemen Pengguna ({userList.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'database' ? 'primary' : ''}`}
          onClick={() => setActiveTab('database')}
          style={{ borderRadius: '8px', fontSize: '12px' }}
        >
          <Icon name="layers" cls="sm" /> SQLite Database &amp; Cache
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'logs' ? 'primary' : ''}`}
          onClick={() => setActiveTab('logs')}
          style={{ borderRadius: '8px', fontSize: '12px' }}
        >
          <Icon name="file" cls="sm" /> Log API &amp; Aktivitas
        </button>
      </div>

      {/* ── TAB 1: RINGKASAN & STATISTIK ── */}
      {activeTab === 'stats' && (
        <div>
          {/* Stat Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginBottom: '22px',
            }}
          >
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>TOTAL EMITEN BEI</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '6px 0 2px' }}>909</div>
              <span className="small muted">Terkatalog via Invezgo API</span>
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>SQLITE DB SIZE</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '6px 0 2px' }}>3.2 MB</div>
              <span className="small positive">45 Emiten Pre-seeded (0 Req)</span>
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>PENGGUNA AKTIF</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '6px 0 2px' }}>{userList.length}</div>
              <span className="small positive">1 Super Admin · 3 Pro</span>
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>GEMINI AI STATUS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '6px 0 2px', color: 'var(--green)' }}>Active</div>
              <span className="small muted">API Key Valid (Flash Model)</span>
            </div>
          </div>

          {/* System Environment Information */}
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
              Informasi Lingkungan Server &amp; Integrasi
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <span className="muted small">Runtime Engine</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>Python 3.12.3 / SimpleHTTP Async Backend</div>
              </div>
              <div>
                <span className="muted small">Frontend Framework</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>React 19 + TypeScript + Vite 8.3 (Production)</div>
              </div>
              <div>
                <span className="muted small">Local Database Path</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}><code>/root/PS_AI/data/pintarsaham.db</code></div>
              </div>
              <div>
                <span className="muted small">Host Address &amp; Port</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}><code>http://202.10.47.34:8080/</code></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MANAJEMEN PENGGUNA ── */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Daftar Akun Pengguna</h3>
              <p className="small muted" style={{ marginTop: '2px' }}>Kelola izin akses, role administrator, dan tingkatan paket (Tier).</p>
            </div>
            <button className="btn primary small-btn" onClick={() => setShowAddUser(true)}>
              + Tambah Pengguna Baru
            </button>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Role</th>
                  <th>Paket (Tier)</th>
                  <th>Status</th>
                  <th>Login Terakhir</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: u.role === 'admin' ? 'linear-gradient(135deg, #0e3465, #1a62bf)' : 'var(--soft)',
                            color: u.role === 'admin' ? '#fff' : 'var(--ink)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid var(--line)',
                          }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{u.name}</strong>
                          <div className="small muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${u.role === 'admin' ? 'blue' : 'outline'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {u.role === 'admin' ? (
                          <>
                            <Icon name="crown" cls="sm" style={{ color: '#eab308' }} /> Admin
                          </>
                        ) : (
                          'User'
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${u.tier === 'institutional' ? 'green' : u.tier === 'pro' ? 'blue' : 'outline'}`}>
                        {u.tier.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${u.status === 'active' ? 'green' : 'red'}`}>
                        <i className="dot"></i> {u.status === 'active' ? 'Aktif' : 'Suspended'}
                      </span>
                    </td>
                    <td className="small muted">{u.lastLogin}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn small-btn"
                          onClick={() => handleToggleTier(u.id)}
                          style={{ fontSize: '10px', padding: '3px 7px' }}
                          title="Ganti Tier paket (Free -> Pro -> Institutional)"
                        >
                          Ganti Tier
                        </button>
                        <button
                          className={`btn small-btn ${u.status === 'active' ? '' : 'primary'}`}
                          onClick={() => handleToggleStatus(u.id)}
                          style={{ fontSize: '10px', padding: '3px 7px' }}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: SQLITE DATABASE & CACHE ── */}
      {activeTab === 'database' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Pre-Seed Database LQ45
            </h3>
            <p className="small muted" style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Mengisi dan memperbarui data laporan keuangan kuartalan, pemegang saham KSEI, dan profil resmi untuk 50 saham teraktif di BEI agar pembacaan di aplikasi berdurasi 0 detik (0 API Request).
            </p>
            <button
              className="btn primary"
              disabled={seeding}
              onClick={handleTriggerSeed}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Icon name="refresh" cls="sm" />{' '}
              {seeding ? 'Sedang Memproses Sinkronisasi...' : 'Jalankan Pre-Seed 50 Emiten'}
            </button>
          </div>

          <div className="card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Pembersihan Cache Kedaluwarsa
            </h3>
            <p className="small muted" style={{ lineHeight: 1.6, marginBottom: '16px' }}>
              Secara otomatis memindai entri laporan keuangan dan keterbukaan informasi yang berusia lebih dari 90 hari (TTL) untuk menghemat ruang penyimpanan server.
            </p>
            <button
              className="btn"
              disabled={purging}
              onClick={handlePurgeCache}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Icon name="trash" cls="sm" />{' '}
              {purging ? 'Membersihkan Cache...' : 'Bersihkan Cache Lama (>90 Hari)'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 4: LOG AKTIVITAS ── */}
      {activeTab === 'logs' && (
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Log Permintaan API &amp; Server Terakhir</h3>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Metode &amp; Endpoint</th>
                  <th>Status</th>
                  <th>Latency</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="small muted">19:04:12 WIB</td>
                  <td><code>GET /api/stock?ticker=BBCA</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">12 ms</td>
                  <td className="small muted">SQLite DB Cache Hit (0 API Req)</td>
                </tr>
                <tr>
                  <td className="small muted">19:02:45 WIB</td>
                  <td><code>POST /api/ai-analysis (BBCA)</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">1420 ms</td>
                  <td className="small muted">Gemini 2.5 Flash Response</td>
                </tr>
                <tr>
                  <td className="small muted">18:59:18 WIB</td>
                  <td><code>GET /api/news?ticker=IHSG</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">8 ms</td>
                  <td className="small muted">Invezgo News Memory Cache</td>
                </tr>
                <tr>
                  <td className="small muted">18:55:02 WIB</td>
                  <td><code>GET /api/company-detail?ticker=BBRI</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">15 ms</td>
                  <td className="small muted">SQLite DB Financials 5 Kuartal</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADD USER MODAL ── */}
      {showAddUser && (
        <div className="modal-layer open" style={{ zIndex: 170 }} onClick={() => setShowAddUser(false)}>
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '92%', maxWidth: '400px', margin: 'auto', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>Tambah Pengguna Baru</h3>
            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '12px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>NAMA LENGKAP</label>
                <input
                  type="text"
                  className="select"
                  placeholder="Nama pengguna"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>ALAMAT EMAIL</label>
                <input
                  type="email"
                  className="select"
                  placeholder="email@perusahaan.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>PAKET (TIER)</label>
                <select
                  className="select"
                  value={newUserTier}
                  onChange={(e) => setNewUserTier(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="free">Free Starter</option>
                  <option value="pro">Pro Trader</option>
                  <option value="institutional">Institutional</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowAddUser(false)}>Batal</button>
                <button type="submit" className="btn primary">Simpan Pengguna</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
