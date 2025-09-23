
'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Users, X } from 'lucide-react';
import type { UserProfile } from '@/lib/data';
import { createGroupChat } from '@/app/(auth)/actions/chat';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface CreateGroupDialogProps {
  allUsers: UserProfile[];
  onGroupCreated: () => void;
}

export function CreateGroupDialog({ allUsers, onGroupCreated }: CreateGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleSubmit = async () => {
    if (groupName.trim() === '' || selectedUsers.length === 0) {
      toast({
        title: 'Invalid Group',
        description: 'Please provide a group name and select at least one member.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        await createGroupChat(groupName, selectedUsers.map(u => u.id));
        toast({
          title: 'Group Created',
          description: `The group "${groupName}" has been successfully created.`,
        });
        onGroupCreated();
        setIsOpen(false);
        setGroupName('');
        setSelectedUsers([]);
      } catch (error) {
        toast({
          title: 'Error Creating Group',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    });
  };

  const getInitials = (name: string | null) => (name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
            <Users className="h-4 w-4" />
            <span className="sr-only">Create Group</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Create a New Group</DialogTitle>
          <DialogDescription>Select members and give your group a name.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Project Team"
            />
          </div>
          <div className="grid gap-2">
            <Label>Select Members</Label>
             {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                {selectedUsers.map(user => (
                   <Badge key={user.id} variant="secondary" className="pr-1">
                    {user.display_name}
                    <button onClick={() => handleSelectUser(user)} className="ml-1 rounded-full hover:bg-background/50 p-0.5">
                       <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-2 space-y-1">
                    {allUsers.map((user) => (
                    <div
                        key={user.id}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${
                        selectedUsers.find((u) => u.id === user.id) ? 'bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleSelectUser(user)}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.photo_url || undefined} alt={user.display_name || ''} />
                                <AvatarFallback>{getInitials(user.display_name)}</AvatarFallback>
                            </Avatar>
                            <span>{user.display_name}</span>
                        </div>
                    </div>
                    ))}
                </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
