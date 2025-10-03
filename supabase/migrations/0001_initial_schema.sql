-- Drop existing objects in reverse order of dependency
DROP FUNCTION IF EXISTS public.accept_friend_request(request_id integer) CASCADE;
DROP FUNCTION IF EXISTS public.create_public_profile_for_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- Create profiles table first
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text,
    full_name text,
    email text,
    photo_url text,
    status text,
    bio text
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- Create other tables
CREATE TABLE public.chats (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    name text
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
-- Add RLS policies for chats later if needed

CREATE TABLE public.chat_participants (
    chat_id bigint NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (chat_id, user_id)
);
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
-- Add RLS policies for chat_participants later if needed

CREATE TABLE public.messages (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content text,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    chat_id bigint REFERENCES public.chats(id) ON DELETE CASCADE
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own messages." ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert their own messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = sender_id);


CREATE TABLE public.friends (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own friends." ON public.friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own friends." ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own friends." ON public.friends FOR DELETE USING (auth.uid() = user_id);


CREATE TABLE public.friend_requests (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friend_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))
);
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own friend requests." ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend requests." ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received friend requests." ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete their own friend requests." ON public.friend_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);


-- Create the single, correct version of the accept_friend_request function
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
BEGIN
  -- Validate the request and get sender/receiver IDs
  SELECT sender_id, receiver_id
  INTO v_sender_id, v_receiver_id
  FROM public.friend_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or you are not the receiver.';
  END IF;

  -- Add to friends table (both directions)
  INSERT INTO public.friends (user_id, friend_id) VALUES (v_receiver_id, v_sender_id);
  INSERT INTO public.friends (user_id, friend_id) VALUES (v_sender_id, v_receiver_id);

  -- Delete the friend request
  DELETE FROM public.friend_requests WHERE id = request_id;
END;
$$;


-- Function to create a public profile for a new user.
CREATE OR REPLACE FUNCTION public.create_public_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, photo_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
END;
$$;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_public_profile_for_user();
