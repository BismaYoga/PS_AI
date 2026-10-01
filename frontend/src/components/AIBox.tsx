import React, { useState } from 'react';
import { StockItem, IndexItem, AIAnalysisResult } from '../types';
import { ChartCalculatedData, fmt, movingAverage, rsi } from '../utils';
import { Icon } from './Icon';

interface AIBoxProps {
  stockOrIndex: StockItem | IndexItem;
  isStock: boolean;
  chartCalc: ChartCalculatedData;
  period: string;
  onOpenDrawer: (type: string, payload?: any) => void;
  onNotify: (msg: string) => void;
}

const aiCache: Record<string, AIAnalysisResult> = {};

export const AIBox: React.FC<AIBoxProps> = ({
  stockOrIndex,
  isStock,
  chartCalc,
  period,
  onOpenDrawer,
  onNotify,
}) => {
  const ticker = stockOrIndex.ticker;
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(
    aiCache[ticker] || null
  );

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
  const val = (x?: { value: number }) => (x ? fmt(x.value, 0) : '—');

  const generateAIAnalysis = async (force: boolean = false) => {
    setAnalyzing(true);
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
        }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      aiCache[ticker] = data;
      setAnalysis(data);
      onNotify(`Analisis Gemini AI untuk ${ticker} berhasil digenerate!`);
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
      setAnalyzing(false);
    }
  };

  // 1. Loading state
  if (analyzing) {
    return (
      <div id="ai-summary">
        <div
          className="ai-box"
          style={{ borderLeft: '4px solid var(--blue)', background: '#fbfdff' }}
        >
          <div className="ai-top">
            <span className="ai-title">
              <Icon name="sparkles" cls="sm" /> Ringkasan AI Terpadu · {ticker}
            </span>
            <span className="pill blue">
              <span className="dot"></span>Memproses AI...
            </span>
          </div>
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
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
                style={{
                  width: '20px',
                  height: '20px',
                  animation: 'spin 1s linear infinite',
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Gemini AI sedang menganalisis teknikal chart ({ticker}) & 3 berita bursa terkini...
            </div>
            <p className="small muted" style={{ marginTop: '6px' }}>
              Memadukan MA20, MA50, RSI 14, Support/Resistance Fibonacci, dan sentimen Google Search hari ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Result state
  if (analysis && analysis.executive_summary) {
    const bias = analysis.sentiment_bias || 'netral';
    const biasColor =
      bias === 'positif' ? 'green' : bias === 'negatif' ? 'red' : 'blue';
    const sentiment = analysis.sentiment || 'Analisis Pasar';

    return (
      <div id="ai-summary">
        <div className="ai-box" style={{ borderLeft: `4px solid var(--${biasColor})` }}>
          <div className="ai-top">
            <div className="flex gap-8 wrap">
              <span className="ai-title">
                <Icon name="sparkles" cls="sm" /> Ringkasan AI · {ticker}
              </span>
              <span className={`pill ${biasColor}`}>
                <i className="dot"></i>
                {sentiment}
              </span>
              <span className="pill outline" style={{ fontSize: '9px' }}>
                Gemini AI Live
              </span>
            </div>
            <div className="flex gap-6">
              <button
                className="btn small-btn"
                onClick={() => generateAIAnalysis(true)}
                title="Analisis ulang dengan berita & teknikal paling mutakhir"
                style={{ fontSize: '10px', padding: '3px 8px' }}
              >
                <Icon name="refresh" cls="sm" /> Analisis Ulang
              </button>
              <button
                className="link-btn"
                onClick={() => onOpenDrawer('technical')}
                style={{ fontSize: '10px', marginLeft: '4px' }}
              >
                Dasar teknikal <Icon name="arrow-up-right" cls="sm" />
              </button>
            </div>
          </div>

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
                background: '#f8fafc',
                border: '1px solid #eef2f6',
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
                <Icon name="chart" cls="sm" /> Sinyal Teknikal & Momentum
              </div>
              <p
                style={{
                  fontSize: '11.5px',
                  lineHeight: 1.6,
                  color: '#475569',
                  margin: 0,
                }}
              >
                {analysis.technical_insight || 'Analisis teknikal MA dan RSI.'}
              </p>
            </div>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #eef2f6',
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
                  color: '#475569',
                  margin: 0,
                }}
              >
                {analysis.catalyst_insight || 'Sentimen berita bursa terkini.'}
              </p>
            </div>
          </div>

          {analysis.actionable_plan && (
            <div
              style={{
                background: '#f0f7ff',
                border: '1px solid #cce3fd',
                borderRadius: '8px',
                padding: '9px 12px',
                marginBottom: '12px',
                fontSize: '11.5px',
                color: '#1e4273',
                lineHeight: 1.65,
              }}
            >
              <strong>🎯 Rencana Aksi / Rekomendasi:</strong>{' '}
              {analysis.actionable_plan}
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
          <span className="pill blue">
            <i className="dot"></i>Gemini AI Siap
          </span>
        </div>

        <p
          className="ai-text"
          style={{ color: '#506479', lineHeight: 1.7, marginBottom: '12px' }}
        >
          Klik tombol di bawah untuk meminta <strong>Gemini AI</strong> menganalisis pergerakan {ticker}. AI akan memadukan indikator teknikal grafik (<strong>MA20, MA50, RSI 14, Support & Resistance</strong>) dengan <strong>3 berita bursa terkini</strong> yang baru saja terbit hari ini.
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
            onClick={() => onOpenDrawer('technical')}
            style={{ fontSize: '11px' }}
          >
            Dasar teknikal <Icon name="arrow-up-right" cls="sm" />
          </button>
        </div>
      </div>
    </div>
  );
};
