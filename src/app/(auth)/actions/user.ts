
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

  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
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


export async function updateUserPlan(planId: 'pro' | 'business', purchaseType: 'monthly' | 'lifetime') {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not found.");
    }
    
    let inviteLink = null;
    if (planId === 'business') {
        // Generate a fake but unique invite link
        const organizationId = `org_${new Date().getTime()}`;
        inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002'}/join?org=${organizationId}`;
    }

    const { data, error } = await supabase.auth.updateUser({
        data: {
            ...user.user_metadata,
            plan: planId,
            purchase_type: purchaseType,
            ...(inviteLink && { business_invite_link: inviteLink })
        }
    });

    if (error) {
        throw new Error(error.message);
    }
    
    revalidatePath('/profile');
    revalidatePath('/home');

    return { updatedUser: data.user, inviteLink };
}


export async function updateUserProfile(formData: FormData) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;
    const avatarFile = formData.get('avatarFile') as File | null;

    if (!userId) {
        throw new Error('User ID is missing.');
    }

    let avatar_url;

    if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, avatarFile, {
                contentType: avatarFile.type,
                upsert: true
            });
        
        if (uploadError) {
            throw new Error(`Avatar Upload Failed: ${uploadError.message}`);
        }
        
        const { data } = supabase.storage.from('files').getPublicUrl(filePath);
        avatar_url = data.publicUrl;
    }

    const updates = {
        display_name: name,
        full_name: name, // Keep full_name and display_name in sync
        bio: bio,
        ...(avatar_url && { avatar_url: avatar_url }),
    };

    const { data: user, error: authError } = await supabase.auth.updateUser({
        data: updates
    });

    if (authError) {
        throw new Error(`Failed to update user metadata: ${authError.message}`);
    }

    const profileUpdates = {
        display_name: name,
        full_name: name,
        bio: bio,
        ...(avatar_url && { photo_url: avatar_url }),
    };

    // Also update the public profiles table
    const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

    if (profileError) {
        // Log the error but don't throw, as auth update is more critical
        console.error('Failed to update public profile:', profileError.message);
    }

    revalidatePath('/profile');
    revalidatePath('/');
}


export async function createPublicProfile(userId: string, email: string, fullName: string | null) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: email,
      display_name: fullName || email,
      full_name: fullName || email,
    });
    
  if (error) {
    console.error("Error creating public profile:", error);
    throw new Error(`Could not create public profile: ${error.message}`);
  }
  
  return data;
}
