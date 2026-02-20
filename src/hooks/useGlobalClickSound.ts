import { useContext, useEffect } from 'react';
import { MuteContext } from '../components/Layout';

function isButtonLike(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === 'BUTTON') return true;
  if (el.tagName === 'INPUT') {
    const type = el.getAttribute('type');
    return type === 'button' || type === 'submit' || type === 'reset';
  }
  if (el.tagName === 'A' && el.getAttribute('role') === 'button') return true;
  return false;
}

export default function useGlobalClickSound() {
  const { muted } = useContext(MuteContext);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body) {
        if (isButtonLike(el)) {
          if (!muted) {
            const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/click.mp3`);
            audio.volume = 1.0;
            audio.play().catch(() => { });
          }
          break;
        }
        el = el.parentElement;
      }
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [muted]);
} 