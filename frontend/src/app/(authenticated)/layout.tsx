/**
 * 認証済みユーザー用レイアウト
 * 認証チェックはMiddlewareで実施済みのため、ここではレイアウトのみを提供
 */
import { generateAuthenticatedMetadata } from '@/shared/lib';
import type { Metadata } from 'next';
export const metadata: Metadata = generateAuthenticatedMetadata();

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <main>{children}</main>
    </div>
  );
}
