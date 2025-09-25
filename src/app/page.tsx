
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Users,
  Sparkles,
  User,
  MoveRight,
  Phone,
  Radio,
  BarChart,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CurrentYear } from '@/components/app/current-year';
import { MainHeader } from '@/components/app/main-header';
import { Check } from 'lucide-react';

const features = [
  {
    icon: <MessageSquare className="w-8 h-8 text-primary" />,
    title: 'Direct Messaging',
    description:
      'Engage in seamless, real-time one-on-one conversations with your connections.',
  },
  {
    icon: <Phone className="w-8 h-8 text-primary" />,
    title: 'Voice Calls',
    description:
      'Experience crystal-clear, low-latency voice calls with anyone, anywhere.',
  },
  {
    icon: <Users className="w-8 h-8 text-primary" />,
    title: 'User Presence',
    description:
      'Instantly see who is online, making it easier to start a conversation right away.',
  },
  {
    icon: <User className="w-8 h-8 text-primary" />,
    title: 'Profile Personalization',
    description:
      'Customize your profile with a unique avatar and bio to express your personality.',
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    frequency: '/ month',
    description: 'For individuals and small teams getting started.',
    features: [
      'Unlimited Text Messages',
      'Group Chats up to 5 members',
      'Basic Voice Calls',
      'Community Support',
    ],
    cta: 'Get Started',
    href: '/signup',
    link: '/billing/info/free',
    variant: 'outline',
  },
  {
    name: 'Pro',
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
    href: '/signup',
    link: '/billing/info/pro',
    variant: 'default',
    featured: true,
  },
  {
    name: 'Business',
    price: '$15',
    frequency: '/ month',
    description: 'For large teams and organizations.',
    features: [
      'Everything in Pro, plus:',
      'Admin Dashboard & Analytics',
      'Custom Server Roles & Permissions',
      '24/7 Dedicated Support',
    ],
    cta: 'Contact Sales',
    href: '/signup',
    link: '/billing/info/business',
    variant: 'outline',
  },
];

const VoiceCallIllustration = () => (
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto rounded-lg bg-card" preserveAspectRatio="xMidYMid meet">
        <style>
            {`
            .wave-line {
                stroke-width: 2;
                stroke-linecap: round;
                animation: wave 4s ease-in-out infinite;
            }
            @keyframes wave {
                0%, 100% { d: path('M50,150 Q100,100 150,150 T250,150 T350,150'); }
                50% { d: path('M50,150 Q100,200 150,150 T250,150 T350,150'); }
            }
            .node {
                animation: pulse 2s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { r: 6; opacity: 1; }
                50% { r: 8; opacity: 0.7; }
            }
            .connection-line {
                stroke-dasharray: 5;
                animation: dash 5s linear infinite;
            }
            @keyframes dash {
                to { stroke-dashoffset: -100; }
            }
            `}
        </style>
        <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 0.3}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity: 0}} />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* Background Grid */}
        <path d="M0 75 H400 M0 150 H400 M0 225 H400 M75 0 V300 M150 0 V300 M225 0 V300 M300 0 V300 M375 0 V300" stroke="hsl(var(--border) / 0.5)" strokeWidth="0.5" />

        {/* Animated Sound Waves */}
        <path className="wave-line" style={{animationDelay: '0s'}} fill="none" stroke="hsl(var(--primary) / 0.8)" />
        <path className="wave-line" style={{animationDelay: '-1s'}} fill="none" stroke="hsl(var(--accent) / 0.6)" />
        <path className="wave-line" style={{animationDelay: '-2s'}} fill="none" stroke="hsl(var(--primary) / 0.4)" />
        
        {/* Connection Nodes */}
        <circle className="node" cx="50" cy="150" fill="hsl(var(--primary))" filter="url(#glow)" />
        <circle className="node" style={{animationDelay: '0.5s'}} cx="150" cy="150" fill="hsl(var(--primary))" />
        <circle className="node" style={{animationDelay: '1s'}} cx="250" cy="150" fill="hsl(var(--primary))" />
        <circle className="node" style={{animationDelay: '1.5s'}} cx="350" cy="150" fill="hsl(var(--primary))" />
        
        <circle className="node" style={{animationDelay: '0.2s'}} cx="100" cy="100" r="4" fill="hsl(var(--accent))" />
        <circle className="node" style={{animationDelay: '0.8s'}} cx="200" cy="200" r="4" fill="hsl(var(--accent))" />
        <circle className="node" style={{animationDelay: '1.2s'}} cx="300" cy="100" r="4" fill="hsl(var(--accent))" />

        {/* Connection Lines */}
        <line className="connection-line" x1="100" y1="100" x2="200" y2="200" stroke="hsl(var(--accent) / 0.5)" strokeWidth="1" />
        <line className="connection-line" style={{animationDelay: '-2s'}} x1="200" y1="200" x2="300" y2="100" stroke="hsl(var(--accent) / 0.5)" strokeWidth="1" />
    </svg>
);


export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader />

      <main className="flex-1">
        <section className="relative py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-primary/5 to-transparent"
          />
          <div className="container mx-auto px-4 md:px-6 text-center">
            <Badge
              variant="outline"
              className="mb-4 border-accent/50 text-accent"
            >
              Voice Calls are Here!
            </Badge>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Find your harmony,
              <br />
              <span className="text-primary">Connect with the World</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              MasterVoice is a modern communication platform designed for
              meaningful interactions. Chat in real-time, engage in crystal-clear voice calls,
              and personalize your profile.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get Started Free
                  <MoveRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="py-20 md:py-32 bg-card border-y"
        >
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                Features for a Better Connection
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                Everything you need to build and maintain your network, all in
                one place.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    {feature.icon}
                  </div>
                  <h3 className="mt-6 font-headline text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                  Crystal-Clear Voice Calls
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Connect with friends and colleagues through high-fidelity, low-latency voice calls. Whether it's a one-on-one catch-up or a group discussion, your conversations will be seamless.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start gap-3">
                    <Radio className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span>
                      <strong className="font-semibold">Low-Latency Audio:</strong>{' '}
                      Experience real-time conversations with minimal delay.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span>
                      <strong className="font-semibold">
                        HD Voice Quality:
                      </strong>{' '}
                      Enjoy rich, clear audio that makes you feel like you're in the same room.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lock className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span>
                      <strong className="font-semibold">
                        End-to-End Encryption:
                      </strong>{' '}
                      Your conversations are private and secure, always.
                    </span>
                  </li>
                </ul>
              </div>
              <Card className="p-2 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                    <VoiceCallIllustration />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        <section id="pricing" className="py-20 md:py-32 bg-card border-y">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                Choose the Plan That's Right for You
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                Simple, transparent pricing. No hidden fees.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {pricingTiers.map((tier) => (
                <Card key={tier.name} className={`flex flex-col ${tier.featured ? 'border-primary ring-2 ring-primary' : ''}`}>
                  <CardHeader className="flex-1">
                    <CardTitle className="font-headline text-2xl">{tier.name}</CardTitle>
                    <p className="text-muted-foreground">{tier.description}</p>
                    <div className="flex items-baseline pt-4">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground">{tier.frequency}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button asChild className="w-full" variant={tier.variant as any}>
                      <Link href={tier.link}>{tier.cta}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-8">
              Billing and subscriptions will be available soon.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-muted-foreground" />
            <span className="font-headline text-lg font-bold text-muted-foreground">
              MasterVoice
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © <CurrentYear /> MasterVoice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
