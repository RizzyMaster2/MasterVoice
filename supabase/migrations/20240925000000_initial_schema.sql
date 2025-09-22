-- 1. Create Profiles Table
-- This table stores public user data.
create table public.profiles (
  id uuid not null primary key references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  email text,
  photo_url text,
  status text
);
comment on table public.profiles is 'Public user profiles.';

-- 2. Create Chats Table
-- This table stores information about chat rooms.
create table public.chats (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  name text,
  is_group boolean not null default false,
  admin_id uuid references public.profiles
);
comment on table public.chats is 'Chat rooms.';

-- 3. Create Chat Participants Table
-- This is a junction table between users and chats.
create table public.chat_participants (
  chat_id uuid not null references public.chats on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
comment on table public.chat_participants is 'Users who are members of a chat.';

-- 4. Create Messages Table
-- This table stores all chat messages.
create table public.messages (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  content text not null,
  sender_id uuid not null references public.profiles,
  chat_id uuid not null references public.chats on delete cascade,
  type text not null default 'text',
  file_url text
);
comment on table public.messages is 'Individual chat messages.';

-- 5. Set up Trigger to Create Profile on New User Signup
-- This function is called when a new user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'photo_url');
  return new;
end;
$$ language plpgsql security definer;

-- This trigger calls the function when a new user is created.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Create RPC to check for existing 1-on-1 chats
create or replace function public.get_existing_chat(user1_id uuid, user2_id uuid)
returns setof uuid
language sql
as $$
  select c.chat_id
  from chat_participants as c
  join chat_participants as c2 on c.chat_id = c2.chat_id
  where c.user_id = user1_id and c2.user_id = user2_id
  and not (select is_group from chats where id = c.chat_id);
$$;

-- 7. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- 8. Create RLS Policies
-- Drop old policies first to ensure a clean slate.
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can view chats they are a member of." on public.chats;
drop policy if exists "Users can create chats." on public.chats;
drop policy if exists "Users can view participants of chats they are a member of." on public.chat_participants;
drop policy if exists "Users can insert participants for chats they are members of." on public.chat_participants;
drop policy if exists "Users can view messages in chats they are a member of." on public.messages;
drop policy if exists "Users can insert messages in chats they are a member of." on public.messages;
drop policy if exists "Authenticated users can upload files." on storage.objects;
drop policy if exists "Anyone can see files." on storage.objects;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create policies for chats
create policy "Users can view chats they are a member of." on public.chats for select using (id in (select chat_id from public.chat_participants where user_id = auth.uid()));
create policy "Users can create chats." on public.chats for insert with check (auth.role() = 'authenticated');

-- Create policies for chat_participants
create policy "Users can view participants of chats they are a member of." on public.chat_participants for select using (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));
create policy "Users can insert participants for chats they are members of." on public.chat_participants for insert with check (auth.role() = 'authenticated');

-- Create policies for messages
create policy "Users can view messages in chats they are a member of." on public.messages for select using (chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));
create policy "Users can insert messages in chats they are a member of." on public.messages for insert with check (sender_id = auth.uid() and chat_id in (select chat_id from public.chat_participants where user_id = auth.uid()));

-- Create policies for Supabase Storage (for file uploads)
create policy "Authenticated users can upload files." on storage.objects for insert to authenticated with check (bucket_id = 'files');
create policy "Anyone can see files." on storage.objects for select using (bucket_id = 'files');
