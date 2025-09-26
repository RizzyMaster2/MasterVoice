
'use client';

import { useHomeClient } from '@/components/app/home-client-layout';
import { ChatLayout } from '@/components/app/chat-layout';
import { Skeleton } from '@/components/ui/skeleton';

export default function GroupsPage() {
  const { 
    currentUser, 
    groups, 
    allUsers, 
    selectedChat, 
    setSelectedChat, 
    refreshAllData,
    handleChatDeleted,
    isLoading 
  } = useHomeClient();

  if (isLoading) {
    return <Skeleton className="flex-1 h-full" />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
        <ChatLayout 
            currentUser={currentUser} 
            chats={groups} 
            allUsers={allUsers}
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            listType="group"
            onChatUpdate={refreshAllData}
            onChatDeleted={handleChatDeleted}
        />
    </div>
  );
}
