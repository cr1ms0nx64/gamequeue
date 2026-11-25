'use client';
import Image from 'next/image';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';

export function GameGallery({ images, title }: { images: string[]; title: string }) {
  const gallery = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  if (!gallery.length) return null;

  const previous = () => setIndex((value) => (value - 1 + gallery.length) % gallery.length);
  const next = () => setIndex((value) => (value + 1) % gallery.length);

  return (
    <section className="game-gallery" aria-label={`Screenshots von ${title}`}>
      <div className="gallery-stage">
        <Image unoptimized width={1920} height={1080} src={gallery[index]} alt={`${title} Screenshot ${index + 1}`} />
        {gallery.length > 1 ? (
          <>
            <button className="gallery-arrow gallery-previous" onClick={previous} aria-label="Vorheriges Bild" type="button"><ChevronLeft /></button>
            <button className="gallery-arrow gallery-next" onClick={next} aria-label="Nächstes Bild" type="button"><ChevronRight /></button>
          </>
        ) : null}
        <a className="gallery-expand" href={gallery[index]} target="_blank" rel="noreferrer" title="Bild in voller Größe öffnen">
          <Expand />
        </a>
        <span className="gallery-counter">{index + 1} / {gallery.length}</span>
      </div>
      {gallery.length > 1 ? (
        <div className="gallery-thumbnails">
          {gallery.slice(0, 10).map((image, imageIndex) => (
            <button
              className={imageIndex === index ? 'active' : ''}
              key={image}
              onClick={() => setIndex(imageIndex)}
              aria-label={`Screenshot ${imageIndex + 1} anzeigen`}
              type="button"
            >
              <Image unoptimized width={1920} height={1080} src={image} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

