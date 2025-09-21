import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck } from 'lucide-react';

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
    </Card>
  );
}
