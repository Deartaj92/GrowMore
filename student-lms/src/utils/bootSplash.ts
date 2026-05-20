declare global {
  interface Window {
    __growmoreBoot?: {
      setProgress: (n: number) => void;
      getProgress: () => number;
    };
  }
}

let splashRemoved = false;

export function getBootProgress(): number {
  try {
    return window.__growmoreBoot?.getProgress?.() ?? 0;
  } catch {
    return 0;
  }
}

export function setBootProgress(percent: number): void {
  const p = Math.min(100, Math.max(0, percent));
  try {
    window.__growmoreBoot?.setProgress?.(p);
  } catch {
    const fill = document.getElementById('boot-progress-fill');
    const label = document.getElementById('boot-progress-label');
    if (fill) fill.style.width = `${p}%`;
    if (label) label.textContent = `${Math.round(p)}%`;
  }
}

export function finishBootSplash(): void {
  if (splashRemoved) return;
  const el = document.getElementById('boot-splash');
  if (!el) {
    splashRemoved = true;
    return;
  }
  splashRemoved = true;
  setBootProgress(100);
  el.classList.add('boot-splash--out');
  window.setTimeout(() => {
    el.remove();
  }, 320);
}
