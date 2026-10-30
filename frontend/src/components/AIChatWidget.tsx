import React, { useState, useRef, useEffect } from 'react';

interface ApprovalPlan {
  action_type: string;
  title: string;
  description: string;
  methodology: string;
  estimated_quota: number;
  quota_label: string;
  continue_label: string;
  cancel_label: string;
  execution_plan?: string;
  originalText: string;
  isApproved?: boolean;
}


interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  toolCalls?: Array<{ name: string; args: any }>;
  approvalPlan?: ApprovalPlan;
  time: string;
}

const DEFAULT_QUESTIONS = [
  'Berapa level IHSG hari ini?',
  'Carikan saham terbaik yang undervalued & ROE tinggi',
  'Berapa harga saham BBCA dan rasio PER-nya?',
  'Jadwal aksi korporasi pasar modal terdekat?',
];

const DEFAULT_POS = { x: 24, y: 24 }; // right: 24px, bottom: 24px

// ==========================================
// RICH MARKDOWN FORMATTER FOR CHAT MESSAGES
// ==========================================

function formatInlineText(text: string): React.ReactNode[] {
  if (!text) return [];
  // Regex untuk menangkap **bold**, *italic*, dan `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(<code key={match.index} className="chat-inline-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const rawLines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Divider garis pemisah (--- atau ***)
    if (line === '---' || line === '***' || line === '___') {
      elements.push(<hr key={`hr-${i}`} className="chat-divider" />);
      i++;
      continue;
    }

    // 2. Header (# Judul, ## Judul, ### Judul, ### **Judul**)
    const headerMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      let title = headerMatch[2].trim();
      // Bersihkan tanda bintang tebal berlebih di sekitar judul jika ada
      if (title.startsWith('**') && title.endsWith('**')) {
        title = title.slice(2, -2).trim();
      }
      const Tag = (level === 1 || level === 2) ? 'h4' : 'h5';
      elements.push(
        <Tag key={`h-${i}`} className={`chat-heading chat-h${level}`}>
          {formatInlineText(title)}
        </Tag>
      );
      i++;
      continue;
    }

    // 3. Tabel Markdown (| Kolom 1 | Kolom 2 |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) =>
          rowStr
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim());

        const headers = parseRow(tableLines[0]);
        // Abaikan baris separator seperti |:---:|:---|
        const rows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div key={`tbl-${i}`} className="chat-table-container">
            <table className="chat-table">
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{formatInlineText(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, rIdx) => (
                  <tr key={rIdx}>
                    {r.map((c, cIdx) => (
                      <td key={cIdx}>{formatInlineText(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 4. Daftar Poin Bullets (* Item, - Item, • Item)
    const listMatch = line.match(/^([*\-•])\s+(.*)$/);
    if (listMatch) {
      const listItems: string[] = [];
      while (i < rawLines.length) {
        const itemLine = rawLines[i].trim();
        const m = itemLine.match(/^([*\-•])\s+(.*)$/);
        if (m) {
          listItems.push(m[2]);
          i++;
        } else if (itemLine === '') {
          if (i + 1 < rawLines.length && rawLines[i + 1].trim().match(/^([*\-•])\s+/)) {
            i++;
            continue;
          }
          break;
        } else {
          break;
        }
      }

      elements.push(
        <ul key={`ul-${i}`} className="chat-list">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="chat-list-item">
              <span className="chat-list-bullet">•</span>
              <span className="chat-list-text">{formatInlineText(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 5. Daftar Nomor (1. Item, 2. Item)
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const numItems: { num: string; text: string }[] = [];
      while (i < rawLines.length) {
        const itemLine = rawLines[i].trim();
        const m = itemLine.match(/^(\d+)\.\s+(.*)$/);
        if (m) {
          numItems.push({ num: m[1], text: m[2] });
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ol key={`ol-${i}`} className="chat-num-list">
          {numItems.map((item, itemIdx) => (
            <li key={itemIdx} className="chat-num-item">
              <span className="chat-num-badge">{item.num}</span>
              <span className="chat-num-text">{formatInlineText(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 6. Paragraf Normal
    elements.push(
      <p key={`p-${i}`} className="chat-paragraph">
        {formatInlineText(line)}
      </p>
    );
    i++;
  }

  return <div className="formatted-chat-message">{elements}</div>;
};


export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'model',
        text: 'Halo! Saya Asisten AI PintarSaham. Saya siap membantu Anda menganalisis data pasar modal BEI, harga saham realtime, fundamental kuartalan, dan aksi korporasi resmi tanpa halusinasi.\n\nAda data saham atau pasar yang ingin Anda tanyakan?',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Draggable floating button state (Default: right: 24px, bottom: 24px)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('ps-chat-pos-v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_POS;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const snapTimerRef = useRef<any>(null);

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const hasMovedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Snap-back timer logic: Jika ikon digeser dari DEFAULT_POS, 5 detik kemudian kembali otomatis
  const scheduleSnapBack = () => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
    }
    snapTimerRef.current = setTimeout(() => {
      setIsReturning(true);
      setPos(DEFAULT_POS);
      try {
        localStorage.setItem('ps-chat-pos-v2', JSON.stringify(DEFAULT_POS));
      } catch {}
      // Matikan flag transition setelah animasi selesai (0.5s)
      setTimeout(() => setIsReturning(false), 550);
    }, 5000);
  };

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
    }
    setIsDragging(true);
    setIsReturning(false);
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: pos.x,
      startY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const dx = dragStartRef.current.mouseX - e.clientX; // Inverted because right-aligned
    const dy = dragStartRef.current.mouseY - e.clientY; // Inverted because bottom-aligned

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const maxX = window.innerWidth - 70;
    const maxY = window.innerHeight - 70;

    const newX = Math.max(12, Math.min(maxX, dragStartRef.current.startX + dx));
    const newY = Math.max(12, Math.min(maxY, dragStartRef.current.startY + dy));

    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      localStorage.setItem('ps-chat-pos-v2', JSON.stringify(pos));
    } catch {}

    // Jika digeser menjauh dari default position, aktifkan timer kembali 5 detik
    if (hasMovedRef.current && (pos.x !== DEFAULT_POS.x || pos.y !== DEFAULT_POS.y)) {
      scheduleSnapBack();
    }

    // If it was just a click (didn't drag substantially), toggle open
    if (!hasMovedRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  // Kirim Pesan dengan Analisis & Estimasi Kuota
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
      // 1. Analisis intent & estimasi kuota bursa realtime
      const estRes = await fetch('/api/ai-chat-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q }),
      });

      let estimateData: any = { needs_approval: false };
      if (estRes.ok) {
        estimateData = await estRes.json();
      }

      if (estimateData.needs_approval) {
        // Tampilkan kartu rencana analisis & konfirmasi persetujuan user
        const approvalMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: '',
          approvalPlan: {
            ...estimateData,
            originalText: q,
          },
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, approvalMsg]);
        setIsLoading(false);
        return;
      }

      // Jika pertanyaan standar (tidak butuh approval khusus), langsung eksekusi
      await executeQuery(newHistory);
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

  // Eksekusi percakapan ke backend setelah diapprove
  const executeQuery = async (history: ChatMessage[]) => {
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

  // User klik "Lanjutkan Analisis" pada kartu estimasi
  const handleApprovePlan = (plan: ApprovalPlan, msgId: string) => {
    // 1. Tandai kartu approval sebagai telah disetujui (tetap tersimpan rapi di histori)
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.approvalPlan) {
          return {
            ...m,
            approvalPlan: { ...m.approvalPlan, isApproved: true },
          };
        }
        return m;
      })
    );

    // 2. Siapkan riwayat percakapan untuk backend AI
    const apiMessages = messages
      .filter((m) => m.text && !m.approvalPlan)
      .map((m) => ({
        role: m.role,
        text: m.text,
      }));

    const textToSend = plan.execution_plan
      ? `${plan.originalText}\n[Instruksi Rencana Analisis: ${plan.execution_plan}]`
      : plan.originalText;

    if (!apiMessages.some((m) => m.text === textToSend || m.text === plan.originalText)) {
      apiMessages.push({ role: 'user', text: textToSend });
    }

    // 3. Jalankan pemrosesan ke AI backend
    executeQueryWithMessages(apiMessages);
  };

  const executeQueryWithMessages = async (apiMessages: Array<{ role: 'user' | 'model'; text: string }>) => {
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


  // User klik "Batalkan"
  const handleCancelPlan = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          return {
            ...m,
            approvalPlan: undefined,
            text: 'Analisis dibatalkan sesuai permintaan Anda. Ada data saham lain yang ingin Anda ketahui?',
          };
        }
        return m;
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 1. Floating Dragable AI Trigger Button (Pojok Kanan Bawah, Snap-Back 5 Detik) */}
      <button
        type="button"
        className={`ps-chat-fab ${isOpen ? 'active' : ''} ${isReturning ? 'returning' : ''}`}
        style={{
          right: `${pos.x}px`,
          bottom: `${pos.y}px`,
          touchAction: 'none',
          transition: isReturning ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Buka Asisten AI PintarSaham (Bisa Digeser - Otomatis Kembali)"
        aria-label="Buka Chatbot AI PintarSaham"
      >
        <span className="fab-icon-wrap">
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.1 4.9 7.3L8 22l4.8-2.4c.4 0 .8.1 1.2.1a8 8 0 0 0 8-8 8 8 0 0 0-8-8z"/>
              <path d="M9.5 9h.01M14.5 9h.01M9.5 13a3.5 3.5 0 0 0 5 0"/>
            </svg>
          )}
        </span>
        <span className="fab-pulse"></span>
        <span className="fab-badge">AI</span>
      </button>

      {/* 2. Interactive Popup Chat Window */}
      {isOpen && (
        <div
          className="ps-chat-modal"
          style={{
            right: `${Math.min(pos.x, window.innerWidth - 390)}px`,
            bottom: `${pos.y + 68}px`,
          }}
        >
          {/* Header */}
          <div className="ps-chat-header">
            <div className="header-left">
              <div className="avatar-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.1 4.9 7.3L8 22l4.8-2.4c.4 0 .8.1 1.2.1a8 8 0 0 0 8-8 8 8 0 0 0-8-8z"/>
                  <path d="M9.5 9h.01M14.5 9h.01M9.5 13a3.5 3.5 0 0 0 5 0"/>
                </svg>
              </div>
              <div>
                <h4 className="title">PintarSaham AI Assistant</h4>
                <div className="status">
                  <span className="dot online"></span>
                  <span>Data Pasar Realtime &amp; AI Intelligence</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="close-btn"
              onClick={() => setIsOpen(false)}
              title="Tutup Obrolan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Messages Body */}
          <div className="ps-chat-body">
            {messages.map((m) => (
              <div key={m.id} className={`message-row ${m.role}`}>
                {m.role === 'model' && (
                  <div className="bot-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                )}
                <div className="message-bubble">
                  {/* Approval Confirmation Card */}
                  {m.approvalPlan ? (
                    <div className="approval-card">
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
                          📊 Estimasi: <strong>{m.approvalPlan.quota_label}</strong>
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
                      {/* Tool Call Badges */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="tool-chips">
                          {m.toolCalls.map((t, idx) => (
                            <span key={idx} className="tool-chip" title={JSON.stringify(t.args)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span>Sumber Data: {t.name.replace(/_/g, ' ')}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <FormattedMessage content={m.text} />
                    </>
                  )}

                  <span className="msg-time">{m.time}</span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message-row model">
                <div className="bot-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div className="message-bubble loading-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="loading-caption">Menganalisis data pasar realtime...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="ps-chat-suggestions">
            {DEFAULT_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="suggestion-chip"
                onClick={() => handleSend(q)}
                disabled={isLoading}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <div className="ps-chat-footer">
            <input
              type="text"
              placeholder="Tanya saham BEI (misal: cari saham murah, BBCA, IHSG)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoFocus
            />
            <button
              type="button"
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              title="Kirim Pesan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
