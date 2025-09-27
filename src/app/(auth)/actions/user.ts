
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

  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
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
      throw new Error(`Failed to delete user: ${deleteError.message}`);
  }

  // If a user deletes their own account, sign them out.
  // The redirect is now handled on the client to avoid CORS issues with server action redirects.
  if (currentUser && currentUser.id === userId) {
    await supabase.auth.signOut();
    revalidatePath('/');
  } else {
    // If an admin deletes a user, just revalidate the admin page.
    revalidatePath('/home/admin');
  }
}
