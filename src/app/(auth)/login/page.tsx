
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';
import { Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { AlreadyLoggedIn } from '@/components/auth/already-logged-in';

interface LoginPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

async function LoginPageContent({ searchParams }: LoginPageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return <AlreadyLoggedIn />;
  }

  const message = searchParams.message as string | undefined;
  const error = searchParams.error as string | undefined;
  const confirmation = searchParams.confirmation as string | undefined;

  const userNotFoundError = "Your user profile could not be found. This can happen if the account was deleted. Please sign in again or create a new account.";
  const unverifiedUserError = "Your email is not confirmed. Please check your inbox for a verification link.";

  return (
    <Card className="w-full max-w-sm shadow-xl relative">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Enter your email below to log in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert variant="destructive" className="mb-4 animate-in fade-in-50 slide-in-from-top-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Login Error</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {error === 'user_not_found' && (
           <Alert variant="destructive" className="mb-4 animate-in fade-in-50 slide-in-from-top-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Login Required</AlertTitle>
            <AlertDescription>{userNotFoundError}</AlertDescription>
          </Alert>
        )}
         {confirmation === 'unverified' && (
           <Alert variant="destructive" className="mb-4 animate-in fade-in-50 slide-in-from-top-5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email Not Verified</AlertTitle>
            <AlertDescription>{unverifiedUserError}</AlertDescription>
          </Alert>
        )}
        <LoginForm />
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="underline text-primary font-medium">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm h-[480px] animate-pulse bg-muted/50" />}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}
