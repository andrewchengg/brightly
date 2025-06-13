// src/app/sign-in/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // For Google OAuth & direct email login
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const supabase = createClient(); // Keep for Google OAuth & direct email login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const typedIdentifier = identifier.trim();

    try {
      let authSuccessful = false;
      let userRole = "student"; // Default role

      if (typedIdentifier.includes("@")) {
        // Email login
        console.log(
          "[CLIENT_SIGN_IN] Attempting direct email login:",
          typedIdentifier
        );
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: typedIdentifier,
            password,
          });

        if (signInError) {
          setError(signInError.message || "Invalid email or password.");
        } else if (data?.user) {
          authSuccessful = true;
          // Fetch role from user_metadata after successful direct email login
          const {
            data: { user: authenticatedUser },
          } = await supabase.auth.getUser();
          userRole = authenticatedUser?.user_metadata?.role || "student";
          console.log(
            "[CLIENT_SIGN_IN] Direct email login successful. Role:",
            userRole
          );
        } else {
          setError("Sign-in failed. Please check your credentials.");
        }
      } else {
        // Username login - call our API
        console.log(
          "[CLIENT_SIGN_IN] Attempting username login via API for:",
          typedIdentifier
        );
        const response = await fetch("/api/auth/sign-in-with-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: typedIdentifier, password }),
        });

        const result = await response.json();

        if (response.ok && result.user) {
          authSuccessful = true;
          userRole = result.role || "student"; // Use role from API response
          console.log(
            "[CLIENT_SIGN_IN] API username login successful. Role:",
            userRole
          );
          // The API route should have set the auth cookies.
          // We might need to refresh Supabase client's session state.
          await supabase.auth.refreshSession(); // Or getSession() to update client state
        } else {
          setError(result.error || "Invalid username or password.");
        }
      }

      if (authSuccessful) {
        console.log(`[REDIRECT] Auth successful. Checking setup status for role: ${userRole}`);
        
        // For students, check if they need to complete setup before redirecting
        if (userRole === "student") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: student, error: studentError } = await supabase
              .from('Student')
              .select('initialSetupComplete')
              .eq('id', user.id)
              .single();

            if (studentError) {
              console.error("[SIGN_IN] Error checking student setup status:", studentError);
              // If error checking status, go to student dashboard and let StudentSetupCheck handle it
              router.push('/student');
            } else if (student && !student.initialSetupComplete) {
              console.log("[SIGN_IN] Student setup incomplete, redirecting to complete-setup");
              router.push('/student/complete-setup');
            } else {
              console.log("[SIGN_IN] Student setup complete, redirecting to dashboard");
              router.push('/student');
            }
          } else {
            router.push('/student');
          }
        } else {
          // For non-students, redirect to their role dashboard directly
          router.push(`/${userRole}`);
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during sign-in.");
      console.error("Sign-in submission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to initiate Google sign-in. Please try again.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred with Google sign-in"
      );
      console.error("Google Sign-in error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                                  Brightly
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Home
              </Link>
              <Link
                href="/sign-up"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen pt-16">
        <div className="p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to continue your PSLE journey
            </p>
          </div>
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
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
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
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={handleGoogleSignIn}
                type="button"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  width="18"
                  height="18"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  ></path>
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  ></path>
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  ></path>
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  ></path>
                </svg>
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </button>
            </div>
          </div>
          <p className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign Up
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-gray-500">
            Forgot password? {/* TODO: Add forgot password link */}
          </p>
        </div>
      </div>
    </div>
  );
}
