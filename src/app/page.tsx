
'use client';

import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Users,
  Sparkles,
  User,
  LogIn,
  MoveRight,
  Rocket,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const features = [
  {
    icon: <MessageSquare className="w-8 h-8 text-primary" />,
    title: 'Direct Messaging',
    description:
      'Engage in seamless, real-time one-on-one conversations with your connections.',
  },
  {
    icon: <Users className="w-8 h-8 text-primary" />,
    title: 'User Presence',
    description:
      'Instantly see who is online, making it easier to start a conversation right away.',
  },
  {
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    title: 'Suggested Friends',
    description:
      'Our AI-powered tool helps you discover and connect with new people who share your interests.',
  },
  {
    icon: <User className="w-8 h-8 text-primary" />,
    title: 'Profile Personalization',
    description:
      'Customize your profile with a unique avatar and bio to express your personality.',
  },
];

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const supabase = createClient();

   useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Set year on client to avoid hydration mismatch
    setYear(new Date().getFullYear());

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="font-headline text-2xl font-bold text-primary">
              MasterVoice
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">
                  <Rocket className="mr-2 h-4 w-4" />
                  Open App
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">
                    Get Started <MoveRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

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
              New: AI-Powered Friend Suggestions!
            </Badge>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Master Your Voice,
              <br />
              <span className="text-primary">Connect with the World</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              MasterVoice is a modern communication platform designed for
              meaningful interactions. Chat in real-time, personalize your
              profile, and discover new connections with our intelligent
              suggestion tool.
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
                  Intelligent Connections,
                  <br />
                  Powered by AI
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Tired of swiping? Our advanced GenAI analyzes shared interests
                  and interaction styles to suggest genuinely compatible
                  connections. Spend less time searching and more time talking.
                </p>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span>
                      <strong className="font-semibold">Smart Matching:</strong>{' '}
                      Get suggestions based on a deep understanding of who you
                      are.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users className="h-5 w-5 mt-1 shrink-0 text-accent" />
                    <span>
                      <strong className="font-semibold">
                        Discover Hidden Gems:
                      </strong>{' '}
                      Find people outside your usual circles who you&apos;ll click
                      with.
                    </span>
                  </li>
                </ul>
              </div>
              <Card className="p-2 shadow-lg">
                <CardContent className="p-0">
                  {heroImage && (
                    <Image
                      src={heroImage.imageUrl}
                      alt={heroImage.description}
                      data-ai-hint={heroImage.imageHint}
                      width={600}
                      height={400}
                      className="rounded-lg aspect-video object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
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
            © {year} MasterVoice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
