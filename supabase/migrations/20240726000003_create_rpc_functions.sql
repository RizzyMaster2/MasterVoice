
-- Function to check for an existing friend request between two users
create or replace function public.check_existing_friend_request(user1_id uuid, user2_id uuid)
returns table (
  id uuid,
  from_user_id uuid,
  to_user_id uuid,
  status public.friend_request_status,
  created_at timestamp with time zone
)
language sql
as $$
  select *
  from public.friend_requests
  where (from_user_id = user1_id and to_user_id = user2_id)
     or (from_user_id = user2_id and to_user_id = user1_id);
$$;

-- Function to get an existing 1-on-1 chat between two users
create or replace function public.get_existing_chat(user1_id uuid, user2_id uuid)
returns table (
  chat_id uuid
)
language sql
as $$
  select p1.chat_id
  from chat_participants p1
  join chat_participants p2 on p1.chat_id = p2.chat_id
  join chats c on p1.chat_id = c.id
  where p1.user_id = user1_id
    and p2.user_id = user2_id
    and c.is_group = false;
$$;
