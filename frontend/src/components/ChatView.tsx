import React, { useState, useRef, useEffect } from 'react';
import { StockItem, ApprovalPlan } from '../types';
import { Icon } from './Icon';
import { FormattedMessage } from './FormattedMessage';

interface ChatViewProps {
  stocks: StockItem[];
  onSelectStock: (ticker: string) => void;
  onNotify: (msg: string) => void;
  onNavigateHome: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  toolCalls?: Array<{ name: string; args?: any }>;
  approvalPlan?: ApprovalPlan;
  time: string;
}

const QUICK_PROMPTS = [
  'Bagaimana analisis teknikal dan tren pergerakan BBCA saat ini?',
  'Sentimen makro apa yang paling mempengaruhi IHSG dan saham perbankan (MSCI, BI-Rate)?',
  'Sebutkan 3 saham dengan proyeksi dividen yield menarik dan fundamental sehat.',
  'Bandingkan valuasi dan margin laba ASII vs UNTR.',
  'Bagaimana ringkasan kinerja laporan keuangan kuartalan terbaru INTP?',
];

export const ChatView: React.FC<ChatViewProps> = ({
  stocks: _stocks,
  onSelectStock: _onSelectStock,
  onNotify,
  onNavigateHome,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Halo! Saya Asisten Analis Pasar Modal PintarSaham. Anda bisa menanyakan analisis teknikal chart (MA20/50, RSI, Support/Resistance), valuasi harga wajar, kinerja laporan keuangan resmi BEI, perbandingan emiten, hingga dampak isu makro seperti rebalancing MSCI dan kebijakan suku bunga. Ada yang ingin Anda diskusikan?',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: q,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
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
        setMessages((prev) => [...prev, confirmMsg]);
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
      setMessages((prev) => [...prev, errorMsg]);
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
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply || 'Data pasar berhasil diproses.',
        toolCalls: data.tool_calls || [],
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Maaf, terjadi kendala saat memproses jawaban: ${err.message || 'Koneksi gagal'}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = (plan: ApprovalPlan, messageId: string) => {
    setMessages((prev) =>
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
      : (plan.originalText || '');

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
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply || 'Data bursa berhasil diproses.',
        toolCalls: data.tool_calls || [],
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Maaf, terjadi kendala saat memproses jawaban: ${err.message || 'Koneksi gagal'}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPlan = (messageId: string) => {
    setMessages((prev) =>
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

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: 'Riwayat obrolan telah dibersihkan. Silakan tanyakan analisis saham atau pasar modal lainnya.',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    onNotify('Riwayat chat berhasil dibersihkan');
  };

  return (
    <main className="main" style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: '16px' }}>
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

      {/* Header */}
      <div className="section-head" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="sparkles" cls="lg" style={{ color: 'var(--blue)' }} /> Chat AI Asisten Pasar Modal
          </h1>
          <p style={{ marginTop: '6px', color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
            Konsultasikan analisis teknikal, valuasi harga wajar, kinerja lapkeu resmi BEI, serta sentimen makro (MSCI &amp; Suku Bunga) secara interaktif.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn small-btn" onClick={handleClearChat} title="Mulai percakapan baru">
            <Icon name="refresh" cls="sm" /> Bersihkan Chat
          </button>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div style={{ marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
          {QUICK_PROMPTS.map((prompt, pIdx) => (
            <button
              key={pIdx}
              type="button"
              className="btn small-btn"
              onClick={() => handleSend(prompt)}
              style={{
                fontSize: '11px',
                borderRadius: '16px',
                whiteSpace: 'nowrap',
                background: 'var(--soft)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
              }}
            >
              <Icon name="sparkles" cls="sm" style={{ color: 'var(--blue)' }} /> {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '650px',
          maxHeight: 'calc(100vh - 280px)',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(14, 52, 101, 0.06)',
          overflow: 'hidden',
          border: '1px solid var(--line)',
        }}
      >
        {/* Messages Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: isUser ? '85%' : '92%',
                    minWidth: '120px',
                    padding: '14px 18px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser ? 'var(--navy)' : '#f8fafc',
                    color: isUser ? '#ffffff' : 'var(--ink)',
                    border: isUser ? 'none' : '1px solid var(--line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {/* Approval Confirmation Card */}
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

                      {/* Body Text */}
                      <FormattedMessage content={m.text} />
                    </>
                  )}

                  {/* Timestamp */}
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '10.5px',
                      textAlign: isUser ? 'right' : 'left',
                      color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                    }}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
              <div
                style={{
                  padding: '14px 20px',
                  borderRadius: '16px 16px 16px 4px',
                  background: '#f8fafc',
                  border: '1px solid var(--line)',
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

        {/* Input Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--line)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan analisis saham, rasio valuasi, atau sentimen pasar BEI..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--line)',
              fontSize: '13.5px',
              outline: 'none',
              background: '#fcfdfe',
            }}
          />
          <button
            type="button"
            className="btn primary"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 650,
              fontSize: '13.5px',
            }}
          >
            <Icon name="sparkles" cls="sm" /> Kirim
          </button>
        </div>
      </div>
      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
        Analisis berbasis data riil Bursa Efek Indonesia (BEI). Selalu lakukan riset mandiri sebelum mengambil keputusan investasi.
      </div>
    </main>
  );
};
