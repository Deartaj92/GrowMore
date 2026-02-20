import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

type Spring = { mass: number; stiffness: number; damping: number };

export interface DockItemConfig {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badgeCount?: number;
}

export interface DockProps {
  items: DockItemConfig[];
  className?: string;
  magnification?: number; // max size in px
  distance?: number; // px falloff radius
  panelHeight?: number; // collapsed height
  dockHeight?: number; // expanded max height
  baseItemSize?: number; // base icon size
  mode?: 'auto' | 'light' | 'dark';
  blur?: number; // px
}

const DockBar = styled.div`
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 14px;
  padding: 10px 16px 12px 16px;
  border-radius: 20px;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  /* Subtle professional glass */
  background:
    radial-gradient(120px 120px at var(--x, 50%) var(--y, 60%), rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 45%, transparent 75%),
    linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 100%),
    rgba(18, 20, 26, 0.34);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.16),
    0 12px 28px rgba(0,0,0,0.28),
    0 6px 16px rgba(0,0,0,0.20);
  z-index: 2000;
  position: fixed;
  overflow: hidden;
  position: fixed;
  isolation: isolate;
  /* Liquid layers from reference */
  &::before { /* liquidGlass-effect */
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    backdrop-filter: blur(3px);
    filter: url(#glass-distortion);
  }
  &::after { /* liquidGlass-tint */
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    background: rgba(255,255,255,0.25);
    pointer-events: none;
  }
  > .lg-shine { /* liquidGlass-shine */
    position: absolute;
    inset: 0;
    z-index: 2;
    box-shadow: inset 2px 2px 1px 0 rgba(255,255,255,0.5), inset -1px -1px 1px 1px rgba(255,255,255,0.5);
    pointer-events: none;
  }
  /* subtle noise overlay */
  &::marker { /* dummy to keep pseudo slots unique */ }
  &:has(*)::marker { display: none; }
  & .noise { display: none; }
  & .noise-overlay {
    content: '';
  }
  /* minimal inner vignette */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(120% 140% at 50% 110%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.06) 35%, rgba(0,0,0,0) 70%);
  }
`;

const DockBtn = styled.button<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.06) 100%),
    ${({ theme }) => theme.BG === '#252525' ? 'rgba(28,31,39,0.55)' : 'rgba(246,248,252,0.55)'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#f1f5f9' : '#0f172a'};
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.28),
    0 10px 22px rgba(0,0,0,0.22);
  cursor: pointer;
  transition: filter 120ms ease;
  &:hover { filter: brightness(1.03); }
  outline: 1px solid rgba(255,255,255,0.12);
  /* subtle gloss highlight */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0) 100%);
    pointer-events: none;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #fff;
  box-shadow: 0 2px 8px rgba(239,68,68,0.5);
`;

const Tooltip = styled.div`
  position: absolute;
  left: 50%;
  top: -24px;
  transform: translateX(-50%);
  background: #060606;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
`;

function gaussianFalloff(distance: number, radius: number): number {
  const sigma = radius / 3; // standard deviation
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

export const Dock: React.FC<DockProps> = ({
  items,
  className,
  magnification = 70,
  distance = 200,
  panelHeight = 64,
  dockHeight = 256,
  baseItemSize = 50,
  mode = 'auto',
  blur = 30,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number>(Infinity);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const onMove = (e: MouseEvent) => {
      const rect = bar.getBoundingClientRect();
      setMouseX(e.clientX - rect.left);
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      bar.style.setProperty('--x', x + 'px');
      bar.style.setProperty('--y', y + 'px');
    };
    const onLeave = () => setMouseX(Infinity);
    bar.addEventListener('mousemove', onMove, { passive: true });
    bar.addEventListener('mouseleave', onLeave);
    return () => {
      bar.removeEventListener('mousemove', onMove);
      bar.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const sizes = useMemo(() => {
    const bar = barRef.current;
    if (!bar) return items.map(() => baseItemSize);
    const rect = bar.getBoundingClientRect();
    const gaps = 14;
    // approximate x for each item center
    let x = 14 + baseItemSize / 2; // padding left + half size
    return items.map(() => {
      const dist = Math.abs(mouseX - x);
      const influence = gaussianFalloff(dist, distance);
      const size = baseItemSize + influence * (magnification - baseItemSize);
      x += baseItemSize + gaps; // advance
      return size;
    });
  }, [mouseX, items, baseItemSize, magnification, distance]);

  const isDarkPreferred = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedMode = mode === 'auto' ? (isDarkPreferred ? 'dark' : 'light') : mode;
  const barStyle: React.CSSProperties = {
    backdropFilter: `blur(${blur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
    // tint bias
    background:
      `radial-gradient(140px 140px at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 42%, rgba(255,255,255,0.04) 72%, transparent 82%),`
      + `radial-gradient(40% 100% at 50% 100%, rgba(255,255,255,${resolvedMode==='dark'?0.12:0.18}) 0%, rgba(255,255,255,0.03) 100%),`
      + `linear-gradient(180deg, rgba(255,255,255,${resolvedMode==='dark'?0.22:0.34}) 0%, rgba(255,255,255,${resolvedMode==='dark'?0.06:0.10}) 100%),`
      + (resolvedMode==='dark' ? 'rgba(16,18,24,0.40)' : 'rgba(245,247,252,0.40)')
  } as any;

  return (
    <DockBar ref={barRef} className={className} style={barStyle} role="toolbar" aria-label="Application dock">
      {items.map((item, idx) => (
        <DockBtn
          key={idx}
          $size={sizes[idx] || baseItemSize}
          onMouseEnter={() => setHoveredIdx(idx)}
          onMouseLeave={() => setHoveredIdx((v) => (v === idx ? null : v))}
          onClick={item.onClick}
          aria-label={item.label}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
          {item.badgeCount !== undefined && item.badgeCount > 0 && (
            <Badge>{item.badgeCount > 99 ? '99+' : item.badgeCount}</Badge>
          )}
          {hoveredIdx === idx && <Tooltip role="tooltip">{item.label}</Tooltip>}
        </DockBtn>
      ))}
    </DockBar>
  );
};

export default Dock;


