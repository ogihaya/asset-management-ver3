import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { notoSansJP, generateMetadata } from '@/shared/lib';

export const metadata: Metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ja'>
      <body className={notoSansJP.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
