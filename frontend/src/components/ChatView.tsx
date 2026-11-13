import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StockItem, ApprovalPlan, UserProfile } from '../types';
import { Icon } from './Icon';
import { FormattedMessage } from './FormattedMessage';
import { ContactAdminModal } from './ContactAdminModal';
import { isUserProOrAdmin } from '../utils';

interface ChatViewProps {
  stocks: StockItem[];
  onSelectStock: (ticker: string) => void;
  onNotify: (msg: string) => void;
  onNavigateHome: () => void;
  currentUser?: UserProfile | null;
  onUpdateTokens?: (tokens: { monthly?: number; additional?: number; total?: number }) => void;
  proMonthlyTokens?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  toolCalls?: Array<{ name: string; args?: any }>;
  approvalPlan?: ApprovalPlan;
  time: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_SESSIONS_KEY = 'ps_chat_sessions_v2';
const STORAGE_ACTIVE_ID_KEY = 'ps_chat_active_session_id_v2';

const PROMPT_SUGGESTION_CARDS = [
  {
    category: 'Analisis Teknikal',
    icon: 'chart',
    title: 'Tren Harga & Support Resistance BBCA',
    desc: 'Kaji posisi Relative Strength Index (RSI 14), Moving Average 20/50, serta level pantulan harga.',
    query: 'Bagaimana analisis teknikal dan tren pergerakan BBCA saat ini?',
  },
  {
    category: 'Sentimen Makro',
    icon: 'globe',
    title: 'Sentimen Rebalancing MSCI & BI-Rate',
    desc: 'Ulas arah kebijakan suku bunga dan potensi rebalancing indeks global terhadap saham perbankan.',
    query: 'Sentimen makro apa yang paling mempengaruhi IHSG dan saham perbankan (MSCI, BI-Rate)?',
  },
  {
    category: 'Skrining Dividen',
    icon: 'coins',
    title: 'Saham Prospek Yield Dividen Tinggi',
    desc: 'Temukan 3 saham dengan proyeksi dividen menarik, payout ratio sehat, dan fundamental solid.',
    query: 'Sebutkan 3 saham dengan proyeksi dividen yield menarik dan fundamental sehat.',
  },
  {
    category: 'Komparasi Valuasi',
    icon: 'layers',
    title: 'Komparasi Valuasi ASII vs UNTR',
    desc: 'Bandingkan rasio PER, PBV, ROE, dan margin laba bersih antar dua emiten konglomerasi.',
    query: 'Bandingkan valuasi dan margin laba ASII vs UNTR.',
  },
];

const createInitialSession = (): ChatSession => {
  const id = `sess_${Date.now()}`;
  return {
    id,
    title: 'Sesi Baru',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        id: `welcome-${id}`,
        role: 'model',
        text: 'Halo! Saya Asisten Analis Pasar Modal PintarSaham. Anda bisa menanyakan analisis teknikal chart (MA20/50, RSI, Support/Resistance), valuasi harga wajar (MOS), kinerja laporan keuangan resmi BEI, hingga dampak isu makro seperti sentimen pasar bursa dan kebijakan suku bunga. Ada yang ingin Anda diskusikan?',
        time: '',
      },
    ],
  };
};

export const ChatView: React.FC<ChatViewProps> = ({
  stocks: _stocks,
  onSelectStock: _onSelectStock,
  onNotify,
  onNavigateHome,
  currentUser,
  onUpdateTokens,
  proMonthlyTokens = 30,
}) => {
  const isPro = isUserProOrAdmin(currentUser);
  const isStarter = !isPro;
  const [contactAdminOpen, setContactAdminOpen] = useState(false);
  // 1. Session Management State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat riwayat sesi chat:', e);
    }
    return [createInitialSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (savedId) return savedId;
    } catch {}
    return '';
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth > 850 : true;
  });

  const [searchSession, setSearchSession] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync activeSessionId
  useEffect(() => {
    if (!activeSessionId || !sessions.some((s) => s.id === activeSessionId)) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        const fresh = createInitialSession();
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      }
    }
  }, [sessions, activeSessionId]);

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.error('Gagal menyimpan sesi chat ke localStorage:', e);
    }
  }, [sessions, activeSessionId]);

  // Active Session
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || createInitialSession();
  }, [sessions, activeSessionId]);

  const messages = activeSession.messages;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  // Create New Session
  const handleCreateNewSession = () => {
    const newSess = createInitialSession();
    setSessions((prev) => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
    setInput('');
    onNotify('Sesi obrolan baru dimulai');
    if (window.innerWidth <= 850) {
      setSidebarOpen(false);
    }
  };

  // Delete Session
  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const fresh = createInitialSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (id === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
    onNotify('Sesi obrolan dihapus');
  };

  // Clear All Sessions
  const handleClearAllSessions = () => {
    if (window.confirm('Bersihkan seluruh riwayat sesi chat PintarSaham?')) {
      const fresh = createInitialSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      onNotify('Seluruh riwayat obrolan dibersihkan');
    }
  };

  // Filtered Sessions for Sidebar
  const filteredSessions = useMemo(() => {
    const q = searchSession.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchSession]);

  // Update Messages Helper for Active Session
  const updateActiveSessionMessages = (
    updater: (prevMessages: ChatMessage[]) => ChatMessage[],
    customTitle?: string
  ) => {
    setSessions((prevSessions) =>
      prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          const nextMessages = updater(s.messages);
          let title = s.title;
          if (customTitle && (s.title === 'Sesi Baru' || s.title === 'Chat Baru')) {
            title = customTitle;
          }
          return {
            ...s,
            title,
            updatedAt: Date.now(),
            messages: nextMessages,
          };
        }
        return s;
      })
    );
  };

  // Handle Send
  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isLoading) return;

    if (isStarter) {
      onNotify('Fitur Chat AI membutuhkan kuota token Pro Trader (0 Token tersisa).');
      setContactAdminOpen(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: q,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    // Auto generate session title from user query if still generic
    const autoTitle = q.length > 34 ? `${q.slice(0, 32)}...` : q;
    const newHistory = [...messages, userMsg];

    updateActiveSessionMessages(() => newHistory, autoTitle);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Cek rencana analisis & estimasi kuota data bursa
      const estRes = await fetch('/api/ai-chat-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q }),
      });
      let estData: any = { needs_approval: false };
      if (estRes.ok) {
        estData = await estRes.json();
      }

      if (estData.needs_approval) {
        const confirmMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: '',
          approvalPlan: {
            ...estData,
            originalText: q,
          },
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        updateActiveSessionMessages((prev) => [...prev, confirmMsg]);
        setIsLoading(false);
        return;
      }

      // 2. Langsung proses jika tidak butuh persetujuan
      await executeChatQuery(newHistory);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Maaf, terjadi kendala saat menganalisis permintaan: ${err.message || 'Koneksi gagal'}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      updateActiveSessionMessages((prev) => [...prev, errorMsg]);
      setIsLoading(false);
    }
  };

  const executeChatQuery = async (history: ChatMessage[]) => {
    setIsLoading(true);
    try {
      const apiMessages = history
        .filter((m) => m.text && !m.approvalPlan)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, user_id: currentUser?.id, email: currentUser?.email }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || (res.status === 403
          ? 'Akun Starter atau kuota token habis (0 Token). Silakan hubungi administrator untuk beralih ke Pro Trader.'
          : `Server mengembalikan status ${res.status}`));
      }

      const data = await res.json();
      if (data.remaining_tokens) {
        onUpdateTokens?.(data.remaining_tokens);
      }
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply || 'Data pasar berhasil diproses.',
        toolCalls: data.tool_calls || [],
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveSessionMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Maaf, terjadi kendala saat memproses jawaban: ${err.message || 'Koneksi gagal'}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      updateActiveSessionMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = (plan: ApprovalPlan, messageId: string) => {
    updateActiveSessionMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.approvalPlan
          ? { ...m, approvalPlan: { ...m.approvalPlan, isApproved: true } }
          : m
      )
    );

    const historyForApi = messages
      .filter((m) => m.text && !m.approvalPlan)
      .map((m) => ({ role: m.role, text: m.text }));

    const queryWithPlan = plan.execution_plan
      ? `${plan.originalText}\n[Instruksi Rencana Analisis: ${plan.execution_plan}]`
      : plan.originalText || '';

    if (!historyForApi.some((m) => m.text === queryWithPlan || m.text === plan.originalText)) {
      historyForApi.push({ role: 'user', text: queryWithPlan });
    }

    sendDirectQuery(historyForApi);
  };

  const sendDirectQuery = async (apiMessages: Array<{ role: string; text: string }>) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, user_id: currentUser?.id, email: currentUser?.email }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || (res.status === 403
          ? 'Akun Starter atau kuota token habis (0 Token). Silakan hubungi administrator untuk beralih ke Pro Trader.'
          : `Server mengembalikan status ${res.status}`));
      }

      const data = await res.json();
      if (data.remaining_tokens) {
        onUpdateTokens?.(data.remaining_tokens);
      }
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply || 'Data bursa berhasil diproses.',
        toolCalls: data.tool_calls || [],
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveSessionMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Maaf, terjadi kendala saat memproses jawaban: ${err.message || 'Koneksi gagal'}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      updateActiveSessionMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPlan = (messageId: string) => {
    updateActiveSessionMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              approvalPlan: undefined,
              text: 'Analisis dibatalkan sesuai permintaan Anda. Ada data saham lain yang ingin Anda ketahui?',
            }
          : m
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const isOnlyGreeting = messages.length <= 1;

  return (
    <div className="chat-view-container">
      {/* Top Breadcrumb */}
      <div className="breadcrumb chat-breadcrumb">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
        >
          Beranda
        </a>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Chat AI Asisten Pasar Modal</span>
      </div>

      {/* Main Studio Frame */}
      <div className="ps-chat-studio">
        {/* Backdrop on mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
          />
        )}

        {/* Left Sidebar: Session Management */}
        <aside className={`ps-chat-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-header">
            <button
              type="button"
              className="btn-new-chat"
              onClick={handleCreateNewSession}
              title="Mulai sesi obrolan baru"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Sesi Baru</span>
            </button>

            <div className="sidebar-search">
              <svg
                className="sidebar-search-icon"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={searchSession}
                onChange={(e) => setSearchSession(e.target.value)}
                placeholder="Cari riwayat sesi..."
              />
            </div>
          </div>

          {/* Session List */}
          <div className="sidebar-sessions-list">
            {filteredSessions.length === 0 ? (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '11.5px' }}>
                Tidak ada sesi yang cocok.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    className={`session-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      if (window.innerWidth <= 850) setSidebarOpen(false);
                    }}
                    title={s.title}
                  >
                    <div className="session-info">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: isActive ? 'var(--blue)' : 'var(--muted)' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span className="session-title">{s.title}</span>
                    </div>

                    <button
                      type="button"
                      className="session-del-btn"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      title="Hapus sesi ini"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <span>{sessions.length} Sesi Tersimpan</span>
            <button
              type="button"
              className="link-btn"
              onClick={handleClearAllSessions}
              style={{ fontSize: '11px', color: 'var(--muted)' }}
              title="Bersihkan semua sesi"
            >
              Hapus Semua
            </button>
          </div>
        </aside>

        {/* Right Canvas: Chat Stream & Input */}
        <div className="ps-chat-canvas">
          {/* Header Bar */}
          <div className="chat-canvas-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSidebarOpen((v) => !v)}
                title={sidebarOpen ? 'Tutup sidebar riwayat' : 'Buka sidebar riwayat'}
                style={{ width: '32px', height: '32px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>

              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {activeSession.title}
                </h3>
                <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block' }}>
                  Model Riset: PintarSaham Intelligence BEI
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn small-btn"
                onClick={handleCreateNewSession}
                title="Mulai sesi baru"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Sesi Baru</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="chat-canvas-messages">
            {isOnlyGreeting ? (
              /* Welcoming Hero Screen */
              <div className="chat-welcome-hero">
                <div className="hero-avatar-wrap">
                  <Icon name="sparkles" cls="lg" />
                </div>
                <h2>Asisten Analis Pasar Modal PintarSaham</h2>
                <p>
                  Konsultasikan data teknikal chart, rasio valuasi fundamental laporan keuangan resmi BEI,
                  analisis bandarmologi, hingga sentimen makro pasar secara langsung tanpa halusinasi.
                </p>

                {/* Prompt Cards Grid */}
                <div className="prompt-cards-grid">
                  {PROMPT_SUGGESTION_CARDS.map((card, idx) => (
                    <div
                      key={idx}
                      className="prompt-card"
                      onClick={() => handleSend(card.query)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="prompt-card-top">
                        <Icon name={card.icon} cls="sm" />
                        <span>{card.category}</span>
                      </div>
                      <div className="prompt-card-title">{card.title}</div>
                      <div className="prompt-card-desc">{card.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Render Existing Message Turns */}
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div key={m.id} className={`chat-turn ${isUser ? 'user' : 'model'}`}>
                  {!isUser && (
                    <div className="turn-avatar model" title="PintarSaham Analyst AI">
                      <Icon name="sparkles" cls="sm" />
                    </div>
                  )}

                  <div className="turn-bubble">
                    {/* Approval Card */}
                    {m.approvalPlan ? (
                      <div className="approval-card" style={{ maxWidth: '100%', margin: '0' }}>
                        <div className="approval-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                          <span>Konfirmasi Rencana Analisis</span>
                        </div>
                        <h5 className="approval-title">{m.approvalPlan.title}</h5>
                        <p className="approval-desc">{m.approvalPlan.description}</p>
                        <div className="approval-method">
                          <strong>Metodologi:</strong> {m.approvalPlan.methodology}
                        </div>
                        <div className="approval-quota-info">
                          <span className="quota-tag">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }}
                            >
                              <line x1="18" y1="20" x2="18" y2="10"></line>
                              <line x1="12" y1="20" x2="12" y2="4"></line>
                              <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            <strong>Estimasi:</strong> {m.approvalPlan.quota_label}
                          </span>
                        </div>
                        {m.approvalPlan.isApproved ? (
                          <div className="approval-confirmed-bar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>Permintaan Telah Disetujui ({m.approvalPlan.quota_label})</span>
                          </div>
                        ) : (
                          <div className="approval-actions">
                            <button
                              type="button"
                              className="btn-approve"
                              onClick={() => handleApprovePlan(m.approvalPlan!, m.id)}
                              disabled={isLoading}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span>{m.approvalPlan.continue_label}</span>
                            </button>
                            <button
                              type="button"
                              className="btn-cancel"
                              onClick={() => handleCancelPlan(m.id)}
                              disabled={isLoading}
                            >
                              {m.approvalPlan.cancel_label}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Tool chips */}
                        {m.toolCalls && m.toolCalls.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {m.toolCalls.map((tc, tcIdx) => (
                              <span
                                key={tcIdx}
                                className="pill green"
                                style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 600 }}
                              >
                                <Icon name="check" cls="sm" /> Sumber: {tc.name.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Formatted Markdown */}
                        <FormattedMessage content={m.text} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="chat-turn model">
                <div className="turn-avatar model">
                  <Icon name="sparkles" cls="sm" />
                </div>
                <div
                  className="turn-bubble"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--navy)',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  <svg
                    className="spin-animation"
                    style={{ width: '18px', height: '18px', color: 'var(--blue)' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>Sedang menganalisis data pasar modal &amp; menyusun jawaban...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Input Box */}
          <div className="chat-canvas-input-wrap">
            {isStarter && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.28)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e' }}>
                  <Icon name="lock" cls="sm" style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>
                    Akun Starter (0 Token AI). Upgrade ke <strong>Pro Trader</strong> untuk mendapatkan {proMonthlyTokens} token AI/bulan dan akses asisten pasar BEI.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn small-btn primary"
                  onClick={() => setContactAdminOpen(true)}
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}
                >
                  Beralih ke Pro Trader
                </button>
              </div>
            )}

            <div className="chat-input-box">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan analisis saham, rasio valuasi, atau sentimen pasar BEI..."
                disabled={isLoading}
              />
              <button
                type="button"
                className="btn-chat-send"
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                title="Kirim pesan"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
              PintarSaham AI dapat membuat kekeliruan. Selalu lakukan riset mandiri (DYOR) sebelum mengambil keputusan investasi. AI ini bertindak sebagai alat bantu riset cepat yang terhubung dengan data resmi BEI.
            </div>
          </div>
        </div>
      </div>

      <ContactAdminModal
        isOpen={contactAdminOpen}
        onClose={() => setContactAdminOpen(false)}
        user={currentUser || null}
        featureTitle="Asisten Pasar Chat AI"
      />
    </div>
  );
};
