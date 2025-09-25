
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Info } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import { Skeleton } from '@/components/ui/skeleton';

const planDetails = {
  free: {
    name: 'Free Plan',
    monthlyPrice: '$0/month',
    lifetimePrice: '$0',
    features: [
      'Unlimited Text Messages',
      'Group Chats up to 5 members',
      'Basic Voice Calls',
      'Community Support',
    ],
    description: 'You are currently on the Free plan. Upgrade for more features!',
    cta: 'Current Plan',
    disabled: true,
  },
  pro: {
    name: 'Pro Plan',
    monthlyPrice: '$5/month',
    lifetimePrice: '$50',
    features: [
      'Everything in Free, plus:',
      'HD Voice Calls',
      'Noise Cancellation',
      'Create Private Servers',
      'Priority Support',
    ],
    description: 'Unlock powerful features for professionals.',
    ctaMonthly: 'Upgrade to Pro Monthly',
    ctaLifetime: 'Get Pro for Life',
    disabled: false,
  },
  business: {
    name: 'Business Plan',
    monthlyPrice: '$15/month',
    lifetimePrice: '$100',
    features: [
      'Everything in Pro, plus:',
      'Admin Dashboard & Analytics',
      'Custom Server Roles & Permissions',
      'Dedicated 24/7 Support',
    ],
    description: 'Advanced tools for your team and organization.',
    ctaMonthly: 'Upgrade to Business Monthly',
    ctaLifetime: 'Get Business for Life',
    disabled: false,
  },
};

type PlanKey = keyof typeof planDetails;

export default function BillingInfoPage() {
  const params = useParams();
  const router = useRouter();
  const planKey = (Array.isArray(params.plan) ? params.plan[0] : params.plan) as PlanKey;
  const plan = planDetails[planKey] || null;

  const { user, isVerified, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Plan</CardTitle>
            <CardDescription>
              The billing plan you selected does not exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!isVerified && <UnverifiedAccountWarning />}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{plan.name}</CardTitle>
          <CardDescription className="text-lg pt-1">{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className='flex items-baseline gap-6'>
            <div>
              <p className='text-sm text-muted-foreground'>Monthly</p>
              <p className="text-4xl font-bold">{plan.monthlyPrice}</p>
            </div>
             <div>
              <p className='text-sm text-muted-foreground'>Lifetime</p>
              <p className="text-4xl font-bold">{plan.lifetimePrice}</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Features included:</h4>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 bg-accent/50 rounded-lg flex items-start gap-3 text-accent-foreground">
             <Info className="h-5 w-5 mt-1 shrink-0 text-primary" />
             <p className="text-sm">Billing functionality is coming soon. This page is a placeholder for the checkout process.</p>
          </div>
        </CardContent>
        <CardFooter className='flex-col sm:flex-row gap-4'>
            {plan.cta ? (
                 <Button className="w-full" size="lg" disabled={plan.disabled}>
                    {plan.cta}
                </Button>
            ) : (
                <>
                    <Button className="w-full" size="lg" disabled={plan.disabled}>
                        {plan.ctaMonthly}
                    </Button>
                    <Button className="w-full" size="lg" variant="outline" disabled={plan.disabled}>
                        {plan.ctaLifetime}
                    </Button>
                </>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
