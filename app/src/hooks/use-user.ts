
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

    // Effect for fetching the initial user state
    useEffect(() => {
        const fetchUser = async () => {
            const { data, error } = await supabase.auth.getUser();
            if (error) {
                console.error("Error fetching user:", error);
            } else {
                setUser(data.user);
                checkRolesAndPlan(data.user);
            }
            setIsLoading(false);
        };
        
        fetchUser();
    // We only want this to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect for listening to auth state changes
    useEffect(() => {
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
                // This will trigger a server-side render and is the safest way to
                // refresh the app state after auth events.
                window.location.reload();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    // This empty dependency array is critical. It ensures the listener is only
    // set up once, preventing any possibility of a refresh loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
