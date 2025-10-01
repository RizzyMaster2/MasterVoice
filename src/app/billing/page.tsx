
'use client';

import { useUser } from '@/hooks/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Info, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { UnverifiedAccountWarning } from '@/components/app/unverified-account-warning';
import Link from 'next/link';
import { MainHeader } from '@/components/app/main-header';
import type { User } from '@supabase/supabase-js';

const pricingTiers = [
  {
    name: 'Free',
    id: 'free',
    price: '$0',
    frequency: '/ month',
    description: 'For individuals and small teams getting started.',
    features: [
      'Unlimited Text Messages',
      'Group Chats up to 5 members',
      'Basic Voice Calls',
      'Community Support',
    ],
    cta: 'Your Current Plan',
    disabled: true,
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$5',
    frequency: '/ month',
    description: 'For professionals who need more power.',
    features: [
      'Everything in Free, plus:',
      'HD Voice Calls',
      'Noise Cancellation',
      'Create Private Servers',
      'Priority Support',
    ],
    cta: 'Upgrade to Pro',
    link: '/billing/info/pro',
    disabled: false,
    featured: true,
  },
  {
    name: 'Business',
    id: 'business',
    price: '$15',
    frequency: '/ month',
    description: 'For large teams and organizations.',
    features: [
      'Everything in Pro, plus:',
      'Admin Dashboard & Analytics',
      'Custom Server Roles & Permissions',
      '24/7 Dedicated Support',
    ],
    cta: 'Upgrade to Business',
    link: '/billing/info/business',
    disabled: false,
  },
];


function BillingPageContent({ user, isVerified, isLoading, currentUserPlanId }: { user: User | null, isVerified: boolean, isLoading: boolean, currentUserPlanId: string }) {
   const router = useRouter();

    if (isLoading) {
        return (
             <div className="container mx-auto px-4 max-w-5xl space-y-6">
                <Skeleton className="h-12 w-1/3 mx-auto" />
                <Skeleton className="h-8 w-2/3 mx-auto" />
                 <div className="grid gap-8 md:grid-cols-3 pt-8">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
            {user && !isVerified && <UnverifiedAccountWarning />}
            <CardHeader className="text-center px-0">
                <CardTitle className="font-headline text-4xl">Billing & Plans</CardTitle>
                <CardDescription className="text-lg">Manage your subscription and explore upgrade options.</CardDescription>
            </CardHeader>
            
            <div className="p-4 bg-accent/50 rounded-lg flex items-start gap-3 text-accent-foreground">
                <Info className="h-5 w-5 mt-1 shrink-0 text-primary" />
                <p className="text-sm">Billing functionality is coming soon. The checkout process is a simulation to demonstrate upgrade paths.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 items-start pt-8">
                {pricingTiers.map((tier) => (
                <Card key={tier.name} className={`flex flex-col h-full ${tier.featured ? 'border-primary ring-2 ring-primary' : ''} ${tier.id === currentUserPlanId ? 'bg-card/50' : 'bg-card'}`}>
                    <CardHeader className="flex-1">
                    {tier.featured && <p className="text-primary font-bold text-sm text-center mb-2 flex items-center justify-center gap-1"><Star className='h-4 w-4'/> Most Popular</p>}
                    <CardTitle className="font-headline text-2xl text-center">{tier.name}</CardTitle>
                    <div className="flex items-baseline justify-center pt-4">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        <span className="text-muted-foreground">{tier.frequency}</span>
                    </div>
                    <p className="text-muted-foreground text-center text-sm h-10">{tier.description}</p>
                    </CardHeader>
                    <CardContent className="flex-1">
                    <ul className="space-y-3">
                        {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                            <span className="text-sm">{feature}</span>
                        </li>
                        ))}
                    </ul>
                    </CardContent>
                    <div className="p-6 pt-0 mt-auto">
                    <Button 
                        asChild
                        className="w-full" 
                        variant={tier.featured ? 'default' : 'outline'}
                        disabled={tier.id === currentUserPlanId}
                    >
                        {tier.link ? (
                            <Link href={tier.link}>{tier.id === currentUserPlanId ? 'Your Current Plan' : tier.cta}</Link>
                        ) : (
                            <span>{tier.cta}</span>
                        )}
                    </Button>
                    </div>
                </Card>
                ))}
            </div>
        </div>
    )
}

export default function BillingPage() {
  const { user, isVerified, isLoading, plan: currentUserPlanId } = useUser();
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader user={user} />
       <main className="flex-1 py-12 md:py-20">
        <BillingPageContent user={user} isVerified={isVerified} isLoading={isLoading} currentUserPlanId={currentUserPlanId} />
       </main>
    </div>
  );
}
