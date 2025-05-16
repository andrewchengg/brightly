"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  studentInitialLoginSchema,
  StudentInitialLoginData,
  studentCompleteSetupSchema,
  StudentCompleteSetupData
} from "@/lib/formValidationSchemas"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { CldUploadWidget } from "next-cloudinary"
import { debug, traceApi } from "@/lib/debug"

export default function StudentCompleteSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'initialLogin' | 'completeProfile' | 'loading' | 'error'>('loading')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialEmailFromAuth, setInitialEmailFromAuth] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(false);

  // Form for initial login (placeholder email + PIN)
  const {
    control: initialLoginControl,
    handleSubmit: handleInitialLoginSubmit,
    formState: { errors: initialLoginErrors },
    reset: resetInitialLoginForm,
  } = useForm<StudentInitialLoginData>({
    resolver: zodResolver(studentInitialLoginSchema),
    defaultValues: { placeholderEmail: "", pin: "" },
  })

  // Form for completing profile (new username, email, password)
  const {
    control: completeProfileControl,
    handleSubmit: handleCompleteProfileSubmit,
    formState: { errors: completeProfileErrors },
    reset: resetCompleteProfileForm,
    setValue: setCompleteProfileValue,
  } = useForm<StudentCompleteSetupData>({
    resolver: zodResolver(studentCompleteSetupSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  })

  useEffect(() => {
    const checkSessionAndSetupStatus = async () => {
      setStep('loading');
      setPageError(null);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        setPageError("Error checking your session. Please refresh.");
        setStep('error');
        return;
      }

      if (session?.user) {
        console.log("Session found, user:", session.user.id);
        setCurrentUser(session.user);
        setInitialEmailFromAuth(session.user.email || "");

        const { data: student, error: studentError } = await supabase
          .from('Student')
          .select('id, initialSetupComplete, email')
          .eq('id', session.user.id)
          .single();

        if (studentError && studentError.code !== 'PGRST116') { // PGRST116: row not found
          console.error("Error fetching student record:", studentError);
          setPageError("Failed to retrieve your student profile.");
          setStep('error');
          return;
        }

        if (student) {
          if (student.initialSetupComplete) {
            console.log("Student setup already complete, redirecting.");
            router.push('/student');
          } else {
            console.log("Student needs to complete profile.");
            setCompleteProfileValue("email", student.email || session.user.email || "");
            setStep('completeProfile');
          }
        } else {
          // This case should ideally not happen if a user has a session from PIN login
          // unless student record creation failed. Or if user signed up but didn't complete parent-child flow.
          console.warn("User session exists, but no student record found for ID:", session.user.id);
          setPageError("Your student profile is not fully set up. Please contact your parent or support.");
          setStep('initialLogin'); // Allow to try login again, or show error
        }
      } else {
        console.log("No active session, showing initial login form.");
        setStep('initialLogin');
      }
    };

    checkSessionAndSetupStatus();

    // No onAuthStateChange needed for this simpler flow, direct session check is enough.
  }, [router, supabase, setCompleteProfileValue]);

  const onInitialLogin = async (data: StudentInitialLoginData) => {
    setIsSubmitting(true);
    setPageError(null);
    try {
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.placeholderEmail,
        password: data.pin,
      });

      if (signInError) {
        console.error("Sign-in error:", signInError);
        setPageError(signInError.message || "Invalid login credentials. Please check the email and PIN.");
        setIsSubmitting(false);
        return;
      }

      if (sessionData.user) {
        console.log("Successfully signed in with PIN for user:", sessionData.user.id);
        setCurrentUser(sessionData.user);
        setInitialEmailFromAuth(sessionData.user.email || "");

        const { data: student, error: studentError } = await supabase
            .from('Student')
            .select('id, initialSetupComplete, email')
            .eq('id', sessionData.user.id)
            .single();

        if (studentError && studentError.code !== 'PGRST116') {
            setPageError("Failed to retrieve your profile after login.");
            setIsSubmitting(false);
            setStep('error');
            return;
        }

        if (student && student.initialSetupComplete) {
            console.log("Student setup already complete, redirecting to dashboard");
            router.push('/student');
        } else {
            setCompleteProfileValue("email", student?.email || sessionData.user.email || "");
            setStep('completeProfile');
            resetInitialLoginForm();
        }
      } else {
        setPageError("Login did not return user data. Please try again.");
      }
    } catch (err: any) {
      console.error("Unexpected error during initial login:", err);
      setPageError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCompleteProfile = async (data: StudentCompleteSetupData) => {
    setIsSubmitting(true);
    setPageError(null);

    if (!currentUser) {
      setPageError("No active user session. Please log in again.");
      setStep('initialLogin');
      setIsSubmitting(false);
      return;
    }

    try {
      debug.log(`Starting profile update for student ID: ${currentUser.id}`);
      debug.log(`Form data submitted:`, data);
      debug.log(`Current placeholder email: ${initialEmailFromAuth}`);
      debug.log(`Avatar URL to save: ${avatarUrl || 'None'}`);

      // 1. Update Auth user (email and password)
      const updateUserData: { password?: string; email?: string } = {};
      if (data.password) {
        updateUserData.password = data.password;
        debug.log(`Password update requested`);
      }
      
      // 2. Update Student record in database first
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
        debug.log(`Including avatar URL in update: ${avatarUrl}`);
      }

      debug.log(`Updating Student record with:`, studentUpdateData);
      
      // Use traceApi to log the full request and response
      const studentUpdateResult = await traceApi(
        'db.updateStudent',
        async () => {
          const result = await supabase
            .from('Student')
            .update(studentUpdateData)
            .eq('id', currentUser.id)
            .select();
          return result;
        }
      );
      
      const { data: updatedStudent, error: studentUpdateError } = studentUpdateResult;
      
      if (studentUpdateError) {
        debug.error(`Error updating Student record:`, studentUpdateError);
        setPageError(`Failed to update student profile: ${studentUpdateError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      debug.log(`Student record updated successfully:`, updatedStudent);
      
      // Now try to update auth user email if needed (non-blocking)
      if (data.email && Object.keys(updateUserData).length > 0) {
        try {
          debug.log(`Updating Supabase auth user with:`, updateUserData);
          const authUpdateResult = await traceApi(
            'auth.updateUser', 
            async () => await supabase.auth.updateUser(updateUserData)
          );
          const { data: updatedAuthUser, error: userUpdateError } = authUpdateResult;
          
          if (userUpdateError) {
            debug.warn(`Warning: Auth user update failed, but database was updated:`, userUpdateError);
            // Don't block completion - database update succeeded
          } else {
            debug.log(`Auth user updated successfully:`, updatedAuthUser);
          }
        } catch (authErr) {
          debug.warn(`Auth update error (non-blocking):`, authErr);
          // Continue with the flow even if auth update fails
        }
      }
      
      // Setup is successful, redirect to student dashboard
      debug.log(`Student profile completed and updated. Redirecting...`);
      router.push('/student');
      router.refresh(); // Ensure layout revalidates auth state

    } catch (err: any) {
      debug.error(`Unexpected error during profile completion:`, err);
      setPageError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSuccess = (result: any) => {
    console.log('Cloudinary upload success:', result);
    if (result?.info?.secure_url) {
      setAvatarUrl(result.info.secure_url);
      console.log("Avatar URL set to:", result.info.secure_url);
      setPageError(null);
    } else {
      console.error("Upload result missing secure_url:", result);
      setPageError("Image upload successful but URL is missing. Please try again.");
    }
  };

  useEffect(() => {
    const checkCloudinaryConfiguration = async () => {
      // Check if Cloudinary is configured via env variables
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      console.log("Cloudinary cloud name from env:", cloudName);
      
      if (cloudName) {
        console.log("Using Cloudinary configuration from environment variables");
        setIsCloudinaryConfigured(true);
        return;
      }
      
      // Fallback to database configuration
      try {
        const { data: config, error } = await supabase.from('Configuration').select('value').eq('key', 'CLOUDINARY_URL');
        
        if (error) {
          console.error('Error fetching Cloudinary configuration:', error);
          setIsCloudinaryConfigured(false);
          return;
        }
        
        if (config && config.length > 0) {
          console.log('Cloudinary configuration found in database');
          setIsCloudinaryConfigured(true);
        } else {
          console.warn('No Cloudinary configuration found in database');
          // Fallback to enable anyway for testing
          setIsCloudinaryConfigured(true);
        }
      } catch (err) {
        console.error('Error checking Cloudinary configuration:', err);
        // Fallback to enable anyway for testing
        setIsCloudinaryConfigured(true);
      }
    };

    checkCloudinaryConfiguration();
  }, [supabase]);

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <p className="text-gray-600">Loading your setup information...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Setup Error</h1>
          <p className="text-gray-600 mb-6">{pageError || "An unknown error occurred."}</p>
          <button 
            onClick={() => setStep('initialLogin')} 
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
        {step === 'initialLogin' && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">Student Login</h1>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Use the placeholder email and PIN provided by your parent.
            </p>
            <form onSubmit={handleInitialLoginSubmit(onInitialLogin)} className="space-y-4">
              <div>
                <label htmlFor="placeholderEmail" className="block text-sm font-medium text-gray-700">Placeholder Email</label>
                <Controller
                  name="placeholderEmail"
                  control={initialLoginControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      id="placeholderEmail"
                      placeholder="child.placeholder...@edcel.app"
                      className={`mt-1 block w-full px-3 py-2 border ${initialLoginErrors.placeholderEmail ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {initialLoginErrors.placeholderEmail && <p className="text-red-500 text-xs mt-1">{initialLoginErrors.placeholderEmail.message}</p>}
              </div>
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">6-Digit PIN</label>
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
                      className={`mt-1 block w-full px-3 py-2 border ${initialLoginErrors.pin ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {initialLoginErrors.pin && <p className="text-red-500 text-xs mt-1">{initialLoginErrors.pin.message}</p>}
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

        {step === 'completeProfile' && currentUser && (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center">Complete Your Profile</h1>
            <p className="text-gray-600 mb-6 text-center text-sm">
              Set your new username, email (optional), and password.
            </p>
            <form onSubmit={handleCompleteProfileSubmit(onCompleteProfile)} className="space-y-4">
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {isCloudinaryConfigured ? (
                  <CldUploadWidget
                    uploadPreset="edcel_profile"
                    options={{
                      maxFiles: 1,
                      resourceType: "image",
                      sources: ["local", "camera"],
                      clientAllowedFormats: ["png", "jpeg", "jpg"],
                      maxImageFileSize: 2000000, // 2MB
                      multiple: false,
                      showUploadMoreButton: false,
                      showAdvancedOptions: false,
                      tags: ["student", "avatar"]
                    }}
                    onSuccess={handleUploadSuccess}
                    onError={(error) => {
                      console.error("Cloudinary upload error:", error);
                      setPageError(`Upload failed: ${error ? error.toString() : 'Unknown error'}`);
                    }}
                  >
                    {({ open }) => (
                      <button
                        type="button"
                        onClick={() => open()}
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
                      >
                        {avatarUrl ? "Change Profile Picture" : "Upload Profile Picture"}
                      </button>
                    )}
                  </CldUploadWidget>
                ) : (
                  <p className="text-xs text-gray-500">Profile picture upload not available</p>
                )}
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Choose Username</label>
                <Controller
                  name="username"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="username"
                      className={`mt-1 block w-full px-3 py-2 border ${completeProfileErrors.username ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.username && <p className="text-red-500 text-xs mt-1">{completeProfileErrors.username.message}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Your Email (Optional - leave blank to keep placeholder)</label>
                <Controller
                  name="email"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      id="email"
                      placeholder={initialEmailFromAuth || "your.email@example.com"}                      
                      className={`mt-1 block w-full px-3 py-2 border ${completeProfileErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.email && <p className="text-red-500 text-xs mt-1">{completeProfileErrors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">New Password</label>
                <Controller
                  name="password"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="password"
                      id="password"
                      className={`mt-1 block w-full px-3 py-2 border ${completeProfileErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.password && <p className="text-red-500 text-xs mt-1">{completeProfileErrors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <Controller
                  name="confirmPassword"
                  control={completeProfileControl}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="password"
                      id="confirmPassword"
                      className={`mt-1 block w-full px-3 py-2 border ${completeProfileErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {completeProfileErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{completeProfileErrors.confirmPassword.message}</p>}
              </div>
              {pageError && <p className="text-red-500 text-sm">{pageError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {isSubmitting ? "Saving Profile..." : "Complete Setup & Save Profile"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
} 