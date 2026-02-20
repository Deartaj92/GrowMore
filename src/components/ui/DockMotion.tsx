import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';

type Spring = { mass: number; stiffness: number; damping: number };

export interface DockMotionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badgeCount?: number;
}

export interface DockMotionProps {
  items: DockMotionItem[];
  className?: string;
  magnification?: number; // px target size at center
  distance?: number; // px influence radius
  panelHeight?: number; // collapsed panel height
  dockHeight?: number; // expanded height
  baseItemSize?: number; // base icon size
}

const Bar = styled.div`
  position: fixed;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 8px 14px 10px 14px;
  border-radius: 16px;
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
    ? 'rgba(20, 22, 28, 0.65)'
    : 'rgba(246, 248, 252, 0.65)'};
  border: 1px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(0,0,0,0.06)'};
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
    ? '0 10px 28px rgba(0,0,0,0.35)'
    : '0 10px 22px rgba(0,0,0,0.16)'};
  z-index: 2000;
`;

const Btn = styled.button<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: ${({ theme }) => theme.BG === '#252525' ? '#1e2230' : '#f1f5f9'};
  color: ${({ theme }) => theme.BG === '#252525' ? '#e5e7eb' : '#0f172a'};
  box-shadow: 0 10px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: filter 140ms ease;
  cursor: pointer;
  &:hover { filter: brightness(1.03); }
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
  top: -22px;
  transform: translateX(-50%);
  background: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#060606' : '#111827'};
  color: ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a') ? '#fff' : '#f8fafc'};
  border: 1px solid ${({ theme }) => (theme.BG === '#252525' || theme.BG === '#181c2a')
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.1)'};
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
`;

export const DockMotion: React.FC<DockMotionProps> = ({
  items,
  className,
  magnification = 70,
  distance = 200,
  panelHeight = 64,
  dockHeight = 256,
  baseItemSize = 50,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number>(Infinity);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const onMove = (e: MouseEvent) => {
      const rect = bar.getBoundingClientRect();
      setIsHovering(true);
      setMouseX(e.clientX - rect.left);
    };
    const onLeave = () => {
      setIsHovering(false);
      setMouseX(Infinity);
    };
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
    // approximate centers assuming uniform base width and gap
    const gap = 16;
    let x = 14 + baseItemSize / 2;
    return items.map(() => {
      const dist = Math.abs(mouseX - x);
      const clamped = Math.max(0, 1 - dist / distance);
      const eased = clamped * clamped; // ease
      const size = baseItemSize + (magnification - baseItemSize) * eased;
      x += baseItemSize + gap;
      return size;
    });
  }, [mouseX, items, baseItemSize, magnification, distance]);

  // Outer wrapper reserves space; Bar stays compact to avoid large dark rectangle
  const wrapperStyle: React.CSSProperties = {
    height: isHovering ? Math.max(dockHeight, magnification + magnification / 2 + 4) : panelHeight,
    transition: 'height 180ms ease',
  };
  const barStyle: React.CSSProperties = {
    height: panelHeight,
    alignItems: 'flex-end',
  };

  return createPortal(
    <div style={{ position: 'fixed', left: '50%', bottom: 2, transform: 'translateX(-50%)', zIndex: 5000, pointerEvents: 'none', ...wrapperStyle }}>
      <div className={className} style={{ pointerEvents: 'auto' }}>
        <Bar ref={barRef} style={barStyle} role="toolbar" aria-label="Application dock">
          {items.map((item, idx) => (
            <Btn
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
            </Btn>
          ))}
        </Bar>
      </div>
    </div>,
    document.body
  );
};

export default DockMotion;


