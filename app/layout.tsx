import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bible Giants — Ondo & Ekiti Camp Meeting',
  description: 'Live Bible quiz competition for the Apostolic Faith camp meeting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream-50 text-ink-900 font-sans antialiased">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}

