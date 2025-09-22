-- 1. Enable RLS on all relevant tables
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- 2. Drop all old policies to ensure a clean slate
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

drop policy if exists "Users can view chats they are a member of." on public.chats;
drop policy if exists "Users can create chats." on public.chats;

drop policy if exists "Users can view their own chat memberships." on public.chat_participants;
drop policy if exists "Users can insert their own chat membership." on public.chat_participants;
drop policy if exists "Users can view participants of chats they are members of." on public.chat_participants;
drop policy if exists "Users can insert participants for chats they are members of." on public.chat_participants;


drop policy if exists "Users can view messages in their chats." on public.messages;
drop policy if exists "Users can send messages in their chats." on public.messages;

drop policy if exists "Allow authenticated uploads to files bucket." on storage.objects;
drop policy if exists "Allow authenticated reads from files bucket." on storage.objects;


-- 3. Create Correct RLS Policies
-- PROFILES
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- CHATS
create policy "Users can view chats they are a member of." on public.chats
  for select using (id in (select chat_id from public.chat_participants where user_id = auth.uid()));

create policy "Users can create chats." on public.chats
  for insert with check (auth.role() = 'authenticated');

-- CHAT PARTICIPANTS
create policy "Users can view participants of chats they are a member of." on public.chat_participants
  for select using (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));

create policy "Users can insert participants for chats they are an admin of." on public.chat_participants
  for insert with check (
    chat_id in (
      select id from public.chats where admin_id = auth.uid()
    )
  );

-- MESSAGES
create policy "Users can view messages in their chats." on public.messages
  for select using (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));

create policy "Users can send messages in their chats." on public.messages
  for insert with check (
    sender_id = auth.uid() and
    chat_id in (select chat_id from public.chat_participants where user_id = auth.uid())
  );

-- STORAGE (FILES)
create policy "Allow authenticated uploads to files bucket." on storage.objects
  for insert to authenticated with check (bucket_id = 'files');

create policy "Allow authenticated reads from files bucket." on storage.objects
  for select to authenticated using (bucket_id = 'files');
