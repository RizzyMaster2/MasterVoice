
"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [plan, setPlan] = useState<'free' | 'pro' | 'business'>('free');
    const [isLoading, setIsLoading] = useState(true); // Add loading state
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
            setUser(currentUser);
            checkRolesAndPlan(currentUser);
            // Only set loading to false after the first check is done.
            if (isLoading) {
                 setIsLoading(false);
            }
             // On signed in or signed out, force a refresh of server components
            if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
                window.location.reload();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    }, [supabase, isLoading]);

    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
