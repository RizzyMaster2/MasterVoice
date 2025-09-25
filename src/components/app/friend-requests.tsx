
'use client';

import type { FriendRequest as TFriendRequest } from '@/lib/data';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Check, Loader2, Mail, Trash2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

interface FriendRequestsProps {
  requests: {
    incoming: TFriendRequest[];
    outgoing: TFriendRequest[];
  };
  onRespond: (action: 'accept' | 'decline' | 'cancel', request: TFriendRequest) => void;
  isProcessing: boolean;
}

export function FriendRequests({ requests, onRespond, isProcessing }: FriendRequestsProps) {
  const getInitials = (name: string | null | undefined) => (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U');

  if (requests.incoming.length === 0 && requests.outgoing.length === 0) {
    return null; // Don't render the card if there are no requests
  }

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className="font-headline flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Friend Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="incoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming">
              Incoming ({requests.incoming.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Sent ({requests.outgoing.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="incoming" className="mt-4">
            <ScrollArea className="h-48">
              <div className="space-y-4 pr-4">
                {requests.incoming.length > 0 ? (
                  requests.incoming.map(req => (
                    <div key={req.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={req.profiles?.photo_url || undefined} alt={req.profiles?.display_name || ''} />
                          <AvatarFallback>{getInitials(req.profiles?.display_name)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold">{req.profiles?.display_name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onRespond('decline', req)} disabled={isProcessing}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onRespond('accept', req)} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 text-green-500" />}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-8">No incoming requests.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="outgoing" className="mt-4">
             <ScrollArea className="h-48">
                <div className="space-y-4 pr-4">
                    {requests.outgoing.length > 0 ? (
                        requests.outgoing.map(req => (
                            <div key={req.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={req.profiles?.photo_url || undefined} alt={req.profiles?.display_name || ''} />
                                        <AvatarFallback>{getInitials(req.profiles?.display_name)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-semibold">{req.profiles?.display_name}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => onRespond('cancel', req)} disabled={isProcessing}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Cancel Request</span>
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center pt-8">No outgoing requests.</p>
                    )}
                </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
