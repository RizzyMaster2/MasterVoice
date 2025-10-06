
'use client';

import { CallPage } from '@/components/app/call-page';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/data';
import { useUser } from '@/hooks/use-user';
import { notFound, useParams } from 'next/navigation';
import { getUserProfile } from '@/app/(auth)/actions/chat';
import { useSearchParams } from 'next/navigation';

export default function FriendCallPage() {
  const params = useParams();
  const friendId = params.friendId as string;
  const { user, isLoading: isUserLoading } = useUser();
  const [friend, setFriend] = useState<UserProfile | null>(null);
  const [isLoadingFriend, setIsLoadingFriend] = useState(true);

  const searchParams = useSearchParams();
  const isReceiving = searchParams.get('isReceiving') === 'true';

  useEffect(() => {
    if (friendId) {
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
        } finally {
          setIsLoadingFriend(false);
        }
      };
      fetchFriendProfile();
    }
  }, [friendId]);

  if (isUserLoading || isLoadingFriend) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!user || !friend) {
    // This should ideally be caught by middleware or the fetch, but serves as a backup.
    notFound();
  }

  return <CallPage currentUser={user} friend={friend} isReceiving={isReceiving} />;
}
