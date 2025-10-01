
-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.friend_requests enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Drop all policies on profiles to ensure a clean slate
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;

-- Drop existing chat policies
drop policy if exists "Users can view their own chats." on public.chats;
drop policy if exists "Users can create chats." on public.chats;
drop policy if exists "Users can view their own chat participants." on public.chat_participants;
drop policy if exists "Users can insert their own chat participants." on public.chat_participants;
drop policy if exists "Users can view messages in their chats." on public.messages;
drop policy if exists "Users can send messages in their chats." on public.messages;
drop policy if exists "Users can delete their own messages" on public.messages;

-- Create Policies for `profiles`
create policy "Public profiles are viewable by everyone."
on public.profiles for select
using ( true );

create policy "Users can insert their own profile."
on public.profiles for insert
with check ( auth.uid() = id );

create policy "Users can update their own profile."
on public.profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );


-- Create Policies for `friends`
create policy "Users can view their own friends."
on public.friends for select
using ( auth.uid() = user_id );

create policy "Users can add their own friends."
on public.friends for insert
with check ( auth.uid() = user_id );

create policy "Users can delete their own friends."
on public.friends for delete
using ( auth.uid() = user_id );

-- Create Policies for `friend_requests`
create policy "Users can view their own friend requests."
on public.friend_requests for select
using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can create friend requests."
on public.friend_requests for insert
with check ( auth.uid() = sender_id );

create policy "Users can update their own friend requests."
on public.friend_requests for update
using ( auth.uid() = receiver_id );

-- Create Policies for `chats` and related tables
create policy "Users can view chats they are a participant in."
on public.chats for select
using ( exists (
  select 1
  from public.chat_participants
  where chat_participants.chat_id = chats.id
    and chat_participants.user_id = auth.uid()
));

create policy "Users can create chats."
on public.chats for insert
with check ( true ); -- Further checks will be on chat_participants

-- Policies for chat_participants
create policy "Users can view participants of chats they are in."
on public.chat_participants for select
using ( exists (
  select 1
  from public.chat_participants as p_check
  where p_check.chat_id = chat_participants.chat_id
    and p_check.user_id = auth.uid()
));

create policy "Users can insert themselves into a chat."
on public.chat_participants for insert
with check ( user_id = auth.uid() );


-- Policies for messages
create policy "Users can view messages in chats they are a participant in."
on public.messages for select
using ( exists (
  select 1
  from public.chat_participants
  where chat_participants.chat_id = messages.chat_id
    and chat_participants.user_id = auth.uid()
));

create policy "Users can send messages in chats they are a participant in."
on public.messages for insert
with check (
  sender_id = auth.uid() and
  exists (
    select 1
    from public.chat_participants
    where chat_participants.chat_id = messages.chat_id
      and chat_participants.user_id = auth.uid()
  )
);

create policy "Users can delete their own messages."
on public.messages for delete
using ( sender_id = auth.uid() );


-- Drop existing function and trigger to be safe
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user;

-- Function to create a profile for a new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, full_name, photo_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$;

-- Trigger to call the function on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Policies for storage
drop policy if exists "Avatar images are publicly accessible." on storage.objects;
create policy "Avatar images are publicly accessible." on storage.objects for select using (bucket_id = 'files');

drop policy if exists "Anyone can upload an avatar." on storage.objects;
create policy "Anyone can upload an avatar." on storage.objects for insert with check (bucket_id = 'files');

drop policy if exists "Anyone can update their own avatar." on storage.objects;
create policy "Anyone can update their own avatar." on storage.objects for update with check (bucket_id = 'files' and auth.uid() = owner);
