-- Drop existing objects
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS accept_friend_request(bigint) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_name TEXT,
    full_name TEXT,
    email TEXT,
    photo_url TEXT,
    status TEXT,
    bio TEXT
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);


-- Create chats table
CREATE TABLE chats (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_group_chat BOOLEAN DEFAULT false,
    group_name TEXT,
    group_avatar_url TEXT,
    last_message_id BIGINT
);
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
-- Policies for chats will be more complex depending on group/dm logic


-- Create chat_participants table
CREATE TABLE chat_participants (
    chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
-- Policies for chat_participants will depend on chat ownership/membership


-- Create messages table
CREATE TABLE messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Can be null for group chats
    chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE, -- Can be null for DMs not yet in a chat room
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see messages they are involved in." ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert their own messages." ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete their own messages." ON messages FOR DELETE USING (auth.uid() = sender_id);


-- Add foreign key constraint to chats table for last_message_id
ALTER TABLE chats ADD CONSTRAINT fk_last_message
FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;


-- Create friends table
CREATE TABLE friends (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own friends." ON friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own friends list." ON friends FOR ALL USING (auth.uid() = user_id);


-- Create friend_requests table
CREATE TABLE friend_requests (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see and manage their own friend requests." ON friend_requests FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);


-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger for new user profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- Function to accept a friend request
CREATE OR REPLACE FUNCTION accept_friend_request(request_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  requesting_user_id UUID;
  receiving_user_id UUID;
BEGIN
  -- Get sender and receiver from the request
  SELECT sender_id, receiver_id INTO requesting_user_id, receiving_user_id
  FROM public.friend_requests
  WHERE id = request_id;

  -- Ensure the person accepting is the receiver
  IF receiving_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not authorized to accept this friend request.';
  END IF;

  -- Insert friend records for both users
  INSERT INTO public.friends (user_id, friend_id) VALUES (requesting_user_id, receiving_user_id);
  INSERT INTO public.friends (user_id, friend_id) VALUES (receiving_user_id, requesting_user_id);

  -- Delete the friend request
  DELETE FROM public.friend_requests WHERE id = request_id;
END;
$$;
