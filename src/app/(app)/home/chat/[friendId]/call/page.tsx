
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
    // Only fetch if we have a friendId and haven't already fetched the friend
    if (friendId && !friend) {
      const fetchFriendProfile = async () => {
        setIsLoadingFriend(true);
        try {
          const friendProfile = await getUserProfile(friendId);
          if (friendProfile) {
            setFriend(friendProfile);
          } else {
            // If the profile is not found, it's a 404
            notFound();
          }
        } catch (error) {
          console.error("Failed to fetch friend profile", error);
          // Handle error, maybe show a toast or an error message
          notFound();
        } finally {
          setIsLoadingFriend(false);
        }
      };
      fetchFriendProfile();
    } else if (!friendId) {
        // If there's no friendId, we can stop loading.
        setIsLoadingFriend(false);
    }
  }, [friendId, friend]);

  // The page is loading if the user is loading or we are actively fetching the friend.
  const isLoading = isUserLoading || isLoadingFriend;

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  // After loading, if we still don't have the user or friend, it's an error.
  if (!user || !friend) {
    // This will show a not found page if data is missing after loading.
    notFound();
  }
  
  return <CallPage currentUser={user} friend={friend} isReceiving={isReceiving} />;
}
