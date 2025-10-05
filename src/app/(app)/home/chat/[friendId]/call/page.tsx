
'use client';

import { CallPage } from '@/components/app/call-page';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/data';
import { useUser } from '@/hooks/use-user';
import { notFound, useSearchParams, useParams } from 'next/navigation';
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
    // This effect runs once when friendId is available.
    if (friendId) {
      const fetchFriendProfile = async () => {
        setIsLoadingFriend(true);
        try {
          const friendProfile = await getUserProfile(friendId);
          if (friendProfile) {
            setFriend(friendProfile);
          }
        } catch (error) {
          console.error("Failed to fetch friend profile", error);
        } finally {
          setIsLoadingFriend(false);
        }
      };
      fetchFriendProfile();
    }
  }, [friendId]); // The dependency is stable, preventing re-runs.

  if (isUserLoading || isLoadingFriend || !friend) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!user) {
    // This should ideally be caught by middleware, but serves as a backup.
    notFound();
  }

  return <CallPage friend={friend} isReceiving={isReceiving} />;
}
