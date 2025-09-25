
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const ONBOARDING_STORAGE_KEY = 'chord-onboarding-complete';

const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to Chord!',
    description: "Let's take a quick tour of the features that will help you connect with others.",
    imageId: 'hero'
  },
  {
    id: 2,
    title: 'Real-Time Chat',
    description: "Connect one-on-one with your contacts. See who's online and start a conversation instantly.",
    imageId: 'avatar1'
  },
  {
    id: 3,
    title: 'Discover New Friends',
    description: 'Our AI suggests new people to connect with based on your interests and activity.',
    imageId: 'avatar4'
  },
  {
    id: 4,
    title: 'Personalize Your Profile',
    description: 'Make your profile your own by adding an avatar and a bio. Let others know who you are!',
    imageId: 'avatar2'
  },
];

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        const onboardingComplete = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!onboardingComplete) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Could not access localStorage:', error);
      }
    }
  }, [isMounted]);

  const handleClose = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (error) {
       console.error('Could not access localStorage:', error);
    }
    setIsOpen(false);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <Carousel className="w-full">
          <CarouselContent>
            {onboardingSteps.map((step) => {
              const image = PlaceHolderImages.find(img => img.id === step.imageId);
              return (
                <CarouselItem key={step.id}>
                  <div className="p-1">
                    <DialogHeader>
                      <DialogTitle className="font-headline text-2xl mb-2">{step.title}</DialogTitle>
                      <DialogDescription>{step.description}</DialogDescription>
                    </DialogHeader>
                    <div className="my-6 flex justify-center">
                      {image && (
                        <Image
                          src={image.imageUrl}
                          alt={image.description}
                          data-ai-hint={image.imageHint}
                          width={200}
                          height={200}
                          className="rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
