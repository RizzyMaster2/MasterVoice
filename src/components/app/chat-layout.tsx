'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { User, Message, users as allUsers } from '@/lib/data';
import { Send, Search } from 'lucide-react';

interface ChatLayoutProps {
  currentUser: User;
}

export function ChatLayout({
  currentUser,
}: ChatLayoutProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] =
    useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState('');
  
  // For demonstration, use mock users as contacts, excluding the current user.
  const contacts = allUsers.filter(u => u.id !== currentUser.id);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('') || 'U';

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      senderId: currentUser.id,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedUser.id]: [...(prev[selectedUser.id] || []), message],
    }));
    setNewMessage('');
  };

  return (
    <Card className="flex h-full w-full">
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-9" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {contacts.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={cn(
                'flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                selectedUser?.id === user.id && 'bg-accent'
              )}
            >
              <Avatar className="h-10 w-10 relative">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                )}
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {messages[user.id]?.[messages[user.id].length - 1]?.text || 'No messages yet'}
                </p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col">
        {selectedUser ? (
          <>
            <CardHeader className="flex flex-row items-center gap-3 border-b">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={selectedUser.avatarUrl}
                  alt={selectedUser.name}
                />
                <AvatarFallback>
                  {getInitials(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-headline text-lg font-semibold">
                  {selectedUser.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[calc(100vh-17.5rem)] lg:h-[calc(100vh-15rem)] p-6">
                <div className="space-y-4">
                  {(messages[selectedUser.id] || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-end gap-2',
                        msg.senderId === currentUser.id && 'justify-end'
                      )}
                    >
                      {msg.senderId !== currentUser.id && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={selectedUser.avatarUrl}
                            alt={selectedUser.name}
                          />
                          <AvatarFallback>
                            {getInitials(selectedUser.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'max-w-xs rounded-lg p-3 text-sm md:max-w-md',
                          msg.senderId === currentUser.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p>{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 border-t">
              <form
                onSubmit={handleSendMessage}
                className="flex w-full items-center space-x-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoComplete="off"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-semibold">Select a contact</p>
              <p className="text-muted-foreground">
                Start a conversation from your contact list.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
