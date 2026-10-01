import React, { useState, useMemo } from 'react';
import { OHLCBar, Timeframe, ChartType } from '../types';
import { Activity, BarChart2 } from 'lucide-react';

interface InteractiveChartProps {
  ohlc: OHLCBar[];
  ticker: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({ ohlc, ticker }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('3M');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoverBar, setHoverBar] = useState<OHLCBar | null>(null);

  // Filter bars by timeframe
  const filteredBars = useMemo(() => {
    if (!ohlc || ohlc.length === 0) return [];
    let count = 60; // 3M
    if (timeframe === '1M') count = 22;
    if (timeframe === '6M') count = 125;
    if (timeframe === '1Y') count = 250;
    return ohlc.slice(-count);
  }, [ohlc, timeframe]);

  // Calculate Moving Averages
  const { ma20Series, ma50Series, rsi14, supportLevel, resistanceLevel } = useMemo(() => {
    if (!filteredBars || filteredBars.length === 0) {
      return { ma20Series: [], ma50Series: [], rsi14: 50, supportLevel: 0, resistanceLevel: 0 };
    }

    const closes = filteredBars.map(b => b.close);
    const ma20: (number | null)[] = [];
    const ma50: (number | null)[] = [];

    for (let i = 0; i < closes.length; i++) {
      if (i >= 19) {
        const slice = closes.slice(i - 19, i + 1);
        ma20.push(slice.reduce((a, b) => a + b, 0) / 20);
      } else {
        ma20.push(null);
      }

      if (i >= 49) {
        const slice = closes.slice(i - 49, i + 1);
        ma50.push(slice.reduce((a, b) => a + b, 0) / 50);
      } else {
        ma50.push(null);
      }
    }

    // Simple RSI(14)
    let rsi = 50;
    if (closes.length >= 15) {
      let gains = 0;
      let losses = 0;
      for (let i = closes.length - 14; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      if (avgLoss === 0) rsi = 100;
      else {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }
    }

    const lows = filteredBars.map(b => b.low);
    const highs = filteredBars.map(b => b.high);
    const minP = Math.min(...lows);
    const maxP = Math.max(...highs);

    return {
      ma20Series: ma20,
      ma50Series: ma50,
      rsi14: Math.round(rsi),
      supportLevel: Math.round(minP * 1.01),
      resistanceLevel: Math.round(maxP * 0.99)
    };
  }, [filteredBars]);

  // Chart dimensions & scaling
  const chartW = 920;
  const chartH = 340;
  const padLeft = 15;
  const padRight = 65;
  const padTop = 25;
  const padBottom = 45;
  const usableW = chartW - padLeft - padRight;
  const usableH = chartH - padTop - padBottom;

  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (filteredBars.length === 0) return { minPrice: 0, maxPrice: 100, maxVolume: 1 };
    let minP = Math.min(...filteredBars.map(b => b.low));
    let maxP = Math.max(...filteredBars.map(b => b.high));
    const pad = (maxP - minP) * 0.08 || 5;
    const maxV = Math.max(...filteredBars.map(b => b.volume || 1));
    return {
      minPrice: Math.max(0, minP - pad),
      maxPrice: maxP + pad,
      maxVolume: maxV
    };
  }, [filteredBars]);

  const priceToY = (price: number) => {
    return padTop + usableH * (1 - (price - minPrice) / (maxPrice - minPrice || 1));
  };

  const barCount = filteredBars.length;
  const barWidth = Math.max(2, Math.min(18, (usableW / barCount) * 0.72));

  // Compute Line Chart Path
  const linePoints = useMemo(() => {
    if (filteredBars.length === 0) return '';
    return filteredBars
      .map((b, i) => {
        const x = padLeft + (i + 0.5) * (usableW / barCount);
        const y = priceToY(b.close);
        return `${x},${y}`;
      })
      .join(' ');
  }, [filteredBars, barCount, usableW, minPrice, maxPrice]);

  return (
    <div className="chart-card">
      <div className="chart-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={18} style={{ color: '#0e3465' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Chart Interaktif {ticker}</h2>
          <span style={{ fontSize: 11, color: '#64748b' }}>({filteredBars.length} Hari Trading)</span>
        </div>

        <div className="chart-toggles">
          <div className="btn-group">
            {(['1M', '3M', '6M', '1Y'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                className={`btn-toggle ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="btn-group">
            <button
              className={`btn-toggle ${chartType === 'candlestick' ? 'active' : ''}`}
              onClick={() => setChartType('candlestick')}
            >
              Candle
            </button>
            <button
              className={`btn-toggle ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
            >
              Line
            </button>
          </div>

          <button
            className={`btn-toggle ${showMA20 ? 'active' : ''}`}
            onClick={() => setShowMA20(!showMA20)}
            style={{ color: showMA20 ? '#2563eb' : undefined }}
          >
            MA20
          </button>
          <button
            className={`btn-toggle ${showMA50 ? 'active' : ''}`}
            onClick={() => setShowMA50(!showMA50)}
            style={{ color: showMA50 ? '#1e3a8a' : undefined }}
          >
            MA50
          </button>
          <button
            className={`btn-toggle ${showVolume ? 'active' : ''}`}
            onClick={() => setShowVolume(!showVolume)}
          >
            Vol
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="svg-chart-wrapper" onMouseLeave={() => setHoverBar(null)}>
        {hoverBar && (
          <div style={{
            position: 'absolute',
            top: 10,
            left: 15,
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: 'monospace',
            display: 'flex',
            gap: 12,
            backdropFilter: 'blur(4px)'
          }}>
            <span>Tgl: {hoverBar.time}</span>
            <span>O: {hoverBar.open}</span>
            <span>H: {hoverBar.high}</span>
            <span>L: {hoverBar.low}</span>
            <span>C: {hoverBar.close}</span>
            <span>Vol: {hoverBar.volume.toLocaleString('id-ID')}</span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          style={{ width: '100%', height: '100%', display: 'block' }}
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const p = minPrice + (maxPrice - minPrice) * (1 - pct);
            const y = padTop + usableH * pct;
            return (
              <g key={pct}>
                <line x1={padLeft} y1={y} x2={chartW - padRight} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text x={chartW - padRight + 8} y={y + 4} fill="#64748b" fontSize="10" fontFamily="monospace">
                  {Math.round(p)}
                </text>
              </g>
            );
          })}

          {/* Volume bars */}
          {showVolume && filteredBars.map((b, i) => {
            const x = padLeft + (i + 0.5) * (usableW / barCount);
            const vHeight = (b.volume / (maxVolume || 1)) * 60;
            const y = padTop + usableH - vHeight;
            const isUp = b.close >= b.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={vHeight}
                fill={isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}
              />
            );
          })}

          {/* Candlesticks */}
          {chartType === 'candlestick' && filteredBars.map((b, i) => {
            const x = padLeft + (i + 0.5) * (usableW / barCount);
            const openY = priceToY(b.open);
            const closeY = priceToY(b.close);
            const highY = priceToY(b.high);
            const lowY = priceToY(b.low);
            const isUp = b.close >= b.open;
            const color = isUp ? '#10b981' : '#ef4444';
            const topY = Math.min(openY, closeY);
            const bodyH = Math.max(2, Math.abs(closeY - openY));

            return (
              <g
                key={`bar-${i}`}
                onMouseEnter={() => setHoverBar(b)}
                style={{ cursor: 'crosshair' }}
              >
                {/* Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.2" />
                {/* Body */}
                <rect
                  x={x - barWidth / 2}
                  y={topY}
                  width={barWidth}
                  height={bodyH}
                  fill={isUp ? color : color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* Line Chart */}
          {chartType === 'line' && (
            <polyline
              points={linePoints}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Moving Averages */}
          {showMA20 && (
            <polyline
              points={ma20Series
                .map((val, i) => {
                  if (val === null) return '';
                  const x = padLeft + (i + 0.5) * (usableW / barCount);
                  return `${x},${priceToY(val)}`;
                })
                .filter(Boolean)
                .join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
            />
          )}

          {showMA50 && (
            <polyline
              points={ma50Series
                .map((val, i) => {
                  if (val === null) return '';
                  const x = padLeft + (i + 0.5) * (usableW / barCount);
                  return `${x},${priceToY(val)}`;
                })
                .filter(Boolean)
                .join(' ')}
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>

      {/* Technical Summary Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        background: '#f8fafc',
        padding: 14,
        borderRadius: 10,
        border: '1px solid #e2e8f0',
        fontSize: 12
      }}>
        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>RSI (14):</span>{' '}
          <strong style={{ color: rsi14 >= 70 ? '#dc2626' : rsi14 <= 30 ? '#059669' : '#1e293b' }}>
            {rsi14} ({rsi14 >= 70 ? 'Overbought' : rsi14 <= 30 ? 'Oversold' : 'Netral'})
          </strong>
        </div>

        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Trend MA:</span>{' '}
          <strong>
            {ma20Series[ma20Series.length - 1] && filteredBars[filteredBars.length - 1].close > (ma20Series[ma20Series.length - 1] || 0)
              ? 'Bullish (Diatas MA20)'
              : 'Bearish (Dibawah MA20)'}
          </strong>
        </div>

        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Support Terdekat:</span>{' '}
          <strong style={{ color: '#059669' }}>Rp {supportLevel.toLocaleString('id-ID')}</strong>
        </div>

        <div>
          <span style={{ color: '#64748b', fontWeight: 600 }}>Resistance Terdekat:</span>{' '}
          <strong style={{ color: '#dc2626' }}>Rp {resistanceLevel.toLocaleString('id-ID')}</strong>
        </div>
      </div>
    </div>
  );
};
