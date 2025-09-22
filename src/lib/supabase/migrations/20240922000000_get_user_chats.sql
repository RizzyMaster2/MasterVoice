-- Function to get all chats for a specific user
create or replace function get_user_chats(p_user_id uuid)
returns table (
    id uuid,
    created_at timestamptz,
    name text,
    is_group boolean,
    admin_id uuid,
    participants jsonb
)
language plpgsql
as $$
begin
    return query
    select
        c.id,
        c.created_at,
        c.name,
        c.is_group,
        c.admin_id,
        jsonb_agg(jsonb_build_object('user_id', cp.user_id)) as participants
    from
        chats c
    join
        chat_participants cp on c.id = cp.chat_id
    where
        c.id in (select chat_id from chat_participants where user_id = p_user_id)
    group by
        c.id;
end;
$$;


-- Function to find an existing 1-on-1 chat between two users
create or replace function get_existing_chat(user1_id uuid, user2_id uuid)
returns setof uuid
language sql
as $$
    select cp1.chat_id
    from chat_participants cp1
    join chat_participants cp2 on cp1.chat_id = cp2.chat_id
    join chats c on cp1.chat_id = c.id
    where
        cp1.user_id = user1_id
        and cp2.user_id = user2_id
        and c.is_group = false;
$$;
