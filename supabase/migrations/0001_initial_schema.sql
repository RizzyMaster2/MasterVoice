
-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_public_profile_for_user();
DROP FUNCTION IF EXISTS public.accept_friend_request(p_request_id bigint, p_sender_id uuid, p_receiver_id uuid);

-- Drop tables in reverse order of dependency
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.friends;
DROP TABLE IF EXISTS public.friend_requests;
DROP TABLE IF EXISTS public.chats;
DROP TABLE IF EXISTS public.profiles;


-- Profiles Table
-- This table is intended to store public-facing user data.
CREATE TABLE
  public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    display_name character varying NULL,
    full_name character varying NULL,
    photo_url character varying NULL,
    status character varying NULL,
    bio character varying NULL,
    email character varying NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
  ) TABLESPACE pg_default;

-- Chats Table
-- This table stores information about chat sessions.
CREATE TABLE
  public.chats (
    id uuid NOT NULL DEFAULT gen_random_uuid (),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_group boolean NOT NULL DEFAULT false,
    name character varying NULL,
    CONSTRAINT chats_pkey PRIMARY KEY (id)
  ) TABLESPACE pg_default;


-- Friends Table
-- This table manages the friendship relationships between users.
CREATE TABLE
  public.friends (
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT friends_pkey PRIMARY KEY (user_id, friend_id),
    CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.profiles (id) ON DELETE CASCADE
  ) TABLESPACE pg_default;

-- Friend Requests Table
-- This table tracks pending, accepted, and declined friend requests.
CREATE TABLE
  public.friend_requests (
    id bigint NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status character varying NOT NULL DEFAULT 'pending'::character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT friend_requests_pkey PRIMARY KEY (id),
    CONSTRAINT friend_requests_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT friend_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT friend_requests_status_check CHECK (
      (
        (status) :: text = ANY (
          ARRAY[('pending'::character varying) :: text, ('accepted'::character varying) :: text, ('declined'::character varying) :: text]
        )
      )
    )
  ) TABLESPACE pg_default;

-- Sequence for Friend Requests ID
CREATE SEQUENCE public.friend_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.friend_requests_id_seq OWNER TO postgres;
ALTER TABLE public.friend_requests ALTER COLUMN id SET DEFAULT nextval('public.friend_requests_id_seq'::regclass);


-- Messages Table
-- This table stores all messages sent between users.
CREATE TABLE
  public.messages (
    id bigint NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    chat_id uuid NULL,
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats (id) ON DELETE SET NULL,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles (id) ON DELETE CASCADE
  ) TABLESPACE pg_default;

-- Sequence for Messages ID
CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.messages_id_seq OWNER TO postgres;
ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


-- Function to create a public profile for a new user
CREATE OR REPLACE FUNCTION public.create_public_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, full_name, photo_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger to create a profile when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_public_profile_for_user();

-- Function to accept a friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id bigint, p_sender_id uuid, p_receiver_id uuid)
RETURNS void AS $$
BEGIN
    -- Insert the two friendship rows
    INSERT INTO public.friends(user_id, friend_id) VALUES (p_receiver_id, p_sender_id);
    INSERT INTO public.friends(user_id, friend_id) VALUES (p_sender_id, p_receiver_id);
    
    -- Delete the friend request
    DELETE FROM public.friend_requests WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for Friends
DROP POLICY IF EXISTS "Users can view their own friends" ON public.friends;
CREATE POLICY "Users can view their own friends" ON public.friends FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add friends" ON public.friends;
CREATE POLICY "Users can add friends" ON public.friends FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own friends" ON public.friends;
CREATE POLICY "Users can remove their own friends" ON public.friends FOR DELETE USING (auth.uid() = user_id);

-- Policies for Friend Requests
DROP POLICY IF EXISTS "Users can see their own friend requests" ON public.friend_requests;
CREATE POLICY "Users can see their own friend requests" ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_requests;
CREATE POLICY "Users can create friend requests" ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their own friend requests" ON public.friend_requests;
CREATE POLICY "Users can update their own friend requests" ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their own friend requests" ON public.friend_requests;
CREATE POLICY "Users can delete their own friend requests" ON public.friend_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policies for Messages
DROP POLICY IF EXISTS "Users can see messages they are part of" ON public.messages;
CREATE POLICY "Users can see messages they are part of" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (auth.uid() = sender_id);
