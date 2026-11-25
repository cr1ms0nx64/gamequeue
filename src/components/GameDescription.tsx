'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

function previewText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const ending = value.lastIndexOf(' ', limit);
  return `${value.slice(0, ending > limit * 0.8 ? ending : limit).trim()}…`;
}

export function GameDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = text.length > 1000;
  const preview = useMemo(() => previewText(text, 1000), [text]);

  return (
    <>
      <p className="about-text">{expanded || !collapsible ? text : preview}</p>
      {collapsible ? (
        <button className="description-toggle" onClick={() => setExpanded((value) => !value)} type="button">
          {expanded ? <ChevronUp /> : <ChevronDown />}
          {expanded ? 'Weniger anzeigen' : 'Vollständige Beschreibung'}
        </button>
      ) : null}
    </>
  );
}

