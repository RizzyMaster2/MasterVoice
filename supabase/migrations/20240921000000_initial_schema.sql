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
-- Add a comment to the table.
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
-- Add a comment to the table.
comment on table public.chats is 'Chat rooms.';

-- 3. Create Chat Participants Table
-- This is a junction table between users and chats.
create table public.chat_participants (
  chat_id uuid not null references public.chats on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
-- Add a comment to the table.
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
-- Add a comment to the table.
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