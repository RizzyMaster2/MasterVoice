
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
    useEffect(() => {
        const fetchUserAndSubscribe = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            
            setUser(user);
            checkRolesAndPlan(user);
            setIsLoading(false);

            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                const currentUser = session?.user ?? null;
                const previousPlan = user?.user_metadata?.plan || 'free';
                const newPlan = currentUser?.user_metadata?.plan || 'free';

                setUser(currentUser);
                checkRolesAndPlan(currentUser);

                if (event === "USER_UPDATED" && previousPlan !== newPlan) {
                    toast({
                        title: "Plan Updated!",
                        description: `You are now on the ${newPlan} plan.`,
                        variant: "success",
                    });
                }

                if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                    window.location.reload();
                }
            });

            return () => {
                authListener.subscription.unsubscribe();
            };
        };

        const unsubscribePromise = fetchUserAndSubscribe();

        // Cleanup function for the useEffect hook
        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe) {
                    unsubscribe();
                }
            });
        };
    // The empty dependency array is critical here. This hook runs ONLY ONCE.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
