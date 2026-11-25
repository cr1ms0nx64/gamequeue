'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';

export function usePlatformDrawer(open: boolean, onClose: () => void, sidebar: RefObject<HTMLElement | null>, trigger: RefObject<HTMLButtonElement | null>) {
  const [mobile, setMobile] = useState(false);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const media = matchMedia('(max-width: 980px)');
    const update = () => { setMobile(media.matches); if (!media.matches) close.current(); };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const opener = trigger.current;
    const background = [...document.querySelectorAll<HTMLElement>('[data-platform-content],[data-platform-dock]')];
    const previous = background.map(node => node.inert), overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    background.forEach(node => { node.inert = true; });
    const focusable = () => [...(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled)') || [])].filter(node => node.getClientRects().length > 0);
    focusable()[0]?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = focusable(), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      document.body.style.overflow = overflow;
      background.forEach((node,index) => { node.inert = previous[index]; });
      opener?.focus({ preventScroll: true });
    };
  }, [open, mobile, sidebar, trigger]);
  return mobile;
}

