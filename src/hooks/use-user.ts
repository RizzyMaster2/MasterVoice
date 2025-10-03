
"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useToast } from "./use-toast";

export function useUser() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [plan, setPlan] = useState<'free' | 'pro' | 'business'>('free');
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkRolesAndPlan = (user: User | null) => {
            const adminEmailList = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
            const adminEmails = adminEmailList.split(',').filter(email => email.trim() !== '');
            
            if (user && user.email) {
                setIsAdmin(adminEmails.length > 0 && adminEmails.includes(user.email));
                setPlan(user.user_metadata?.plan || 'free');
            } else {
                setIsAdmin(false);
                setPlan('free');
            }
        };

        const fetchUser = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.auth.getUser();
            if (!error && data.user) {
                setUser(data.user);
                checkRolesAndPlan(data.user);
            } else {
                setUser(null);
                checkRolesAndPlan(null);
            }
            setIsLoading(false);
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            const previousPlan = user?.user_metadata?.plan || 'free';
            const currentPlan = currentUser?.user_metadata?.plan || 'free';

            setUser(currentUser);
            checkRolesAndPlan(currentUser);

            if (isLoading) {
                 setIsLoading(false);
            }

            if (event === "USER_UPDATED" && previousPlan !== currentPlan) {
                toast({
                    title: "Plan Updated!",
                    description: `You are now on the ${currentPlan} plan.`,
                    variant: "success",
                });
                window.location.reload();
            } else if (event === "SIGNED_OUT") {
                // A full reload on sign-in or sign-out ensures a clean state and re-runs middleware correctly.
                window.location.reload();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, toast]);

    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
