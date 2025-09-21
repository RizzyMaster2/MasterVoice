// This file is deprecated.
// Use the clients from @/lib/supabase/client, @/lib/supabase/server, or @/lib/supabase/admin instead.
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
