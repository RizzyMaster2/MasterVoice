"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // This function now safely checks the public environment variable on the client.
        const checkAdmin = (user: User | null) => {
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            // Ensure we only set admin to true if the adminEmail is defined and matches the user's email.
            if (adminEmail && user && user.email === adminEmail) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        };

        const fetchUser = async () => {
            const { data, error } = await supabase.auth.getUser();
            if (!error && data.user) {
                setUser(data.user);
                checkAdmin(data.user);
            } else {
                setUser(null);
                checkAdmin(null);
            }
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            checkAdmin(currentUser);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    }, [supabase]);

    return { user, isAdmin };
}
