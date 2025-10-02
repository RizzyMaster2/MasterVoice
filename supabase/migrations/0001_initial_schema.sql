
-- Drop tables if they exist
DROP TABLE IF EXISTS public.friends CASCADE;
DROP TABLE IF EXISTS public.friend_requests CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chat_participants CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS public.accept_friend_request(bigint, uuid, uuid);

-- Create profiles table
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

-- Create chats table
CREATE TABLE public.chats (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_group_chat boolean DEFAULT false,
    group_name text,
    group_photo_url text
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    chat_id bigint NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    chat_id bigint REFERENCES public.chats(id) ON DELETE CASCADE
);

-- Create friends table
CREATE TABLE public.friends (
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);

-- Create friend_requests table
CREATE TABLE public.friend_requests (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(sender_id, receiver_id)
);

-- Create accept_friend_request function
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id bigint, p_sender_id uuid, p_receiver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the two-way friendship
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (p_receiver_id, p_sender_id);

    INSERT INTO public.friends (user_id, friend_id)
    VALUES (p_sender_id, p_receiver_id);

    -- Delete the friend request
    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;
$$;


-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for friends
CREATE POLICY "Users can view their own friendships." ON public.friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own friendships." ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own friendships." ON public.friends FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for friend_requests
CREATE POLICY "Users can see their own friend requests." ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send friend requests." ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their own friend requests." ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete their own friend requests." ON public.friend_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- RLS Policies for messages
CREATE POLICY "Users can see messages they sent or received." ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages." ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = sender_id);
