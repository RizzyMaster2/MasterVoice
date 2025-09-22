
'use client';

import type { UserProfile, Chat as AppChat } from '@/lib/data';
import { ChatLayout } from '@/components/app/chat-layout';
import { OnboardingModal } from '@/components/app/onboarding-modal';
import { SuggestedFriends } from '@/components/app/suggested-friends';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { useUser } from '@/hooks/use-user';
import { redirect } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getUsers, getChats, createChat } from '@/app/actions/chat';

export default function DashboardPage() {
  const { user: authUser, isLoading: isUserLoading } = useUser();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [chats, setChats] = useState<AppChat[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!authUser) {
      redirect('/login');
      return;
    }

    setIsVerified(!!authUser.email_confirmed_at);

    const fetchData = async () => {
      setIsLoading(true);
      startTransition(async () => {
        const [usersData, chatsData] = await Promise.all([getUsers(), getChats()]);
        setAllUsers(usersData);
        setChats(chatsData);
        setIsLoading(false);
      });
    };

    fetchData();

  }, [authUser, isUserLoading]);

  const handleAddFriend = (friend: UserProfile) => {
    startTransition(async () => {
      await createChat(friend.id);
      // Re-fetch chats to update the list
      const updatedChats = await getChats();
      setChats(updatedChats);
    });
  };

  if (isLoading || !authUser) {
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

  const currentUserProfile: UserProfile = {
      id: authUser.id,
      display_name: authUser.user_metadata?.full_name || authUser.email || 'User',
      photo_url: authUser.user_metadata?.avatar_url || '',
      created_at: authUser.created_at,
      email: authUser.email || null,
      status: 'online', // Placeholder
  }

  return (
    <>
      <div className="flex-1 flex flex-col gap-6 h-full">
        {!isVerified && <UnverifiedAccountWarning />}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
          <div className="flex-1 h-full">
            <ChatLayout currentUser={currentUserProfile} chats={chats} />
          </div>
          <div className="w-full lg:w-[320px] flex flex-col gap-6">
            <SuggestedFriends
              allUsers={allUsers} 
              onAddFriend={handleAddFriend}
              currentUserId={authUser.id}
              chats={chats}
            />
          </div>
        </div>
      </div>
      <OnboardingModal />
    </>
  );
}
