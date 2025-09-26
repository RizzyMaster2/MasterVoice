

'use client'

import {
  useState,
  useEffect,
  useTransition,
  useRef,
  useMemo,
  useCallback,
  type FormEvent,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { cn, getErrorMessage } from '@/lib/utils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { getMessages, sendMessage, deleteChat } from '@/app/(auth)/actions/chat';
import { CodeBlock } from './code-block';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Send, Search, Phone, Trash2, Users, Download, Paperclip, Loader2 } from 'lucide-react';
import type { Chat, Message, UserProfile } from '@/lib/data';

interface ChatLayoutProps {
  currentUser: UserProfile;
  chats: Chat[];
  allUsers: UserProfile[];
  selectedChat: Chat | null;
  setSelectedChat: (chat: Chat | null) => void;
  listType: 'friend' | 'group';
  onChatUpdate: () => void;
  onChatDeleted: () => void;
}

const parseMessageContent = (content: string): ReactNode[] => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [fullMatch, language, code] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    if (startIndex > lastIndex) {
      parts.push(<p key={lastIndex}>{content.substring(lastIndex, startIndex)}</p>);
    }

    parts.push(<CodeBlock key={startIndex} language={language || 'text'} code={code.trim()} />);
    lastIndex = endIndex;
  }

  if (lastIndex < content.length) {
    parts.push(<p key={lastIndex}>{content.substring(lastIndex)}</p>);
  }

  return parts;
};

export function ChatLayout({
  currentUser,
  chats: parentChats,
  allUsers,
  selectedChat,
  setSelectedChat,
  listType,
  onChatUpdate,
  onChatDeleted,
}: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, startSendingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    allUsers.forEach(user => map.set(user.id, user));
    map.set(currentUser.id, currentUser); // Ensure current user is in the map
    return map;
  }, [allUsers, currentUser]);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  const fetchMessages = useCallback(async (chatId: string) => {
    console.log(`ChatLayout: fetchMessages called for chatId: ${chatId}`);
    setIsLoadingMessages(true);
    try {
      const serverMessages = await getMessages(chatId);
      console.log(`ChatLayout: fetchMessages found ${serverMessages.length} messages.`);
      setMessages(serverMessages);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not fetch messages.', variant: 'destructive' });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
    console.log('ChatLayout: selectedChat changed:', selectedChat?.id);
    if (selectedChat?.id) {
      fetchMessages(selectedChat.id);
    } else {
      setMessages([]);
    }
  }, [selectedChat?.id, fetchMessages]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!selectedChat?.id) {
        console.log('ChatLayout: No selected chat ID, skipping realtime subscription.');
        return;
    };

    console.log(`ChatLayout: Setting up realtime subscription for chat-room:${selectedChat.id}`);
    const channel = supabase
      .channel(`chat-room:${selectedChat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
        (payload) => {
          console.log('ChatLayout: Realtime new message received:', payload);
          const newMessage = payload.new as Message;
          // No profile data comes from the subscription, so we add it manually.
          if (!newMessage.profiles) {
            newMessage.profiles = userMap.get(newMessage.sender_id) || null;
          }
          setMessages(current => [...current, newMessage]);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
            console.log(`ChatLayout: Successfully subscribed to channel: chat-room:${selectedChat.id}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error:', err);
          toast({
            title: 'Realtime Connection Error',
            description: getErrorMessage(err) || 'Could not connect to real-time server.',
            variant: 'destructive',
          });
        }
      });
    
    return () => {
      console.log(`ChatLayout: Cleaning up realtime channel: chat-room:${selectedChat.id}`);
      supabase.removeChannel(channel);
    };
  }, [selectedChat?.id, supabase, toast, userMap]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const content = newMessage;
    console.log(`ChatLayout: handleSendMessage - Sending: "${content}" to chat ${selectedChat.id}`);
    setNewMessage('');
    
    startSendingTransition(async () => {
        try {
            await sendMessage(selectedChat.id, content);
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        }
    });
  };
  
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    toast({ title: "File upload not implemented yet.", variant: "info" });
  };
  
  const handleStartCall = () => {
    toast({ title: "Voice calls coming soon!", variant: "info" });
  };


  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const handleSelectChat = (chat: Chat) => {
    console.log('ChatLayout: handleSelectChat', chat);
    setSelectedChat(chat);
    router.push(`${pathname}?chat=${chat.id}`, { scroll: false });
  };

  const handleDeleteChat = () => {
    if (!selectedChat || selectedChat.is_group || !selectedChat.otherParticipant) return;
    const chatId = selectedChat.id;
    const friendName = selectedChat.otherParticipant.display_name;
    console.log(`ChatLayout: handleDeleteChat - Deleting chat ${chatId} with friend ${friendName}`);

    startDeletingTransition(async () => {
      try {
        if (!selectedChat.otherParticipant) {
             throw new Error("Cannot delete chat without participant information.");
        }
        await deleteChat(chatId, selectedChat.otherParticipant.id);
        toast({
          title: 'Friend Removed',
          description: `You are no longer friends with ${friendName}.`,
          variant: 'success',
        });
        onChatDeleted();
      } catch (error) {
        toast({
          title: 'Error Removing Friend',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    });
  };

  const formatMessageTimestamp = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) return format(date, 'p');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const filteredChats = parentChats.filter(chat =>
    (chat.is_group ? chat.name : chat.otherParticipant?.display_name)?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  console.log('ChatLayout: Rendering with props:', {
    selectedChatId: selectedChat?.id,
    listType,
    chatsCount: parentChats.length,
    isLoadingMessages
  });

  return (
    <Card className="flex h-full w-full">
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={listType === 'friend' ? "Search friends..." : "Search groups..."}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={cn(
                  'flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  selectedChat?.id === chat.id && 'bg-accent'
                )}
              >
                <Avatar className="h-10 w-10 relative">
                   {chat.is_group ? (
                     <div className="flex items-center justify-center h-full w-full bg-muted rounded-full">
                        <Users className="h-5 w-5 text-muted-foreground" />
                     </div>
                   ) : (
                    <>
                      <AvatarImage src={chat.otherParticipant?.photo_url || undefined} alt={chat.name || chat.otherParticipant?.display_name || ''} />
                      <AvatarFallback>{getInitials(chat.otherParticipant?.display_name)}</AvatarFallback>
                    </>
                   )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold flex items-center gap-2">
                    {chat.is_group ? chat.name : chat.otherParticipant?.display_name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.is_group ? `${chat.participants.length} members` : '...'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>{listType === 'friend' ? 'No friends found.' : 'No groups found.'}</p>
            </div>
          )}
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col h-full">
        {selectedChat ? (
          <>
            <CardHeader className="flex flex-col gap-3 border-b">
              <div className='flex flex-row items-center gap-3'>
                 <Avatar className="h-10 w-10">
                    {selectedChat.is_group ? (
                        <div className="flex items-center justify-center h-full w-full bg-muted rounded-full">
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                        <AvatarImage
                          src={selectedChat.otherParticipant?.photo_url || undefined}
                          alt={selectedChat.name || ''}
                        />
                        <AvatarFallback>
                          {getInitials(selectedChat.otherParticipant?.display_name)}
                        </AvatarFallback>
                        </>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="font-headline text-lg font-semibold flex items-center gap-2">
                      {selectedChat.is_group ? selectedChat.name : selectedChat.otherParticipant?.display_name}
                    </h2>
                     <div className="h-5">
                         {selectedChat.is_group && (
                            <p className="text-sm text-muted-foreground">{selectedChat.participants.length} members</p>
                         )
                      }
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={handleStartCall}>
                    <Phone className="h-5 w-5" />
                    <span className="sr-only">Start Voice Call</span>
                  </Button>
                  {!selectedChat.is_group && (
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-5 w-5" />
                          <span className="sr-only">Remove Friend</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove <span className="font-bold">{selectedChat.otherParticipant?.display_name}</span> as a friend and delete your entire chat history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteChat}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isDeleting ? 'Removing...' : 'Remove Friend'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
              </div>
            </CardHeader>
            <div className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                {isLoadingMessages ? (
                   <div className="space-y-4 p-6">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-12 w-3/4 ml-auto" />
                        <Skeleton className="h-12 w-2/4" />
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-12 w-1/2 ml-auto" />
                   </div>
                ) : (
                    <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                        key={msg.id}
                        className={cn(
                            'flex items-end gap-2',
                            msg.sender_id === currentUser.id && 'justify-end'
                        )}
                        >
                        {msg.sender_id !== currentUser.id && (
                            <Avatar className="h-8 w-8">
                            <AvatarImage
                                src={msg.profiles?.photo_url || userMap.get(msg.sender_id)?.photo_url || undefined}
                                alt={msg.profiles?.display_name || userMap.get(msg.sender_id)?.display_name || ''}
                            />
                            <AvatarFallback>
                                {getInitials(msg.profiles?.display_name || userMap.get(msg.sender_id)?.display_name)}
                            </AvatarFallback>
                            </Avatar>
                        )}
                        <div
                            className={cn(
                            'max-w-xs rounded-lg p-3 text-sm md:max-w-md',
                            msg.sender_id === currentUser.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted',
                            msg.id.toString().startsWith('temp-') && 'opacity-70'
                            )}
                        >
                             {msg.type === 'file' && msg.file_url ? (
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 underline"
                                >
                                  <Download className="h-4 w-4" />
                                  {msg.file_url.split('/').pop()}
                                </a>
                              ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  {parseMessageContent(msg.content)}
                                </div>
                              )}
                            <p className="text-xs opacity-70 mt-1 text-right">
                                {formatMessageTimestamp(msg.created_at)}
                            </p>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
              </ScrollArea>
            </div>
            <CardFooter className="p-4 border-t">
              <form
                onSubmit={handleSendMessage}
                className="flex w-full items-center space-x-2"
              >
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isSending || isLoadingMessages}
                />
                 <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || isLoadingMessages}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                <Input
                  value={newMessage}
                  onChange={handleNewMessageChange}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoComplete="off"
                  disabled={isSending || isLoadingMessages}
                />
                <Button type="submit" size="icon" disabled={isSending || isLoadingMessages || !newMessage.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-semibold">{listType === 'friend' ? 'Select a friend' : 'Select a group'}</p>
              <p className="text-muted-foreground">
                {listType === 'friend' ? 'Start a conversation from your friends list.' : 'Select a group to see the conversation.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

    