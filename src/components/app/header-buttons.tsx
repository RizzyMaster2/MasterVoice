
'use client';

import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { LogIn, MoveRight, Rocket } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function HeaderButtons({ user }: { user: User | null }) {
  return (
    <div className="flex items-center gap-4">
      {user ? (
        <Button asChild>
          <Link href="/home">
            <Rocket className="mr-2 h-4 w-4" />
            Open App
          </Link>
        </Button>
      ) : (
        <>
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Get Started <MoveRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
