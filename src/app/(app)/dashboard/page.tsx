'use client';

import type { User as AppUser } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { OnboardingModal } from '@/components/app/onboarding-modal';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { useUser } from '@/hooks/use-user';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { users as allUsers } from '@/lib/data';

export default function DashboardPage() {
  const { user: authUser, isLoading: isUserLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<AppUser[]>([]);

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

  const handleAddFriend = (friend: AppUser) => {
    if (!contacts.find(c => c.id === friend.id)) {
      setContacts(prev => [...prev, friend]);
    }
  };

  // Mock suggestions - in a real app this would come from an API
  const suggestedUsers = allUsers.filter(u => {
    if (!appUser || u.id === appUser.id) return false;
    if (contacts.find(c => c.id === u.id)) return false;
    return ['user5', 'user6', 'user7'].includes(u.id);
  });


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
            <ChatLayout currentUser={appUser} contacts={contacts} />
          </div>
          <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <SuggestedFriends 
              suggestedUsers={suggestedUsers} 
              onAddFriend={handleAddFriend}
            />
          </div>
        </div>
      </div>
      <OnboardingModal />
    </>
  );
}
