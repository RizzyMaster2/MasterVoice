"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async () => {
            const { data, error } = await supabase.auth.getUser();
            if (data.user) {
                setUser(data.user);
                // This check must happen on the client after the env var is loaded
                if (process.env.NEXT_PUBLIC_ADMIN_EMAIL && data.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
                    setIsAdmin(true);
                }
            }
        };
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            if (process.env.NEXT_PUBLIC_ADMIN_EMAIL && session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };

    }, [supabase]);

    return { user, isAdmin };
}
