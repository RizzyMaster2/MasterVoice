

import { MainHeader } from '@/components/app/main-header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const faqs = [
    {
        question: "What is MasterVoice?",
        answer: "MasterVoice is a modern communication platform that allows you to connect with friends and colleagues through real-time chat and high-quality voice calls."
    },
    {
        question: "Is MasterVoice free to use?",
        answer: "Yes, MasterVoice offers a generous free plan that includes unlimited text messaging and basic voice calls. We also offer paid plans (Pro and Business) for users who need more advanced features."
    },
    {
        question: "How do I add friends?",
        answer: "You can add friends by navigating to the 'Friends' tab in the app and using the 'Add Friend' feature. You can search for users by their display name and send them a friend request."
    },
    {
        question: "Can I create group chats?",
        answer: "Absolutely! You can create group chats by going to the 'Groups' tab and clicking the 'Create Group' icon. You can then name your group and select members from your friends list."
    },
    {
        question: "Are my conversations secure?",
        answer: "Yes, we take your privacy and security very seriously. All communications, including voice calls, are end-to-end encrypted, meaning only you and the person you're communicating with can read or hear them."
    },
     {
        question: "How do I update my profile?",
        answer: "You can update your profile information, including your display name and avatar, by going to the 'Profile' page from the user menu in the top-right corner."
    },
    {
        question: "What happens if I forget my password?",
        answer: "If you forget your password, you can use the 'Forgot Password' link on the login page to reset it. You will receive an email with instructions on how to create a new password."
    }
];

const FaqIcon = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary">
        <style>{`
        .bubble { transform-origin: 50% 80%; animation: pop-bubble 0.6s ease-out forwards; opacity: 0; }
        .bubble-1 { animation-delay: 0.1s; }
        .bubble-2 { animation-delay: 0.3s; }
        .bubble-3 { animation-delay: 0.5s; }
        .mark { transform-origin: 50% 50%; animation: pop-mark 0.5s 0.7s ease-out forwards; opacity: 0; }
        @keyframes pop-bubble { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pop-mark { 0% { transform: scale(0.5) rotate(-30deg); opacity: 0; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        `}</style>
        <path className="bubble bubble-1" fill="currentColor" opacity="0.3" d="M40,60 Q20,60 20,40 Q20,20 40,20 L60,20 Q80,20 80,40 Q80,60 60,60 L50,60 Q45,60 45,65 L55,65 Q55,75 45,75 Z" />
        <path className="bubble bubble-2" fill="currentColor" opacity="0.6" d="M60,80 Q80,80 80,60 Q80,40 60,40 L40,40 Q20,40 20,60 Q20,80 40,80 L50,80 Q55,80 55,75 L45,75 Q45,70 50,70 Z" />
        <g className="mark">
            <text x="42" y="65" fontSize="30" fontWeight="bold" fill="var(--primary-foreground, white)">?</text>
        </g>
    </svg>
);


export default async function FaqPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainHeader user={user} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <Card className="max-w-3xl mx-auto bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <FaqIcon />
              </div>
              <CardTitle className="font-headline text-4xl">Frequently Asked Questions</CardTitle>
              <p className="text-muted-foreground pt-2">
                Have questions? We've got answers. If you can't find what you're looking for, feel free to contact our support team.
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="text-lg font-semibold text-left hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
