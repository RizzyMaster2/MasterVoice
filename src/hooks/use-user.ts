
"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Add loading state
    const supabase = createClient();

    useEffect(() => {
        const checkRoles = (user: User | null) => {
            const adminEmailList = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
            const adminEmails = adminEmailList.split(',').filter(email => email.trim() !== '');
            
            if (user && user.email) {
                setIsAdmin(adminEmails.length > 0 && adminEmails.includes(user.email));
            } else {
                setIsAdmin(false);
            }
        };

        const fetchUser = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.auth.getUser();
            if (!error && data.user) {
                setUser(data.user);
                checkRoles(data.user);
            } else {
                setUser(null);
                checkRoles(null);
            }
            setIsLoading(false);
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            checkRoles(currentUser);
            setIsLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    }, [supabase]);

    const isVerified = !!user?.email_confirmed_at;

    return { user, isAdmin, isLoading, isVerified };
}
