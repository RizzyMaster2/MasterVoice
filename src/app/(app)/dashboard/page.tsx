'use client';

import type { User as AppUser } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { OnboardingModal } from '@/components/app/onboarding-modal';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { useUser } from '@/hooks/use-user';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user: authUser, isLoading: isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupUser = async () => {
      if (isUserLoading) {
        return;
      }
      if (!authUser) {
        redirect('/login');
        return;
      }

      const currentUser: AppUser = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email || 'User',
        avatarUrl: authUser.user_metadata?.avatar_url || '',
        isOnline: true,
        bio: authUser.user_metadata?.bio || '',
      };
      setAppUser(currentUser);
      setIsVerified(!!authUser.email_confirmed_at);
      setIsLoading(false);
    };
    setupUser();
  }, [authUser, isUserLoading]);

  if (isLoading || !appUser) {
    return (
      <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
        <div className="flex-1 h-full">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="w-full lg:w-[320px] flex flex-col gap-6">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col gap-6 h-full">
        {!isVerified && <UnverifiedAccountWarning />}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
          <div className="flex-1 h-full">
            <ChatLayout currentUser={appUser} />
          </div>
          <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <SuggestedFriends currentUser={appUser} />
          </div>
        </div>
      </div>
      <OnboardingModal />
    </>
  );
}