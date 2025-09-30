
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { AlreadyLoggedIn } from '@/components/auth/already-logged-in';


async function SignupPageContent() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        return <AlreadyLoggedIn />;
    }

    return (
        <Card className="w-full max-w-sm shadow-xl relative">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
                <CardDescription>
                Enter your information to create your MasterVoice account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <SignupForm />
                <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/login" className="underline text-primary font-medium">
                    Login
                </Link>
                </div>
            </CardContent>
        </Card>
    );
}


export default function SignupPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm h-[520px] animate-pulse bg-muted/50" />}>
        <SignupPageContent />
    </Suspense>
  );
}
