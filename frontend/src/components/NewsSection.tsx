import React, { useState, useEffect } from 'react';
import { NewsItem } from '../types';
import { NEWS } from '../constants';
import { Icon } from './Icon';

interface NewsSectionProps {
  activeTicker: string;
  onOpenNewsDrawer: (newsItem: NewsItem) => void;
}

const newsCache: Record<string, { ts: number; data: NewsItem[] }> = {};

export const NewsSection: React.FC<NewsSectionProps> = ({
  activeTicker,
  onOpenNewsDrawer,
}) => {
  const ticker = activeTicker || 'IHSG';
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);

  const loadNews = async (force: boolean = false) => {
    // Check 15 min cache
    const cached = newsCache[ticker];
    if (!force && cached && Date.now() - cached.ts < 15 * 60 * 1000) {
      setNews(cached.data);
      setLoading(false);
      setIsLive(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && !data[0]?.error) {
        newsCache[ticker] = { ts: Date.now(), data };
        setNews(data);
        setIsLive(true);
      } else {
        setNews(NEWS);
        setIsLive(false);
      }
    } catch (err) {
      console.warn('[News] Server offline or fetch failed, using fallback:', err);
      setNews(NEWS);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [ticker]);

  const name = ticker === 'IHSG' ? 'IHSG & Pasar Modal Indonesia' : ticker;

  return (
    <section className="section" id="news">
      <div className="section-head">
        <div>
          <div className="flex gap-8 align-center">
            <h2>Kabar Terkini Pasar & Emiten</h2>
            {isLive ? (
              <span className="pill green" id="news-live-badge">
                <i className="dot"></i> Live RSS & Web
              </span>
            ) : (
              <span className="pill outline" id="news-static-badge">
                {loading ? 'Memuat...' : 'Simulasi'}
              </span>
            )}
          </div>
          <p id="news-subtitle">Berita terbaru seputar {name}.</p>
        </div>
        <button
          className="link-btn"
          onClick={() => loadNews(true)}
          style={{ cursor: 'pointer' }}
        >
          Perbarui berita <Icon name="refresh" cls="sm" />
        </button>
      </div>

      <div className="news-grid" id="news-grid">
        {loading
          ? [1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="card news-card"
                style={{
                  pointerEvents: 'none',
                  animation: 'pulse-bg 1.4s ease infinite',
                }}
              >
                <div className="news-meta">
                  <span
                    style={{
                      width: '80px',
                      height: '10px',
                      background: '#eef1f4',
                      borderRadius: '4px',
                      display: 'inline-block',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '60px',
                      height: '10px',
                      background: '#eef1f4',
                      borderRadius: '4px',
                      display: 'inline-block',
                    }}
                  ></span>
                </div>
                <div
                  style={{
                    height: '14px',
                    background: '#eef1f4',
                    borderRadius: '4px',
                    marginBottom: '8px',
                  }}
                ></div>
                <div
                  style={{
                    height: '14px',
                    background: '#eef1f4',
                    borderRadius: '4px',
                    width: '80%',
                    marginBottom: '6px',
                  }}
                ></div>
                <div
                  style={{
                    height: '12px',
                    background: '#f4f6f8',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                ></div>
                <div
                  style={{
                    height: '12px',
                    background: '#f4f6f8',
                    borderRadius: '4px',
                    width: '70%',
                  }}
                ></div>
              </div>
            ))
          : news.map((n, i) => {
              const iconName = n.icon || (i === 0 ? 'building' : i === 1 ? 'globe' : 'leaf');
              const biasColor =
                n.bias === 'positif'
                  ? 'positive'
                  : n.bias === 'negatif'
                  ? 'negative'
                  : '';
              const dateStr = n.date || 'Hari ini';

              return (
                <button
                  key={i}
                  className="card news-card"
                  onClick={() => onOpenNewsDrawer(n)}
                  aria-label={`Baca berita: ${n.title}`}
                  style={{ background: 'none', border: '1px solid var(--line)' }}
                >
                  <div className="news-meta">
                    <span className="news-category">
                      <Icon name={iconName} cls="sm" /> {n.category}
                    </span>
                    <span>
                      {dateStr}
                      {isLive ? ' · Live' : ' · Simulasi'}
                    </span>
                  </div>
                  <h3>{n.title}</h3>
                  <p>{n.desc}</p>
                  <div className="news-bottom">
                    <span className={biasColor}>{n.impact}</span>
                    <Icon name="arrow-up-right" cls="sm" />
                  </div>
                </button>
              );
            })}
      </div>
    </section>
  );
};
