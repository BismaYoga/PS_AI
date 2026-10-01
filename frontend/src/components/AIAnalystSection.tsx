import React from 'react';
import { NewsItem, AIAnalysis } from '../types';
import { Sparkles, Newspaper, ExternalLink, RefreshCw } from 'lucide-react';

interface AIAnalystSectionProps {
  ticker: string;
  news: NewsItem[];
  aiAnalysis: AIAnalysis | null;
  isLoadingAI: boolean;
  onRefreshAI: () => void;
}

export const AIAnalystSection: React.FC<AIAnalystSectionProps> = ({
  ticker,
  news,
  aiAnalysis,
  isLoadingAI,
  onRefreshAI
}) => {
  const getStanceColor = (stance?: string) => {
    if (!stance) return '#64748b';
    const s = stance.toUpperCase();
    if (s.includes('BULLISH')) return '#059669';
    if (s.includes('BEARISH')) return '#dc2626';
    return '#d97706';
  };

  return (
    <div className="ai-news-grid">
      {/* AI Market Analyst Card */}
      <div className="ai-card">
        <div className="card-header-row">
          <div className="card-title">
            <Sparkles size={18} style={{ color: '#8b5cf6' }} />
            <span>AI Market Insight · {ticker}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {aiAnalysis?.stance && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 6,
                  color: '#ffffff',
                  background: getStanceColor(aiAnalysis.stance)
                }}
              >
                {aiAnalysis.stance}
              </span>
            )}
            <button
              className="btn-secondary"
              onClick={onRefreshAI}
              disabled={isLoadingAI}
              title="Analisis ulang menggunakan Gemini AI"
              style={{ padding: '4px 10px', fontSize: 11 }}
            >
              <RefreshCw size={12} className={isLoadingAI ? 'spin' : ''} />
              <span>{isLoadingAI ? 'Menganalisis...' : 'Analisis Ulang AI'}</span>
            </button>
          </div>
        </div>

        {isLoadingAI ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>
            <Sparkles size={24} style={{ color: '#8b5cf6', margin: '0 auto 8px', animation: 'spin 2s linear infinite' }} />
            <p>Gemini AI sedang menyusun analisis teknikal & katalis berita real-time...</p>
          </div>
        ) : aiAnalysis ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                💡 Ringkasan & Katalis Utama:
              </h4>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                {aiAnalysis.summary || aiAnalysis.news_catalyst}
              </p>
            </div>

            {aiAnalysis.key_factors && aiAnalysis.key_factors.length > 0 && (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  🔍 Faktor Penggerak Kunci:
                </h4>
                <ul style={{ paddingLeft: 18, fontSize: 12, color: '#334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {aiAnalysis.key_factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {aiAnalysis.recommendation && (
              <div style={{
                background: '#eff6ff',
                borderLeft: '4px solid #3b82f6',
                padding: '10px 14px',
                borderRadius: '0 8px 8px 0',
                fontSize: 12,
                color: '#1e3a8a'
              }}>
                <strong>Saran Strategi:</strong> {aiAnalysis.recommendation}
              </div>
            )}

            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
              Dianalisis pada: {aiAnalysis.timestamp || 'Terkini'} · Model: Google Gemini
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
            <p>Klik tombol <strong>Analisis Ulang AI</strong> di atas untuk memanggil Gemini AI.</p>
          </div>
        )}
      </div>

      {/* Real-time News Card */}
      <div className="news-card">
        <div className="card-header-row">
          <div className="card-title">
            <Newspaper size={18} style={{ color: '#0284c7' }} />
            <span>Berita Pasar Real-time · {ticker}</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Google Search Live</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {news && news.length > 0 ? (
            news.slice(0, 3).map((item, idx) => {
              let sentClass = 'sentiment-neutral';
              let sentLabel = 'Netral';
              if (item.sentiment === 'positive') {
                sentClass = 'sentiment-positive';
                sentLabel = 'Positif';
              } else if (item.sentiment === 'negative') {
                sentClass = 'sentiment-negative';
                sentLabel = 'Perhatian';
              }

              return (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-item"
                >
                  <div className="news-top">
                    <span style={{ fontWeight: 600 }}>{item.publisher || 'Media Nasional'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`sentiment-pill ${sentClass}`}>{sentLabel}</span>
                      <span>{item.ago || item.time || ''}</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>

                  <div className="news-title">{item.title}</div>
                  {item.snippet && (
                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                      {item.snippet.slice(0, 140)}...
                    </div>
                  )}
                </a>
              );
            })
          ) : (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>
              <p>Tidak ada berita terbaru yang ditemukan untuk {ticker}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
