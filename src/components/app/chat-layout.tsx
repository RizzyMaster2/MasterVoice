

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
import { format, isToday, isYesterday, parseISO, formatDistanceToNow } from 'date-fns';
import { getMessages, sendMessage, deleteChat, deleteMessage } from '@/app/(auth)/actions/chat';
import { CodeBlock } from './code-block';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Send, Search, Phone, Trash2, Users, Download, Paperclip, Loader2, MoreHorizontal, Copy } from 'lucide-react';
import type { Chat, Message, UserProfile } from '@/lib/data';
import { useCall } from './call-provider';

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

const SelectChatIllustration = ({ type }: { type: 'friend' | 'group' }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50">
      <style>{`
        .main-icon { animation: float 3s ease-in-out infinite; }
        .bubble { opacity: 0; transform-origin: center; animation: pop-in 0.5s ease-out forwards; }
        .bubble-1 { animation-delay: 0.5s; }
        .bubble-2 { animation-delay: 0.7s; }
        .bubble-3 { animation-delay: 0.9s; }
        .arrow { stroke-dasharray: 20; stroke-dashoffset: 20; animation: draw 0.7s 1.2s ease-out forwards; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes pop-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes draw { to { stroke-dashoffset: 0; } }
      `}</style>
      <g className="main-icon">
        {type === 'friend' ? (
          <path fill="currentColor" d="M50 30 C 40 30, 35 40, 35 50 C 35 65, 45 70, 50 70 C 55 70, 65 65, 65 50 C 65 40, 60 30, 50 30 Z M 50 25 C 55 25, 55 20, 50 20 C 45 20, 45 25, 50 25 Z" />
        ) : (
          <>
            <path fill="currentColor" opacity="0.7" d="M40 35 C 30 35, 25 45, 25 55 C 25 70, 35 75, 40 75 C 45 75, 55 70, 55 55 C 55 45, 50 35, 40 35 Z M 40 30 C 45 30, 45 25, 40 25 C 35 25, 35 30, 40 30 Z" />
            <path fill="currentColor" d="M60 35 C 50 35, 45 45, 45 55 C 45 70, 55 75, 60 75 C 65 75, 75 70, 75 55 C 75 45, 70 35, 60 35 Z M 60 30 C 65 30, 65 25, 60 25 C 55 25, 55 30, 60 30 Z" />
          </>
        )}
      </g>
      <circle cx="20" cy="50" r="4" fill="currentColor" className="bubble bubble-1" />
      <circle cx="15" cy="65" r="3" fill="currentColor" className="bubble bubble-2" />
      <circle cx="25" cy="35" r="3" fill="currentColor" className="bubble bubble-3" />
      <path d="M28 50 L 35 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="arrow" />
    </svg>
);


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
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { startCall } = useCall();

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
    setIsLoadingMessages(true);
    try {
      const serverMessages = await getMessages(chatId);
      const messagesWithProfiles = serverMessages.map(msg => ({
          ...msg,
          profiles: userMap.get(msg.sender_id)
      }));
      setMessages(messagesWithProfiles);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not fetch messages.', variant: 'destructive' });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [toast, userMap]);

  useEffect(() => {
    if (selectedChat?.id) {
      fetchMessages(selectedChat.id);
    } else {
      setMessages([]);
    }
  }, [selectedChat, fetchMessages]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, scrollToBottom]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const content = newMessage;
    setNewMessage('');
    
    startSendingTransition(async () => {
        try {
            await sendMessage(selectedChat.id, content);
            // onChatUpdate(); // This will trigger a refresh from the parent
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        }
    });
  };
  
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    toast({ title: "File upload not implemented yet.", variant: "info" });
  };
  
  const handleStartCall = () => {
    if (selectedChat?.otherParticipant) {
      startCall(selectedChat.otherParticipant);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Message copied to clipboard' });
  };
  
  const handleDeleteMessage = (messageId: string) => {
    // Optimistic update
    setMessages(prev => prev.filter(m => m.id !== messageId));
    startDeletingTransition(async () => {
      try {
        await deleteMessage(messageId);
        // onChatUpdate(); // Refresh from parent
      } catch (error) {
        toast({ title: 'Error deleting message', description: getErrorMessage(error), variant: 'destructive' });
        if (selectedChat) {
            fetchMessages(selectedChat.id); // Refetch messages on error
        }
      }
    });
  };


  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    router.push(`${pathname}?chat=${chat.id}`, { scroll: false });
  };

  const handleDeleteChat = () => {
    if (!selectedChat || selectedChat.is_group || !selectedChat.otherParticipant) return;
    const chatId = selectedChat.id;
    const friendName = selectedChat.otherParticipant.display_name;

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
  
   const formatLastMessageTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return '';
    return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
  };

  const getInitials = (name: string | undefined | null) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const filteredChats = parentChats.filter(chat =>
    (chat.is_group ? chat.name : chat.otherParticipant?.display_name)?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  

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
                <div className="flex-1 overflow-hidden">
                   <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">
                            {chat.is_group ? chat.name : chat.otherParticipant?.display_name}
                        </p>
                   </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.is_group 
                      ? `${chat.participants.length} members` 
                      : chat.otherParticipant?.bio || `No bio set for: ${chat.otherParticipant?.display_name}`
                    }
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
                    <div className="space-y-1">
                    {messages.map((msg) => (
                        <div
                        key={msg.id}
                        className={cn(
                            'group/message flex items-end gap-2 w-full',
                            msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
                        )}
                        >
                        {msg.sender_id === currentUser.id && (
                           <div className="opacity-0 group-hover/message:opacity-100 transition-opacity">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => handleCopyMessage(msg.content)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Copy
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(msg.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                           </div>
                        )}
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
              <SelectChatIllustration type={listType} />
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
