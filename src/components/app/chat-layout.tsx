

'use client';

import { useState, useEffect, useTransition, useRef, type FormEvent, type ChangeEvent, type ReactNode, useMemo, useCallback } from 'react';
import {
  Card,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { UserProfile, Message, Chat } from '@/lib/data';
import { getMessages, sendMessage, deleteChat } from '@/app/(auth)/actions/chat';
import { Send, Search, UserPlus, Paperclip, Download, Phone, Users, Trash2, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CodeBlock } from './code-block';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useRouter, usePathname } from 'next/navigation';


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

// Helper to extract a user-friendly error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    try {
      // Supabase can sometimes stringify a JSON object in the message
      const parsed = JSON.parse(error.message);
      return parsed.message || error.message;
    } catch (e) {
      return error.message;
    }
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred.';
};

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


export function ChatLayout({ currentUser, chats: parentChats, allUsers, selectedChat, setSelectedChat, listType, onChatUpdate, onChatDeleted }: ChatLayoutProps) {
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
    map.set(currentUser.id, currentUser);
    return map;
  }, [allUsers, currentUser]);

  const handleStartCall = () => {
     toast({
      title: 'Feature Coming Soon',
      description: 'Voice calling is not available at the moment.',
      variant: 'info'
    });
  };
  
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, []);

  const fetchMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const serverMessages = await getMessages(chatId);
      setMessages(serverMessages);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
    } finally {
        setIsLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
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
    if (!selectedChat) {
      return;
    }
      const channel = supabase
        .channel(`chat-room:${selectedChat.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
          (payload) => {
            const newMessage = payload.new as Message;
            // Add sender profile from userMap if it's missing
            if (!newMessage.profiles) {
                newMessage.profiles = userMap.get(newMessage.sender_id) || null;
            }
             setMessages(currentMessages => {
                if (currentMessages.some(m => m.id === newMessage.id)) {
                    return currentMessages;
                }
                const optimisticMessageId = `temp-${newMessage.content}`;
                const newMessages = currentMessages.filter(m => m.id !== optimisticMessageId);
                newMessages.push(newMessage);
                return newMessages;
            });
          }
        )
        .subscribe((status, err) => {
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
          supabase.removeChannel(channel);
      };
    
  }, [selectedChat, supabase, toast, userMap]);


  const getInitials = (name: string | undefined | null) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const messageContent = newMessage;
    setNewMessage('');
    
    startSendingTransition(() => {
        sendMessage(selectedChat.id, messageContent).catch((error) => {
            console.error("Failed to send message", error);
            toast({
                title: "Error",
                description: getErrorMessage(error),
                variant: "destructive"
            });
            // Revert optimistic update on failure - can be improved
            fetchMessages(selectedChat.id); 
        });
    });
  };

  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };
  
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !selectedChat || !authUser) {
      return;
    }
    const file = event.target.files[0];
    startSendingTransition(async () => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('files').getPublicUrl(filePath);
        
        if (!data.publicUrl) {
            throw new Error('Could not get public URL for the uploaded file.');
        }

        await sendMessage(selectedChat.id, data.publicUrl, 'file');
        
        toast({
          title: 'File Sent',
          description: 'Your file has been sent successfully.',
        });
      } catch (error) {
        console.error('Failed to upload and send file:', error);
        toast({
          title: 'Upload Failed',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    });
  };

  const handleDeleteChat = () => {
    if (!selectedChat || selectedChat.is_group || !selectedChat.otherParticipant) return;
    
    const chatId = selectedChat.id;
    const friendName = selectedChat.otherParticipant.display_name;

    startDeletingTransition(async () => {
      try {
        await deleteChat(chatId, selectedChat.otherParticipant!.id);
        toast({
          title: 'Friend Removed',
          description: `You are no longer friends with ${friendName}.`,
          variant: 'success'
        });
        onChatDeleted();
      } catch (error) {
        console.error("Failed to delete chat:", error);
        toast({
          title: "Error Removing Friend",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    });
  };
  
  const formatMessageTimestamp = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) {
      return format(date, 'p'); // e.g., 5:30 PM
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d'); // e.g., Jul 22
  };
  
  const filteredChats = parentChats.filter((chat) =>
    (chat.is_group ? chat.name : chat.otherParticipant?.display_name)?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
   const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    router.push(`${pathname}?chat=${chat.id}`, { scroll: false });
  };


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
                  disabled={isSending}
                />
                 <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
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
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
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
