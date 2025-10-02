-- Initial Schema for MasterVoice

-- Drop existing tables and types if they exist, in reverse order of creation
DROP FUNCTION IF EXISTS public.accept_friend_request(p_request_id integer, p_sender_id uuid, p_receiver_id uuid);
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.chat_participants;
DROP TABLE IF EXISTS public.chats;
DROP TABLE IF EXISTS public.friends;
DROP TABLE IF EXISTS public.friend_requests;
DROP TABLE IF EXISTS public.profiles;
DROP TYPE IF EXISTS public.friend_request_status;

--
-- Name: friend_request_status; Type: TYPE; Schema: public; Owner: postgres
--
CREATE TYPE public.friend_request_status AS ENUM (
    'pending',
    'accepted',
    'declined'
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text,
    full_name text,
    email text,
    photo_url text,
    status text,
    bio text
);

ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."profiles"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert their own profile" ON "public"."profiles"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON "public"."profiles"
AS PERMISSIVE FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.friend_requests (
    id integer NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status public.friend_request_status DEFAULT 'pending'::public.friend_request_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.friend_requests OWNER TO postgres;

--
-- Name: friend_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--
CREATE SEQUENCE public.friend_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.friend_requests_id_seq OWNER TO postgres;

--
-- Name: friend_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--
ALTER SEQUENCE public.friend_requests_id_seq OWNED BY public.friend_requests.id;

--
-- Name: friend_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.friend_requests ALTER COLUMN id SET DEFAULT nextval('public.friend_requests_id_seq'::regclass);

--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);

--
-- Name: friend_requests_sender_id_receiver_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE public.friend_requests
    ADD CONSTRAINT friend_requests_sender_id_receiver_id_key UNIQUE (sender_id, receiver_id);


ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own friend requests" ON "public"."friend_requests"
AS PERMISSIVE FOR SELECT
TO public
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" ON "public"."friend_requests"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own friend requests" ON "public"."friend_requests"
AS PERMISSIVE FOR UPDATE
TO public
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own friend requests" ON public.friend_requests
AS PERMISSIVE FOR DELETE
TO public
USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));


--
-- Name: friends; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.friends (
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.friends OWNER TO postgres;

--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (user_id, friend_id);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own friends" ON "public"."friends"
AS PERMISSIVE FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own friends" ON "public"."friends"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friends" ON "public"."friends"
AS PERMISSIVE FOR DELETE
TO public
USING (auth.uid() = user_id);


--
-- Name: chats; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.chats (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_group boolean DEFAULT false,
    name text
);

ALTER TABLE public.chats OWNER TO postgres;

--
-- Name: chats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--
CREATE SEQUENCE public.chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.chats_id_seq OWNER TO postgres;

--
-- Name: chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--
ALTER SEQUENCE public.chats_id_seq OWNED BY public.chats.id;

--
-- Name: chats id; Type: DEFAULT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.chats ALTER COLUMN id SET DEFAULT nextval('public.chats_id_seq'::regclass);

--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);

--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.chat_participants (
    chat_id integer NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_participants OWNER TO postgres;

--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (chat_id, user_id);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--
CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--
CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--
ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;

--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);

--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--
ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see messages they are part of" ON "public"."messages"
AS PERMISSIVE FOR SELECT
TO public
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON "public"."messages"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" ON "public"."messages"
AS PERMISSIVE FOR DELETE
TO public
USING (auth.uid() = sender_id);


--
-- Foreign Key Constraints
--
ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- RPC Functions
--

-- Function to handle creating a profile for a new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, full_name, email, photo_url)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger to call the function when a new user signs up
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Function to accept a friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id integer, p_sender_id uuid, p_receiver_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if the request exists and is pending for the receiver
    IF NOT EXISTS (
        SELECT 1
        FROM public.friend_requests
        WHERE id = p_request_id
          AND sender_id = p_sender_id
          AND receiver_id = p_receiver_id
          AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Friend request not found or not pending for this user.';
    END IF;

    -- Add the friendship in both directions
    INSERT INTO public.friends (user_id, friend_id) VALUES (p_receiver_id, p_sender_id);
    INSERT INTO public.friends (user_id, friend_id) VALUES (p_sender_id, p_receiver_id);
    
    -- Delete the friend request
    DELETE FROM public.friend_requests WHERE id = p_request_id;
END;
$function$;