
-- Drop all old versions of the functions and triggers to ensure a clean slate.
-- Use CASCADE to remove dependent objects like triggers.
DROP FUNCTION IF EXISTS accept_friend_request(integer, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS accept_friend_request(bigint, uuid, uuid) CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_public_profile_for_user() CASCADE;


--
-- Creates a public profile for a new user.
--
CREATE OR REPLACE FUNCTION create_public_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--
-- Trigger for creating a public profile on new user signup.
--
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE create_public_profile_for_user();

--
-- Accepts a friend request, creates the two-way friendship, and deletes the request.
--
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id bigint, p_sender_id uuid, p_receiver_id uuid)
RETURNS void AS $$
BEGIN
    -- Insert the first friendship record
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (p_receiver_id, p_sender_id);

    -- Insert the second (reciprocal) friendship record
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (p_sender_id, p_receiver_id);

    -- Delete the friend request
    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
