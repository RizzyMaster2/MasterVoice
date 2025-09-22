
'use client';

import { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
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
import type { UserProfile, Message, Chat } from '@/lib/data';
import { getMessages, sendMessage } from '@/app/actions/chat';
import { Send, Search, UserPlus, Paperclip, Download, Bot } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { echo } from '@/ai/flows/echo-flow';

interface ChatLayoutProps {
  currentUser: UserProfile;
  chats: Chat[];
}

export function ChatLayout({ currentUser, chats: initialChats }: ChatLayoutProps) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, startSendingTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const isBotChat = useMemo(() => selectedChat?.id === 'chat-ai-bot-echo', [selectedChat]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };


  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedChat) {
        setIsLoadingMessages(true);
        const fetchedMessages = await getMessages(selectedChat.id);
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
        setTimeout(scrollToBottom, 100);
      }
    };
    fetchMessages();
  }, [selectedChat]);

  // Listen for new messages in real-time
  useEffect(() => {
    if (!selectedChat || !authUser || isBotChat) return;

    const channel = supabase
      .channel(`chat_${selectedChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        async (payload) => {
          // We need to fetch the message with the profile
          const { data: newMessage, error } = await supabase
            .from('messages')
            .select('*, profiles(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (error) {
            console.error('Error fetching new message with profile:', error);
            return;
          }

          if (newMessage) {
            setMessages((prevMessages) => [...prevMessages, newMessage as Message]);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat, supabase, authUser, isBotChat]);
  
  useEffect(() => {
    setChats(initialChats);
    const hasBotChat = initialChats.some(chat => chat.id === 'chat-ai-bot-echo');
    if (!hasBotChat) {
        const botChat: Chat = {
            id: 'chat-ai-bot-echo',
            created_at: new Date().toISOString(),
            name: 'Echo',
            is_group: false,
            participants: [currentUser.id, 'ai-bot-echo'],
            admin_id: null,
            otherParticipant: {
                id: 'ai-bot-echo',
                display_name: 'Echo',
                photo_url: 'https://picsum.photos/seed/ai-bot/200/200',
                created_at: new Date().toISOString(),
                email: 'bot@mastervoice.ai',
                status: 'online',
            }
        };
        setChats(prev => [botChat, ...prev]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChats]);

  const getInitials = (name: string | undefined | null) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const tempMessageId = `temp-${Date.now()}`;
    const messageContent = newMessage;
    setNewMessage('');

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: tempMessageId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: currentUser.id,
      chat_id: selectedChat.id,
      type: 'text',
      profiles: currentUser,
      file_url: null,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 100);

    startSendingTransition(async () => {
      try {
        if (isBotChat) {
            // Handle bot chat
            const history = messages.map(m => ({
                role: m.sender_id === currentUser.id ? 'user' as const : 'model' as const,
                content: [{ text: m.content }]
            }));

            const response = await echo({ history, message: messageContent });

            const botMessage: Message = {
                id: `bot-${Date.now()}`,
                content: response,
                created_at: new Date().toISOString(),
                sender_id: 'ai-bot-echo',
                chat_id: selectedChat.id,
                type: 'text',
                file_url: null,
                profiles: selectedChat.otherParticipant,
            };
             setMessages(prev => [...prev.filter(m => m.id !== tempMessageId), optimisticMessage, botMessage]);

        } else {
            await sendMessage(selectedChat.id, messageContent);
        }

      } catch (error) {
        console.error("Failed to send message", error);
        toast({
          title: "Error",
          description: "Failed to send message.",
          variant: "destructive"
        });
        // Revert optimistic update on failure
        setMessages(prev => prev.filter(m => m.id !== tempMessageId));
      }
    });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !selectedChat || !authUser) {
      return;
    }
     if (isBotChat) {
      toast({
        title: "Not supported",
        description: "File uploads are not supported in chats with the bot.",
      });
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
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    });
  };

  
  const filteredChats = chats.filter((chat) =>
    chat.otherParticipant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="flex h-full w-full">
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
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
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  'flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                  selectedChat?.id === chat.id && 'bg-accent'
                )}
              >
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={chat.otherParticipant?.photo_url || undefined} alt={chat.otherParticipant?.display_name || ''} />
                  <AvatarFallback>{getInitials(chat.otherParticipant?.display_name)}</AvatarFallback>
                  {chat.id === 'chat-ai-bot-echo' && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-primary border-2 border-accent" />
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold flex items-center gap-2">
                    {chat.otherParticipant?.display_name}
                    {chat.id === 'chat-ai-bot-echo' && <Bot className="h-4 w-4 text-primary" />}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.id === 'chat-ai-bot-echo' ? 'AI Assistant' : '...'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>No contacts found.</p>
            </div>
          )}
        </ScrollArea>
      </div>
      <div className="w-2/3 flex flex-col h-full">
        {selectedChat ? (
          <>
            <CardHeader className="flex flex-row items-center gap-3 border-b">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={selectedChat.otherParticipant?.photo_url || undefined}
                  alt={selectedChat.otherParticipant?.display_name || ''}
                />
                <AvatarFallback>
                  {getInitials(selectedChat.otherParticipant?.display_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-headline text-lg font-semibold flex items-center gap-2">
                  {selectedChat.otherParticipant?.display_name}
                  {isBotChat && <Bot className="h-5 w-5 text-primary" />}
                </h2>
              </div>
            </CardHeader>
            <div className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                {isLoadingMessages ? (
                   <div className="space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-12 w-3/4 ml-auto" />
                        <Skeleton className="h-12 w-2/4" />
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
                                src={msg.profiles?.photo_url || undefined}
                                alt={msg.profiles?.display_name || ''}
                            />
                            <AvatarFallback>
                                {getInitials(msg.profiles?.display_name)}
                            </AvatarFallback>
                            </Avatar>
                        )}
                        <div
                            className={cn(
                            'max-w-xs rounded-lg p-3 text-sm md:max-w-md',
                            msg.sender_id === currentUser.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
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
                                <p>{msg.content}</p>
                              )}
                            <p className="text-xs opacity-70 mt-1 text-right">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    disabled={isSending || isBotChat}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoComplete="off"
                  disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-semibold">Select a contact</p>
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
