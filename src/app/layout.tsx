import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GrameenWifi - Admin Panel',
  description: 'GrameenWifi Management System · Kalikaccha, Sarail, Brahmanbaria',
  icons: {
    icon: [
      { url: '/icon.png?v=2', type: 'image/png' },
      { url: '/favicon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png?v=2', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon.png?v=2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}