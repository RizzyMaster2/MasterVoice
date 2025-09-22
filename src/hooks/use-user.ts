
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
        // This function now safely checks the public environment variable on the client.
        const checkAdmin = (user: User | null) => {
            const adminEmailList = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
            const adminEmails = adminEmailList.split(',').filter(email => email.trim() !== '');
            
            // Ensure we only set admin to true if the adminEmails is defined and includes the user's email.
            if (adminEmails.length > 0 && user && user.email && adminEmails.includes(user.email)) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        };

        const fetchUser = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.auth.getUser();
            if (!error && data.user) {
                setUser(data.user);
                checkAdmin(data.user);
            } else {
                setUser(null);
                checkAdmin(null);
            }
            setIsLoading(false);
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            checkAdmin(currentUser);
            setIsLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    }, [supabase]);

    return { user, isAdmin, isLoading };
}
