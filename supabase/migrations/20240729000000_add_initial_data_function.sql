
-- This migration creates a single, optimized function to fetch all the initial data
-- required for the `/home` layout. This drastically improves performance by reducing
-- multiple round-trips to the database into a single query.

create or replace function get_initial_home_data()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  result json;
begin
  -- Ensure the user exists
  if current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select json_build_object(
    'all_users', (
      select json_agg(
        json_build_object(
          'id', p.id,
          'created_at', p.created_at,
          'display_name', p.display_name,
          'email', p.email,
          'photo_url', p.photo_url,
          'status', p.status,
          'bio', p.bio
        )
      )
      from profiles p
      join auth.users u on p.id = u.id
    ),
    'chats', (
      select json_agg(
        json_build_object(
          'id', c.id,
          'created_at', c.created_at,
          'name', c.name,
          'is_group', c.is_group,
          'admin_id', c.admin_id,
          'participants', (
            select json_agg(cp.user_id)
            from chat_participants cp
            where cp.chat_id = c.id
          )
        )
      )
      from chats c
      where c.id in (
        select chat_id from chat_participants where user_id = current_user_id
      )
    ),
    'incoming_friend_requests', (
      select json_agg(fr)
      from friend_requests fr
      where fr.to_user_id = current_user_id and fr.status = 'pending'
    ),
    'outgoing_friend_requests', (
      select json_agg(fr)
      from friend_requests fr
      where fr.from_user_id = current_user_id and fr.status = 'pending'
    )
  ) into result;

  return result;
end;
$$;
