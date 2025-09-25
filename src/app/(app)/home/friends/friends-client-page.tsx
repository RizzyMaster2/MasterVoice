
'use client';

import { useState, useMemo, useTransition, useEffect, useCallback } from 'react';
import type { UserProfile, Chat, FriendRequest } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Plus,
  Loader2,
  Send,
  Mail,
  Check,
  X,
  Trash2,
  MessageSquare,
  UserX,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  getChats,
  getFriendRequests,
} from '@/app/(auth)/actions/chat';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FriendsClientPageProps {
  currentUser: UserProfile;
  initialFriends: Chat[];
  initialFriendRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] };
  allUsers: UserProfile[];
}

export function FriendsClientPage({
  currentUser,
  initialFriends,
  initialFriendRequests,
  allUsers,
}: FriendsClientPageProps) {
  const [friends, setFriends] = useState<Chat[]>(initialFriends);
  const [friendRequests, setFriendRequests] = useState(initialFriendRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const { isVerified } = useUser();

  const getInitials = (name: string | null | undefined) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const friendIds = useMemo(() => new Set(friends.flatMap(c => c.participants)), [friends]);
  const outgoingRequestUserIds = useMemo(() => new Set(friendRequests.outgoing.map(req => req.to_user_id)), [friendRequests.outgoing]);
  const incomingRequestUserIds = useMemo(() => new Set(friendRequests.incoming.map(req => req.from_user_id)), [friendRequests.incoming]);


  const refreshAllData = useCallback(async () => {
    const [chats, requests] = await Promise.all([getChats(), getFriendRequests()]);
    setFriends(chats.filter(c => !c.is_group));
    setFriendRequests(requests);
  }, []);
  
   useEffect(() => {
    if (!currentUser.id) return;
    const channel = supabase.channel(`friend-requests-and-chats-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `to_user_id=eq.${currentUser.id}` }, payload => {
        refreshAllData();
      })
       .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `from_user_id=eq.${currentUser.id}` }, payload => {
        refreshAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}` }, payload => {
        refreshAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUser.id, refreshAllData]);

  const handleSendFriendRequest = (user: UserProfile) => {
    if (!isVerified) {
        toast({
            title: "Verification Required",
            description: "You must verify your email before sending friend requests.",
            variant: "destructive"
        });
        return;
    }
    setProcessingId(user.id);
    startTransition(async () => {
      try {
        await sendFriendRequest(user.id);
        toast({
          title: 'Request Sent',
          description: `Your friend request to ${user.display_name} has been sent.`,
          variant: 'success',
        });
        // The realtime listener will update the state, no need to manually set it here
      } catch (error) {
        toast({
          title: 'Error',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      } finally {
        // We don't set processingId to null here, it will be handled by the useEffect watching isProcessing
      }
    });
  };

  // When a transition finishes, clear the processing ID.
  useEffect(() => {
    if (!isProcessing) {
      setProcessingId(null);
    }
  }, [isProcessing]);


  const handleRequestResponse = (action: 'accept' | 'decline' | 'cancel', request: FriendRequest) => {
    setProcessingId(request.id);
    startTransition(async () => {
      try {
        let user, title, description, variant;
        switch (action) {
          case 'accept':
            await acceptFriendRequest(request.id);
            user = request.profiles;
            title = 'Request Accepted';
            description = `You are now friends with ${user?.display_name}.`;
            variant = 'success';
            break;
          case 'decline':
            await declineFriendRequest(request.id);
            user = request.profiles;
            title = 'Request Declined';
            description = `You have declined the friend request from ${user?.display_name}.`;
            variant = 'info';
            break;
          case 'cancel':
            await cancelFriendRequest(request.id);
            user = request.profiles;
            title = 'Request Cancelled';
            description = `You have cancelled your friend request to ${user?.display_name}.`;
            variant = 'info';
            break;
        }
        toast({ title, description, variant: variant as any });
      } catch (error) {
        toast({
          title: 'Error',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      } finally {
        setProcessingId(null);
      }
    });
  };

  const addFriendFilteredUsers = useMemo(() => {
    const availableUsers = allUsers.filter(
      user =>
        user.id !== currentUser.id &&
        !friendIds.has(user.id) &&
        !incomingRequestUserIds.has(user.id)
    );

    if (searchQuery) {
      return availableUsers.filter(user =>
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return availableUsers.slice(0, 10); // Show some suggestions
  }, [allUsers, currentUser.id, friendIds, incomingRequestUserIds, searchQuery]);


  return (
    <div className="h-full">
      <Tabs defaultValue="all" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({friendRequests.incoming.length})</TabsTrigger>
          <TabsTrigger value="add">Add Friend</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Your Friends</CardTitle>
              <CardDescription>Your current list of connections.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-22rem)]">
                {friends.length > 0 ? (
                  <div className="space-y-4">
                    {friends.map(chat => (
                      <div key={chat.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={chat.otherParticipant?.photo_url || undefined} />
                            <AvatarFallback>{getInitials(chat.otherParticipant?.display_name)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold">{chat.otherParticipant?.display_name}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/home')}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <p>Your friends list is empty. Go to the "Add Friend" tab to find people!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
                <CardTitle className="font-headline">Friend Requests</CardTitle>
                <CardDescription>Manage your incoming and sent friend requests.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="incoming">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="incoming">Incoming ({friendRequests.incoming.length})</TabsTrigger>
                        <TabsTrigger value="outgoing">Sent ({friendRequests.outgoing.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="incoming" className="mt-4">
                        <ScrollArea className="h-[calc(100vh-28rem)]">
                            <div className="space-y-4 pr-4">
                                {friendRequests.incoming.length > 0 ? (
                                    friendRequests.incoming.map(req => (
                                        <div key={req.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                <AvatarImage src={req.profiles?.photo_url || undefined} />
                                                <AvatarFallback>{getInitials(req.profiles?.display_name)}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-semibold">{req.profiles?.display_name}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleRequestResponse('decline', req)} disabled={isProcessing}>
                                                    {isProcessing && processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4 text-destructive" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleRequestResponse('accept', req)} disabled={isProcessing}>
                                                    {isProcessing && processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 text-green-500" />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : <p className="text-sm text-muted-foreground text-center pt-8">No incoming requests.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="outgoing" className="mt-4">
                        <ScrollArea className="h-[calc(100vh-28rem)]">
                            <div className="space-y-4 pr-4">
                                {friendRequests.outgoing.length > 0 ? (
                                    friendRequests.outgoing.map(req => (
                                        <div key={req.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={req.profiles?.photo_url || undefined} />
                                                    <AvatarFallback>{getInitials(req.profiles?.display_name)}</AvatarFallback>
                                                </Avatar>
                                                <p className="font-semibold">{req.profiles?.display_name}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRequestResponse('cancel', req)} disabled={isProcessing}>
                                                {isProcessing && processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive" />}
                                            </Button>
                                        </div>
                                    ))
                                ) : <p className="text-sm text-muted-foreground text-center pt-8">No outgoing requests.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Find New Friends</CardTitle>
              <CardDescription>Search for people to connect with.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for people..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[calc(100vh-25rem)]">
                 {addFriendFilteredUsers.length > 0 ? (
                  <div className="space-y-4">
                    {addFriendFilteredUsers.map(user => {
                      const hasOutgoingRequest = outgoingRequestUserIds.has(user.id);
                      const isCurrentlyProcessing = isProcessing && processingId === user.id;

                      return (
                        <div key={user.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.photo_url || undefined} alt={user.display_name || ''} />
                              <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold">{user.display_name}</p>
                          </div>
                          
                           {hasOutgoingRequest || isCurrentlyProcessing ? (
                                 <Button variant="ghost" size="icon" disabled>
                                    {isCurrentlyProcessing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                           ) : (
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                        <Button variant="ghost" size="icon" onClick={() => handleSendFriendRequest(user)} disabled={!isVerified}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {!isVerified && (
                                    <TooltipContent>
                                        <p>Verify your email to send friend requests.</p>
                                    </TooltipContent>
                                )}
                                </Tooltip>
                            </TooltipProvider>
                           )}

                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                     <UserX className="h-12 w-12 mx-auto mb-4" />
                     <p>{searchQuery ? 'No users found.' : 'No new suggestions at the moment.'}</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
