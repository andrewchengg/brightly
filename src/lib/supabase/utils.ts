import { createClient } from './server'
import { type User } from '@supabase/supabase-js'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.user_metadata?.role as string | null
} 