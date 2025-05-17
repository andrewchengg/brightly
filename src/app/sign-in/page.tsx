"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { type User } from "@supabase/supabase-js"

// Client-side hook to get the current user
export const useSupabaseUser = () => {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Fetch the user on initial load
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setIsLoaded(true)
      }
    )

    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return {
    user,
    isLoaded,
  }
}

// Client-side helper to get the user's role
export const useUserRole = () => {
  const { user, isLoaded } = useSupabaseUser()

  if (!isLoaded || !user) {
    return { role: null, isLoaded }
  }

  return {
    role: (user.user_metadata?.role as string) || "student",
    isLoaded,
  }
}

// Client-side helper to sign out
export const useSignOut = () => {
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/sign-in')
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return { signOut, isLoading }
}

export default function SignInPage() {
  const router = useRouter()
  const supabase = createClient()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      // Determine if the identifier is an email or username
      const isEmail = identifier.includes('@')
      
      let signInResponse
      
      if (isEmail) {
        // Sign in using email
        signInResponse = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        })
      } else {
        // First we need to find the user's email using their username
        const { data: userData, error: findUserError } = await supabase
          .from('Student')
          .select('email')
          .eq('username', identifier)
          .single();

        if (findUserError || !userData?.email) {
          // If not found in Student table, try Parent table
          const { data: parentData, error: findParentError } = await supabase
            .from('Parent')
            .select('email')
            .eq('username', identifier)
            .single();
            
          if (findParentError || !parentData?.email) {
            // Try Teacher table as a last resort
            const { data: teacherData, error: findTeacherError } = await supabase
              .from('Teacher')
              .select('email')
              .eq('username', identifier)
              .single();
              
            if (findTeacherError || !teacherData?.email) {
              setError("Username not found. Please check your credentials.");
              setIsLoading(false);
              return;
            }
            
            // Sign in using teacher email
            signInResponse = await supabase.auth.signInWithPassword({
              email: teacherData.email,
              password,
            })
          } else {
            // Sign in using parent email
            signInResponse = await supabase.auth.signInWithPassword({
              email: parentData.email,
              password,
            })
          }
        } else {
          // Sign in using student email
          signInResponse = await supabase.auth.signInWithPassword({
            email: userData.email,
            password,
          })
        }
      }

      const { error: signInError, data } = signInResponse

      if (signInError) {
        setError(signInError.message)
      } else if (data.user) {
        // Redirect based on role or to a default dashboard
        const role = data.user.user_metadata?.role || 'student' // Default if no role
        router.push(`/${role}`)
        router.refresh() // Important to re-fetch server components with new auth state
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) {
        setError(error.message)
      }
      
      // The user will be automatically redirected to Google's consent page
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError("An unexpected error occurred with Google sign-in")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-700"
            >
              Email or Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="email username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter your email or username"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleGoogleSignIn}
              type="button"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
              </svg>
              Sign in with Google
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <a href="/sign-up" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  )
} 