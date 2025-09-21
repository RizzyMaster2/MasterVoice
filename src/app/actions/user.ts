'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function deleteUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('User not found or not authenticated.');
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Supabase delete error:', deleteError);
    throw new Error('Could not delete user from the database.');
  }
  
  const { error: signOutError } = await supabase.auth.signOut();

  if (signOutError) {
    console.error('Supabase sign out error:', signOutError);
    // Even if sign out fails, the user was deleted, so we proceed
  }

  return { success: true };
}
