
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const { 
    friends, 
    isLoading
  } = useHomeClient();

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  // Redirect to the first friend in the list, or to the friends page if no friends.
  if (friends.length > 0) {
    redirect(`/home/chat/${friends[0].friend_id}`);
  } else {
    redirect('/home/friends');
  }

  return <Skeleton className="h-full w-full" />;
}
