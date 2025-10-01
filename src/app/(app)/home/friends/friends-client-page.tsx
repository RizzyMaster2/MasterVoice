
'use client';

import { useState, useMemo, useTransition } from 'react';
import type { UserProfile, Friend, FriendRequest } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Loader2,
  MessageSquare,
  Check,
  X,
  Clock,
  UserPlus
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest } from '@/app/(auth)/actions/chat';
import { getErrorMessage } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface FriendsClientPageProps {
  currentUser: UserProfile;
  initialFriends: Friend[];
  initialFriendRequests: { incoming: FriendRequest[], outgoing: FriendRequest[] };
  allUsers: UserProfile[];
}

const EmptyFriendsIllustration = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-muted-foreground">
        <style>{`
        .person { animation: float 3s ease-in-out infinite; }
        .person-1 { animation-delay: 0s; }
        .person-2 { animation-delay: -1.5s; }
        .plus { transform-origin: center; animation: pop-in 0.5s 1s ease-out forwards; opacity: 0; }
        .line { stroke-dasharray: 20; stroke-dashoffset: 20; animation: draw-line 0.5s 0.5s forwards; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes draw-line { to { stroke-dashoffset: 0; } }
        @keyframes pop-in { from { transform: scale(0); } to { transform: scale(1); } }
        `}</style>
        <g className="person person-1">
            <circle cx="35" cy="35" r="8" fill="currentColor" />
            <path d="M35 43 a 15 15 0 0 1 0 30 a 15 15 0 0 1 0 -30" fill="currentColor" />
        </g>
        <g className="person person-2">
            <circle cx="65" cy="35" r="8" fill="currentColor" />
            <path d="M65 43 a 15 15 0 0 1 0 30 a 15 15 0 0 1 0 -30" fill="currentColor" />
        </g>
        <line x1="45" y1="55" x2="55" y2="55" stroke="currentColor" strokeWidth="2" className="line" />
        <g className="plus">
            <line x1="80" y1="50" x2="80" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="75" y1="55" x2="85" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </g>
    </svg>
);

const NoUsersFoundIllustration = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-muted-foreground">
        <style>{`
        .glass { transform-origin: 35px 65px; animation: search 3s ease-in-out infinite; }
        .question-mark { opacity: 0; animation: fade-in 1s 0.5s ease-in forwards; }
        @keyframes search { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-20deg); } 75% { transform: rotate(20deg); } }
        @keyframes fade-in { to { opacity: 1; } }
        `}</style>
        <g className="glass">
            <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="4" fill="none" />
            <line x1="65" y1="65" x2="80" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </g>
        <text x="42" y="58" fontFamily="sans-serif" fontSize="20" fill="currentColor" className="question-mark">?</text>
        <circle cx="20" cy="20" r="5" fill="currentColor" opacity="0.3" style={{animation: 'fade-in 1s 1s forwards'}} />
        <circle cx="80" cy="25" r="3" fill="currentColor" opacity="0.3" style={{animation: 'fade-in 1s 1.2s forwards'}} />
        <circle cx="25" cy="80" r="4" fill="currentColor" opacity="0.3" style={{animation: 'fade-in 1s 1.4s forwards'}} />
    </svg>
);


export function FriendsClientPage({
  currentUser,
  initialFriends,
  initialFriendRequests,
  allUsers,
}: FriendsClientPageProps) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [friendRequests, setFriendRequests] = useState(initialFriendRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { isVerified } = useUser();

  const getInitials = (name: string | null | undefined) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const friendIds = useMemo(() => new Set(friends.map(f => f.friend_id)), [friends]);
  const outgoingRequestIds = useMemo(() => new Set(friendRequests.outgoing.map(r => r.sender_profile.id)), [friendRequests]);
  const incomingRequestIds = useMemo(() => new Set(friendRequests.incoming.map(r => r.sender_profile.id)), [friendRequests]);

  const handleSendRequest = (user: UserProfile) => {
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
        const newRequest = await sendFriendRequest(user.id);
        toast({
          title: 'Friend Request Sent',
          description: `Your request to ${user.display_name} has been sent.`,
          variant: 'success',
        });
        setFriendRequests(prev => ({...prev, outgoing: [...prev.outgoing, newRequest]}));
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

  const handleAcceptRequest = (request: FriendRequest) => {
    setProcessingId(request.id);
    startTransition(async () => {
        try {
            await acceptFriendRequest(request.id, request.sender_id);
            toast({
                title: 'Friend Added',
                description: `You are now friends with ${request.sender_profile.display_name}.`,
                variant: 'success',
            });
            setFriendRequests(prev => ({
                ...prev,
                incoming: prev.incoming.filter(r => r.id !== request.id),
            }));
            setFriends(prev => [...prev, {
                user_id: currentUser.id,
                friend_id: request.sender_id,
                created_at: new Date().toISOString(),
                friend_profile: request.sender_profile,
            }])
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

  const handleDeclineRequest = (request: FriendRequest) => {
    setProcessingId(request.id);
     startTransition(async () => {
        try {
            await declineFriendRequest(request.id);
            toast({
                title: 'Request Declined',
                description: `You have declined the friend request from ${request.sender_profile.display_name}.`,
            });
            setFriendRequests(prev => ({
                ...prev,
                incoming: prev.incoming.filter(r => r.id !== request.id),
            }));
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
        !outgoingRequestIds.has(user.id) &&
        !incomingRequestIds.has(user.id)
    );

    if (searchQuery) {
      return availableUsers.filter(user =>
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return availableUsers.slice(0, 10); // Show some suggestions
  }, [allUsers, currentUser.id, friendIds, outgoingRequestIds, incomingRequestIds, searchQuery]);


  return (
    <div className="h-full">
      <Tabs defaultValue="all" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {friendRequests.incoming.length > 0 && 
              <Badge className="ml-2 bg-primary text-primary-foreground">{friendRequests.incoming.length}</Badge>
            }
          </TabsTrigger>
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
                    {friends.map(friend => (
                      <div key={friend.friend_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.friend_profile?.photo_url || undefined} />
                            <AvatarFallback>{getInitials(friend.friend_profile?.display_name)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold">{friend.friend_profile?.display_name}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/home?friend=${friend.friend_id}`)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                    <EmptyFriendsIllustration />
                    <p>Your friends list is empty. Go to the "Add Friend" tab to find people!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="requests" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Friend Requests</CardTitle>
              <CardDescription>Manage your incoming friend requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-22rem)]">
                {friendRequests.incoming.length > 0 ? (
                  <div className="space-y-4">
                    {friendRequests.incoming.map(request => (
                      <div key={request.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.sender_profile?.photo_url || undefined} />
                            <AvatarFallback>{getInitials(request.sender_profile?.display_name)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold">{request.sender_profile?.display_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeclineRequest(request)} 
                                disabled={isProcessing && processingId === request.id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                {isProcessing && processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleAcceptRequest(request)} 
                                disabled={isProcessing && processingId === request.id}
                                className="text-green-600 hover:text-green-600 hover:bg-green-600/10"
                            >
                                {isProcessing && processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground p-8">
                     <UserPlus className="h-16 w-16 mx-auto mb-4" />
                    <p>You have no new friend requests.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="add" className="flex-1 mt-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-headline">Find New Connections</CardTitle>
              <CardDescription>Search for people or see our suggestions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[calc(100vh-25rem)]">
                 {addFriendFilteredUsers.length > 0 ? (
                  <div className="space-y-4">
                    {addFriendFilteredUsers.map(user => {
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
                          
                           {isCurrentlyProcessing ? (
                                 <Button variant="ghost" size="icon" disabled>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </Button>
                           ) : (
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                        <Button variant="ghost" size="icon" onClick={() => handleSendRequest(user)} disabled={!isVerified || (isProcessing && processingId === user.id)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                {!isVerified && (
                                    <TooltipContent>
                                        <p>Verify your email to add friends.</p>
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
                   friendRequests.outgoing.length > 0 && !searchQuery ? (
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 mt-4">Pending Requests</h4>
                         {friendRequests.outgoing.map(request => (
                             <div key={request.id} className="flex items-center justify-between p-2 rounded-md bg-accent/50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                    <AvatarImage src={request.sender_profile?.photo_url || undefined} />
                                    <AvatarFallback>{getInitials(request.sender_profile?.display_name)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-semibold">{request.sender_profile?.display_name}</p>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Clock className="h-4 w-4" />
                                    <span>Pending</span>
                                </div>
                             </div>
                         ))}
                    </div>
                   ) : (
                     <div className="text-center text-muted-foreground p-8">
                        <NoUsersFoundIllustration />
                        <p>{searchQuery ? 'No users found.' : 'No new suggestions at the moment.'}</p>
                     </div>
                   )
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
