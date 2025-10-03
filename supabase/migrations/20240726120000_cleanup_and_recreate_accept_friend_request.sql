
-- Drop all possible old versions of the accept_friend_request function
-- This handles the case where the function exists with different parameter signatures.

-- Drop function with bigint parameter if it exists
DROP FUNCTION IF EXISTS public.accept_friend_request(p_request_id bigint);

-- Drop function with integer parameter if it exists
DROP FUNCTION IF EXISTS public.accept_friend_request(p_request_id integer);

-- Drop function with uuid parameters if it exists
DROP FUNCTION IF EXISTS public.accept_friend_request(p_sender_id uuid, p_receiver_id uuid);

-- Drop function with the correct name but wrong type
DROP FUNCTION IF EXISTS public.accept_friend_request(request_id bigint);

-- Drop function with the correct name but possibly no parameters if one was made
DROP FUNCTION IF EXISTS public.accept_friend_request();


-- Recreate the function with a single, correct signature
create or replace function public.accept_friend_request(request_id integer)
returns void
language plpgsql
security definer
as $$
declare
  sender_uuid uuid;
  receiver_uuid uuid;
begin
  -- First, get the sender and receiver from the request and verify the current user is the receiver
  select sender_id, receiver_id into sender_uuid, receiver_uuid
  from public.friend_requests
  where id = request_id and receiver_id = auth.uid();

  -- If the request doesn't exist or the current user is not the receiver, raise an error
  if not found then
    raise exception 'Friend request not found or you are not authorized to accept it.';
  end if;

  -- Add the friendship in both directions
  insert into public.friends (user_id, friend_id) values (sender_uuid, receiver_uuid);
  insert into public.friends (user_id, friend_id) values (receiver_uuid, sender_uuid);

  -- Delete the friend request
  delete from public.friend_requests where id = request_id;
end;
$$;
