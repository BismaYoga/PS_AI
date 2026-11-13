import React, { useState, useEffect } from 'react';
import { NewsItem, UserProfile } from '../types';
import { NEWS } from '../constants';
import { isUserProOrAdmin } from '../utils';
import { Icon } from './Icon';
import { LockedFeatureOverlay } from './LockedFeatureOverlay';

interface NewsSectionProps {
  activeTicker: string;
  onOpenNewsDrawer: (newsItem: NewsItem) => void;
  currentUser?: UserProfile | null;
  onNotify?: (msg: string) => void;
  onOpenContact?: (feature: string) => void;
}

const newsPoolCache: Record<string, { ts: number; data: NewsItem[] }> = {};

export const NewsSection: React.FC<NewsSectionProps> = ({
  activeTicker,
  onOpenNewsDrawer,
  currentUser,
  onNotify,
  onOpenContact,
}) => {
  const isPro = isUserProOrAdmin(currentUser);
  const isStarter = !isPro;
  const ticker = activeTicker || 'IHSG';
  const [pool, setPool] = useState<NewsItem[]>([]);
  const [batchIndex, setBatchIndex] = useState<number>(0);
  const [triggered, setTriggered] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  const batchSize = 3;

  // Reset ke mode siap-trigger saat ganti instrumen agar hemat kuota API & hanya muncul saat ditrigger
  useEffect(() => {
    setTriggered(false);
    setBatchIndex(0);
  }, [ticker]);

  const loadNews = async (force: boolean = false) => {
    setTriggered(true);
    const cached = newsPoolCache[ticker];
    if (!force && cached && Date.now() - cached.ts < 10 * 60 * 1000 && cached.data.length > 0) {
      setPool(cached.data);
      setBatchIndex(0);
      setLoading(false);
      setIsLive(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/news?ticker=${encodeURIComponent(ticker)}${force ? '&force=1' : ''}`
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && !data[0]?.error) {
        newsPoolCache[ticker] = { ts: Date.now(), data };
        setPool(data);
        setBatchIndex(0);
        setIsLive(true);
      } else {
        setPool(NEWS);
        setBatchIndex(0);
        setIsLive(false);
      }
    } catch (err) {
      console.warn('[News] Server offline or fetch failed, using fallback:', err);
      setPool(NEWS);
      setBatchIndex(0);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCycleNews = () => {
    if (!pool.length) {
      loadNews(true);
      return;
    }
    const totalBatches = Math.max(1, Math.ceil(pool.length / batchSize));
    if (totalBatches > 1) {
      setBatchIndex((prev) => (prev + 1) % totalBatches);
    } else {
      loadNews(true);
    }
  };

  const totalBatches = Math.max(1, Math.ceil(pool.length / batchSize));
  const currentBatch = pool.slice(
    batchIndex * batchSize,
    batchIndex * batchSize + batchSize
  );
  const name = ticker === 'IHSG' ? 'IHSG & Pasar Modal Indonesia' : `Emiten ${ticker}`;

  return (
    <section className="section" id="news">
      <div className="section-head">
        <div>
          <div className="flex gap-8 align-center">
            <h2>Kabar Terkini Pasar &amp; Emiten</h2>
            {loading && (
              <span className="pill blue" id="news-loading-badge">
                <i className="dot"></i> Memuat Berita...
              </span>
            )}
          </div>
          <p id="news-subtitle">
            Menampilkan ringkasan berita utama, keterbukaan informasi, dan sentimen pasar terkini untuk {name}.
          </p>
        </div>

        {triggered && (
          <div className="flex gap-8 align-center" style={{ flexWrap: 'wrap' }}>
            {pool.length > batchSize && (
              <button
                className="btn small-btn primary"
                onClick={handleCycleNews}
                disabled={loading}
                style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}
                title="Ganti tampilan ke berita berikutnya"
              >
                <Icon name="refresh" cls="sm" /> Ganti Berita ({batchIndex + 1}/{totalBatches})
              </button>
            )}
            <button
              className="btn small-btn"
              onClick={() => {
                if (isStarter) {
                  onNotify?.('Pembaruan berita live hanya tersedia untuk pengguna Pro Trader.');
                  onOpenContact?.('Pembaruan Berita Pasar');
                  return;
                }
                loadNews(true);
              }}
              disabled={loading}
              style={{ cursor: 'pointer', padding: '6px 11px', fontSize: '11px' }}
              title={isStarter ? 'Terkunci untuk akun Starter (Khusus Pro Trader)' : 'Perbarui berita pasar terkini'}
            >
              {isStarter ? <Icon name="lock" cls="sm" style={{ color: '#d97706' }} /> : <Icon name="refresh" cls="sm" />}{' '}
              Perbarui Berita
              {isStarter && <span className="pill amber" style={{ fontSize: '9px', padding: '1px 5px', marginLeft: '4px' }}>PRO</span>}
            </button>
          </div>
        )}
      </div>

      <LockedFeatureOverlay
        isLocked={isStarter}
        featureName={`Kabar Terkini & Sentimen Pasar (${ticker})`}
        description="Akses kurasi berita bursa real-time, ringkasan keterbukaan informasi BEI, dan analisis sentimen emiten khusus Pro Trader."
        badge="SENTIMEN PASAR PRO TRADER"
        onUnlockClick={() => onOpenContact?.('Kabar Terkini & Sentimen Pasar')}
        minHeight="220px"
      >
        {isStarter ? (
          <div className="news-grid" style={{ pointerEvents: 'none' }}>
            {NEWS.slice(0, 3).map((n, i) => (
              <div
                key={i}
                className="card news-card"
                style={{ background: 'none', border: '1px solid var(--line)' }}
              >
                <div className="news-meta">
                  <span className="news-category">
                    <Icon name={n.icon || 'building'} cls="sm" /> {n.category} · {ticker}
                  </span>
                  <span>{n.date || 'Hari ini'}</span>
                </div>
                <h3>{n.title}</h3>
                <p>{n.desc}</p>
                <div className="news-bottom">
                  <span>{n.impact}</span>
                  <Icon name="arrow-up-right" cls="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : !triggered ? (
          <div
            className="card"
            style={{
              padding: '22px 24px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f7faff 100%)',
              border: '1.5px dashed #bed8f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '680px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  color: 'var(--navy)',
                  marginBottom: '6px',
                }}
              >
                <Icon name="file" cls="sm" /> Kabar Pasar &amp; Keterbukaan Informasi BEI · {ticker}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#506479',
                  lineHeight: 1.65,
                }}
              >
                Klik tombol di samping untuk memuat berita pasar modal terkini, sentimen emiten, dan keterbukaan informasi resmi BEI untuk <strong>{name}</strong> secara real-time. Anda juga dapat menekan tombol <em>Ganti Berita</em> untuk melihat berita lainnya.
              </p>
            </div>

            <button
              className="btn primary news-trigger-btn"
              onClick={() => {
                if (isStarter) {
                  onNotify?.('Akses berita bursa terkunci untuk akun Starter.');
                  onOpenContact?.('Kabar Terkini & Sentimen Pasar');
                  return;
                }
                loadNews(false);
              }}
              style={{
                padding: '10px 18px',
                fontSize: '12px',
                fontWeight: 650,
                boxShadow: '0 3px 12px rgba(14,52,101,0.18)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name="sparkles" cls="sm" /> Tampilkan Kabar Pasar ({ticker})
            </button>
          </div>
        ) : (
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
              : currentBatch.map((n, i) => {
                  const iconName =
                    n.icon || (i === 0 ? 'building' : i === 1 ? 'globe' : 'leaf');
                  const biasColor =
                    n.bias === 'positif'
                      ? 'positive'
                      : n.bias === 'negatif'
                      ? 'negative'
                      : '';
                  const dateStr = n.date || 'Hari ini';

                  return (
                    <button
                      key={`${batchIndex}-${i}`}
                      className="card news-card"
                      onClick={() => onOpenNewsDrawer(n)}
                      aria-label={`Baca berita: ${n.title}`}
                      style={{ background: 'none', border: '1px solid var(--line)' }}
                    >
                      <div className="news-meta">
                        <span className="news-category">
                          <Icon name={iconName} cls="sm" /> {n.category}
                          {n.ticker && n.ticker !== 'IHSG' ? ` · ${n.ticker}` : ''}
                        </span>
                        <span>
                          {dateStr}
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
        )}
      </LockedFeatureOverlay>
    </section>
  );
};
