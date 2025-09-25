
CREATE TYPE public.friend_request_status AS ENUM (
    'pending',
    'accepted',
    'declined'
);

-- Make sure the friend_requests table uses this type
-- We'll alter the column if it exists, otherwise it will be created by another migration.
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'friend_requests' AND column_name = 'status') THEN
        ALTER TABLE public.friend_requests
        ALTER COLUMN status TYPE public.friend_request_status
        USING status::text::public.friend_request_status;
    END IF;
END $$;
