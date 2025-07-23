// src/app/sign-in/page.tsx
"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // For Google OAuth & direct email login
import Link from "next/link";
import CuteLoader, { StudyLoader } from "@/components/ui/CuteLoader";
import TransitionLoader, {
  useTransitionLoader,
} from "@/components/TransitionLoader";

function SignInContent() {
  const router = useRouter();
  const supabase = createClient(); // Keep for Google OAuth & direct email login
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isTransitioning, startTransition } = useTransitionLoader();
  const searchParams = useSearchParams();

  // Handle URL parameters and clean up sensitive data
  useEffect(() => {
    const identifier = searchParams.get("identifier");
    const password = searchParams.get("password");
    const errorParam = searchParams.get("error");
    
    // Handle error messages
    if (errorParam === "account_not_found") {
      setError("No account found. Please sign up first or check your credentials.");
    }
    
    if (identifier || password || errorParam) {
      // Remove sensitive/processed parameters from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("identifier");
      url.searchParams.delete("password");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

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
        console.log("[CLIENT_SIGN_IN] Attempting direct email login");
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: typedIdentifier,
            password,
          });

        if (signInError) {
          setError(signInError.message || "Invalid email or password.");
        } else if (data?.user) {
          authSuccessful = true;
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
        console.log("[CLIENT_SIGN_IN] Attempting username login via API");
        const response = await fetch("/api/auth/sign-in-with-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: typedIdentifier, password }),
        });

        const result = await response.json();

        if (response.ok && result.user) {
          authSuccessful = true;
          userRole = result.role || "student";
          console.log(
            "[CLIENT_SIGN_IN] API username login successful. Role:",
            userRole
          );
          await supabase.auth.refreshSession();
        } else {
          setError(result.error || "Invalid username or password.");
        }
      }

      if (authSuccessful) {
        startTransition();
        router.push(`/${userRole}`);
      }
    } catch (err: any) {
      console.error("[CLIENT_SIGN_IN] Error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback?mode=signin`,
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
        startTransition();
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
    <>
      <TransitionLoader isVisible={isTransitioning} />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100">
        {/* Navigation */}
        <nav className="fixed w-full bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="text-2xl font-bold text-purple-800">
                  Brightly
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-purple-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
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
                  className="bg-purple-800 hover:bg-purple-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex flex-col items-center justify-center min-h-screen px-4">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-800 hover:bg-purple-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 disabled:cursor-not-allowed min-h-[40px]"
                >
                  {isLoading ? (
                    <CuteLoader text="Signing you in..." size="sm" />
                  ) : (
                    "Sign in"
                  )}
                </button>
              </div>
            </form>
            <div className="mt-6">
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
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                >
                  {isLoading ? (
                    <CuteLoader text="Connecting with Google..." size="sm" />
                  ) : (
                    <>
                      <img src="/google.svg" alt="Google" className="w-5 h-5" />
                      Sign in with Google
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-purple-800 hover:text-purple-900"
              >
                Sign Up
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-gray-500">
              <Link
                href="/forgot-password"
                className="text-purple-800 hover:text-purple-900"
              >
                Forgot password?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
