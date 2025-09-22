
create or replace function get_user_chats(p_user_id uuid)
returns table (
    id uuid,
    created_at timestamptz,
    name text,
    is_group boolean,
    admin_id uuid,
    participants json
) as $$
begin
    return query
    select
        c.id,
        c.created_at,
        c.name,
        c.is_group,
        c.admin_id,
        json_agg(json_build_object('user_id', cp.user_id)) as participants
    from
        chats c
    join
        chat_participants cp on c.id = cp.chat_id
    where
        c.id in (select chat_id from chat_participants where user_id = p_user_id)
    group by
        c.id;
end;
$$ language plpgsql;
