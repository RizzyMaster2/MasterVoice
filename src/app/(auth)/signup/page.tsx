
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


function SignupPageContent() {
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


export default async function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        <SignupPageContent />
    </Suspense>
  );
}
