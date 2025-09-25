
-- Create the ENUM type if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_request_status') THEN
        CREATE TYPE public.friend_request_status AS ENUM ('pending', 'accepted', 'declined');
    END IF;
END$$;

-- Drop the default constraint on the status column
ALTER TABLE public.friend_requests ALTER COLUMN status DROP DEFAULT;

-- Alter the column type to use the new ENUM
ALTER TABLE public.friend_requests
    ALTER COLUMN status TYPE public.friend_request_status
    USING status::text::public.friend_request_status;

-- Add the default constraint back with the correct type
ALTER TABLE public.friend_requests
    ALTER COLUMN status SET DEFAULT 'pending'::public.friend_request_status;
