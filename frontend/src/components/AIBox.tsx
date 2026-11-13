import React, { useState, useEffect } from 'react';
import { StockItem, IndexItem, AIAnalysisResult, UserProfile } from '../types';
import { ChartCalculatedData, fmt, movingAverage, rsi, isUserProOrAdmin } from '../utils';
import { Icon } from './Icon';

interface AIBoxProps {
  stockOrIndex: StockItem | IndexItem;
  isStock: boolean;
  chartCalc: ChartCalculatedData;
  period: string;
  onOpenDrawer: (type: string, payload?: any) => void;
  onNotify: (msg: string) => void;
  currentUser?: UserProfile | null;
  onUpdateTokens?: (tokens: { monthly?: number; additional?: number; total?: number }) => void;
}

const aiCache: Record<string, AIAnalysisResult> = {};
const activeAiPending = new Set<string>();
type AiListener = (ticker: string) => void;
const aiListeners = new Set<AiListener>();

function notifyAiListeners(ticker: string) {
  aiListeners.forEach((cb) => {
    try {
      cb(ticker);
    } catch (e) {
      console.error(e);
    }
  });
}

export const AIBox: React.FC<AIBoxProps> = ({
  stockOrIndex,
  isStock,
  chartCalc,
  period,
  onOpenDrawer,
  onNotify,
  currentUser,
  onUpdateTokens,
}) => {
  const isPro = isUserProOrAdmin(currentUser);
  const isStarter = !isPro;
  const ticker = stockOrIndex.ticker;
  const [analyzing, setAnalyzing] = useState<boolean>(activeAiPending.has(ticker));
  const [viewMode, setViewMode] = useState<'ringkas' | 'lengkap'>('ringkas');
  const [languageMode, setLanguageMode] = useState<'pro' | 'santai'>('santai');
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(
    aiCache[ticker] || null
  );

  // Reset / sinkronkan state analisis setiap kali pengguna beralih emiten atau remount/tab switch
  useEffect(() => {
    setAnalysis(aiCache[ticker] || null);
    setAnalyzing(activeAiPending.has(ticker));
    setViewMode('ringkas');

    const listener = (updatedTicker: string) => {
      if (updatedTicker === ticker) {
        setAnalyzing(activeAiPending.has(ticker));
        setAnalysis(aiCache[ticker] || null);
      }
    };
    aiListeners.add(listener);
    return () => {
      aiListeners.delete(listener);
    };
  }, [ticker]);

  const ma20 = movingAverage(chartCalc.full, 20, chartCalc.full.length - 1);
  const ma50 = movingAverage(chartCalc.full, 50, chartCalc.full.length - 1);
  const rs = rsi(chartCalc.full);
  const above20 = ma20 !== null ? stockOrIndex.price > ma20 : true;
  const above50 = ma50 !== null ? stockOrIndex.price > ma50 : true;

  const support = chartCalc.levels
    .filter((l) => l.value < stockOrIndex.price)
    .sort((a, b) => b.value - a.value);
  const res = chartCalc.levels
    .filter((l) => l.value > stockOrIndex.price)
    .sort((a, b) => a.value - b.value);
  const S = support[0];
  const R = res[0];
  const S2 = support[1] || (S ? { value: Math.round(S.value * 0.98) } : undefined);
  const R2 = res[1] || (R ? { value: Math.round(R.value * 1.02) } : undefined);
  const pivotVal = Math.round(
    (stockOrIndex.price + (S ? S.value : stockOrIndex.price) + (R ? R.value : stockOrIndex.price)) / 3
  );
  const pivot = { value: pivotVal };
  const val = (x?: { value: number }) => (x ? fmt(x.value, 0) : '—');

  const generateAIAnalysis = async (force: boolean = false) => {
    if (isStarter) {
      onNotify('Fitur Analisis AI eksklusif untuk investor Pro Trader (0 Token tersisa).');
      return;
    }
    if (activeAiPending.has(ticker)) return;
    activeAiPending.add(ticker);
    setAnalyzing(true);
    notifyAiListeners(ticker);

    const techData = {
      ticker,
      price: fmt(stockOrIndex.price, isStock ? 0 : 2),
      change: fmt(stockOrIndex.change, 2),
      period,
      ma20: ma20 ? fmt(ma20, 0) : '—',
      ma50: ma50 ? fmt(ma50, 0) : '—',
      rsi: fmt(rs, 1),
      support: val(S),
      resistance: val(R),
      above_ma20: above20,
      above_ma50: above50,
    };

    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          technical: techData,
          force,
          user_id: currentUser?.id,
          email: currentUser?.email,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || ('HTTP ' + res.status));
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.remaining_tokens) {
        onUpdateTokens?.(data.remaining_tokens);
      }

      aiCache[ticker] = data;
      setAnalysis(data);
      const remTotal = data.remaining_tokens ? (data.remaining_tokens.total ?? (data.remaining_tokens.monthly + data.remaining_tokens.additional)) : null;
      onNotify(
        remTotal !== null
          ? `Analisis cerdas untuk ${ticker} berhasil disiapkan! (1 Token digunakan, sisa: ${remTotal} Token)`
          : `Analisis cerdas untuk ${ticker} berhasil disiapkan!`
      );
    } catch (err: any) {
      console.warn('[AI Analysis] Error or fallback:', err);
      // Fallback local rule generation
      const sentiment = above20 && above50 ? 'Akumulasi' : !above20 && !above50 ? 'Distribusi' : 'Konsolidasi';
      const bias = above20 && above50 ? 'positif' : !above20 && !above50 ? 'negatif' : 'netral';
      const fallbackResult: AIAnalysisResult = {
        sentiment,
        sentiment_bias: bias,
        executive_summary: `${ticker} saat ini diperdagangkan di level ${fmt(stockOrIndex.price, isStock ? 0 : 2)} (${stockOrIndex.change >= 0 ? '+' : ''}${fmt(stockOrIndex.change, 2)}%). Indikator teknikal menunjukkan momentum ${sentiment.toLowerCase()} dengan RSI 14 berada di ${fmt(rs, 1)}. Support terdekat teridentifikasi di ${val(S)} dan resistance di ${val(R)}.`,
        technical_insight: `Rata-rata pergerakan MA20 berada di ${ma20 ? fmt(ma20, 0) : '—'} dan MA50 di ${ma50 ? fmt(ma50, 0) : '—'}. Posisi harga berada ${above20 ? 'di atas' : 'di bawah'} garis tren jangka menengah.`,
        catalyst_insight: `Sentimen pasar dipengaruhi oleh dinamika suku bunga acuan dan arus transaksi institusional pada sektor ${isStock ? (stockOrIndex as StockItem).sector : 'IHSG'}.`,
        actionable_plan: above20
          ? `Pertahankan posisi hold atau cicil beli saat pullback mendekati area support ${val(S)} dengan target bertahap ${val(R)}.`
          : `Wait and see hingga konfirmasi pembalikan arah di atas resistance terdekat ${val(R)} dengan disiplin stop-loss di bawah ${val(S)}.`,
        key_levels: {
          support: val(S),
          resistance: val(R),
          rsi: fmt(rs, 1),
          ma_status: above20 && above50 ? 'Bullish' : 'Koreksi',
        },
        timestamp: 'Baru saja',
      };
      aiCache[ticker] = fallbackResult;
      setAnalysis(fallbackResult);
      onNotify(`Ringkasan teknikal & pasar ${ticker} berhasil disiapkan.`);
    } finally {
      activeAiPending.delete(ticker);
      setAnalyzing(false);
      notifyAiListeners(ticker);
    }
  };

  // 1. Loading state (OpenAI-inspired clean style)
  if (analyzing) {
    return (
      <div id="ai-summary">
        <div
          className="ai-box"
          style={{
            border: '1px solid var(--line)',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            padding: '20px 22px',
          }}
        >
          <div className="ai-top">
            <span className="ai-title">
              <Icon name="sparkles" cls="sm" /> Analisis Cerdas Pasar · {ticker}
            </span>
            <span className="pill outline" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="dot" style={{ background: 'var(--blue)', animation: 'pulse-bg 1s infinite' }}></span>
              Memproses Analisis AI...
            </span>
          </div>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
                color: 'var(--navy)',
                fontSize: '13px',
              }}
            >
              <svg
                className="spin-animation"
                style={{
                  width: '20px',
                  height: '20px',
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Sistem sedang menganalisis teknikal chart ({ticker}) &amp; sentimen berita resmi BEI...
            </div>
            <p className="small muted" style={{ marginTop: '8px', fontSize: '12px' }}>
              Memadukan MA20, MA50, RSI 14, Support/Resistance, serta berita terkini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Result state (hanya tampil jika analisis cocok dengan emiten yang sedang aktif)
  if (analysis && analysis.ticker === ticker && analysis.executive_summary) {
    const bias = analysis.sentiment_bias || 'netral';
    const biasColor =
      bias === 'positif' ? 'green' : bias === 'negatif' ? 'red' : 'blue';
    const sentiment = analysis.sentiment || 'Analisis Pasar';

    return (
      <div id="ai-summary">
        {/* OpenAI-inspired Clean Minimalist Card (No Heavy Colored Borders) */}
        <div
          className="ai-box"
          style={{
            border: '1px solid var(--line)',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            padding: '18px 20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div className="ai-top" style={{ marginBottom: '14px' }}>
            <div className="flex gap-8 wrap">
              <span className="ai-title" style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)' }}>
                <Icon name="sparkles" cls="sm" style={{ color: 'var(--blue)' }} /> Analisis PintarSaham AI · {ticker}
              </span>
              <span className="pill outline" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <i className="dot" style={{ background: bias === 'positif' ? '#10b981' : bias === 'negatif' ? '#ef4444' : '#0284c7' }}></i>
                {sentiment}
              </span>
            </div>

            <div className="flex gap-6 wrap">
              {/* Language Mode Toggle: Non-Finance Simple vs Professional Technical */}
              <div className="segmented" style={{ padding: '2px', background: 'var(--soft)', borderRadius: '6px' }}>
                <button
                  type="button"
                  className={languageMode === 'santai' ? 'active' : ''}
                  onClick={() => setLanguageMode('santai')}
                  style={{ fontSize: '10.5px', padding: '4px 10px', fontWeight: languageMode === 'santai' ? 700 : 500 }}
                  title="Bahasa santai & mudah dipahami untuk orang non-finance / pemula"
                >
                  Bahasa Santai (Pemula)
                </button>
                <button
                  type="button"
                  className={languageMode === 'pro' ? 'active' : ''}
                  onClick={() => setLanguageMode('pro')}
                  style={{ fontSize: '10.5px', padding: '4px 10px', fontWeight: languageMode === 'pro' ? 700 : 500 }}
                  title="Analisis teknikal, rasio fundamental & trading plan"
                >
                  Analisis Profesional
                </button>
              </div>

              {isStock && languageMode === 'pro' && (
                <div className="segmented" style={{ padding: '2px', background: 'var(--soft)', borderRadius: '6px' }}>
                  <button
                    type="button"
                    className={viewMode === 'ringkas' ? 'active' : ''}
                    onClick={() => setViewMode('ringkas')}
                    style={{ fontSize: '10px', padding: '4px 8px' }}
                  >
                    Taktis
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'lengkap' ? 'active' : ''}
                    onClick={() => setViewMode('lengkap')}
                    style={{ fontSize: '10px', padding: '4px 8px' }}
                  >
                    Mendalam
                  </button>
                </div>
              )}

              <button
                className="btn small-btn"
                onClick={() => generateAIAnalysis(true)}
                title="Analisis ulang dengan berita & teknikal paling mutakhir"
                style={{ fontSize: '10px', padding: '4px 9px' }}
              >
                <Icon name="refresh" cls="sm" /> Ulang
              </button>
              <button
                className="link-btn"
                onClick={() => onOpenDrawer('technical', { stock: stockOrIndex, chartCalc, ticker })}
                style={{ fontSize: '11px', marginLeft: '4px' }}
                title="Buka rincian data teknikal chart"
              >
                Dasar teknikal <Icon name="arrow-up-right" cls="sm" />
              </button>
            </div>
          </div>

          {/* Simple Language Card for Non-Finance Users */}
          {languageMode === 'santai' ? (
            <div
              style={{
                background: 'var(--soft, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Panduan Bahasa Awam (Mudah Dipahami Non-Finance):
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.75, color: 'var(--ink)' }}>
                {analysis.simple_summary || analysis.executive_summary}
              </p>
            </div>
          ) : (
            <p
              className="ai-text"
              style={{
                fontSize: '12.5px',
                lineHeight: 1.8,
                color: 'var(--ink)',
                marginBottom: '14px',
              }}
            >
              {analysis.executive_summary}
            </p>
          )}

          {/* Status Kelayakan Pasar Khusus IHSG (Jika Indeks) */}
          {(ticker === 'IHSG' || analysis.is_index) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--soft, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="target" cls="sm" style={{ color: 'var(--navy)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Kesimpulan Kelayakan Investasi Pasar:
                </span>
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 750,
                  color:
                    analysis.market_status?.includes('Layak')
                      ? '#059669'
                      : analysis.market_status?.includes('Waspada') || analysis.market_status?.includes('Wait')
                      ? '#d97706'
                      : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="dot" style={{
                  background: analysis.market_status?.includes('Layak') ? '#059669' : '#d97706',
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }}></span>
                {analysis.market_status || 'Waspada / Netral (Wait & See)'}
              </div>
            </div>
          )}

          {/* Mode 1: Support & Resisten Kunci Teknikal (Hanya untuk Emiten Saham) */}
          {isStock && viewMode === 'ringkas' ? (
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Support 1 (S1)
                  </span>
                  <strong style={{ fontSize: '13px', color: '#16a34a' }}>
                    Rp{val(S)}
                  </strong>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Support 2 (S2)
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0d9488' }}>
                    Rp{val(S2)}
                  </strong>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Resisten 1 (R1)
                  </span>
                  <strong style={{ fontSize: '13px', color: '#dc2626' }}>
                    Rp{val(R)}
                  </strong>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Resisten 2 (R2)
                  </span>
                  <strong style={{ fontSize: '13px', color: '#b91c1c' }}>
                    Rp{val(R2)}
                  </strong>
                </div>

                <div style={{ background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                    Pivot Konsolidasi
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--navy, #0e3465)' }}>
                    Rp{val(pivot)}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Analisis Mendalam (Teknikal & Berita) - Tampil untuk IHSG atau saat mode mendalam */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  background: 'var(--soft)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Icon name="chart" cls="sm" /> Sinyal Teknikal &amp; Momentum
                </div>
                <p
                  style={{
                    fontSize: '11.5px',
                    lineHeight: 1.6,
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  {analysis.technical_insight || 'Analisis teknikal MA dan RSI.'}
                </p>
              </div>
              <div
                style={{
                  background: 'var(--soft)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Icon name="file" cls="sm" /> Katalis Berita Terkini
                </div>
                <p
                  style={{
                    fontSize: '11.5px',
                    lineHeight: 1.6,
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  {analysis.catalyst_insight || 'Sentimen berita bursa terkini.'}
                </p>
              </div>
            </div>
          )}

          {/* Actionable Plan Linked to Recent News Catalysts */}
          {analysis.actionable_plan && (
            <div
              style={{
                background: 'var(--soft, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px',
                fontSize: '12px',
                lineHeight: 1.65,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon name="target" cls="sm" style={{ color: 'var(--blue)', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {ticker === 'IHSG' ? 'Strategi Investasi Pasar Terkini:' : 'Rencana Aksi & Rekomendasi Terkait Berita:'}
                </span>
              </div>
              <div style={{ color: 'var(--ink)' }}>
                {analysis.actionable_plan}
              </div>
            </div>
          )}

          <div className="ai-bottom">
            <div className="ai-levels">
              <span className="ai-level">
                Support <b>{analysis.key_levels?.support || val(S)}</b>
              </span>
              <span className="ai-level">
                Resistance <b>{analysis.key_levels?.resistance || val(R)}</b>
              </span>
              <span className="ai-level">
                RSI 14 <b>{analysis.key_levels?.rsi || fmt(rs, 1)}</b>
              </span>
              <span className="ai-level">
                Status MA{' '}
                <b>
                  {analysis.key_levels?.ma_status ||
                    (above20 && above50 ? 'Bullish' : 'Koreksi')}
                </b>
              </span>
            </div>
            <span className="small muted" style={{ fontSize: '10px' }}>
              {analysis.timestamp || 'Baru saja'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Ready state (Interactive trigger)
  return (
    <div id="ai-summary">
      <div
        className="ai-box"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f7faff 100%)',
          border: '1.5px dashed #bed8f7',
        }}
      >
        <div className="ai-top">
          <span
            className="ai-title"
            style={{ color: 'var(--navy)', fontSize: '13px', fontWeight: 700 }}
          >
            <Icon name="sparkles" cls="sm" /> Ringkasan AI Terpadu · {ticker}
          </span>
        </div>

        <p
          className="ai-text"
          style={{ color: '#506479', lineHeight: 1.7, marginBottom: '12px' }}
        >
          Klik tombol di bawah untuk menganalisis pergerakan {ticker}. Analisis cerdas akan memadukan indikator teknikal grafik (<strong>MA20, MA50, RSI 14, Support &amp; Resistance</strong>) dengan <strong>berita pasar, sentimen makro, dan kinerja emiten terkini</strong>.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            background: '#ffffff',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '14px',
            fontSize: '11px',
          }}
        >
          <span style={{ color: 'var(--muted)' }}>Data yang akan dianalisis:</span>
          <span>
            Harga: <strong>Rp{fmt(stockOrIndex.price, isStock ? 0 : 2)}</strong>
          </span>
          <span>
            RSI 14: <strong>{fmt(rs, 1)}</strong>
          </span>
          <span>
            Support: <strong>{val(S)}</strong>
          </span>
          <span>
            Resistance: <strong>{val(R)}</strong>
          </span>
          <span>
            Posisi MA:{' '}
            <strong>
              {above20 && above50
                ? 'Di atas MA20 & MA50'
                : !above20 && !above50
                ? 'Di bawah MA20 & MA50'
                : 'Uji MA'}
            </strong>
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn primary"
            onClick={() => generateAIAnalysis(false)}
            style={{
              padding: '9px 18px',
              fontSize: '12px',
              fontWeight: 650,
              boxShadow: '0 3px 12px rgba(14,52,101,0.18)',
            }}
          >
            <Icon name="sparkles" cls="sm" /> Generate Analisis AI ({ticker})
          </button>
          <button
            className="link-btn"
            onClick={() => onOpenDrawer('technical', { stock: stockOrIndex, chartCalc, ticker })}
            style={{ fontSize: '11px' }}
            title="Buka rincian data teknikal chart"
          >
            Dasar teknikal <Icon name="arrow-up-right" cls="sm" />
          </button>
        </div>
      </div>
    </div>
  );
};
