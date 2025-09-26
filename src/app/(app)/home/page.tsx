
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { HomeClientLayout } from '@/components/app/home-client-layout';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


export default async function HomePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const isVerified = !!authUser.email_confirmed_at;
  
  const currentUserProfile: UserProfile = {
      id: authUser.id,
      display_name: authUser.user_metadata?.display_name || authUser.email || 'User',
      photo_url: authUser.user_metadata?.photo_url || '',
      created_at: authUser.created_at,
      email: authUser.email || null,
      status: 'online', // Placeholder
  }

  return (
    <>
      <div className="flex-1 flex flex-col gap-6 h-full">
        {!isVerified && <UnverifiedAccountWarning />}
        <Suspense fallback={<Skeleton className="flex-1 h-full" />}>
          <HomeClientLayout
              currentUser={currentUserProfile}
          />
        </Suspense>
      </div>
    </>
  );
}
