
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-primary/5 p-4">
      <div className="mb-8 flex items-center gap-3 text-center">
        <Logo className="h-10 w-10 text-primary" />
        <h1 className="font-headline text-4xl font-bold text-primary">
          Sonorus
        </h1>
      </div>
      {children}
      <p className="mt-8 text-sm text-muted-foreground">
        Go back to{' '}
        <Link href="/" className="font-medium text-primary hover:underline">
          Homepage
        </Link>
      </p>
    </div>
  );
}
