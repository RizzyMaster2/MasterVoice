'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


export async function deleteUser(userId?: string) {
  const supabase = createClient();

  const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

  if (userError || !currentUser) {
    // If there's no current user, we can't check for admin privileges.
    // However, for the temporary case of allowing deletion from login/signup,
    // we'll allow the admin client to proceed if a userId is passed.
    if (!userId) {
       throw new Error('User not found or not authenticated.');
    }
  }

  const supabaseAdmin = createAdminClient();
  
  let idToDelete: string;

  if (userId) {
    // Admin deleting another user. 
    // The check for admin privileges is temporarily bypassed as requested.
    // In a production scenario, this check would be critical:
    // if (currentUser.email !== process.env.ADMIN_EMAIL) {
    //   throw new Error('You do not have permission to delete this user.');
    // }
    idToDelete = userId;
  } else {
    // User deleting their own account
    if (!currentUser) {
      throw new Error('User not found or not authenticated.');
    }
    idToDelete = currentUser.id;
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(idToDelete);

  if (deleteError) {
    console.error('Supabase delete error:', deleteError);
    throw new Error('Could not delete user from the database.');
  }

  revalidatePath('/dashboard/admin');
  revalidatePath('/profile');
  revalidatePath('/login');
  revalidatePath('/signup');
  
  // If the user deleted themselves, sign them out and redirect.
  if (currentUser && (!userId || userId === currentUser.id)) {
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/');
  }
}
