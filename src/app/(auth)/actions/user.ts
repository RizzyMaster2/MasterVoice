
'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';


export async function deleteUser(userId: string) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const adminEmails = process.env.ADMIN_EMAIL?.split(',') || [];
  const isAdmin = currentUser && adminEmails.includes(currentUser.email!);

  if (!isAdmin && currentUser?.id !== userId) {
    throw new Error('You do not have permission to delete this user.');
  }

  const supabaseAdmin = createAdminClient();
  
  // The database trigger will handle deleting associated data (profiles, messages, etc.)
  // So we just need to delete the user from the auth system.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
      console.error('Supabase delete user error:', deleteError);
      // It's possible the user doesn't exist, but we can treat it as a success for the client.
      // If it's a real error, the logs will show it.
  }

  // If a user deletes their own account, sign them out and redirect.
  if (currentUser && currentUser.id === userId) {
    await supabase.auth.signOut();
    redirect('/');
  } else {
    // If an admin deletes a user, just revalidate the admin page.
    revalidatePath('/home/admin');
  }
}
