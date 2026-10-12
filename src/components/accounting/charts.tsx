import React, { useState } from 'react';
import { money } from './ledger.ts';

// Validated against #F7F8F8 (scripts/validate_palette.js): sales/income blue, expenses amber.
export const SALES = '#1D5FD1';
export const EXPENSE = '#B4690E';

type Point = { label: string; value: number };

const W = 520;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 52 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
};
const short = (v: number) =>
  v >= 1_000_000 ? `₱${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M` : v >= 1000 ? `₱${Math.round(v / 1000)}K` : `₱${v}`;

// Shared frame: recessive hairline grid, clean y ticks, month labels.
const Frame: React.FC<{ max: number; points: Point[]; xAt: (i: number) => number; children: React.ReactNode }> = ({ max, points, xAt, children }) => (
  <>
    {[0, 0.5, 1].map((f) => {
      const y = PAD.top + innerH - f * innerH;
      return (
        <g key={f}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#DDE3E6" strokeWidth={1} />
          <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#6B767D">{short(max * f)}</text>
        </g>
      );
    })}
    {points.map((p, i) => (
      <text key={p.label} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#4E585E">{p.label}</text>
    ))}
    {children}
  </>
);

// Hover read-out above the plot; the plot keeps its height whether or not one is shown.
const Readout: React.FC<{ point?: Point; name: string }> = ({ point, name }) => (
  <p className="h-5 text-[12.5px] text-[#4E585E] tabular-nums" aria-live="polite">
    {point ? <><strong className="text-[#141517]">{point.label}</strong> · {name} {money(point.value)}</> : 'Hover a month for its total'}
  </p>
);

const Table: React.FC<{ points: Point[]; name: string }> = ({ points, name }) => (
  <table className="sr-only">
    <caption>{name} by month</caption>
    <tbody>{points.map((p) => <tr key={p.label}><th>{p.label}</th><td>{money(p.value)}</td></tr>)}</tbody>
  </table>
);

export const LineChart: React.FC<{ points: Point[]; name: string }> = ({ points, name }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const xAt = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(p.value)}`).join(' ');
  const area = `${line} L${xAt(points.length - 1)},${PAD.top + innerH} L${xAt(0)},${PAD.top + innerH} Z`;
  const slot = innerW / Math.max(points.length - 1, 1);
  return (
    <div>
      <Readout point={hover === null ? undefined : points[hover]} name={name} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${name} by month`} onMouseLeave={() => setHover(null)}>
        <Frame max={max} points={points} xAt={xAt}>
          <path d={area} fill={SALES} opacity={0.1} />
          <path d={line} fill="none" stroke={SALES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#8C989F" strokeWidth={1} />}
          {points.map((p, i) => (
            <g key={p.label}>
              <circle cx={xAt(i)} cy={yAt(p.value)} r={i === hover || i === points.length - 1 ? 5 : 0} fill={SALES} stroke="#F7F8F8" strokeWidth={2} />
              <rect x={xAt(i) - slot / 2} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          ))}
        </Frame>
      </svg>
      <Table points={points} name={name} />
    </div>
  );
};

export const ColumnChart: React.FC<{ points: Point[]; name: string }> = ({ points, name }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const band = innerW / points.length;
  const bar = Math.min(24, band * 0.6);
  const xAt = (i: number) => PAD.left + band * i + band / 2;
  return (
    <div>
      <Readout point={hover === null ? undefined : points[hover]} name={name} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${name} by month`} onMouseLeave={() => setHover(null)}>
        <Frame max={max} points={points} xAt={xAt}>
          {points.map((p, i) => {
            const h = Math.max((p.value / max) * innerH, p.value ? 2 : 0);
            const x = xAt(i) - bar / 2;
            const y = PAD.top + innerH - h;
            const r = Math.min(4, h);
            return (
              <g key={p.label} onMouseEnter={() => setHover(i)}>
                <rect x={xAt(i) - band / 2} y={PAD.top} width={band} height={innerH} fill={hover === i ? '#EEF1F2' : 'transparent'} />
                {/* rounded data end, square at the baseline */}
                <path
                  d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bar - r},${y} Q${x + bar},${y} ${x + bar},${y + r} L${x + bar},${y + h} Z`}
                  fill={EXPENSE}
                />
              </g>
            );
          })}
        </Frame>
      </svg>
      <Table points={points} name={name} />
    </div>
  );
};
