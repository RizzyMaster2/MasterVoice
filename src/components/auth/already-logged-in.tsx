

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function AlreadyLoggedIn() {
    return (
        <Card className="w-full max-w-sm shadow-xl">
            <CardHeader className="text-center">
                 <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="font-headline text-2xl">You&apos;re Already Logged In</CardTitle>
                <CardDescription>
                    It looks like you already have an active session.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button asChild size="lg">
                    <Link href="/home">Go to Home</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
