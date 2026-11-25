'use client';
import PlatformError from '@/components/PlatformError';
import './globals.css';

export default function GlobalError(props: Parameters<typeof PlatformError>[0]) {
  return <html lang="de"><body><PlatformError {...props} /></body></html>;
}

