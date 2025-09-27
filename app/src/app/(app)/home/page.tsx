
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { 
    currentUser, 
    friends, 
    allUsers, 
    selectedChat, 
    setSelectedChat, 
    refreshAllData, 
    handleChatDeleted,
    isLoading
  } = useHomeClient();

  if (isLoading && !currentUser) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
        <ChatLayout 
            currentUser={currentUser} 
            chats={friends}
            allUsers={allUsers}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            listType="friend"
            onChatUpdate={refreshAllData}
            onChatDeleted={handleChatDeleted}
        />
    </div>
  );
}
