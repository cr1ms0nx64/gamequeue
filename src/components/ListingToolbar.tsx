'use client';

import Link from 'next/link';
import { ArrowUpDown, Plus } from 'lucide-react';
import type { GamesUser } from '@/lib/types';

type Tab = { value: string; label: string };

export function ListingToolbar({
  basePath,
  tabs,
  activeTab,
  sort,
  user,
  search,
  tabKey = 'filter',
  resultCount
}: {
  basePath: string;
  tabs: Tab[];
  activeTab: string;
  sort: string;
  user: GamesUser | null;
  search?: string;
  tabKey?: string;
  resultCount: number;
}) {
  function queryUrl(next: Record<string, string>) {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'all' && value !== 'newest') params.set(key, value);
    }
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ''}`;
  }

  return (
    <div className="listing-toolbar">
      <div className="listing-tabs" role="tablist" aria-label="Spiele filtern">
        {tabs.map((tab) => (
          <Link
            className={activeTab === tab.value ? 'active' : ''}
            href={queryUrl({ [tabKey]: tab.value, sort })}
            key={tab.value}
            role="tab"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="listing-tools">
        <span className="result-count">{resultCount} Spiele</span>
        <label className="sort-select">
          <ArrowUpDown />
          <span className="sr-only">Sortierung</span>
          <select
            defaultValue={sort}
            onChange={(event) => { window.location.href = queryUrl({ [tabKey]: activeTab, sort: event.target.value }); }}
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
            <option value="score">Community Score</option>
            {basePath === '/choice' ? <option value="owner">Admin Score</option> : null}
            <option value="submitted">Am häufigsten vorgeschlagen</option>
            <option value="release">Release-Datum</option>
            <option value="title">Alphabetisch</option>
          </select>
        </label>
        <Link className="button button-primary suggest-button" href={user ? '/submit' : '/login?next=/submit'}>
          <Plus />
          Spiel vorschlagen
        </Link>
      </div>
    </div>
  );
}

