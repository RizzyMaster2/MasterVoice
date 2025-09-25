
-- supabase/migrations/20240726120000_create_check_existing_friend_request_function.sql

create or replace function public.check_existing_friend_request(user1_id uuid, user2_id uuid)
returns friend_requests
language sql
security definer
as $$
  select * from public.friend_requests
  where (from_user_id = user1_id and to_user_id = user2_id)
     or (from_user_id = user2_id and to_user_id = user1_id)
  limit 1;
$$;
