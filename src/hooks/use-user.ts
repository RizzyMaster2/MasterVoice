"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkAdmin = (user: User | null) => {
            // This logic now correctly reads the public env var on the client.
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
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
