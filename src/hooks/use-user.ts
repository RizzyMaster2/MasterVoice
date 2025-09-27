
"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "./use-toast";

export function useUser() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [plan, setPlan] = useState<'free' | 'pro' | 'business'>('free');
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    const checkRolesAndPlan = useCallback((user: User | null) => {
        const adminEmailList = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
        const adminEmails = adminEmailList.split(',').filter(email => email.trim() !== '');
        
        if (user && user.email) {
            setIsAdmin(adminEmails.length > 0 && adminEmails.includes(user.email));
            setPlan(user.user_metadata?.plan || 'free');
        } else {
            setIsAdmin(false);
            setPlan('free');
        }
    }, []);

    // This single useEffect handles both the initial fetch and the auth state listener.
    // It runs ONLY ONCE on component mount.
    useEffect(() => {
        const fetchUserAndSubscribe = async () => {
            setIsLoading(true);
            
            // 1. Fetch initial user
            const { data: { user: initialUser } } = await supabase.auth.getUser();
            
            // 2. Set initial state
            setUser(initialUser);
            checkRolesAndPlan(initialUser);
            setIsLoading(false);

            // 3. Set up the listener for future changes
            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                const currentUser = session?.user ?? null;
                const previousUser = user;

                setUser(currentUser);
                checkRolesAndPlan(currentUser);

                if (event === "USER_UPDATED" && previousUser?.user_metadata?.plan !== currentUser?.user_metadata?.plan) {
                    toast({
                        title: "Plan Updated!",
                        description: `You are now on the ${currentUser?.user_metadata?.plan || 'free'} plan.`,
                        variant: "success",
                    });
                }

                if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                    // This reload is safe because this listener is set up only once.
                    window.location.reload();
                }
            });

            // 4. Return the cleanup function
            return () => {
                authListener.subscription.unsubscribe();
            };
        };

        const unsubscribePromise = fetchUserAndSubscribe();

        // The top-level return for the useEffect hook handles async cleanup
        return () => {
            unsubscribePromise.then(cleanup => {
                if (cleanup) {
                    cleanup();
                }
            });
        };
    // The empty dependency array is critical. This hook runs ONLY ONCE.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
