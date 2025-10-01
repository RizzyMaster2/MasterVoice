
-- Drop policies on profiles to ensure a clean slate
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;

-- Drop policies on friends
DROP POLICY IF EXISTS "Users can only manage their own friendships." ON public.friends;
DROP POLICY IF EXISTS "Users can view their own friendships." ON public.friends;

-- Drop policies on friend_requests
DROP POLICY IF EXISTS "Users can manage their own friend requests." ON public.friend_requests;

-- Drop policies on messages
DROP POLICY IF EXISTS "Users can manage their own messages." ON public.messages;

-- Drop trigger before function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Use CREATE OR REPLACE to avoid dropping the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, photo_url, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  display_name TEXT,
  full_name TEXT,
  email TEXT,
  photo_url TEXT,
  status TEXT,
  bio TEXT
);

-- Profiles RLS Policies
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

-- Friends RLS Policies
CREATE POLICY "Users can view their own friendships." ON public.friends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only manage their own friendships." ON public.friends
  FOR ALL USING (auth.uid() = user_id);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (sender_id, receiver_id)
);

-- Friend Requests RLS Policies
CREATE POLICY "Users can manage their own friend requests." ON public.friend_requests
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create messages table (for direct messaging)
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Messages RLS Policies
CREATE POLICY "Users can manage their own messages." ON public.messages
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id);

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create file storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('files', 'files', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for file storage
CREATE POLICY "Users can view their own folder" ON storage.objects
  FOR SELECT USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text);
