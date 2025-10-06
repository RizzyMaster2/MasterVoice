
'use client';

import { CallPage } from '@/components/app/call-page';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/data';
import { useUser } from '@/hooks/use-user';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { getUserProfile } from '@/app/(auth)/actions/chat';

export default function FriendCallPage() {
  const params = useParams();
  const friendId = params.friendId as string;
  const { user, isLoading: isUserLoading } = useUser();
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [isLoadingFriend, setIsLoadingFriend] = useState(true);

  const searchParams = useSearchParams();
  const isReceiving = searchParams.get('isReceiving') === 'true';

  useEffect(() => {
    if (friendId && !friend) {
      const fetchFriendProfile = async () => {
        setIsLoadingFriend(true);
        try {
          const friendProfile = await getUserProfile(friendId);
          if (friendProfile) {
            setFriend(friendProfile);
          } else {
            notFound();
          }
        } catch (error) {
          console.error("Failed to fetch friend profile", error);
          notFound();
        } finally {
          setIsLoadingFriend(false);
        }
      };
      fetchFriendProfile();
    }
  }, [friendId, friend]);

  const isLoading = isUserLoading || isLoadingFriend;

  // We will now pass user and friend directly, even if they are null.
  // The CallPage component will handle the skeleton state internally.
  return <CallPage currentUser={user} friend={friend} isReceiving={isReceiving} isLoading={isLoading} />;
}
