import type { Metadata, Viewport } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import './globals.css';
import './platform-shell-v2.css';

export const metadata: Metadata = {
  title: {
    default: 'cr1ms0n Games',
    template: '%s · cr1ms0n Games'
  },
  description: 'Community Game Queue für gemeinsame Spielabende.',
  icons: {
    icon: '/assets/crimson-favicon.png',
    apple: '/assets/crimson-icon.png'
  }
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="app-body">
        <Header />
        <div data-platform-content className="app-shell">
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

