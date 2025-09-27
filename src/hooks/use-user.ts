
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

    useEffect(() => {
        const fetchUser = async () => {
            const { data, error } = await supabase.auth.getUser();
            if (error) {
                console.error("Error fetching user:", error);
                setIsLoading(false);
                return;
            }
            setUser(data.user);
            checkRolesAndPlan(data.user);
            setIsLoading(false);
        };
        
        fetchUser();
    }, [supabase, checkRolesAndPlan]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            const previousPlan = user?.user_metadata?.plan || 'free';
            const newPlan = currentUser?.user_metadata?.plan || 'free';

            setUser(currentUser);
            checkRolesAndPlan(currentUser);
            
            // Only set loading to false after the initial state is determined.
            // subsequent changes shouldn't flash a loading screen.
            if (isLoading) {
              setIsLoading(false);
            }

            if (event === "USER_UPDATED" && previousPlan !== newPlan) {
                 toast({
                    title: "Plan Updated!",
                    description: `You are now on the ${newPlan} plan. Refresh the page to see your new features.`,
                    variant: "success",
                });
                // We remove the automatic reload to prevent loops.
                // The user is notified to refresh.
            }

            // Reloading here is safe because this listener only runs ONCE.
            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                window.location.reload();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    // The empty dependency array is CRITICAL to prevent this from re-running and causing a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
