-- Add bio column to profiles table
ALTER TABLE public.profiles ADD COLUMN bio TEXT;

-- Drop the existing function if it exists to ensure a clean re-creation
DROP FUNCTION IF EXISTS public.get_initial_home_data(uuid);

-- Recreate the function with the correct columns
CREATE OR REPLACE FUNCTION public.get_initial_home_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    _all_users json;
    _chats json;
    _incoming_friend_requests json;
    _outgoing_friend_requests json;
BEGIN
    -- Get all users except the current user
    SELECT json_agg(
        json_build_object(
            'id', u.id,
            'created_at', p.created_at,
            'display_name', p.display_name,
            'email', u.email,
            'photo_url', p.photo_url,
            'bio', p.bio,
            'status', p.status
        )
    )
    INTO _all_users
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE u.id != p_user_id;

    -- Get all chats the user is a part of
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'created_at', c.created_at,
            'name', c.name,
            'is_group', c.is_group,
            'admin_id', c.admin_id,
            'participants', (SELECT json_agg(cp.user_id) FROM public.chat_participants cp WHERE cp.chat_id = c.id)
        )
    )
    INTO _chats
    FROM public.chats c
    JOIN public.chat_participants cp ON c.id = cp.chat_id
    WHERE cp.user_id = p_user_id;

    -- Get incoming friend requests
    SELECT json_agg(req)
    INTO _incoming_friend_requests
    FROM public.friend_requests req
    WHERE req.to_user_id = p_user_id AND req.status = 'pending';

    -- Get outgoing friend requests
    SELECT json_agg(req)
    INTO _outgoing_friend_requests
    FROM public.friend_requests req
    WHERE req.from_user_id = p_user_id AND req.status = 'pending';

    -- Return all data as a single JSON object
    RETURN json_build_object(
        'all_users', COALESCE(_all_users, '[]'::json),
        'chats', COALESCE(_chats, '[]'::json),
        'incoming_friend_requests', COALESCE(_incoming_friend_requests, '[]'::json),
        'outgoing_friend_requests', COALESCE(_outgoing_friend_requests, '[]'::json)
    );
END;
$$;
