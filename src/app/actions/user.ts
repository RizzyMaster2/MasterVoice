'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function deleteUser(userId: string) {
  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Admin check. In a real app you'd want more robust role-based access control.
  if (!currentUser || currentUser.email !== process.env.ADMIN_EMAIL) {
    if (currentUser?.id !== userId) {
        throw new Error('You do not have permission to delete this user.');
    }
  }

  const supabaseAdmin = createAdminClient();

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('Supabase delete error:', deleteError);
    throw new Error('Could not delete user from the database.');
  }

  // If a user deletes their own account, sign them out and redirect.
  if (currentUser && currentUser.id === userId) {
    await supabase.auth.signOut();
    revalidatePath('/', 'layout')
    redirect('/');
  } else {
    // If an admin deletes a user, just revalidate the admin page.
    revalidatePath('/dashboard/admin');
  }
}
