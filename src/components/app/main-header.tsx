
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { HeaderButtons } from '@/components/app/header-buttons';
import { Logo } from '@/components/logo';
import { cookies } from 'next/headers';

export async function MainHeader() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold text-primary">
            MasterVoice
          </span>
        </Link>
        <HeaderButtons user={user} />
      </div>
    </header>
  );
}
