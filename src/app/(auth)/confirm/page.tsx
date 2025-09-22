import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function ConfirmPage() {
  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <MailCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-2xl">Confirm your email</CardTitle>
        <CardDescription>
          We sent a confirmation link to your email address. Please click the
          link to complete the registration.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center p-4 bg-amber-50 border border-amber-200 rounded-md mx-6">
        <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Can't wait?</h3>
        </div>
        <p className='text-sm text-amber-700 mb-3'>You can skip for now, but some features will be disabled.</p>
        <Button asChild variant="secondary" className='w-full'>
            <Link href="/dashboard">Continue to Dashboard</Link>
        </Button>
      </CardContent>
      <CardFooter/>
    </Card>
  );
}