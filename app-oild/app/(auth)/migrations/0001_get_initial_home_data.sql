
-- This function fetches all the necessary data for the home page in a single RPC call.
create or replace function get_initial_home_data(p_user_id uuid)
returns json as $$
declare
  all_users_json json;
  chats_json json;
  incoming_requests_json json;
  outgoing_requests_json json;
begin
  -- 1. Get all users and their profiles
  select json_agg(
    json_build_object(
      'id', u.id,
      'created_at', p.created_at,
      'display_name', coalesce(p.display_name, u.raw_user_meta_data->>'display_name', u.email, 'User'),
      'email', u.email,
      'photo_url', coalesce(p.photo_url, u.raw_user_meta_data->>'photo_url', u.raw_user_meta_data->>'avatar_url'),
      'status', p.status,
      'bio', coalesce(p.bio, u.raw_user_meta_data->>'bio')
    )
  ) into all_users_json
  from auth.users u
  left join public.profiles p on u.id = p.id;

  -- 2. Get all chats for the user with participant IDs
  select json_agg(
    json_build_object(
      'id', c.id,
      'created_at', c.created_at,
      'name', c.name,
      'is_group', c.is_group,
      'admin_id', c.admin_id,
      'participants', (select json_agg(cp.user_id) from public.chat_participants cp where cp.chat_id = c.id)
    )
  ) into chats_json
  from public.chats c
  join public.chat_participants cp_user on c.id = cp_user.chat_id
  where cp_user.user_id = p_user_id;

  -- 3. Get incoming friend requests
  select json_agg(req) into incoming_requests_json
  from public.friend_requests req
  where req.to_user_id = p_user_id and req.status = 'pending';

  -- 4. Get outgoing friend requests
  select json_agg(req) into outgoing_requests_json
  from public.friend_requests req
  where req.from_user_id = p_user_id and req.status = 'pending';

  -- Return all data as a single JSON object
  return json_build_object(
    'all_users', coalesce(all_users_json, '[]'::json),
    'chats', coalesce(chats_json, '[]'::json),
    'incoming_requests', coalesce(incoming_requests_json, '[]'::json),
    'outgoing_requests', coalesce(outgoing_requests_json, '[]'::json)
  );
end;
$$ language plpgsql security definer;
