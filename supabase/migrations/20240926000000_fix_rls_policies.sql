-- Drop all existing RLS policies to ensure a clean slate.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view chats they are a member of." ON public.chats;
DROP POLICY IF EXISTS "Users can create chats." ON public.chats;
DROP POLICY IF EXISTS "Users can see their own chat memberships." ON public.chat_participants;
DROP POLICY IF EXISTS "Users can see participants of chats they are in." ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join chats." ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their chats." ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their chats." ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated uploads to files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to files bucket" ON storage.objects;

-- === PROFILES POLICIES ===
-- 1. Allow users to read all public profiles. This is necessary to display user names and avatars in chats.
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

-- 2. Allow users to insert their own profile. The trigger handle_new_user does this automatically.
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Allow users to update their own profile.
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- === CHATS POLICIES ===
-- 1. Allow users to see chats they are a participant in.
CREATE POLICY "Users can view chats they are a member of." ON public.chats
  FOR SELECT USING (id IN (
    SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()
  ));

-- 2. Allow any authenticated user to create a new chat.
CREATE POLICY "Users can create chats." ON public.chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- === CHAT_PARTICIPANTS POLICIES ===
-- 1. Allow users to see their own membership record. This is the key fix for the error.
CREATE POLICY "Users can see their own chat memberships." ON public.chat_participants
  FOR SELECT USING (auth.uid() = user_id);
  
-- 2. Allow users to see other participants of chats they are also in.
CREATE POLICY "Users can see participants of chats they are in." ON public.chat_participants
  FOR SELECT USING (chat_id IN (
    SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()
  ));

-- 3. Allow users to be added to chats (create a participant record).
CREATE POLICY "Users can join chats." ON public.chat_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- === MESSAGES POLICIES ===
-- 1. Allow users to read messages from chats they are a participant in.
CREATE POLICY "Users can view messages in their chats." ON public.messages
  FOR SELECT USING (chat_id IN (
    SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()
  ));

-- 2. Allow users to send messages in chats they are a participant in.
CREATE POLICY "Users can send messages in their chats." ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND chat_id IN (
      SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid()
    )
  );

-- === STORAGE POLICIES ===
-- 1. Allow authenticated users to upload to the 'files' bucket.
CREATE POLICY "Allow authenticated uploads to files bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'files');

-- 2. Allow anyone to view files in the 'files' bucket. URLs are non-guessable.
CREATE POLICY "Allow public read access to files bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'files');
