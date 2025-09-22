-- 1. Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;


-- 2. Drop Old Policies (to prevent conflicts)
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

drop policy if exists "Users can view chats they are a member of." on public.chats;
drop policy if exists "Users can create chats." on public.chats;

drop policy if exists "Users can view their own chat memberships." on public.chat_participants;
drop policy if exists "Users can create chat memberships." on public.chat_participants;

drop policy if exists "Users can view messages in their chats." on public.messages;
drop policy if exists "Users can send messages in their chats." on public.messages;

drop policy if exists "Authenticated users can upload files." on storage.objects;
drop policy if exists "Anyone can see files." on storage.objects;


-- 3. Create Correct RLS Policies

-- PROFILES
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- CHATS
create policy "Users can view chats they are a member of."
  on public.chats for select
  using ( id in (select chat_id from public.chat_participants where user_id = auth.uid()) );

create policy "Users can create chats."
  on public.chats for insert
  with check ( auth.role() = 'authenticated' );

-- CHAT PARTICIPANTS
create policy "Users can view their own chat memberships."
  on public.chat_participants for select
  using ( auth.uid() = user_id );

create policy "Users can create chat memberships."
  on public.chat_participants for insert
  with check ( auth.uid() = user_id );

-- MESSAGES
create policy "Users can view messages in their chats."
  on public.messages for select
  using ( chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()) );

create policy "Users can send messages in their chats."
  on public.messages for insert
  with check ( sender_id = auth.uid() and chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()) );
  
-- STORAGE
create policy "Authenticated users can upload files." on storage.objects
  for insert to authenticated with check ( bucket_id = 'files' );

create policy "Anyone can see files." on storage.objects
  for select using ( bucket_id = 'files' );
