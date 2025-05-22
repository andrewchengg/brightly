// src/app/sign-up/page.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"; // Keep Link for "Already have an account?"

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("") 
  const [name, setName] = useState("") 
  const [password, setPassword] = useState("")
  // Role is fixed to 'parent' for this page's primary flow
  // const [role, setRole] = useState("parent") 
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: signUpResponseData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            role: "parent", 
            username: username,
            name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/sign-up/parent-child-setup`, // Guide after email confirm
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }
      
      if (signUpResponseData.user) {
        // User entry created in auth.users. Session might be null if email confirmation is required.
        console.log("Parent Auth user creation initiated for:", email);
        
        // If session is active (email confirmation OFF or auto-confirmed in dev)
        if (signUpResponseData.session) {
            // Create Parent DB record immediately and redirect
            const { error: parentDbError } = await supabase
              .from("Parent")
              .upsert({
                  id: signUpResponseData.user.id,
                  name: name,
                  username: username,
                  email: email,
                  updatedAt: new Date().toISOString(),
                },{ onConflict: "id" });

            if (parentDbError) {
                console.error("Error saving parent details to DB during sign-up:", parentDbError);
                setError(`Account created, but failed to save profile: ${parentDbError.message}`);
                // Consider signing out if DB op fails to prevent inconsistent state
                // await supabase.auth.signOut(); 
                setIsLoading(false);
                return;
            }
            router.push(`/sign-up/parent-child-setup`);
        } else {
            // Email confirmation is required. User is created in auth, but no active session yet.
            router.push(`/sign-up/confirmation?message=Parent account created. Please check your email (${email}) to confirm your account. After confirming, you will be guided to set up your child's account.`);
        }
      } else {
        setError("Account creation may have been initiated, but user details not returned. Please check your email or try again.");
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
      console.error("Sign up error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Store intended role and next path for OAuth callback
      if (typeof window !== "undefined") {
        localStorage.setItem('oauth_intended_role', 'parent');
        localStorage.setItem('oauth_intended_next_path', '/sign-up/parent-child-setup');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // Callback handles final redirect
          // No need to pass 'next' in queryParams here, localStorage + callback logic handles it
        }
      })
      if (error) { setError(error.message); setIsLoading(false); return; }
      if (data?.url) { window.location.href = data.url; } 
      else { setIsLoading(false); }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred with Google sign-up");
      console.error("Google Sign up error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Parent Account</h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Full Name</label>
            <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Choose a Username</label>
            <input id="username" name="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Your Email Address</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Create Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          
          {/* Role is implicitly 'parent' for this form */}
          {/* <input type="hidden" name="role" value="parent" />  */}
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {isLoading ? "Creating Account..." : "Create Parent Account"}
            </button>
          </div>
        </form>
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
          </div>
          <div className="mt-4">
            <button onClick={handleGoogleSignUp} type="button" disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"> {/* Google SVG */} </svg>
              Sign up with Google
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-indigo-600 hover:text-indigo-500">Sign In</Link>
        </p>
      </div>
    </div>
  )
}