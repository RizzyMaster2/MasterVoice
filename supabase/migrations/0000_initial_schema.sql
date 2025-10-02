
-- Drop tables if they exist
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS public.create_public_profile_for_user();
DROP FUNCTION IF EXISTS public.accept_friend_request(bigint, uuid, uuid);


-- Create profiles table
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  display_name text,
  full_name text,
  email text,
  photo_url text,
  status text,
  bio text,
  PRIMARY KEY (id)
);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
    id BIGSERIAL PRIMARY KEY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT friend_requests_check CHECK ((sender_id <> receiver_id)),
    CONSTRAINT friend_requests_unique UNIQUE (sender_id, receiver_id)
);

-- Create friends table
CREATE TABLE public.friends (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id)
);

-- Create chats table
CREATE TABLE public.chats (
  id BIGSERIAL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  participant1_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  participant2_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  chat_id bigint REFERENCES public.chats(id) ON DELETE SET NULL
);

-- Function to create a public profile for a new user
CREATE OR REPLACE FUNCTION public.create_public_profile_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER create_profile_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_public_profile_for_user();


-- Function to accept a friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id bigint, p_sender_id uuid, p_receiver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add to friends table for both users
    INSERT INTO public.friends (user_id, friend_id) VALUES (p_sender_id, p_receiver_id);
    INSERT INTO public.friends (user_id, friend_id) VALUES (p_receiver_id, p_sender_id);

    -- Delete the friend request
    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;
$$;

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own friend requests." ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend requests." ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received friend requests." ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete their own friend requests." ON public.friend_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own friends." ON public.friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own friends." ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own friends." ON public.friends FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see messages they are involved in." ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = sender_id);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see chats they are a part of." ON public.chats FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
CREATE POLICY "Users can create chats." ON public.chats FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Add storage bucket
-- The policy here is just a placeholder, you'll want to refine this for production
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload to the bucket"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'files' );

CREATE POLICY "Anyone can update files."
  ON storage.objects FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can read files"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'files' );
