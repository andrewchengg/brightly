"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { type User } from "@supabase/supabase-js"

export const useSupabaseUser = () => {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setIsLoaded(true)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, isLoaded }
}

export const useUserRole = () => {
  const { user, isLoaded } = useSupabaseUser()

  if (!isLoaded || !user) {
    return { role: null, isLoaded }
  }

  return {
    role: user.user_metadata?.role as string | undefined,
    isLoaded,
  }
} 