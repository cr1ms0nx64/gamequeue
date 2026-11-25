import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageUrl(page: number, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `?${query}` : '?';
}

export function Pagination({ page, pages, params }: { page: number; pages: number; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const visible = Array.from({ length: pages }, (_, index) => index + 1)
    .filter((value) => value === 1 || value === pages || Math.abs(value - page) <= 2);

  return (
    <nav className="pagination" aria-label="Seitennavigation">
      <Link
        className={page <= 1 ? 'disabled' : ''}
        href={pageUrl(Math.max(1, page - 1), params)}
        aria-label="Vorherige Seite"
      >
        <ChevronLeft />
      </Link>
      {visible.map((value, index) => {
        const previous = visible[index - 1];
        return (
          <span className="pagination-entry" key={value}>
            {previous && value - previous > 1 ? <span className="pagination-gap">…</span> : null}
            <Link className={value === page ? 'active' : ''} href={pageUrl(value, params)}>{value}</Link>
          </span>
        );
      })}
      <Link
        className={page >= pages ? 'disabled' : ''}
        href={pageUrl(Math.min(pages, page + 1), params)}
        aria-label="Nächste Seite"
      >
        <ChevronRight />
      </Link>
    </nav>
  );
}

