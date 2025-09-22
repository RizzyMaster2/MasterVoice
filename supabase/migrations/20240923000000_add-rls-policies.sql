
-- Enable Row Level Security (RLS) for all relevant tables
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Drop existing policies to ensure a clean slate
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

drop policy if exists "Users can create chats." on public.chats;
drop policy if exists "Users can view chats they are members of." on public.chats;

drop policy if exists "Users can insert their own participation." on public.chat_participants;
drop policy if exists "Users can view participants of their own chats." on public.chat_participants;

drop policy if exists "Users can create messages in chats they are a member of." on public.messages;
drop policy if exists "Users can view messages in chats they are a member of." on public.messages;


-- Create policies for the 'profiles' table
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create policies for the 'chats' table
create policy "Users can create chats." on public.chats
  for insert with check (auth.uid() is not null);

create policy "Users can view chats they are members of." on public.chats
  for select using (id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
  ));

-- Create policies for the 'chat_participants' table
create policy "Users can insert their own participation." on public.chat_participants
  for insert with check (auth.uid() = user_id);

create policy "Users can view participants of their own chats." on public.chat_participants
  for select using (chat_id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
  ));

-- Create policies for the 'messages' table
create policy "Users can create messages in chats they are a member of." on public.messages
  for insert with check (
    sender_id = auth.uid() and
    chat_id in (select chat_id from public.chat_participants where user_id = auth.uid())
  );

create policy "Users can view messages in chats they are a member of." on public.messages
  for select using (
    chat_id in (select chat_id from public.chat_participants where user_id = auth.uid())
  );
