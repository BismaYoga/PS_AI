import React, { useState, useEffect, useRef } from 'react';
import { Timeframe, ChartType, OHLCPoint } from '../types';
import { chartData, ChartCalculatedData, fmt, fmtDate, movingAverage } from '../utils';

interface MainChartProps {
  ticker: string;
  price: number;
  change: number;
  isStock: boolean;
  period: Timeframe;
  chartType: ChartType;
  showFib?: boolean;
  marketCache?: Record<string, any>;
  onChartCalculated?: (c: ChartCalculatedData) => void;
}

export const MainChart: React.FC<MainChartProps> = ({
  ticker,
  price,
  change,
  isStock,
  period,
  chartType,
  showFib = false,
  marketCache,
  onChartCalculated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 291 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Resize observer
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 800;
        const h = containerRef.current.clientHeight || 291;
        setDimensions({ width: Math.max(270, w), height: h });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const c = chartData(ticker, price, change, period, marketCache);

  useEffect(() => {
    if (onChartCalculated) {
      onChartCalculated(c);
    }
  }, [ticker, price, change, period]);

  const { width: w, height: h } = dimensions;
  const small = w < 550;
  const pad = { l: 8, r: small ? 56 : 72, t: 18, b: 28 };
  const plotW = w - pad.l - pad.r;
  const priceBottom = h - 73;
  const plotH = priceBottom - pad.t;

  let ymin = Math.min(...c.data.map((d) => d.low));
  let ymax = Math.max(...c.data.map((d) => d.high));
  const span = ymax - ymin;
  ymin -= span * 0.09;
  ymax += span * 0.1;

  const x = (i: number) => pad.l + (i / (c.data.length - 1)) * plotW;
  const y = (v: number) => pad.t + ((ymax - v) / (ymax - ymin)) * plotH;
  const volumeMax = Math.max(...c.data.map((d) => d.volume));

  // Grid lines
  const gridLines = [];
  for (let i = 0; i < 5; i++) {
    const v = ymin + ((ymax - ymin) * i) / 4;
    const yy = y(v);
    gridLines.push(
      <g key={`grid-${i}`}>
        <line
          x1={pad.l}
          y1={yy}
          x2={w - pad.r}
          y2={yy}
          stroke="#eef1f5"
          strokeWidth="1"
        />
        <text
          x={w - pad.r + 10}
          y={yy + 4}
          fontSize={small ? 9 : 10}
          fill="#8a97a5"
        >
          {fmt(v, 0)}
        </text>
      </g>
    );
  }

  // Date labels
  const dateLabels = [];
  const ticks = small ? 3 : 5;
  for (let i = 0; i < ticks; i++) {
    const ix = Math.round((i / (ticks - 1)) * (c.data.length - 1));
    const anchor = i === 0 ? 'start' : i === ticks - 1 ? 'end' : 'middle';
    dateLabels.push(
      <text
        key={`date-${i}`}
        x={x(ix)}
        y={h - 8}
        textAnchor={anchor}
        fontSize={small ? 9 : 10}
        fill="#8a97a5"
      >
        {new Date(c.data[ix].date + 'T12:00:00').toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        })}
      </text>
    );
  }

  // Volume bars
  const bw = Math.max(0.8, (plotW / c.data.length) * 0.64);
  const volumeBars = c.data.map((d, i) => {
    const hh = (d.volume / volumeMax) * 26;
    return (
      <rect
        key={`vol-${i}`}
        x={x(i) - bw / 2}
        y={h - 31 - hh}
        width={bw}
        height={hh}
        rx="0.5"
        fill={d.close >= d.open ? '#d7e5f2' : '#e8e1e5'}
      />
    );
  });

  // Price line or candles
  const pricePath = c.data
    .map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(d.close).toFixed(2)}`)
    .join(' ');

  // MA 20 dashed line
  let maPath = '';
  let maStarted = false;
  c.data.forEach((_, i) => {
    const ma = movingAverage(c.full, 20, c.start + i);
    if (ma !== null) {
      maPath += `${maStarted ? 'L' : 'M'}${x(i).toFixed(2)},${y(ma).toFixed(2)} `;
      maStarted = true;
    }
  });

  // Fibonacci retracement
  let fibElements = null;
  if (isStock && showFib) {
    const levelsToRender = c.levels.filter(
      (l) => !small || [0, 0.382, 0.618, 1].includes(l.ratio)
    );
    fibElements = levelsToRender.map((l, i) => (
      <g key={`fib-${i}`}>
        <line
          x1={pad.l}
          y1={y(l.value)}
          x2={w - pad.r}
          y2={y(l.value)}
          stroke={l.ratio === 0.618 ? '#759ac8' : '#b9cce2'}
          strokeWidth="0.8"
          strokeDasharray="4 4"
        />
        <rect
          x={pad.l + 4}
          y={y(l.value) - 13}
          width={small ? 100 : 112}
          height={13}
          fill="#ffffffdf"
        />
        <text
          x={pad.l + 8}
          y={y(l.value) - 3}
          fontSize={small ? 8 : 9}
          fill="#7489a5"
        >
          {fmt(l.ratio * 100, 1)}% · {fmt(l.value)}
        </text>
      </g>
    ));
  }

  const lastY = y(price);

  // Pointer hover calculation
  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    const px = e.clientX - b.left;
    const index = Math.min(
      c.data.length - 1,
      Math.max(0, Math.round(((px - pad.l) / plotW) * (c.data.length - 1)))
    );
    setHoverIndex(index);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const hoveredPoint: OHLCPoint | null =
    hoverIndex !== null && c.data[hoverIndex] ? c.data[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? x(hoverIndex) : 0;
  const hoverY = hoveredPoint ? y(hoveredPoint.close) : 0;

  let tooltipLeft = 0;
  let tooltipTop = 0;
  if (hoveredPoint) {
    tooltipLeft = Math.min(
      w - 167,
      Math.max(4, hoverX > plotW / 2 ? hoverX - 172 : hoverX + 15)
    );
    tooltipTop = Math.max(0, Math.min(h - 153, hoverY - 45));
  }

  return (
    <div className="chart-wrap" ref={containerRef} id="main-chart">
      <svg
        id="price-svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${ticker} ${period} ${
          chartType === 'line' ? 'garis' : 'candlestick'
        }, data pasar`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a62bf" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#1a62bf" stopOpacity="0" />
          </linearGradient>
          <clipPath id="plot-clip">
            <rect
              x={pad.l - 4}
              y={pad.t - 10}
              width={plotW + 8}
              height={plotH + 10}
            />
          </clipPath>
        </defs>

        {gridLines}
        {volumeBars}

        <g clipPath="url(#plot-clip)">
          {chartType === 'line' ? (
            <>
              <path
                d={`${pricePath} L${x(c.data.length - 1)},${priceBottom} L${x(
                  0
                )},${priceBottom} Z`}
                fill="url(#chart-fill)"
              />
              <path
                d={pricePath}
                fill="none"
                stroke="#1a62bf"
                strokeWidth="2.15"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            c.data.map((d, i) => {
              const color = d.close >= d.open ? '#408d7a' : '#bb6e78';
              return (
                <g key={`candle-${i}`}>
                  <line
                    x1={x(i)}
                    y1={y(d.high)}
                    x2={x(i)}
                    y2={y(d.low)}
                    stroke={color}
                    strokeWidth="1"
                  />
                  <rect
                    x={x(i) - bw / 2}
                    y={Math.min(y(d.open), y(d.close))}
                    width={bw}
                    height={Math.max(1.2, Math.abs(y(d.open) - y(d.close)))}
                    rx="0.5"
                    fill={color}
                  />
                </g>
              );
            })
          )}

          {maPath && (
            <path
              d={maPath}
              fill="none"
              stroke="#adbed3"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
          )}

          {fibElements}
        </g>

        {/* Current price indicator on right axis */}
        <line
          x1={x(c.data.length - 1)}
          y1={lastY}
          x2={w - pad.r + 5}
          y2={lastY}
          stroke="#1a62bf"
          strokeDasharray="3 3"
        />
        <rect
          x={w - pad.r + 3}
          y={lastY - 10}
          width={pad.r - 3}
          height="20"
          rx="4"
          fill="#1a62bf"
        />
        <text
          x={w - pad.r + pad.r / 2 + 1}
          y={lastY + 3.5}
          textAnchor="middle"
          fontSize={small ? 9 : 10}
          fill="white"
        >
          {fmt(price, isStock ? 0 : 2)}
        </text>

        {dateLabels}

        {/* Crosshair indicator */}
        {hoveredPoint && (
          <g id="crosshair" style={{ pointerEvents: 'none' }}>
            <line
              id="cross-x"
              x1={hoverX}
              x2={hoverX}
              y1={pad.t}
              y2={h - 30}
              stroke="#8c9db2"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
            <line
              id="cross-y"
              x1={pad.l}
              x2={w - pad.r}
              y1={hoverY}
              y2={hoverY}
              stroke="#8c9db2"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
            <circle
              id="cross-dot"
              cx={hoverX}
              cy={hoverY}
              r="3.5"
              fill="#1a62bf"
              stroke="white"
              strokeWidth="1.5"
            />
          </g>
        )}

        {/* Hover capture rect */}
        <rect
          id="chart-hover"
          x={pad.l}
          y={pad.t}
          width={plotW}
          height={h - pad.t - 28}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          className="chart-tooltip"
          id="chart-tooltip"
          style={{
            display: 'block',
            left: `${tooltipLeft}px`,
            top: `${tooltipTop}px`,
          }}
        >
          <div className="tip-date">
            {fmtDate(hoveredPoint.date)} · data sesi
          </div>
          {[
            ['Open', hoveredPoint.open],
            ['High', hoveredPoint.high],
            ['Low', hoveredPoint.low],
            ['Close', hoveredPoint.close],
          ].map(([lbl, val]) => (
            <div className="tip-row" key={lbl}>
              <span>{lbl}</span>
              <b>{fmt(Number(val), isStock ? 0 : 2)}</b>
            </div>
          ))}
          <div className="tip-row">
            <span>Volume</span>
            <b>{fmt(hoveredPoint.volume / 1e6, 1)} jt</b>
          </div>
        </div>
      )}
    </div>
  );
};
