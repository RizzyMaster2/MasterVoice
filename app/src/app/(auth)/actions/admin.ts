
'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { subDays, format, startOfDay, eachDayOfInterval, endOfDay } from 'date-fns';
import { cookies } from 'next/headers';
import type { UserProfile } from '@/lib/data';
import { getUsers } from './chat';

type AdminStats = {
    totalUsers: number;
    totalChats: number;
    totalMessages: number;
    error: string | null;
}

export type TimeSeriesData = {
    date: string;
    count: number;
}

async function checkAdminPermissions() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    if (!user || !user.email || !adminEmails.includes(user.email)) {
        throw new Error('Permission denied.');
    }
    return createAdminClient();
}

export async function getAdminStats(): Promise<AdminStats> {
 try {
    const supabaseAdmin = await checkAdminPermissions();

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
  } catch(err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      return { totalUsers: 0, totalChats: 0, totalMessages: 0, error: message };
  }
}

export async function getUserSignupsByDay(): Promise<{ data: TimeSeriesData[], error: string | null }> {
    try {
        const supabaseAdmin = await checkAdminPermissions();
        const thirtyDaysAgo = subDays(new Date(), 29); // Include today
        const startDate = startOfDay(thirtyDaysAgo);
        const endDate = endOfDay(new Date());

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (error) throw error;
        
        const countsByDay = new Map<string, number>();
        const interval = eachDayOfInterval({ start: startDate, end: endDate });

        interval.forEach(day => {
            countsByDay.set(format(day, 'yyyy-MM-dd'), 0);
        });

        data.forEach(profile => {
            const day = format(new Date(profile.created_at), 'yyyy-MM-dd');
            countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
        });
        
        const formattedData: TimeSeriesData[] = Array.from(countsByDay.entries()).map(([day, count]) => ({
            date: format(new Date(day), 'MMM d'),
            count: count,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        return { data: formattedData, error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        return { data: [], error: message };
    }
}

export async function getMessageCountByDay(): Promise<{ data: TimeSeriesData[], error: string | null }> {
     try {
        const supabaseAdmin = await checkAdminPermissions();
        const thirtyDaysAgo = subDays(new Date(), 29);
        const startDate = startOfDay(thirtyDaysAgo);
        const endDate = endOfDay(new Date());

        const { data, error } = await supabaseAdmin
            .from('messages')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());


        if (error) throw error;
        
        const countsByDay = new Map<string, number>();
        const interval = eachDayOfInterval({ start: startDate, end: endDate });

        interval.forEach(day => {
            countsByDay.set(format(day, 'yyyy-MM-dd'), 0);
        });

        data.forEach(message => {
            const day = format(new Date(message.created_at), 'yyyy-MM-dd');
            countsByDay.set(day, (countsByDay.get(day) || 0) + 1);
        });

        const formattedData: TimeSeriesData[] = Array.from(countsByDay.entries()).map(([day, count]) => ({
            date: format(new Date(day), 'MMM d'),
            count: count,
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { data: formattedData, error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        return { data: [], error: message };
    }
}
