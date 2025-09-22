-- This function checks if a 1-on-1 chat already exists between two users.
create or replace function get_existing_chat(user1_id uuid, user2_id uuid)
returns table (chat_id uuid)
language plpgsql
as $$
begin
  return query
  select p1.chat_id
  from chat_participants p1
  join chat_participants p2 on p1.chat_id = p2.chat_id
  join chats c on p1.chat_id = c.id
  where p1.user_id = user1_id
    and p2.user_id = user2_id
    and c.is_group = false;
end;
$$;
