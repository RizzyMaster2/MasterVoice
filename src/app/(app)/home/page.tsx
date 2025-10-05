
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';

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

  // While loading, or if there's no specific friend selected, we can show the main chat layout
  // The ChatLayout itself will handle the "Select a friend" message.
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
