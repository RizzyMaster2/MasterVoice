
'use client';

import { Logo } from '@/components/logo';

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-background">
      <div className="flex flex-col items-center gap-4">
        <Logo className="h-12 w-12 text-primary animate-pulse" />
        <p className="text-muted-foreground animate-pulse">Loading your space...</p>
      </div>
    </div>
  );
}
