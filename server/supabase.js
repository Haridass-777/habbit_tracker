
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing Supabase credentials. Check your .env file.'
  );
  process.exit(1);
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

console.log('Supabase URL configured:', Boolean(SUPABASE_URL));
console.log(
  'Supabase server key configured:',
  Boolean(SUPABASE_SERVICE_ROLE_KEY)
);
