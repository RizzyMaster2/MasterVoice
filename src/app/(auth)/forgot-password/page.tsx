
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import Link from 'next/link';
import { Suspense } from 'react';


function ForgotPasswordPageContent() {
    return (
        <Card className="w-full max-w-sm shadow-xl relative">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Forgot Password</CardTitle>
                <CardDescription>
                Enter your email address and we will send you a link to reset your password.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ForgotPasswordForm />
                 <div className="mt-4 text-center text-sm">
                    Remembered your password?{' '}
                    <Link href="/login" className="underline text-primary font-medium">
                        Login
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}


export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
        <ForgotPasswordPageContent />
    </Suspense>
  );
}
