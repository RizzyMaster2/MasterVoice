
'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { subDays, format } from 'date-fns';

type AdminStats = {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    error: string | null;
}

type TimeSeriesData = {
    date: string;
    count: number;
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

async function checkAdminPermissions() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
        throw new Error('Permission denied.');
    }
    return createAdminClient();
}


export async function getUserSignupsByDay(): Promise<{ data: TimeSeriesData[], error: string | null }> {
    try {
        const supabaseAdmin = await checkAdminPermissions();
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

        const { data, error } = await supabaseAdmin.rpc('get_daily_signups', {
            start_date: thirtyDaysAgo
        });

        if (error) throw error;
        
        // Format date for display
        const formattedData = data.map((item: any) => ({
            date: format(new Date(item.day), 'MMM d'),
            count: item.count,
        }));

        return { data: formattedData, error: null };
    } catch (err: any) {
        return { data: [], error: err.message };
    }
}

export async function getMessageCountByDay(): Promise<{ data: TimeSeriesData[], error: string | null }> {
     try {
        const supabaseAdmin = await checkAdminPermissions();
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

        const { data, error } = await supabaseAdmin.rpc('get_daily_message_counts', {
             start_date: thirtyDaysAgo
        });

        if (error) throw error;
        
        const formattedData = data.map((item: any) => ({
            date: format(new Date(item.day), 'MMM d'),
            count: item.count,
        }));

        return { data: formattedData, error: null };
    } catch (err: any) {
        return { data: [], error: err.message };
    }
}
