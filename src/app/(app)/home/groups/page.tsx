
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function GroupsPage() {
    return (
        <div className="flex-1 flex flex-col h-full items-center justify-center">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-2xl">Group Chats Are Coming Soon</CardTitle>
                    <CardDescription>
                        This feature is currently under construction. Soon, you'll be able to create and manage group conversations right here. Stay tuned!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        For now, you can enjoy unlimited one-on-one messaging with your friends.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
