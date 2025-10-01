
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
  Star,
  BrainCircuit,
  ShieldCheck,
  Gamepad2,
  Briefcase,
  Heart,
  Cog,
  DollarSign,
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
import { LandingNav } from '@/components/app/landing-nav';
import { FireSaleBanner } from '@/components/app/fire-sale-banner';

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
       <style>{`
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
        `}</style>
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

const HowItWorksIllustration = ({ step }: { step: number }) => {
  const illustrations = [
    // Step 1: Sign Up
    <svg viewBox="0 0 100 100" key="1"><style>{`.form-field{animation:slide-up .5s ease-out forwards;opacity:0}.line-1{animation-delay:.2s}.line-2{animation-delay:.4s}.check{stroke-dasharray:30;stroke-dashoffset:30;animation:draw .5s .7s forwards}@keyframes slide-up{to{transform:translateY(0);opacity:1}}@keyframes draw{to{stroke-dashoffset:0}}`}</style><rect x="20" y="20" width="60" height="60" rx="5" fill="none" stroke="currentColor" strokeWidth="2" className="form-field" /><path d="M30 40 L70 40" className="form-field line-1" stroke="currentColor" strokeWidth="2" /><path d="M30 55 L70 55" className="form-field line-2" stroke="currentColor" strokeWidth="2" /><path d="M45 70 L55 80 L75 60" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" className="check"/></svg>,
    // Step 2: Find Friends
    <svg viewBox="0 0 100 100" key="2"><style>{`.user{animation:pop-in .5s ease-out forwards;opacity:0;transform-origin:center}.user-2{animation-delay:.2s}.user-3{animation-delay:.4s}.plus{animation:pop-in .5s .6s forwards;opacity:0;transform-origin:center}@keyframes pop-in{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}`}</style><circle cx="50" cy="35" r="10" fill="currentColor" className="user user-1" /><path d="M50 45 A 15 15 0 0 0 35 60 H 65 A 15 15 0 0 0 50 45 Z" fill="currentColor" className="user user-1" /><circle cx="25" cy="55" r="8" fill="currentColor" opacity=".7" className="user user-2" /><path d="M25 63 A 12 12 0 0 0 13 75 H 37 A 12 12 0 0 0 25 63 Z" fill="currentColor" opacity=".7" className="user user-2" /><g className="plus"><line x1="75" y1="50" x2="75" y2="70" stroke="hsl(var(--primary))" strokeWidth="3" /><line x1="65" y1="60" x2="85" y2="60" stroke="hsl(var(--primary))" strokeWidth="3" /></g></svg>,
    // Step 3: Start Talking
    <svg viewBox="0 0 100 100" key="3"><style>{`.bubble{animation:pop-in .5s ease-out forwards;opacity:0;transform-origin:center}.wave{stroke-dasharray:10;stroke-dashoffset:10;animation:draw .5s ease-out forwards;opacity:0}.b-1{animation-delay:0s}.b-2{animation-delay:.2s}.w-1{animation-delay:.5s}.w-2{animation-delay:.7s}.w-3{animation-delay:.9s}@keyframes pop-in{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}@keyframes draw{to{stroke-dashoffset:0;opacity:1}}`}</style><path d="M20 60 V40 C20 20 40 20 40 20 H60 C80 20 80 40 80 40 V60 C80 80 60 80 60 80 H50 L40 90 L40 80 H20 Z" fill="currentColor" opacity=".3" className="bubble b-1"/><g className="bubble b-2"><path d="M30 40 L70 40" stroke="currentColor" strokeWidth="3" className="wave w-1" /><path d="M30 50 L60 50" stroke="currentColor" strokeWidth="3" className="wave w-2" /><path d="M30 60 L50 60" stroke="currentColor" strokeWidth="3" className="wave w-3" /></g></svg>
  ];
  return illustrations[step - 1];
};

const ChartGraphIllustration = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <style>{`
            .chart-bar {
                transform-origin: bottom;
                opacity: 0;
                animation: grow-bar 1s ease-out forwards;
            }
            .bar-1 { animation-delay: 0.2s; }
            .bar-2 { animation-delay: 0.4s; }
            .bar-3 { animation-delay: 0.6s; }
            .grid-line {
                stroke-dasharray: 2 3;
                animation: draw-line 1s forwards;
            }
            .axis {
                animation: draw-line 1s forwards;
            }
            @keyframes grow-bar {
                from { transform: scaleY(0); opacity: 0; }
                to { transform: scaleY(1); opacity: 1; }
            }
            @keyframes draw-line {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `}</style>
        {/* Axis Lines */}
        <path d="M10 90 H 90" stroke="currentColor" strokeWidth="2" className="axis" />
        <path d="M10 90 V 10" stroke="currentColor" strokeWidth="2" className="axis" />

        {/* Grid Lines */}
        <path d="M10 70 H 90" stroke="currentColor" strokeWidth="1" opacity="0.3" className="grid-line" />
        <path d="M10 50 H 90" stroke="currentColor" strokeWidth="1" opacity="0.3" className="grid-line" />
        <path d="M10 30 H 90" stroke="currentColor" strokeWidth="1" opacity="0.3" className="grid-line" />

        {/* Bars */}
        <rect x="20" y="50" width="15" height="40" rx="2" fill="hsl(var(--primary) / 0.5)" className="chart-bar bar-1" />
        <rect x="42.5" y="30" width="15" height="60" rx="2" fill="hsl(var(--primary))" className="chart-bar bar-2" />
        <rect x="65" y="65" width="15" height="25" rx="2" fill="hsl(var(--primary) / 0.5)" className="chart-bar bar-3" />
    </svg>
);


const AIConnectIllustration = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto"><style>{`.brain{animation:brain-glow 3s infinite ease-in-out}.node{animation:node-pulse 2s infinite ease-in-out}.line{stroke-dasharray:100;stroke-dashoffset:100;animation:draw-line 2s .5s forwards infinite}.n1{animation-delay:-.5s}.n2{animation-delay:-1s}.n3{animation-delay:-1.5s}.l1{animation-delay:.5s}.l2{animation-delay:1s}.l3{animation-delay:1.5s}@keyframes brain-glow{50%{filter:drop-shadow(0 0 5px hsl(var(--primary)))}}@keyframes node-pulse{50%{r:4}}@keyframes draw-line{50%{stroke-dashoffset:0}100%{stroke-dashoffset:-100}}`}</style><path d="M50 20 C 30 20 30 40 50 40 C 70 40 70 20 50 20 M50 40 C 30 40 30 60 50 60 C 70 60 70 40 50 40 M50 60 C 30 60 30 80 50 80 C 70 80 70 60 50 60" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" className="brain" /><circle cx="20" cy="30" r="3" fill="currentColor" className="node n1"/><circle cx="80" cy="70" r="3" fill="currentColor" className="node n2"/><circle cx="30" cy="70" r="3" fill="currentColor" className="node n3"/><circle cx="70" cy="30" r="3" fill="currentColor" className="node"/><path d="M50 40 C 30 40 30 30 20 30" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" className="line l1" opacity=".5"/><path d="M50 60 C 70 60 70 70 80 70" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" className="line l2" opacity=".5"/><path d="M50 80 C 30 80 30 70 30 70" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" className="line l3" opacity=".5"/></svg>
);


export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <MainHeader />
      <LandingNav />

      <main className="flex-1 lg:pl-48">
        <section id="hero-section" className="relative py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0 top-0 -z-10 h-1/2 bg-gradient-to-b from-primary/10 to-transparent"
          />
          <div className="container mx-auto px-4 md:px-6 text-center">
            <FireSaleBanner />
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-6xl pt-6">
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
          className="py-20 md:py-32 bg-secondary/30 border-y"
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
              <Card className="p-2 shadow-lg overflow-hidden bg-card/50">
                <CardContent className="p-0">
                    <VoiceCallIllustration />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        <section id="how-it-works" className="py-20 md:py-32 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                Get Started in Seconds
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                Connecting with your world has never been easier.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 flex items-center justify-center text-primary"><HowItWorksIllustration step={1} /></div>
                <h3 className="mt-6 font-headline text-xl font-semibold">1. Create Your Account</h3>
                <p className="mt-2 text-muted-foreground">Sign up for free with just your email.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-24 w-24 flex items-center justify-center text-primary"><HowItWorksIllustration step={2} /></div>
                <h3 className="mt-6 font-headline text-xl font-semibold">2. Find Your People</h3>
                <p className="mt-2 text-muted-foreground">Easily search and add friends or colleagues.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-24 w-24 flex items-center justify-center text-primary"><HowItWorksIllustration step={3} /></div>
                <h3 className="mt-6 font-headline text-xl font-semibold">3. Start Talking</h3>
                <p className="mt-2 text-muted-foreground">Jump into a chat or a voice call instantly.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="use-cases" className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                Built for Your World
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                Whether for gaming, work, or just hanging out, MasterVoice is your space to talk.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <Card className="text-center p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Gamepad2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="mt-6 font-headline text-xl font-semibold">For Gamers</h3>
                <p className="mt-2 text-muted-foreground">Coordinate with your team with crystal-clear, low-latency voice chat.</p>
              </Card>
               <Card className="text-center p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <h3 className="mt-6 font-headline text-xl font-semibold">For Work</h3>
                <p className="mt-2 text-muted-foreground">Host meetings, brainstorm ideas, and stay connected with your remote team.</p>
              </Card>
               <Card className="text-center p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="mt-6 font-headline text-xl font-semibold">For Friends</h3>
                <p className="mt-2 text-muted-foreground">Catch up, make plans, and share moments with your closest friends.</p>
              </Card>
            </div>
          </div>
        </section>

        <section id="admin-controls" className="py-20 md:py-32 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div className="order-2 md:order-1">
                <Badge variant="secondary" className="mb-4">Business Plan</Badge>
                <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                  Powerful Admin Controls
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Manage your community with ease. Our business plan gives you access to a full suite of tools to monitor activity, manage users, and customize permissions.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start gap-3">
                    <BarChart className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span><strong className="font-semibold">Analytics Dashboard:</strong> Get insights into user engagement and activity.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span><strong className="font-semibold">User Management:</strong> Easily view, manage, and moderate all users.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span><strong className="font-semibold">Custom Roles:</strong> Define roles and permissions to fit your organization.</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 md:order-2 h-48 md:h-64 text-primary flex items-center justify-center">
                <ChartGraphIllustration />
              </div>
            </div>
          </div>
        </section>

         <section id="ai-features" className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div className="order-1 md:order-2 h-48 md:h-64 text-primary flex items-center justify-center">
                <AIConnectIllustration />
              </div>
              <div className="order-2 md:order-1">
                 <Badge variant="outline" className="mb-4">Coming Soon</Badge>
                <h2 className="font-headline text-3xl font-bold text-foreground md:text-4xl">
                  AI-Powered Connections
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                 Our smart suggestion engine, powered by Google's Gemini, helps you discover new friends and communities based on your interests and activity.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span><strong className="font-semibold">Smart Suggestions:</strong> Get personalized recommendations for new people to connect with.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <BrainCircuit className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span><strong className="font-semibold">Interest Matching:</strong> Find groups and users that share your passions and hobbies.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="call-to-action" className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6 text-center">
             <h2 className="font-headline text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Ready to Find Your Harmony?
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              Join thousands of communities, friends, and teams communicating on MasterVoice today. It's free to get started.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Sign Up For Free
                  <MoveRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 md:py-32 bg-secondary/30 border-y">
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
                <Card key={tier.name} className={`flex flex-col bg-card/80 ${tier.featured ? 'border-primary ring-2 ring-primary' : ''}`}>
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

      <footer className="bg-secondary/30 border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-muted-foreground" />
            <span className="font-headline text-lg font-bold text-muted-foreground">
              MasterVoice
            </span>
          </div>
           <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © <CurrentYear /> MasterVoice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
