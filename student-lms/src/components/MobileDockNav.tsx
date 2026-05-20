import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  User,
  type LucideIcon,
} from 'lucide-react';
import './MobileDockNav.css';

type DockTab = {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const DOCK_TABS: DockTab[] = [
  { path: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { path: '/fees', label: 'Fees', icon: CreditCard },
  { path: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { path: '/academics', label: 'Academics', icon: GraduationCap },
  { path: '/profile', label: 'Profile', icon: User },
];

const BAR_HEIGHT = 64;
const NOTCH_HALF = 38;

function getActiveIndex(pathname: string): number {
  if (pathname === '/') return 2;
  for (let i = 0; i < DOCK_TABS.length; i++) {
    if (i === 2) continue;
    const { path } = DOCK_TABS[i];
    if (pathname === path || pathname.startsWith(`${path}/`)) return i;
  }
  return 2;
}

/** SVG path: dark bar with concave notch centered at `cx` */
function buildDockPath(width: number, cx: number): string {
  const y = 20;
  const l = Math.max(16, cx - NOTCH_HALF);
  const r = Math.min(width - 16, cx + NOTCH_HALF);
  return [
    `M 0 ${y + 16}`,
    `Q 0 ${y} 16 ${y}`,
    `L ${l} ${y}`,
    `C ${l + 18} ${y} ${cx - 26} 0 ${cx} 0`,
    `C ${cx + 26} 0 ${r - 18} ${y} ${r} ${y}`,
    `L ${width - 16} ${y}`,
    `Q ${width} ${y} ${width} ${y + 16}`,
    `L ${width} ${BAR_HEIGHT + 24}`,
    `L 0 ${BAR_HEIGHT + 24}`,
    'Z',
  ].join(' ');
}

export const MobileDockNav: React.FC = () => {
  const { pathname } = useLocation();
  const dockRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [layout, setLayout] = useState({ width: 360, cx: 180 });

  const activeIndex = getActiveIndex(pathname);
  const ActiveIcon = DOCK_TABS[activeIndex].icon;

  const measure = useCallback(() => {
    const dock = dockRef.current;
    const tab = tabRefs.current[activeIndex];
    if (!dock || !tab) return;
    const dockRect = dock.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const cx = tabRect.left - dockRect.left + tabRect.width / 2;
    setLayout({ width: dockRect.width, cx });
  }, [activeIndex]);

  useEffect(() => {
    measure();
    const dock = dockRef.current;
    if (!dock) return;
    const ro = new ResizeObserver(measure);
    ro.observe(dock);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, pathname]);

  return (
    <nav ref={dockRef} className="mobile-dock-nav" aria-label="Mobile navigation">
      <svg
        className="mobile-dock-svg"
        viewBox={`0 0 ${layout.width} ${BAR_HEIGHT + 20}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path className="mobile-dock-path" d={buildDockPath(layout.width, layout.cx)} />
      </svg>

      <div
        className="mobile-dock-bubble"
        style={{ left: layout.cx }}
        aria-hidden
      >
        <div className="mobile-dock-bubble-inner">
          <ActiveIcon size={26} strokeWidth={2.25} />
        </div>
      </div>

      <div className="mobile-dock-tabs">
        {DOCK_TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = index === activeIndex;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              className={`mobile-dock-tab ${isActive ? 'is-active' : ''}`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className="mobile-dock-tab-icon"
                size={22}
                strokeWidth={isActive ? 0 : 2}
                aria-hidden
              />
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
