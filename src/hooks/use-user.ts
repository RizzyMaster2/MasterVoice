
"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useToast } from "./use-toast";
import type { UserProfile } from "@/lib/data";

export function useUser() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const checkRolesAndPlan = (user: User | null) => {
            const adminEmailList = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
            const adminEmails = adminEmailList.split(',').filter(email => email.trim() !== '');
            
            if (user && user.email) {
                setIsAdmin(adminEmails.length > 0 && adminEmails.includes(user.email));
            } else {
                setIsAdmin(false);
            }
        };

        const fetchUserAndProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                checkRolesAndPlan(user);

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profileData as UserProfile);

            } else {
                setUser(null);
                setProfile(null);
                checkRolesAndPlan(null);
            }
            setIsLoading(false);
        };
        fetchUserAndProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            const previousPlan = profile?.plan || 'free';
            
            setUser(currentUser);

            if (currentUser) {
                checkRolesAndPlan(currentUser);
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
                setProfile(profileData as UserProfile);

                const currentPlan = (profileData as UserProfile)?.plan || 'free';

                 if (event === "USER_UPDATED" && previousPlan !== currentPlan) {
                    toast({
                        title: "Plan Updated!",
                        description: `You are now on the ${currentPlan} plan.`,
                        variant: "success",
                    });
                     window.location.reload();
                }

            } else {
                setProfile(null);
                checkRolesAndPlan(null);
            }


            if (isLoading) {
                 setIsLoading(false);
            }

            if (event === "SIGNED_OUT") {
                // A full reload on sign-in or sign-out ensures a clean state and re-runs middleware correctly.
                window.location.reload();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const plan = profile?.plan || 'free';
    const isVerified = !!user?.email_confirmed_at;
    const isProPlan = plan === 'pro' || plan === 'business';
    const isBusinessPlan = plan === 'business';

    return { user, profile, isAdmin, isLoading, isVerified, plan, isProPlan, isBusinessPlan };
}
