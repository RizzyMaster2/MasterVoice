-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Policies for 'profiles' table
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Policies for 'chats' table
drop policy if exists "Users can create chats." on public.chats;
create policy "Users can create chats." on public.chats
  for insert with check (true); -- Further checks are done in chat_participants

drop policy if exists "Users can view chats they are a member of." on public.chats;
create policy "Users can view chats they are a member of." on public.chats
  for select using (
    id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );

-- Policies for 'chat_participants' table
drop policy if exists "Users can view chat participants of chats they are a member of." on public.chat_participants;
create policy "Users can view chat participants of chats they are a member of." on public.chat_participants
  for select using (
    chat_id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert participants for a chat they are creating." on public.chat_participants;
create policy "Users can insert participants for a chat they are creating." on public.chat_participants
  for insert with check (user_id = auth.uid() or chat_id in (select id from chats where admin_id = auth.uid()));


-- Policies for 'messages' table
drop policy if exists "Users can send messages in chats they are a member of." on public.messages;
create policy "Users can send messages in chats they are a member of." on public.messages
  for insert with check (
    sender_id = auth.uid() and
    chat_id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );

drop policy if exists "Users can view messages in chats they are a member of." on public.messages;
create policy "Users can view messages in chats they are a member of." on public.messages
  for select using (
    chat_id in (
      select chat_id from public.chat_participants where user_id = auth.uid()
    )
  );
