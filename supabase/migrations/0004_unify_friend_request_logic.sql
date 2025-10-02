
-- Drop existing functions and triggers if they exist to ensure a clean slate.
DROP FUNCTION IF EXISTS public.accept_friend_request(integer, uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_friend_request(bigint, uuid, uuid);
DROP FUNCTION IF EXISTS public.create_public_profile_for_user();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

--
-- Name: create_public_profile_for_user(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE OR REPLACE FUNCTION public.create_public_profile_for_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'photo_url'
  );
  RETURN NEW;
END;
$$;

--
-- Name: on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_public_profile_for_user();

--
-- Name: accept_friend_request(bigint, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_request_id bigint, p_sender_id uuid, p_receiver_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Add the friendship in both directions
    INSERT INTO public.friends (user_id, friend_id)
    VALUES (p_receiver_id, p_sender_id), (p_sender_id, p_receiver_id);

    -- Delete the friend request
    DELETE FROM public.friend_requests
    WHERE id = p_request_id;
END;
$$;
