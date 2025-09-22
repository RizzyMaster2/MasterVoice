
'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type AdminStats = {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    error: string | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { totalUsers: 0, totalChats: 0, totalMessages: 0, error: 'Permission denied.' };
  }
  
  const supabaseAdmin = createAdminClient();

  const [
    { count: totalUsers, error: usersError },
    { count: totalChats, error: chatsError },
    { count: totalMessages, error: messagesError },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('chats').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }),
  ]);

  const error = usersError?.message || chatsError?.message || messagesError?.message || null;

  return {
    totalUsers: totalUsers ?? 0,
    totalChats: totalChats ?? 0,
    totalMessages: totalMessages ?? 0,
    error,
  };
}
