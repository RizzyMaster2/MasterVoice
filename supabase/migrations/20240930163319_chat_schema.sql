
-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.messages enable row level security;
alter table public.friend_requests enable row level security;

-- Drop all existing policies on profiles to ensure a clean slate
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

-- Recreate policies for profiles correctly
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Policies for friends
create policy "Users can view their own friends." on public.friends
  for select using (auth.uid() = user_id);
create policy "Users can insert their own friendships." on public.friends
  for insert with check (auth.uid() = user_id);
create policy "Users can delete their own friendships." on public.friends
  for delete using (auth.uid() = user_id);

-- Policies for messages
create policy "Users can view messages they are part of." on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can insert their own messages." on public.messages
  for insert with check (auth.uid() = sender_id);
create policy "Users can delete their own messages." on public.messages
  for delete using (auth.uid() = sender_id);
  
-- Policies for friend_requests
create policy "Users can view their own friend requests." on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can insert their own friend requests." on public.friend_requests
  for insert with check (auth.uid() = sender_id);
create policy "Users can update their own received friend requests." on public.friend_requests
  for update using (auth.uid() = receiver_id);


-- Drop the existing trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- Use CREATE OR REPLACE to safely update the function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, display_name, photo_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end;
$$;

-- Re-create the trigger to use the updated function
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create storage bucket for files
insert into storage.buckets (id, name, public)
values ('files', 'files', true)
on conflict (id) do nothing;

-- RLS for storage
create policy "Anyone can upload a file" on storage.objects for
insert with check (true);

create policy "Anyone can update a file" on storage.objects for
update with check (true);

create policy "Anyone can read a file" on storage.objects for
select using (true);
