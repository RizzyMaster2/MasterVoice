
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
  type KeyboardEvent,
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
import { cn, getErrorMessage } from '@/lib/utils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { getMessages, sendMessage, removeFriend, deleteMessage, editMessage, sendTypingIndicator } from '@/app/(auth)/actions/chat';
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
import { Send, Search, Phone, Trash2, Paperclip, Loader2, MoreHorizontal, Copy, Pencil, Check, X } from 'lucide-react';
import type { Message, UserProfile, Friend, MessageEdit } from '@/lib/data';
import { useCall } from './call-provider';
import { createClient } from '@/lib/supabase/client';
import { useHomeClient } from './home-client-layout';
import { ActiveCallBar } from './active-call-bar';

interface ChatLayoutProps {
  currentUser: UserProfile;
  friends: Friend[];
  allUsers: UserProfile[];
  selectedFriend: UserProfile | null;
  setSelectedFriend: (friend: UserProfile | null) => void;
  onFriendRemoved: () => void;
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

const SelectChatIllustration = () => (
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
          <path fill="currentColor" d="M50 30 C 40 30, 35 40, 35 50 C 35 65, 45 70, 50 70 C 55 70, 65 65, 65 50 C 65 40, 60 30, 50 30 Z M 50 25 C 55 25, 55 20, 50 20 C 45 20, 45 25, 50 25 Z" />
      </g>
      <circle cx="20" cy="50" r="4" fill="currentColor" className="bubble bubble-1" />
      <circle cx="15" cy="65" r="3" fill="currentColor" className="bubble bubble-2" />
      <circle cx="25" cy="35" r="3" fill="currentColor" className="bubble bubble-3" />
      <path d="M28 50 L 35 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="arrow" />
    </svg>
);

const TypingIndicator = ({ name }: { name: string }) => (
    <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground italic">{name} is typing</span>
        <div className="flex gap-0.5 items-center">
            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1 w-1 bg-muted-foreground rounded-full animate-bounce" />
        </div>
    </div>
);


export function ChatLayout({
  currentUser,
  friends,
  allUsers,
  selectedFriend,
  setSelectedFriend,
  onFriendRemoved,
}: ChatLayoutProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, startSendingTransition] = useTransition();
  const [isDeleting, startDeletingTransition] = useTransition();
  const [editingMessage, setEditingMessage] = useState<MessageEdit | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startCall, incomingCall, acceptCall, declineCall } = useCall();
  const supabase = createClient();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { unreadMessages } = useHomeClient();

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

  const fetchMessages = useCallback(async (friendId: string) => {
    setIsLoadingMessages(true);
    try {
      const serverMessages = await getMessages(friendId);
      const messagesWithProfiles = serverMessages.map(msg => ({
          ...msg,
          sender_profile: userMap.get(msg.sender_id)
      }));
      setMessages(messagesWithProfiles);
    } catch (error) {
      toast({ title: 'Error', description: 'Could not fetch messages.', variant: 'destructive' });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [toast, userMap]);

  useEffect(() => {
    if (selectedFriend?.id) {
      fetchMessages(selectedFriend.id);
    } else {
      setMessages([]);
    }
  }, [selectedFriend, fetchMessages]);

  useEffect(() => {
    if (!selectedFriend) return;

    const channelName = `chat:${[currentUser.id, selectedFriend.id].sort().join(':')}`;
    const messageChannel = supabase.channel(channelName, { config: { broadcast: { self: false } }});

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;

          const isForCurrentChat =
            (newMessage.sender_id === currentUser.id && newMessage.receiver_id === selectedFriend.id) ||
            (newMessage.sender_id === selectedFriend.id && newMessage.receiver_id === currentUser.id);

          if (isForCurrentChat) {
            setMessages((currentMessages) => {
              if (currentMessages.some((m) => m.id === newMessage.id)) {
                return currentMessages;
              }
              return [...currentMessages, { ...newMessage, sender_profile: userMap.get(newMessage.sender_id) }];
            });
             if (isTyping) setIsTyping(false);
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(currentMessages =>
            currentMessages.map(msg => msg.id === updatedMessage.id ? { ...msg, ...updatedMessage, sender_profile: userMap.get(updatedMessage.sender_id) } : msg)
          );
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.sender_id === selectedFriend.id) {
             setIsTyping(payload.payload.is_typing);
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [selectedFriend, currentUser.id, supabase, userMap, isTyping]);


  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, scrollToBottom]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedFriend) return;

    const content = newMessage;
    setNewMessage('');
    if(typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingIndicator(selectedFriend.id, false);
    
    startSendingTransition(async () => {
        try {
            await sendMessage(selectedFriend.id, content);
            // Realtime will handle the update
        } catch (error) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
            // Re-add the message to the input if sending fails
            setNewMessage(content);
        }
    });
  };
  
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      toast({ title: "File upload not implemented yet.", variant: "info" });
    }
  };
  
  const handleStartCall = () => {
    if (selectedFriend) {
      startCall(selectedFriend);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Message copied to clipboard' });
  };
  
  const handleDeleteMessage = (messageId: number) => {
    // Optimistic update
    setMessages(prev => prev.filter(m => m.id !== messageId));
    startDeletingTransition(async () => {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        toast({ title: 'Error deleting message', description: getErrorMessage(error), variant: 'destructive' });
        if (selectedFriend) {
            fetchMessages(selectedFriend.id); // Refetch messages on error
        }
      }
    });
  };

  const handleNewMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!selectedFriend) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    sendTypingIndicator(selectedFriend.id, true);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(selectedFriend.id, false);
    }, 2000);
  };

  const handleSaveEdit = () => {
      if (!editingMessage) return;
      
      startTransition(async () => {
          try {
              await editMessage(editingMessage.id, editingMessage.content);
              setEditingMessage(null);
              // Optimistic update handled by real-time subscription
          } catch(error) {
              toast({ title: "Error saving message", description: getErrorMessage(error), variant: "destructive" });
          }
      });
  };
  
  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditingMessage(null);
        }
  };


  const handleSelectFriend = (friend: UserProfile) => {
    setSelectedFriend(friend);
  };

  const handleRemoveFriend = () => {
    if (!selectedFriend) return;
    const friendName = selectedFriend.display_name;

    startDeletingTransition(async () => {
      try {
        await removeFriend(selectedFriend.id);
        toast({
          title: 'Friend Removed',
          description: `You are no longer friends with ${friendName}.`,
          variant: 'success',
        });
        onFriendRemoved();
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

  const filteredFriends = friends.filter(friend =>
    friend.friend_profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const showActiveCallBar = incomingCall && (incomingCall.otherParticipant.id === selectedFriend?.id);

  return (
    <Card className="flex h-full w-full">
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <div
                key={friend.friend_id}
                onClick={() => handleSelectFriend(friend.friend_profile)}
                className={cn(
                  'flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  selectedFriend?.id === friend.friend_id && 'bg-accent'
                )}
              >
                <Avatar className="h-10 w-10 relative">
                   <AvatarImage src={friend.friend_profile?.photo_url || undefined} alt={friend.friend_profile?.display_name || ''} />
                   <AvatarFallback>{getInitials(friend.friend_profile?.display_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                   <div className="flex items-center justify-between">
                        <p className="font-semibold truncate">
                            {friend.friend_profile?.display_name}
                        </p>
                         {unreadMessages.has(friend.friend_id) && (
                            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                        )}
                   </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {friend.friend_profile?.bio || 'No bio available'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>No friends found.</p>
            </div>
          )}
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col h-full">
        {selectedFriend ? (
          <>
            <CardHeader className="flex flex-col gap-3 border-b">
              <div className='flex flex-row items-center gap-3'>
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedFriend.photo_url || undefined} />
                    <AvatarFallback>{getInitials(selectedFriend.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="font-headline text-lg font-semibold flex items-center gap-2">
                      {selectedFriend.display_name}
                    </h2>
                     <div className="h-5">
                        {isTyping ? <TypingIndicator name={selectedFriend.display_name || '...'} /> : <p className="text-sm text-muted-foreground">{selectedFriend.email}</p>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={handleStartCall}>
                    <Phone className="h-5 w-5" />
                    <span className="sr-only">Start Voice Call</span>
                  </Button>
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
                            This will permanently remove <span className="font-bold">{selectedFriend.display_name}</span> as a friend. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRemoveFriend}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isDeleting ? 'Removing...' : 'Remove Friend'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
              </div>
              {showActiveCallBar && incomingCall && (
                <ActiveCallBar 
                    participants={[incomingCall.otherParticipant]}
                    onJoin={acceptCall}
                    onDecline={declineCall}
                />
              )}
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
                                  <DropdownMenuItem onClick={() => setEditingMessage({ id: msg.id, content: msg.content })}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                  </DropdownMenuItem>
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
                                src={msg.sender_profile?.photo_url || undefined}
                                alt={msg.sender_profile?.display_name || ''}
                            />
                            <AvatarFallback>
                                {getInitials(msg.sender_profile?.display_name)}
                            </AvatarFallback>
                            </Avatar>
                        )}
                        <div
                            className={cn(
                            'max-w-xs rounded-lg p-3 text-sm md:max-w-md',
                            msg.sender_id === currentUser.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted',
                            String(msg.id).startsWith('temp-') && 'opacity-70'
                            )}
                        >
                            {editingMessage?.id === msg.id ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editingMessage.content}
                                        onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })}
                                        onKeyDown={handleEditKeyDown}
                                        className="h-8 bg-background/80 text-foreground"
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setEditingMessage(null)}><X className="h-4 w-4"/></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSaveEdit}><Check className="h-4 w-4"/></Button>
                                </div>
                            ) : (
                                <>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        {parseMessageContent(msg.content)}
                                    </div>
                                    <p className="text-xs opacity-70 mt-1 text-right">
                                        {msg.is_edited && '(edited) '}
                                        {formatMessageTimestamp(msg.created_at)}
                                    </p>
                                </>
                            )}
                        </div>
                      </div>
                    ))}
                    </div>
                )}
              </ScrollArea>
            </div>
            <CardFooter className="p-4 border-t flex flex-col items-start gap-1">
              <div className="h-5">
                  {newMessage.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                           <Pencil className="h-3 w-3" />
                           You are typing...
                      </div>
                  )}
              </div>
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
              <SelectChatIllustration />
              <p className="mt-4 text-lg font-semibold">Select a friend</p>
              <p className="text-muted-foreground">Start a conversation from your friends list.</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
