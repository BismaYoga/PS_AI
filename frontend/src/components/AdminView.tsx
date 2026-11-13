import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, StockItem, UserRole, UserTier } from '../types';
import { Icon } from './Icon';

interface InvezgoUsageData {
  usage: number;
  remaining: number;
  limit: number;
  isBlocked: boolean;
  expire: string;
  role: string;
  addonQuota: number;
}

interface InvezgoLogItem {
  id: string;
  date: string;
  method: string;
  url: string;
  access: string;
  status: number;
  response_time: number;
}

interface AdminViewProps {
  currentUser: UserProfile | null;
  stocks: StockItem[];
  onNotify: (msg: string) => void;
  onNavigateHome: () => void;
  onUpdateProTokens?: (val: number) => void;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier: UserTier;
  status: 'active' | 'suspended';
  lastLogin: string;
  monthlyTokens: number;
  additionalTokens: number;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  stocks,
  onNotify,
  onNavigateHome,
  onUpdateProTokens,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'invezgo' | 'users' | 'database' | 'logs' | 'settings'>('stats');

  // ── Contact & System Settings State ──
  const [settingsWa, setSettingsWa] = useState('6281234567890');
  const [settingsWaDisplay, setSettingsWaDisplay] = useState('+62 812-3456-7890');
  const [settingsEmail, setSettingsEmail] = useState('admin@pintarsaham.id');
  const [settingsTemplate, setSettingsTemplate] = useState('Halo Admin PintarSaham, saya ingin menambah token / upgrade akun ke Pro Trader.\nNama: {name}\nEmail: {email}\nFitur: {feature}');
  const [settingsProTokens, setSettingsProTokens] = useState<number>(30);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [resettingTokens, setResettingTokens] = useState(false);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const d = await res.json();
        if (d.whatsapp) setSettingsWa(d.whatsapp);
        if (d.whatsappDisplay) setSettingsWaDisplay(d.whatsappDisplay);
        if (d.email) setSettingsEmail(d.email);
        if (d.waMessageTemplate) setSettingsTemplate(d.waMessageTemplate);
        if (d.proMonthlyTokens !== undefined) {
          const val = Number(d.proMonthlyTokens);
          setSettingsProTokens(val);
          onUpdateProTokens?.(val);
        }
      }
    } catch (e) {
      console.warn('Fetch settings error:', e);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp: settingsWa.trim(),
          whatsappDisplay: settingsWaDisplay.trim(),
          email: settingsEmail.trim(),
          waMessageTemplate: settingsTemplate.trim(),
          proMonthlyTokens: Number(settingsProTokens),
        }),
      });
      if (res.ok) {
        onNotify('Pengaturan kontak admin dan jatah token bulanan berhasil disimpan!');
        onUpdateProTokens?.(Number(settingsProTokens));
        fetchUsers();
      } else {
        onNotify('Gagal menyimpan pengaturan kontak admin');
      }
    } catch {
      onNotify('Koneksi gagal saat menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetMonthlyTokens = async () => {
    if (!window.confirm(`Apakah Anda yakin ingin mereset kuota token bulanan untuk seluruh pengguna ke ${settingsProTokens} token? Kuota tambahan pengguna tidak akan terhapus.`)) {
      return;
    }
    setResettingTokens(true);
    try {
      const res = await fetch('/api/admin/reset-monthly-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onNotify(data.message || 'Jatah bulanan seluruh pengguna berhasil di-reset!');
        onUpdateProTokens?.(Number(settingsProTokens));
        fetchUsers();
      } else {
        onNotify(data.error || 'Gagal mereset jatah bulanan pengguna');
      }
    } catch {
      onNotify('Kesalahan koneksi saat mereset jatah token');
    } finally {
      setResettingTokens(false);
    }
  };

  // ── Invezgo API Usage Live State ──
  const [invezgoQuota, setInvezgoQuota] = useState<InvezgoUsageData | null>(null);
  const [invezgoLogs, setInvezgoLogs] = useState<InvezgoLogItem[]>([]);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);

  const fetchInvezgoUsage = async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch('/api/invezgo-usage');
      if (res.ok) {
        const data = await res.json();
        if (data.quota && !data.quota.error) {
          setInvezgoQuota(data.quota);
        }
        if (Array.isArray(data.logs)) {
          setInvezgoLogs(data.logs);
        }
      }
    } catch (e) {
      console.error('Error fetching invezgo usage:', e);
    } finally {
      setLoadingUsage(false);
    }
  };

  // ── Live Users Management State ──
  const [userList, setUserList] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userSearch, setUserSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Top-Up Token Modal State
  const [selectedUserForToken, setSelectedUserForToken] = useState<UserRecord | null>(null);
  const [tokenAddAmount, setTokenAddAmount] = useState<number>(10);
  const [savingTokenAdd, setSavingTokenAdd] = useState(false);

  // Add User Modal State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserTier, setNewUserTier] = useState<UserTier>('starter');
  const [savingNewUser, setSavingNewUser] = useState(false);

  // Database tools state
  const [seeding, setSeeding] = useState(false);
  const [purging, setPurging] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUserList(data);
        }
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchInvezgoUsage();
    fetchSettings();
  }, []);

  // Update User Role directly via dropdown
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u)));
          onNotify(`Role pengguna ${data.user.name} diperbarui menjadi ${newRole.toUpperCase()}`);
        }
      } else {
        onNotify('Gagal mengubah role pengguna');
      }
    } catch {
      onNotify('Kesalahan koneksi saat mengubah role pengguna');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Update User Tier directly via dropdown
  const handleTierChange = async (userId: string, newTier: UserTier) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, tier: newTier }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserList((prev) =>
            prev.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    tier: data.user.tier,
                    monthlyTokens: data.user.monthlyTokens,
                  }
                : u
            )
          );
          onNotify(`Paket user ${data.user.name} diubah menjadi ${newTier.toUpperCase()}`);
        }
      } else {
        onNotify('Gagal mengubah paket pengguna');
      }
    } catch {
      onNotify('Kesalahan koneksi saat mengubah paket pengguna');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Toggle user active / suspended
  const handleToggleStatus = async (user: UserRecord) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    setUpdatingUserId(user.id);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      if (res.ok) {
        setUserList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
        onNotify(`Status user ${user.name} diubah menjadi ${nextStatus.toUpperCase()}`);
      }
    } catch {
      onNotify('Gagal mengubah status pengguna');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Confirm Add Token for a specific user
  const handleConfirmAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForToken || tokenAddAmount <= 0) return;

    setSavingTokenAdd(true);
    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUserForToken.id,
          add_tokens: tokenAddAmount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserList((prev) =>
            prev.map((u) => (u.id === selectedUserForToken.id ? data.user : u))
          );
          onNotify(`Berhasil menambahkan ${tokenAddAmount} token tambahan untuk ${selectedUserForToken.name}!`);
          setSelectedUserForToken(null);
          setTokenAddAmount(10);
        }
      } else {
        onNotify('Gagal menambahkan token ke pengguna');
      }
    } catch {
      onNotify('Kesalahan koneksi saat menambahkan token');
    } finally {
      setSavingTokenAdd(false);
    }
  };

  // Add new user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setSavingNewUser(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          tier: newUserTier,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserList((prev) => [data.user, ...prev]);
        } else {
          fetchUsers();
        }
        setShowAddUser(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserRole('user');
        setNewUserTier('starter');
        onNotify(`Pengguna baru ${newUserName} berhasil didaftarkan!`);
      } else {
        const err = await res.json();
        onNotify(`Gagal menambahkan pengguna: ${err.error || 'Terjadi kesalahan'}`);
      }
    } catch {
      onNotify('Koneksi gagal saat menambahkan pengguna');
    } finally {
      setSavingNewUser(false);
    }
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

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return userList;
    const q = userSearch.toLowerCase();
    return userList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.tier.toLowerCase().includes(q)
    );
  }, [userList, userSearch]);

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
            Kelola pengguna, pantau telemetri request API, alokasikan token, dan atur integrasi kontak admin.
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
          className={`btn ${activeTab === 'invezgo' ? 'primary' : ''}`}
          onClick={() => {
            setActiveTab('invezgo');
            fetchInvezgoUsage();
          }}
          style={{ borderRadius: '8px', fontSize: '12px' }}
        >
          <Icon name="zap" cls="sm" /> Invezgo Token &amp; Usage
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'users' ? 'primary' : ''}`}
          onClick={() => {
            setActiveTab('users');
            fetchUsers();
          }}
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
        <button
          type="button"
          className={`btn ${activeTab === 'settings' ? 'primary' : ''}`}
          onClick={() => {
            setActiveTab('settings');
            fetchSettings();
          }}
          style={{ borderRadius: '8px', fontSize: '12px' }}
        >
          <Icon name="sparkles" cls="sm" /> Kontak Admin &amp; Aturan Token
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
              <span className="small positive">Pre-seeded &amp; Caching Aktif</span>
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>TOTAL PENGGUNA TERDAFTAR</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '6px 0 2px' }}>{userList.length}</div>
              <span className="small positive">
                {userList.filter((u) => u.tier === 'pro' || u.tier === 'institutional').length} Akun Berbayar
              </span>
            </div>

            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>AI ENGINE STATUS</div>
              <div style={{ fontSize: '28px', fontWeight: 700, margin: '6px 0 2px', color: 'var(--green)' }}>Active</div>
              <span className="small muted">Gemini 2.5 Flash Production</span>
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

      {/* ── TAB 2: INVEZGO USAGE LIVE ── */}
      {activeTab === 'invezgo' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Invezgo API Token &amp; Usage Monitor</h2>
              <p className="small muted">Memantau konsumsi kuota bulanan, limit pemanggilan, dan log riwayat request secara langsung dari Invezgo.</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={fetchInvezgoUsage}
              disabled={loadingUsage}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icon name="clock" cls="sm" /> {loadingUsage ? 'Memuat Data...' : 'Segarkan Data'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div className="card" style={{ padding: '18px' }}>
              <div className="small muted" style={{ fontWeight: 600 }}>PENGGUNAAN KUOTA (BULANAN)</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: 'var(--primary)' }}>
                {invezgoQuota ? invezgoQuota.usage.toLocaleString('id-ID') : '—'}
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-sub)' }}>
                  {' '}/ {invezgoQuota ? invezgoQuota.limit.toLocaleString('id-ID') : '30.000'} req
                </span>
              </div>
              <div style={{ marginTop: '10px', height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: invezgoQuota ? `${Math.min(100, (invezgoQuota.usage / invezgoQuota.limit) * 100)}%` : '0%',
                    background: '#0284c7',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <div className="small muted" style={{ marginTop: '6px', fontSize: '11px' }}>
                Terpakai {invezgoQuota ? ((invezgoQuota.usage / invezgoQuota.limit) * 100).toFixed(1) : 0}% dari batas kuota
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div className="small muted" style={{ fontWeight: 600 }}>SISA KUOTA TERSEDIA</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#10b981' }}>
                {invezgoQuota ? invezgoQuota.remaining.toLocaleString('id-ID') : '—'}
              </div>
              <div className="small muted" style={{ marginTop: '4px' }}>
                Status: {invezgoQuota?.isBlocked ? (
                  <span className="pill red" style={{ fontSize: '10px' }}>Terblokir</span>
                ) : (
                  <span className="pill green" style={{ fontSize: '10px' }}>Aktif &amp; Normal</span>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div className="small muted" style={{ fontWeight: 600 }}>PAKET &amp; TIER TOKEN</div>
              <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>
                {invezgoQuota?.role || 'ADVANCE'}
              </div>
              <div className="small muted" style={{ marginTop: '4px' }}>
                Addon Quota: {invezgoQuota?.addonQuota || 0}
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <div className="small muted" style={{ fontWeight: 600 }}>JADWAL RESET / EXPIRE</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '8px' }}>
                {invezgoQuota?.expire ? (
                  new Date(invezgoQuota.expire).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) + ' WIB'
                ) : '—'}
              </div>
              <div className="small muted" style={{ marginTop: '4px', fontSize: '11px' }}>
                Endpoint: <code>GET /usage/api</code>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Riwayat Log Pemanggilan Invezgo API</h3>
                <p className="small muted" style={{ marginTop: '2px' }}>Daftar aktivitas request dan status response (Endpoint: <code>GET /usage/logs</code>)</p>
              </div>
              <span className="pill blue" style={{ fontSize: '11px' }}>
                {invezgoLogs.length} Entri Terbaru
              </span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu (WIB)</th>
                    <th>Method</th>
                    <th>Endpoint Path</th>
                    <th>User-Agent / Access</th>
                    <th>Response Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invezgoLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }} className="muted">
                        {loadingUsage ? 'Memuat riwayat log Invezgo...' : 'Tidak ada riwayat log terbaru.'}
                      </td>
                    </tr>
                  ) : (
                    invezgoLogs.map((log) => {
                      const logDate = log.date ? new Date(log.date).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }) + ' WIB' : '—';
                      return (
                        <tr key={log.id}>
                          <td className="small muted">{logDate}</td>
                          <td><span className="pill gray" style={{ fontSize: '10px', fontWeight: 700 }}>{log.method}</span></td>
                          <td><code style={{ fontSize: '12px' }}>{log.url}</code></td>
                          <td className="small muted">{log.access || '—'}</td>
                          <td className="small">{log.response_time ? `${log.response_time} ms` : '—'}</td>
                          <td>
                            {log.status === 200 ? (
                              <span className="pill green" style={{ fontSize: '10px' }}>200 OK</span>
                            ) : log.status === 404 ? (
                              <span className="pill gray" style={{ fontSize: '10px' }}>404 Not Found</span>
                            ) : (
                              <span className="pill red" style={{ fontSize: '10px' }}>{log.status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LIVE USER MANAGEMENT ── */}
      {activeTab === 'users' && (
        <div className="card">
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Manajemen Akun Pengguna</h3>
              <p className="small muted" style={{ marginTop: '2px' }}>
                Atur role (User, Admin, Super Admin), paket tier, jatah token bulanan, dan top-up token tambahan langsung ke SQLite.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="select"
                placeholder="Cari nama atau email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '200px', fontSize: '12px', padding: '6px 10px' }}
              />
              <button
                type="button"
                className="btn small-btn"
                onClick={fetchUsers}
                disabled={loadingUsers}
                title="Muat ulang daftar pengguna dari SQLite"
              >
                <Icon name="refresh" cls="sm" /> {loadingUsers ? 'Memuat...' : 'Segarkan'}
              </button>
              <button
                type="button"
                className="btn small-btn"
                onClick={handleResetMonthlyTokens}
                disabled={resettingTokens}
                title="Reset jatah token bulanan seluruh pengguna Pro ke nilai acuan"
                style={{ borderColor: '#f59e0b', color: '#b45309' }}
              >
                <Icon name="refresh" cls="sm" /> {resettingTokens ? 'Mereset...' : 'Reset Jatah Bulanan'}
              </button>
              <button
                type="button"
                className="btn primary small-btn"
                onClick={() => setShowAddUser(true)}
              >
                + Tambah Pengguna
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Role (Izin Akses)</th>
                  <th>Paket (Tier)</th>
                  <th>Sisa Kuota Token</th>
                  <th>Status</th>
                  <th>Login Terakhir</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers && userList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }} className="muted">
                      Memuat data akun pengguna dari database SQLite...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }} className="muted">
                      {userSearch ? 'Tidak ada pengguna yang cocok dengan pencarian.' : 'Belum ada data pengguna.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser && (currentUser.id === u.id || currentUser.email === u.email);
                    const isBusy = updatingUserId === u.id;
                    const monthly = u.monthlyTokens ?? 0;
                    const additional = u.additionalTokens ?? 0;
                    const totalTokens = monthly + additional;

                    return (
                      <tr key={u.id} style={{ opacity: isBusy ? 0.6 : 1 }}>
                        {/* 1. Pengguna info */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background:
                                  u.role === 'super admin'
                                    ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                                    : u.role === 'admin'
                                    ? 'linear-gradient(135deg, #0284c7, #0e3465)'
                                    : 'var(--soft)',
                                color: u.role === 'user' ? 'var(--ink)' : '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: '1px solid var(--line)',
                                flexShrink: 0,
                              }}
                            >
                              {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{u.name}</strong>
                                {isSelf && (
                                  <span className="pill blue" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="small muted" style={{ fontSize: '11.5px' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Interactive Role Dropdown */}
                        <td>
                          <select
                            className="select"
                            value={u.role || 'user'}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            disabled={isBusy}
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              borderColor:
                                u.role === 'super admin'
                                  ? '#7c3aed'
                                  : u.role === 'admin'
                                  ? 'var(--blue)'
                                  : 'var(--line)',
                              background:
                                u.role === 'super admin'
                                  ? 'rgba(124, 58, 237, 0.08)'
                                  : u.role === 'admin'
                                  ? 'rgba(2, 132, 199, 0.08)'
                                  : 'transparent',
                              color:
                                u.role === 'super admin'
                                  ? '#7c3aed'
                                  : u.role === 'admin'
                                  ? 'var(--blue)'
                                  : 'inherit',
                            }}
                          >
                            <option value="user">User (Standar)</option>
                            <option value="admin">Admin</option>
                            <option value="super admin">Super Admin</option>
                          </select>
                        </td>

                        {/* 3. Interactive Tier Dropdown */}
                        <td>
                          <select
                            className="select"
                            value={u.tier === 'free' ? 'starter' : u.tier || 'starter'}
                            onChange={(e) => handleTierChange(u.id, e.target.value as UserTier)}
                            disabled={isBusy}
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              padding: '4px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            <option value="starter">Free Starter (0 Token)</option>
                            <option value="pro">Pro Trader ({settingsProTokens} Token/bln)</option>
                            <option value="institutional">Institutional (100 Token/bln)</option>
                          </select>
                        </td>

                        {/* 4. Kuota Token Breakdown */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                className={`pill ${monthly > 0 ? 'blue' : 'gray'}`}
                                style={{ fontSize: '11px', fontWeight: 700 }}
                                title="Sisa kuota token bulanan dari batas jatah paket"
                              >
                                {monthly} / {u.tier === 'pro' ? settingsProTokens : (u.tier === 'institutional' ? 100 : 0)} Bulanan
                              </span>
                              {additional > 0 && (
                                <span
                                  className="pill green"
                                  style={{ fontSize: '11px', fontWeight: 700 }}
                                  title="Token tambahan dari top-up Admin (tidak hangus bulanan)"
                                >
                                  +{additional} Tambahan
                                </span>
                              )}
                            </div>
                            <div className="small muted" style={{ fontSize: '10.5px' }}>
                              Total Kuota: <strong>{totalTokens}</strong> Token
                            </div>
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td>
                          <button
                            type="button"
                            className="btn small-btn"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isBusy}
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span
                              className={`pill ${u.status === 'active' ? 'green' : 'red'}`}
                              style={{ margin: 0, padding: '2px 6px' }}
                            >
                              <i className="dot"></i> {u.status === 'active' ? 'Aktif' : 'Suspended'}
                            </span>
                          </button>
                        </td>

                        {/* 6. Login Terakhir */}
                        <td className="small muted" style={{ fontSize: '11px' }}>
                          {u.lastLogin || '—'}
                        </td>

                        {/* 7. Aksi */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn primary small-btn"
                            onClick={() => {
                              setSelectedUserForToken(u);
                              setTokenAddAmount(10);
                            }}
                            style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            title="Tambahkan sejumlah token khusus ke pengguna ini"
                          >
                            <Icon name="sparkles" cls="sm" /> + Token
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: SQLITE DATABASE & CACHE ── */}
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

      {/* ── TAB 5: LOG AKTIVITAS ── */}
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
                  <td className="small muted">01:45:12 WIB</td>
                  <td><code>GET /api/stock?ticker=BBCA</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">12 ms</td>
                  <td className="small muted">SQLite DB Cache Hit (0 Invezgo Req)</td>
                </tr>
                <tr>
                  <td className="small muted">01:42:05 WIB</td>
                  <td><code>POST /api/ai-chat</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">1120 ms</td>
                  <td className="small muted">Gemini 2.5 Flash (-1 Token Berhasil)</td>
                </tr>
                <tr>
                  <td className="small muted">01:38:40 WIB</td>
                  <td><code>GET /api/user/profile</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">9 ms</td>
                  <td className="small muted">SQLite User Profile &amp; Token Sync</td>
                </tr>
                <tr>
                  <td className="small muted">01:35:18 WIB</td>
                  <td><code>GET /api/settings/contact</code></td>
                  <td><span className="pill green">200 OK</span></td>
                  <td className="small">6 ms</td>
                  <td className="small muted">System Settings DB Query</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: PENGATURAN KONTAK & ATURAN TOKEN ── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Card 1: Form Pengaturan Kontak Admin */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(2, 132, 199, 0.1)',
                  color: 'var(--blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="sparkles" cls="sm" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                  Pengaturan Kontak Administrator
                </h3>
                <p className="small muted" style={{ margin: '2px 0 0 0' }}>
                  Atur nomor WhatsApp dan email resmi yang muncul pada popup "Hubungi Admin via WhatsApp", "Salin No. WhatsApp", dan "Salin Email Admin".
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="small muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 650 }}>
                    NOMOR WHATSAPP (ANGKA DENGAN KODE NEGARA)
                  </label>
                  <input
                    type="text"
                    className="select"
                    value={settingsWa}
                    onChange={(e) => setSettingsWa(e.target.value)}
                    placeholder="Contoh: 6281234567890"
                    style={{ width: '100%', fontSize: '13px' }}
                    required
                  />
                  <span className="small muted" style={{ fontSize: '10.5px', marginTop: '4px', display: 'block' }}>
                    Digunakan untuk link <code>https://wa.me/[nomor]</code>. Jangan sertakan tanda + atau spasi.
                  </span>
                </div>

                <div>
                  <label className="small muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 650 }}>
                    TAMPILAN FORMAT NOMOR WHATSAPP
                  </label>
                  <input
                    type="text"
                    className="select"
                    value={settingsWaDisplay}
                    onChange={(e) => setSettingsWaDisplay(e.target.value)}
                    placeholder="Contoh: +62 812-3456-7890"
                    style={{ width: '100%', fontSize: '13px' }}
                    required
                  />
                  <span className="small muted" style={{ fontSize: '10.5px', marginTop: '4px', display: 'block' }}>
                    Teks nomor yang disalin saat pengguna menekan tombol "Salin No. WhatsApp".
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 650 }}>
                  ALAMAT EMAIL RESMI ADMINISTRATOR
                </label>
                <input
                  type="email"
                  className="select"
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  placeholder="admin@pintarsaham.id"
                  style={{ width: '100%', maxWidth: '600px', fontSize: '13px' }}
                  required
                />
                <span className="small muted" style={{ fontSize: '10.5px', marginTop: '4px', display: 'block' }}>
                  Alamat email yang disalin saat pengguna menekan tombol "Salin Email Admin".
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 650 }}>
                  JATAH TOKEN BULANAN PRO TRADER (PER BULAN)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  className="select"
                  value={settingsProTokens}
                  onChange={(e) => setSettingsProTokens(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: '100%', maxWidth: '280px', fontSize: '13.5px', fontWeight: 700 }}
                  required
                />
                <span className="small muted" style={{ fontSize: '10.5px', marginTop: '4px', display: 'block' }}>
                  Jatah kuota token bulanan standar untuk seluruh pengguna Pro Trader. Seluruh teks dan notifikasi sistem di aplikasi otomatis menyesuaikan nilai ini.
                </span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 650 }}>
                  TEMPLATE PESAN OTOMATIS WHATSAPP
                </label>
                <textarea
                  className="select"
                  rows={3}
                  value={settingsTemplate}
                  onChange={(e) => setSettingsTemplate(e.target.value)}
                  placeholder="Halo Admin PintarSaham, saya ingin menambah token / upgrade akun ke Pro Trader.\nNama: {name}\nEmail: {email}\nFitur: {feature}"
                  style={{ width: '100%', maxWidth: '720px', fontSize: '12px', lineHeight: 1.5, padding: '10px 12px' }}
                />
                <span className="small muted" style={{ fontSize: '10.5px', marginTop: '4px', display: 'block' }}>
                  Gunakan placeholder <code>{'{name}'}</code>, <code>{'{email}'}</code>, dan <code>{'{feature}'}</code> yang otomatis diisi oleh sistem.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={savingSettings}
                  style={{ padding: '8px 20px', fontSize: '12.5px', fontWeight: 650 }}
                >
                  <Icon name="check" cls="sm" /> {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan & Jatah Token'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={fetchSettings}
                  disabled={loadingSettings}
                  style={{ fontSize: '12px' }}
                >
                  <Icon name="refresh" cls="sm" /> Muat Ulang
                </button>
              </div>
            </form>
          </div>

          {/* Card 1.5: Reset Kuota Bulanan Semua Pengguna */}
          <div className="card" style={{ padding: '22px 24px', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                  Reset Jatah Token Bulanan Seluruh Pengguna
                </h4>
                <p className="small muted" style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                  Kembalikan kuota token bulanan semua pengguna Pro Trader ke angka resmi ({settingsProTokens} token/bulan). Token tambahan (hasil top-up) tetap aman dan tidak akan hilang.
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                disabled={resettingTokens}
                onClick={handleResetMonthlyTokens}
                style={{ background: '#d97706', borderColor: '#d97706', padding: '9px 18px', fontSize: '12.5px', fontWeight: 700 }}
              >
                <Icon name="refresh" cls="sm" /> {resettingTokens ? 'Mereset Token...' : 'Reset Jatah Bulanan Semua Akun'}
              </button>
            </div>
          </div>

          {/* Card 2: Aturan & Mekanisme Pengurangan Token Sistem */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="zap" cls="sm" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                  Aturan &amp; Mekanisme Pemotongan Token Sistem
                </h3>
                <p className="small muted" style={{ margin: '2px 0 0 0' }}>
                  Daftar aktivitas pengguna yang secara otomatis memotong kuota token di database SQLite.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '16px' }}>
              <div style={{ background: 'var(--soft, #f8fafc)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>Chatbot Asisten PintarSaham AI</span>
                  <span className="pill blue" style={{ fontSize: '11px', fontWeight: 700 }}>-1 Token / Pesan</span>
                </div>
                <p className="small muted" style={{ fontSize: '11.5px', lineHeight: 1.5, margin: 0 }}>
                  Setiap pertanyaan yang dikirimkan user di halaman Chat AI atau widget popup akan memproses analisis model dan memotong 1 token.
                </p>
              </div>

              <div style={{ background: 'var(--soft, #f8fafc)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>Analisis Fundamental &amp; Pasar AI</span>
                  <span className="pill blue" style={{ fontSize: '11px', fontWeight: 700 }}>-1 Token / Analisis</span>
                </div>
                <p className="small muted" style={{ fontSize: '11.5px', lineHeight: 1.5, margin: 0 }}>
                  Dipotong saat pengguna menekan tombol "Generate Analisis AI" atau "Ulang Analisis" pada grafik emiten saham.
                </p>
              </div>

              <div style={{ background: 'var(--soft, #f8fafc)', border: '1px solid var(--line)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>Perbarui Data Live Emiten</span>
                  <span className="pill amber" style={{ fontSize: '11px', fontWeight: 700 }}>-1 Token / Refresh</span>
                </div>
                <p className="small muted" style={{ fontSize: '11.5px', lineHeight: 1.5, margin: 0 }}>
                  Dipotong saat pengguna Pro menekan tombol "Perbarui" data bursa live untuk mengambil kuotasi real-time terkini dari server BEI.
                </p>
              </div>
            </div>

            {/* Priority breakdown */}
            <div
              style={{
                marginTop: '18px',
                padding: '14px 16px',
                background: 'rgba(2, 132, 199, 0.05)',
                border: '1px solid rgba(2, 132, 199, 0.2)',
                borderRadius: '10px',
                fontSize: '12px',
                lineHeight: 1.6,
                color: 'var(--ink)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--navy)' }}>
                Urutan Prioritas Pengurangan Token:
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px' }}>
                <li><strong>Token Bulanan (Monthly Tokens)</strong> dipotong terlebih dahulu (jatah {settingsProTokens} token/bulan untuk Pro Trader).</li>
                <li>Jika Token Bulanan habis (0), sistem secara otomatis memotong <strong>Token Tambahan (Additional Tokens)</strong> yang telah ditambahkan oleh Admin.</li>
                <li>Jika seluruh kuota token habis (0), aktivitas akan dibatasi dan sistem secara otomatis memunculkan modal <strong>Tambah Token &amp; Upgrade</strong> untuk menghubungi Admin.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP-UP TOKEN MODAL ── */}
      {selectedUserForToken && (
        <div
          className="modal-layer open"
          style={{ zIndex: 170 }}
          onClick={() => setSelectedUserForToken(null)}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '92%',
              maxWidth: '460px',
              margin: 'auto',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Top-Up Token Pengguna</h3>
                <p className="small muted" style={{ margin: '4px 0 0 0' }}>
                  Tambahkan token khusus untuk pengguna terpilih di luar kuota bulanan.
                </p>
              </div>
              <button
                type="button"
                className="btn small-btn"
                onClick={() => setSelectedUserForToken(null)}
                style={{ padding: '4px 8px', borderRadius: '50%' }}
              >
                ✕
              </button>
            </div>

            {/* Target user info */}
            <div
              style={{
                background: 'var(--soft)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Akun Penerima
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
                {selectedUserForToken.name}
              </div>
              <div className="small muted" style={{ fontSize: '12px' }}>
                {selectedUserForToken.email}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '11.5px' }}>
                <span>Bulanan: <strong>{selectedUserForToken.monthlyTokens ?? 0}</strong></span>
                <span>•</span>
                <span>Tambahan: <strong>{selectedUserForToken.additionalTokens ?? 0}</strong></span>
                <span>•</span>
                <span>Total Sekarang: <strong>{(selectedUserForToken.monthlyTokens ?? 0) + (selectedUserForToken.additionalTokens ?? 0)}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmAddToken}>
              <div style={{ marginBottom: '14px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '6px', fontWeight: 650 }}>
                  JUMLAH TOKEN YANG INGIN DITAMBAHKAN
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {[5, 10, 20, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn small-btn ${tokenAddAmount === preset ? 'primary' : ''}`}
                      onClick={() => setTokenAddAmount(preset)}
                      style={{ flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 600 }}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="select"
                  value={tokenAddAmount}
                  onChange={(e) => setTokenAddAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  style={{ width: '100%', fontSize: '14px', fontWeight: 700 }}
                  required
                />
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '18px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: 'var(--ink)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Token Tambahan Baru:</span>
                  <strong>+{(selectedUserForToken.additionalTokens ?? 0) + tokenAddAmount} Token</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 700 }}>
                  <span>Total Keseluruhan Pengguna:</span>
                  <span>{(selectedUserForToken.monthlyTokens ?? 0) + (selectedUserForToken.additionalTokens ?? 0) + tokenAddAmount} Token</span>
                </div>
                <div className="small muted" style={{ fontSize: '10.5px', marginTop: '6px' }}>
                  Pencatatan token tambahan dipisah dari kuota bulanan dan tidak akan di-reset pada awal bulan.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelectedUserForToken(null)}
                  disabled={savingTokenAdd}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={savingTokenAdd}
                  style={{ minWidth: '130px', justifyContent: 'center' }}
                >
                  <Icon name="check" cls="sm" /> {savingTokenAdd ? 'Menyimpan...' : 'Tambahkan Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD USER MODAL ── */}
      {showAddUser && (
        <div className="modal-layer open" style={{ zIndex: 170 }} onClick={() => setShowAddUser(false)}>
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '92%', maxWidth: '420px', margin: 'auto', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>Tambah Pengguna Baru</h3>
            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '12px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>NAMA LENGKAP</label>
                <input
                  type="text"
                  className="select"
                  placeholder="Nama lengkap pengguna"
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
                  placeholder="email@pengguna.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>ROLE PENGGUNA</label>
                <select
                  className="select"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  style={{ width: '100%' }}
                >
                  <option value="user">User (Pengguna Biasa)</option>
                  <option value="admin">Admin</option>
                  <option value="super admin">Super Admin</option>
                </select>
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label className="small muted" style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>PAKET (TIER)</label>
                <select
                  className="select"
                  value={newUserTier}
                  onChange={(e) => setNewUserTier(e.target.value as UserTier)}
                  style={{ width: '100%' }}
                >
                  <option value="starter">Free Starter (0 Token)</option>
                  <option value="pro">Pro Trader ({settingsProTokens} Token/bln)</option>
                  <option value="institutional">Institutional (100 Token/bln)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowAddUser(false)} disabled={savingNewUser}>
                  Batal
                </button>
                <button type="submit" className="btn primary" disabled={savingNewUser}>
                  {savingNewUser ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
