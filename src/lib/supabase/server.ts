import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { cache } from 'react'

// This follows the pattern recommended in Next.js 15 for working with cookies()
// https://nextjs.org/docs/messages/sync-dynamic-apis
export const createClient = cache(async () => {
  // In Next.js 15, cookies() must be awaited
  const cookieStore = await cookies()
  
  return createServerComponentClient({ 
    cookies: () => cookieStore 
  })
}) 