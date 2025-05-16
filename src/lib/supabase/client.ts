import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () =>
  createClientComponentClient({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
  }) 