
-- Create profiles table
create table if not exists public.profiles (
  id uuid not null primary key,
  created_at timestamptz not null default now(),
  display_name text,
  email text,
  photo_url text,
  status text
);
-- Set up constraint to link to auth.users table
alter table public.profiles
  add constraint fk_profiles_on_users
  foreign key (id) references auth.users(id) on delete cascade;

-- Create chats table
create table if not exists public.chats (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  name text,
  is_group boolean not null default false,
  admin_id uuid references public.profiles(id) on delete set null
);

-- Create chat_participants table
create table if not exists public.chat_participants (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

-- Create messages table
create table if not exists public.messages (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  content text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  type text not null default 'text',
  file_url text
);

-- Set up Realtime publications
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;

-- Function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'photo_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

