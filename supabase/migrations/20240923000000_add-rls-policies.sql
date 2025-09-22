-- 1. Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- 2. Drop old policies to ensure a clean slate
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

drop policy if exists "Users can view chats they are a member of." on public.chats;
drop policy if exists "Users can create chats." on public.chats;

drop policy if exists "Users can view participants of chats they are a member of." on public.chat_participants;
drop policy if exists "Users can view their own chat memberships." on public.chat_participants;
drop policy if exists "Users can insert their own chat memberships." on public.chat_participants;

drop policy if exists "Users can view messages in chats they are a member of." on public.messages;
drop policy if exists "Users can insert messages in chats they are a member of." on public.messages;

drop policy if exists "Authenticated users can upload files." on storage.objects;
drop policy if exists "Anyone can see files." on storage.objects;

-- 3. Create Correct RLS Policies
-- Profiles: Users can see all profiles, but only manage their own.
create policy "Public profiles are viewable by everyone." on public.profiles 
    for select to authenticated using (true);

create policy "Users can insert their own profile." on public.profiles 
    for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles 
    for update using (auth.uid() = id);

-- Chats: Users can see chats they are a part of, and any authenticated user can create a chat.
create policy "Users can view chats they are a member of." on public.chats 
    for select using (id in (select chat_id from public.chat_participants where user_id = auth.uid()));

create policy "Users can create chats." on public.chats 
    for insert with check (auth.role() = 'authenticated');

-- Chat Participants: THIS IS THE KEY FIX.
-- A user can see rows in chat_participants if they are a member of that chat.
-- This allows the app to fetch the list of all participants for a given chat.
create policy "Users can view participants of chats they are a member of." on public.chat_participants 
    for select using (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));

-- Users can add members to chats they are a part of.
create policy "Users can insert participants for chats they are a member of." on public.chat_participants
    for insert with check (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));

-- Messages: Users can see messages in chats they are a member of, and can only send as themselves.
create policy "Users can view messages in chats they are a member of." on public.messages 
    for select using (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));

create policy "Users can insert messages in chats they are a member of." on public.messages 
    for insert with check (sender_id = auth.uid() and chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));
    
-- Storage: Allow authenticated users to upload files, and allow anyone to view them (as URLs are non-guessable).
create policy "Authenticated users can upload files." on storage.objects 
    for insert to authenticated with check (bucket_id = 'files');

create policy "Anyone can see files." on storage.objects 
    for select using (bucket_id = 'files');
