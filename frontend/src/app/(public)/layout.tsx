import type { Metadata } from 'next';
import { generatePublicMetadata } from '@/shared/lib';

export const metadata: Metadata = generatePublicMetadata();

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50'>
      {children}
    </div>
  );
}
