
'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function deleteUser(userId: string) {
  const supabase = createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const adminEmails = process.env.ADMIN_EMAIL?.split(',') || [];
  const isAdmin = currentUser && adminEmails.includes(currentUser.email!);

  // Admin check. In a real app you'd want more robust role-based access control.
  if (!isAdmin) {
    if (currentUser?.id !== userId) {
        throw new Error('You do not have permission to delete this user.');
    }
  }

  const supabaseAdmin = createAdminClient();
  
  const { data: userToDelete, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (getUserError) {
    console.error('Supabase get user error:', getUserError);
    throw new Error('Could not fetch user to delete.');
  }

  // If a user deletes their own account, sign them out and redirect.
  if (currentUser && currentUser.id === userId) {
    await supabase.auth.signOut();
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error('Could not delete user from the database.');
    }
    // No revalidation needed, just redirect.
    redirect('/');
  } else {
    // If an admin deletes a user, just revalidate the admin page.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error('Could not delete user from the database.');
    }
    revalidatePath('/dashboard/admin');
  }
}
