
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // The redirect URL should point to a page where the user can set a new password.
    // We will need to create this page later. For now, let's set it to a placeholder.
    // A common pattern is /reset-password
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw error;
    }
    
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: message };
  }
}
