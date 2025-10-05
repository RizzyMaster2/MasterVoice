
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const { 
    currentUser, 
    friends, 
    allUsers, 
    selectedFriend, 
    setSelectedFriend, 
    handleFriendRemoved,
    isLoading
  } = useHomeClient();

  // This is the main home page. 
  // If the user has no friends, redirect them to the add friends page.
  if (!isLoading && friends.length === 0) {
    redirect('/home/friends');
  }

  // The ChatLayout will handle the "Select a friend" message.
  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatLayout 
        currentUser={currentUser} 
        friends={friends}
        allUsers={allUsers}
        selectedFriend={selectedFriend}
        setSelectedFriend={setSelectedFriend}
        onFriendRemoved={handleFriendRemoved}
      />
    </div>
  );
}
