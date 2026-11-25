'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight, Crown, Gamepad2, House, Info, LogIn, LogOut, Plus,
  Search, UserRound, X
} from 'lucide-react';
import type { SiteBranding } from '@/lib/branding';
import type { GamesUser } from '@/lib/types';
import { initials } from '@/lib/format';


export function HeaderClient({ user, branding }: { user: GamesUser | null; branding: SiteBranding }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState(params.get('q') || '');

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, params.toString()]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 980px)');
    const update = () => { setMobile(media.matches); if (!media.matches) setMenuOpen(false); };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!menuOpen || !mobile) return;
    const background = document.querySelector<HTMLElement>('.app-shell');
    const previousInert = background?.inert;
    if (background) background.inert = true;
    const focusable = () => [...(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input') || [])].filter(element => element.getClientRects().length > 0);
    focusable()[0]?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); }
      if (event.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      if (background) background.inert = previousInert ?? false;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [menuOpen, mobile]);

  useEffect(() => {
    document.body.classList.toggle('nav-drawer-open', menuOpen);
    return () => document.body.classList.remove('nav-drawer-open');
  }, [menuOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/?q=${encodeURIComponent(value)}` : '/');
    setMenuOpen(false);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/';
  }

  return (
    <>
      <header data-platform-mobile-header className="games-mobile-header">
        <Link className="games-brand games-brand--compact" href="/" aria-label={`${branding.siteName} Startseite`}>
          <span className="games-brand-icon">
            <img src={branding.iconUrl} alt="" />
          </span>
          <span className="games-brand-copy">
            <span className="site-name">{branding.siteName}</span>
            <small>Community</small>
          </span>
        </Link>
        <div className="games-mobile-actions">
          <Link
            aria-label={user ? 'Profil öffnen' : 'Anmelden'}
            className="games-mobile-profile"
            href={user ? '/account' : '/login'}
          >
            <span className="games-user-avatar">
              {user ? initials(user.displayName || user.username) : <LogIn />}
            </span>
          </Link>
          <button
            ref={triggerRef}
            aria-controls="games-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Navigation schließen' : 'Navigation öffnen'}
            className={`games-menu-button ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <aside data-platform-sidebar ref={sidebarRef} id="games-navigation" inert={mobile && !menuOpen} aria-label="Seitennavigation" className={`games-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div data-platform-brand className="games-sidebar-brand">
          <Link className="games-brand" href="/" aria-label={`${branding.siteName} Startseite`}>
            <span className="games-brand-icon">
              <img src={branding.iconUrl} alt="" />
            </span>
            <span className="games-brand-copy">
              <span className="site-name">{branding.siteName}</span>
              <small>Community</small>
            </span>
          </Link>
          <button
            aria-label="Navigation schließen"
            className="games-sidebar-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X />
          </button>
        </div>

        <nav data-platform-nav aria-label="Hauptnavigation" className="games-sidebar-nav">
          <section className="games-nav-section">
            <span className="games-nav-section-label">Games</span>
            <div className="games-nav-section-items">
              <Link className={`games-nav-item ${pathname === '/' || pathname.startsWith('/game/') ? 'is-active' : ''}`} href="/">
                <span className="games-nav-icon"><House /></span>
                <span>Übersicht</span>
              </Link>
              <Link className={`games-nav-item ${pathname.startsWith('/choice') ? 'is-active' : ''}`} href="/choice">
                <span className="games-nav-icon"><Crown /></span>
                <span>Community Choice</span>
              </Link>
            </div>
          </section>

          <section className="games-nav-section">
            <span className="games-nav-section-label">Community</span>
            <div className="games-nav-section-items">
              <Link className={`games-nav-item ${pathname.startsWith('/submit') ? 'is-active' : ''}`} href={user ? '/submit' : '/login?next=/submit'}>
                <span className="games-nav-icon"><Plus /></span>
                <span>Spiel vorschlagen</span>
              </Link>
              <Link className={`games-nav-item ${pathname.startsWith('/about') ? 'is-active' : ''}`} href="/about">
                <span className="games-nav-icon"><Info /></span>
                <span>Über die Community</span>
              </Link>
            </div>
          </section>

          <section className="games-nav-section">
            <span className="games-nav-section-label">Konto</span>
            <div className="games-nav-section-items">
              <a className="games-nav-item" href="/account">
                <span className="games-nav-icon"><UserRound /></span>
                <span>Mein Konto</span>
              </a>
            </div>
          </section>

          {user?.role === 'ADMIN' && <Link className={`games-nav-item ${pathname === '/admin' ? 'is-active' : ''}`} href="/admin"><span className="games-nav-icon"><UserRound /></span><span>Administration</span></Link>}
          <form className="games-sidebar-search" onSubmit={submitSearch}>
            <Search />
            <input
              aria-label="Spiele suchen"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Spiele suchen"
              value={query}
            />
            <button aria-label="Suche ausführen" type="submit"><ArrowRight /></button>
          </form>
        </nav>

        <div data-platform-footer className="games-sidebar-footer">
          {user ? (
            <a className="games-user-card" href="/account">
              <span className="games-user-avatar">{initials(user.displayName || user.username)}</span>
              <span className="games-user-copy">
                <strong>{user.displayName || user.username}</strong>
                <small>@{user.username}</small>
              </span>
              <span className="games-user-role">{user.role === 'ADMIN' ? 'Admin' : 'User'}</span>
            </a>
          ) : (
            <Link className="games-user-card games-login-card" href="/login">
              <span className="games-user-avatar"><LogIn /></span>
              <span className="games-user-copy">
                <strong>Anmelden</strong>
                <small>Community Konto verwenden</small>
              </span>
            </Link>
          )}
          <div className="games-sidebar-actions">
            <a aria-label="Konto öffnen" href="/account" title="Konto öffnen"><UserRound /></a>
            <Link aria-label="Spiel vorschlagen" href={user ? '/submit' : '/login?next=/submit'} title="Spiel vorschlagen"><Gamepad2 /></Link>
            {user ? (
              <button aria-label="Abmelden" onClick={logout} title="Abmelden" type="button"><LogOut /></button>
            ) : (
              <Link aria-label="Anmelden" href="/login" title="Anmelden"><LogIn /></Link>
            )}
          </div>
        </div>
      </aside>

      <button data-platform-backdrop
        aria-label="Navigation schließen"
        tabIndex={-1}
        aria-hidden="true"
        className={`games-sidebar-backdrop ${menuOpen ? 'is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        type="button"
      />
      <nav data-platform-dock aria-label="Schnellnavigation" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }} inert={menuOpen}>
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}><House /><span>Start</span></Link>
        <Link href="/choice" aria-current={pathname === '/choice' ? 'page' : undefined}><Crown /><span>Choice</span></Link>
        <Link href={user ? '/submit' : '/login?next=/submit'} aria-current={pathname === '/submit' ? 'page' : undefined}><Plus /><span>Vorschlagen</span></Link>
        <button type="button" aria-label="Navigation öffnen" onClick={() => setMenuOpen(true)}><img src="/platform-icons/menu.svg" alt="" width="21" height="21"/><span>Menü</span></button>
      </nav>
    </>
  );
}

