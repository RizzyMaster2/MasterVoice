-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Drop old policies if they exist to prevent conflicts
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

drop policy if exists "Users can view chats they are a member of." on public.chats;
drop policy if exists "Users can create chats." on public.chats;

drop policy if exists "Users can view participants of chats they are a member of." on public.chat_participants;
drop policy if exists "Users can insert participants for chats they are a member of." on public.chat_participants;

drop policy if exists "Users can view messages in chats they are a member of." on public.messages;
drop policy if exists "Users can insert messages in chats they are a member of." on public.messages;

drop policy if exists "Authenticated users can upload files." on storage.objects;
drop policy if exists "Anyone can see files." on storage.objects;


-- Create new RLS policies

-- 1. Profiles
-- Corrected policy: Allows any authenticated user to view profiles. This is necessary to see other users' details in chats.
create policy "Public profiles are viewable by authenticated users." on public.profiles
  for select to authenticated using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2. Chats
create policy "Users can view chats they are a member of." on public.chats
  for select using (
    id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );

create policy "Users can create chats." on public.chats
  for insert with check (auth.role() = 'authenticated');

-- 3. Chat Participants
create policy "Users can view participants of chats they are a member of." on public.chat_participants
  for select using (
    chat_id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );
  
create policy "Users can insert participants for chats they are members of." on public.chat_participants
  for insert with check (
    auth.role() = 'authenticated'
  );

-- 4. Messages
create policy "Users can view messages in chats they are a member of." on public.messages
  for select using (
    chat_id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );

create policy "Users can insert messages in chats they are a member of." on public.messages
  for insert with check (
    sender_id = auth.uid() and chat_id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );

-- 5. Files (for avatars and attachments)
create policy "Authenticated users can upload files." on storage.objects
  for insert to authenticated with check ( bucket_id = 'files' );

create policy "Anyone can see files in the files bucket." on storage.objects
  for select using ( bucket_id = 'files' );