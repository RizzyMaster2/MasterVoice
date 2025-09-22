-- Drop the old function if it exists to avoid conflicts.
DROP FUNCTION IF EXISTS get_user_chats(uuid);

-- Create the new, corrected function.
CREATE OR REPLACE FUNCTION get_user_chats(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    name text,
    is_group boolean,
    admin_id uuid,
    participants json
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.name,
        c.is_group,
        c.admin_id,
        json_agg(json_build_object('user_id', cp.user_id)) AS participants
    FROM
        chats c
    JOIN
        chat_participants cp ON c.id = cp.chat_id
    WHERE
        c.id IN (SELECT chat_id FROM chat_participants WHERE user_id = p_user_id)
    GROUP BY
        c.id
    ORDER BY
        MAX(c.created_at) DESC;
END;
$$ LANGUAGE plpgsql;
