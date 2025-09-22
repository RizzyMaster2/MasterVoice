-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid not null primary key references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  email text,
  photo_url text,
  status text
);
comment on table public.profiles is 'Public user profiles.';

-- 2. Chats Table
create table if not exists public.chats (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  name text,
  is_group boolean not null default false,
  admin_id uuid references public.profiles on delete set null
);
comment on table public.chats is 'Chat rooms.';

-- 3. Chat Participants Table
create table if not exists public.chat_participants (
  chat_id uuid not null references public.chats on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
comment on table public.chat_participants is 'Users who are members of a chat.';

-- 4. Messages Table
create table if not exists public.messages (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  content text not null,
  sender_id uuid not null references public.profiles on delete cascade,
  chat_id uuid not null references public.chats on delete cascade,
  type text not null default 'text',
  file_url text
);
comment on table public.messages is 'Individual chat messages.';


-- 5. Trigger for new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, photo_url)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'photo_url');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists, then create it
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Function to find existing 1-on-1 chat
create or replace function get_existing_chat(user1_id uuid, user2_id uuid)
returns setof uuid
language sql
as $$
    select p1.chat_id
    from chat_participants p1
    join chat_participants p2 on p1.chat_id = p2.chat_id
    join chats on p1.chat_id = chats.id
    where p1.user_id = user1_id and p2.user_id = user2_id and chats.is_group = false;
$$;


-- 7. Enable RLS
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- 8. Drop all old RLS policies to ensure a clean slate
do $$
declare
  r record;
begin
  for r in (select polname, relname from pg_policies where schemaname = 'public') loop
    execute 'DROP POLICY IF EXISTS ' || quote_ident(r.polname) || ' ON public.' || quote_ident(r.relname) || ';';
  end loop;
end;
$$;
do $$
declare
  r record;
begin
  for r in (select polname, relname from pg_policies where schemaname = 'storage') loop
    execute 'DROP POLICY IF EXISTS ' || quote_ident(r.polname) || ' ON storage.' || quote_ident(r.relname) || ';';
  end loop;
end;
$$;


-- 9. Create New RLS Policies
-- Profiles
create policy "Authenticated users can view profiles." on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);
create policy "Admins can delete profiles." on public.profiles for delete using (
  (select check_if_user_is_app_admin(auth.uid()))
);

-- Chats
create policy "Users can view chats they are in." on public.chats for select using (id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
));
create policy "Users can create new chats." on public.chats for insert with check (auth.role() = 'authenticated');
create policy "Group admins can update group chats." on public.chats for update using (admin_id = auth.uid());
create policy "Group admins can delete group chats." on public.chats for delete using (admin_id = auth.uid());

-- Chat Participants
create policy "Users can view participants of chats they are in." on public.chat_participants for select using (chat_id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
));
create policy "Users can add participants to chats they are in." on public.chat_participants for insert with check (chat_id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
));
create policy "Users can remove themselves from chats." on public.chat_participants for delete using (user_id = auth.uid());

-- Messages
create policy "Users can view messages in chats they are in." on public.messages for select using (chat_id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
));
create policy "Users can send messages in chats they are in." on public.messages for insert with check (
  sender_id = auth.uid() and chat_id in (
    select chat_id from public.chat_participants where user_id = auth.uid()
  )
);
create policy "Users can delete their own messages." on public.messages for delete using (sender_id = auth.uid());

-- Storage
create policy "Authenticated users can upload files." on storage.objects for insert to authenticated with check (bucket_id = 'files');
create policy "Anyone can see files." on storage.objects for select using (bucket_id = 'files');

-- Helper function to check for admin privileges based on .env
create or replace function check_if_user_is_app_admin(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  admin_emails text := current_setting('app.admin_emails', true); -- Reading from a custom GUC
begin
  select email into user_email from auth.users where id = user_id;
  
  if admin_emails is null or admin_emails = '' then
    return false;
  end if;

  return user_email = any(string_to_array(admin_emails, ','));
end;
$$;
