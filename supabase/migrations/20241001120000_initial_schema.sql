-- Drop existing tables and functions to ensure a clean slate
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.accept_friend_request(integer, uuid, uuid);


-- Profiles Table: Stores user profile information
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

-- Friends Table: Stores friendship relationships
CREATE TABLE public.friends (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Friend Requests Table: Manages pending friend requests
CREATE TABLE public.friend_requests (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friend_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])))
);
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Chats Table (Optional, for group chats or metadata)
CREATE TABLE public.chats (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Messages Table: Stores chat messages
CREATE TABLE public.messages (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Friends
CREATE POLICY "Users can view their own friends." ON public.friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own friend records." ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own friendships." ON public.friends FOR DELETE USING (auth.uid() = user_id);


-- Policies for Friend Requests
CREATE POLICY "Users can see their own friend requests." ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend requests." ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their own received friend requests." ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);


-- Policies for Messages
CREATE POLICY "Users can view messages they are part of." ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- Function to handle creating a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, photo_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RPC function to accept a friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id integer, sender_id uuid, receiver_id uuid)
RETURNS void AS $$
BEGIN
    -- Update the friend request status to 'accepted'
    UPDATE public.friend_requests
    SET status = 'accepted'
    WHERE id = request_id AND receiver_id = receiver_id;

    -- Insert the friendship record for the receiver
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (receiver_id, sender_id);

    -- Insert the friendship record for the sender
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (sender_id, receiver_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
