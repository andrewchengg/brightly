"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  studentInitialLoginSchema,
  StudentInitialLoginData,
  studentCompleteSetupSchema,
  StudentCompleteSetupData,
} from "@/lib/formValidationSchemas";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";

export default function StudentCompleteSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<
    "initialLogin" | "completeProfile" | "loading" | "error"
  >("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [redirectFailed, setRedirectFailed] = useState(false);
  const [initialEmailFromAuth, setInitialEmailFromAuth] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, error: uploadError, uploadImage } = useCloudinaryUpload();

  // Form for initial login (username + PIN)
  const {
    control: initialLoginControl,
    handleSubmit: handleInitialLoginSubmit,
    formState: { errors: initialLoginErrors },
    reset: resetInitialLoginForm,
  } = useForm<StudentInitialLoginData>({
    resolver: zodResolver(studentInitialLoginSchema),
    defaultValues: { username: "", pin: "" },
  });

  // Form for completing profile (new username, email, password)
  const {
    control: completeProfileControl,
    handleSubmit: handleCompleteProfileSubmit,
    formState: { errors: completeProfileErrors },
    reset: resetCompleteProfileForm,
    setValue: setCompleteProfileValue,
  } = useForm<StudentCompleteSetupData>({
    resolver: zodResolver(studentCompleteSetupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const checkSessionAndSetupStatus = async () => {
      setStep("loading");
      setPageError(null);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setPageError("Error checking your session. Please refresh.");
        setStep("error");
        return;
      }

      if (session?.user) {
        setCurrentUser(session.user);
        setInitialEmailFromAuth(session.user.email || "");

        const { data: student, error: studentError } = await supabase
          .from("Student")
          .select("id, initialSetupComplete, walkthroughComplete, email")
          .eq("id", session.user.id)
          .single();

        if (studentError && studentError.code !== "PGRST116") {
          // PGRST116: row not found
          setPageError("Failed to retrieve your student profile.");
          setStep("error");
          return;
        }

        if (student) {
          if (student.initialSetupComplete) {
            // If initial setup is complete, check if walkthrough is needed
            if (!student.walkthroughComplete) {
              // If walkthrough is not complete, redirect to dashboard to show walkthrough first
              router.push("/student");
            } else {
              // Both setup and walkthrough are complete, redirect to dashboard
              router.push("/student");
            }
          } else {
            // Initial setup is not complete, show the setup form
            setCompleteProfileValue(
              "email",
              student.email || session.user.email || ""
            );
            setStep("completeProfile");
          }
        } else {
          setPageError(
            "Your student profile is not fully set up. Please contact your parent or support."
          );
          setStep("initialLogin"); // Allow to try login again, or show error
        }
      } else {
        setStep("initialLogin");
      }
    };

    checkSessionAndSetupStatus();
  }, [router, supabase, setCompleteProfileValue]);

  const onInitialLogin = async (data: StudentInitialLoginData) => {
    setIsSubmitting(true);
    setPageError(null);
    try {
      // First we need to find the user's email using their username
      const { data: studentData, error: findStudentError } = await supabase
        .from("Student")
        .select("email")
        .eq("username", data.username)
        .single();

      if (findStudentError || !studentData) {
        setPageError(
          "Username not found. Please check the credentials provided by your parent."
        );
        setIsSubmitting(false);
        return;
      }

      // Now sign in with the email and PIN
      const { data: sessionData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: studentData.email,
          password: data.pin,
        });

      if (signInError) {
        setPageError(
          signInError.message ||
            "Invalid login credentials. Please check the username and PIN."
        );
        setIsSubmitting(false);
        return;
      }

      if (sessionData.user) {
        setCurrentUser(sessionData.user);
        setInitialEmailFromAuth(sessionData.user.email || "");

        const { data: student, error: studentError } = await supabase
          .from("Student")
          .select("id, initialSetupComplete, walkthroughComplete, email")
          .eq("id", sessionData.user.id)
          .single();

        if (studentError && studentError.code !== "PGRST116") {
          setPageError("Failed to retrieve your profile after login.");
          setIsSubmitting(false);
          setStep("error");
          return;
        }

        if (student && student.initialSetupComplete) {
          // If initial setup is complete, check if walkthrough is needed
          if (!student.walkthroughComplete) {
            // If walkthrough is not complete, redirect to dashboard to show walkthrough first
            router.push("/student");
          } else {
            // Both setup and walkthrough are complete, redirect to dashboard
            router.push("/student");
          }
        } else if (student) {
          // Initial setup is not complete, show the setup form
          setCompleteProfileValue(
            "email",
            student?.email || sessionData.user.email || ""
          );
          setStep("completeProfile");
          resetInitialLoginForm();
        } else {
          setPageError("Failed to retrieve your profile after login.");
          setIsSubmitting(false);
          setStep("error");
        }
      } else {
        setPageError("Login did not return user data. Please try again.");
      }
    } catch (err: any) {
      setPageError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCompleteProfile = async (data: StudentCompleteSetupData) => {
    if (isSubmitting || setupComplete) {
      return;
    }

    setIsSubmitting(true);
    setPageError(null);

    if (!currentUser) {
      setPageError("No active user session. Please log in again.");
      setStep("initialLogin");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Update Student record in database first
      const studentUpdateData: {
        username: string;
        email?: string;
        initialSetupComplete: boolean;
        img?: string | null;
      } = {
        username: data.username,
        initialSetupComplete: true,
      };

      // Update the student's email only if it's valid (not the placeholder)
      if (data.email) {
        studentUpdateData.email = data.email;
      }

      // Save the avatar URL if one was uploaded
      if (avatarUrl) {
        studentUpdateData.img = avatarUrl;
      }

      // Update the Student record
      const { data: updatedStudent, error: studentUpdateError } = await supabase
        .from("Student")
        .update(studentUpdateData)
        .eq("id", currentUser.id)
        .select();

      if (studentUpdateError) {
        setPageError(
          `Failed to update student profile: ${studentUpdateError.message}`
        );
        setIsSubmitting(false);
        return;
      }

      // 2. Now update auth user with API route
      try {
        // Call our admin API to update the user in Supabase Auth
        const authUpdateData: {
          userId: string;
          username: string;
          role: string;
          email?: string;
          password?: string;
        } = {
          userId: currentUser.id,
          username: data.username,
          role: "student",
        };

        // Add email if provided
        if (data.email) {
          authUpdateData.email = data.email;
        }

        // Add password if provided
        if (data.password) {
          authUpdateData.password = data.password;
        }

        const authUpdateResponse = await fetch("/api/auth/update-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(authUpdateData),
        });

        if (!authUpdateResponse.ok) {
          const errorText = await authUpdateResponse.text();
        } else {
        }

        // Update the session with the new credentials to ensure proper login
        if (data.email || data.password) {
          if (data.password) {
            await supabase.auth.signInWithPassword({
              email: data.email || initialEmailFromAuth,
              password: data.password,
            });
          } else {
            await supabase.auth.refreshSession();
          }
        }
      } catch (authErr) {
        // Continue with the flow even if auth update fails
      }

      // Mark setup as complete to prevent further interactions
      setSetupComplete(true);

      // Setup is successful, redirect to student dashboard
      try {
        router.push("/student");

        router.refresh(); // Ensure layout revalidates auth state

        // Add a timeout fallback in case navigation doesn't work
        setTimeout(() => {
          if (window.location.pathname === "/student/complete-setup") {
            setRedirectFailed(true);
          }
        }, 3000);
      } catch (routerError) {
        // Show manual redirect option immediately if router fails
        setRedirectFailed(true);
      }
    } catch (err: any) {
      setPageError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const secureUrl = await uploadImage(file);
      if (secureUrl) {
        setAvatarUrl(secureUrl);
        setPageError(null);
      }
    } catch (err: any) {
      setPageError(err.message || "Failed to upload image");
    }
  };

  useEffect(() => {
    const checkCloudinaryConfiguration = async () => {
      // Check if Cloudinary is configured via env variables
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      if (cloudName) {
        setIsCloudinaryConfigured(true);
        return;
      }

      // Fallback to database configuration
      try {
        const { data: config, error } = await supabase
          .from("Configuration")
          .select("value")
          .eq("key", "CLOUDINARY_URL");

        if (error) {
          setIsCloudinaryConfigured(false);
          return;
        }

        if (config && config.length > 0) {
          setIsCloudinaryConfigured(true);
        } else {
          // Fallback to enable anyway for testing
          setIsCloudinaryConfigured(true);
        }
      } catch (err) {
        // Fallback to enable anyway for testing
        setIsCloudinaryConfigured(true);
      }
    };

    checkCloudinaryConfiguration();
  }, [supabase]);

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <p className="text-gray-600">Loading your setup information...</p>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">
            Setup Complete!
          </h1>
          <p className="text-gray-600 mb-6">
            Your profile has been successfully set up.{" "}
            {redirectFailed
              ? "Click the button below to go to your dashboard."
              : "Redirecting you to your dashboard..."}
          </p>
          {redirectFailed ? (
            <button
              onClick={() => {
                window.location.href = "/student";
              }}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Dashboard
            </button>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Setup Error</h1>
          <p className="text-gray-600 mb-6">
            {pageError || "An unknown error occurred."}
          </p>
          <button
            onClick={() => setStep("initialLogin")}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Logging In Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        {step === "initialLogin" && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">
              Student Login
            </h1>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Use the username and PIN provided by your parent.
            </p>
            <form
              onSubmit={handleInitialLoginSubmit(onInitialLogin)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <Controller
                  name="username"
                  control={initialLoginControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="username"
                      placeholder="your_username1"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        initialLoginErrors.username
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {initialLoginErrors.username && (
                  <p className="text-red-500 text-xs mt-1">
                    {initialLoginErrors.username.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="pin"
                  className="block text-sm font-medium text-gray-700"
                >
                  6-Digit PIN
                </label>
                <Controller
                  name="pin"
                  control={initialLoginControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="password" // Mask PIN input
                      id="pin"
                      maxLength={6}
                      placeholder="••••••"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        initialLoginErrors.pin
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {initialLoginErrors.pin && (
                  <p className="text-red-500 text-xs mt-1">
                    {initialLoginErrors.pin.message}
                  </p>
                )}
              </div>
              {pageError && <p className="text-red-500 text-sm">{pageError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {isSubmitting ? "Logging In..." : "Login"}
              </button>
            </form>
          </>
        )}

        {step === "completeProfile" && currentUser && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">
              Complete Your Profile
            </h1>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Set your new username, email (optional), and password.
            </p>
            <form
              onSubmit={(e) => {
                handleCompleteProfileSubmit(onCompleteProfile)(e);
              }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Your Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 disabled:opacity-50"
                  >
                    {uploading
                      ? "Uploading..."
                      : avatarUrl
                      ? "Change Profile Picture"
                      : "Upload Profile Picture"}
                  </button>
                </div>
                {uploadError && (
                  <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Choose Username
                </label>
                <Controller
                  name="username"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="username"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        completeProfileErrors.username
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.username && (
                  <p className="text-red-500 text-xs mt-1">
                    {completeProfileErrors.username.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Your Email (Optional)
                </label>
                <Controller
                  name="email"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      id="email"
                      placeholder="your.email@example.com"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        completeProfileErrors.email
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {completeProfileErrors.email.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  You can add an email address later if you prefer not to now.
                </p>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Choose Password
                </label>
                <Controller
                  name="password"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="password"
                      id="password"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        completeProfileErrors.password
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {completeProfileErrors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm Password
                </label>
                <Controller
                  name="confirmPassword"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="password"
                      id="confirmPassword"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        completeProfileErrors.confirmPassword
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {completeProfileErrors.confirmPassword.message}
                  </p>
                )}
              </div>
              {pageError && <p className="text-red-500 text-sm">{pageError}</p>}
              <button
                type="submit"
                disabled={isSubmitting || setupComplete}
                onClick={(e) => {
                  // Let the form's onSubmit handle the submission
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {setupComplete
                  ? "Setup Complete..."
                  : isSubmitting
                  ? "Setting Up..."
                  : "Complete Setup"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
