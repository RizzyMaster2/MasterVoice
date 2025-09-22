'use server';

import { createClient as createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function deleteUser(userId?: string) {
  const supabase = createClient();

  const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

  if (userError || !currentUser) {
    throw new Error('User not found or not authenticated.');
  }

  const supabaseAdmin = createAdminClient();
  
  let idToDelete: string;

  if (userId) {
    // Admin deleting another user
    if (currentUser.email !== process.env.ADMIN_EMAIL) {
      throw new Error('You do not have permission to delete this user.');
    }
    idToDelete = userId;
  } else {
    // User deleting their own account
    idToDelete = currentUser.id;
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(idToDelete);

  if (deleteError) {
    console.error('Supabase delete error:', deleteError);
    throw new Error('Could not delete user from the database.');
  }

  revalidatePath('/dashboard/admin');
  revalidatePath('/profile');
  
  // If the user deleted themselves, sign them out and redirect.
  if (!userId || userId === currentUser.id) {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error('Supabase sign out error:', signOutError);
      // Even if sign out fails, the user was deleted, so we proceed
    }
    revalidatePath('/', 'layout')
    redirect('/')
  }
}
