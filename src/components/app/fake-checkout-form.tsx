
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, Loader2, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { updateUserPlan } from '@/app/(auth)/actions/user';

const formSchema = z.object({
  cardName: z.string().min(2, { message: 'Name on card is required.' }),
  cardNumber: z.string()
    .length(19, { message: 'Card number must be 16 digits.' })
    .regex(/^\d{4} \d{4} \d{4} \d{4}$/, { message: 'Invalid card number format.' }),
  expiryDate: z.string()
    .length(5, { message: 'Expiry date must be MM/YY.' })
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Invalid expiry date format.' }),
  cvc: z.string().min(3, { message: 'CVC must be 3-4 digits.' }).max(4, { message: 'CVC must be 3-4 digits.' }),
});

type CheckoutFormValues = z.infer<typeof formSchema>;

interface FakeCheckoutFormProps {
    planName: string;
    price: string;
    priceType: 'monthly' | 'lifetime';
    planId: 'pro' | 'business';
}

export function FakeCheckoutForm({ planName, price, priceType, planId }: FakeCheckoutFormProps) {
  const [isProcessing, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cardName: '',
      cardNumber: '',
      expiryDate: '',
      cvc: '',
    },
  });

  const formatCardNumber = (value: string) => {
    return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
  };
  
  const formatExpiryDate = (value: string) => {
    let cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 2) {
      return cleanValue.slice(0, 2) + '/' + cleanValue.slice(2, 4);
    }
    return cleanValue;
  };

  async function onSubmit(values: CheckoutFormValues) {
    startTransition(async () => {
      try {
        const result = await updateUserPlan(planId, priceType);
        
        toast({
          title: 'Upgrade Successful!',
          description: `You are now on the ${planName} plan.`,
          variant: 'success',
        });
        
        if (result.inviteLink) {
            setInviteLink(result.inviteLink);
        }

        setIsSuccess(true);

      } catch (error) {
        toast({
          title: 'Upgrade Failed',
          description: getErrorMessage(error),
          variant: 'destructive',
        });
      }
    });
  }
  
  const handleGoToDashboard = () => {
      router.push('/home');
      router.refresh();
  }

  if (isSuccess) {
    return (
        <Card className="shadow-lg animate-in fade-in-50">
            <CardHeader className="text-center items-center">
                 <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                    <PartyPopper className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="font-headline text-2xl">Upgrade Complete!</CardTitle>
                <CardDescription>
                    You now have access to all the features of the <strong>{planName}</strong> plan.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {inviteLink && (
                    <div className="space-y-3 p-4 rounded-lg bg-accent/50 text-center">
                        <h4 className="font-semibold">Your Business Invite Link</h4>
                        <p className="text-sm text-muted-foreground">Share this link with your team to have them join your organization.</p>
                        <Input readOnly value={inviteLink} className="font-mono text-center"/>
                        <Button variant="outline" onClick={() => {
                            navigator.clipboard.writeText(inviteLink);
                            toast({ title: 'Copied to clipboard!'})
                        }}>Copy Link</Button>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button className="w-full" size="lg" onClick={handleGoToDashboard}>
                    Go to Dashboard
                </Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Complete Your Upgrade</CardTitle>
        <CardDescription>
          You are upgrading to the <strong>{planName}</strong> plan. Total due today: <strong>{price}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cardName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on Card</FormLabel>
                  <FormControl>
                    <Input placeholder="John M. Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="0000 0000 0000 0000" 
                        {...field} 
                        className="pl-9"
                        onChange={(e) => field.onChange(formatCardNumber(e.target.value))}
                       />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="MM/YY" 
                        {...field}
                        onChange={(e) => field.onChange(formatExpiryDate(e.target.value))}
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cvc"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>CVC</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                {isProcessing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Lock className="mr-2 h-4 w-4" />
                        Pay {price}
                    </>
                )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
