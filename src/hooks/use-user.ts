
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
    }, [supabase, checkRolesAndPlan]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            
            // Get the previous plan from the current state before updating
            const previousPlan = user?.user_metadata?.plan || 'free';
            const currentPlan = currentUser?.user_metadata?.plan || 'free';

            setUser(currentUser);
            checkRolesAndPlan(currentUser);
            setIsLoading(false);

            if (event === "USER_UPDATED" && previousPlan !== currentPlan) {
                toast({
                    title: "Plan Updated!",
                    description: `You are now on the ${currentPlan} plan.`,
                    variant: "success",
                });
                window.location.reload();
            } else if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                // This helps sync server components and client state after login/logout
                window.location.reload();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    // The dependencies for this effect need to be stable and not cause re-runs.
    // user, checkRolesAndPlan are included so we can compare old vs new plan.
    }, [supabase, toast, checkRolesAndPlan, user]);


    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
