"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CldUploadWidget } from "next-cloudinary";

// Form schema for profile edit
const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
});

// Form schema for password change
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password must be at least 6 characters"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function StudentProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(true);

  // Profile form
  const { 
    control: profileControl, 
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Password form
  const { 
    control: passwordControl, 
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors }
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    async function fetchStudentProfile() {
      setLoading(true);
      setError(null);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          setError("You must be logged in to view this page");
          router.push("/sign-in");
          return;
        }
        
        // Get student profile
        const { data: studentData, error: studentError } = await supabase
          .from("Student")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (studentError) {
          throw studentError;
        }
        
        if (studentData) {
          setStudent(studentData);
          
          // Set avatar URL if exists
          if (studentData.img) {
            setAvatarUrl(studentData.img);
          }
          
          // Update form default values
          resetProfileForm({
            username: studentData.username || "",
            email: studentData.email || "",
          });
        } else {
          setError("Student profile not found. Please complete setup.");
          router.push("/student/complete-setup");
        }
      } catch (err: any) {
        console.error("Error fetching student profile:", err);
        setError(err.message || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentProfile();
  }, [resetProfileForm, router, supabase]);
  
  const handleUploadSuccess = (result: any) => {
    console.log('Cloudinary upload success:', result);
    if (result.info && result.info.secure_url) {
      setAvatarUrl(result.info.secure_url);
    }
  };
  
  const onProfileSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    
    try {
      // Update student record
      const updateData: any = {
        username: data.username,
        email: data.email,
      };
      
      // Add avatar URL if uploaded
      if (avatarUrl) {
        updateData.img = avatarUrl;
      }
      
      const { error: profileUpdateError } = await supabase
        .from("Student")
        .update(updateData)
        .eq("id", student.id);
      
      if (profileUpdateError) {
        throw profileUpdateError;
      }
      
      // Update auth user email if changed (non-blocking)
      if (data.email !== student.email) {
        try {
          const { error: authUpdateError } = await supabase.auth.updateUser({
            email: data.email,
          });
          
          if (authUpdateError) {
            console.warn("Auth email update failed, but database was updated:", authUpdateError.message);
            // Don't throw error here, we'll at least update the profile in the database
          }
        } catch (authErr) {
          console.warn("Auth update error:", authErr);
          // Continue with the flow even if auth update fails
        }
      }
      
      // Update student state
      setStudent({
        ...student,
        ...updateData,
      });
      
      setSuccessMessage("Profile updated successfully");
      setIsEditing(false);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };
  
  const onPasswordSubmit = async (data: PasswordFormData) => {
    setSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    
    try {
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: student.email,
        password: data.currentPassword,
      });
      
      if (signInError) {
        setError("Current password is incorrect");
        setSubmitting(false);
        return;
      }
      
      // Update password
      const { error: passwordUpdateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      
      if (passwordUpdateError) {
        throw passwordUpdateError;
      }
      
      setSuccessMessage("Password changed successfully");
      resetPasswordForm();
      setIsChangingPassword(false);
    } catch (err: any) {
      console.error("Error changing password:", err);
      setError(err.message || "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/sign-in")}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Student Profile</h1>
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md">
            {error}
          </div>
        )}
        
        {student && !isEditing && !isChangingPassword && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={student.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-gray-400">
                    {student.name?.charAt(0) || student.username?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{student.name}</h2>
                <p className="text-sm text-gray-500">
                  School Level: Primary {student.schoolLevel}
                  {student.schoolName && ` • ${student.schoolName}`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium">{student.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{student.email}</p>
              </div>
            </div>
            
            <div className="pt-4 flex space-x-4">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Change Password
              </button>
            </div>
          </div>
        )}
        
        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
            
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mr-4">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-gray-400">
                      {student.name?.charAt(0) || student.username?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                
                {isCloudinaryConfigured && (
                  <CldUploadWidget
                    uploadPreset="edcel_profile"
                    onSuccess={handleUploadSuccess}
                    options={{
                      maxFiles: 1,
                      resourceType: "image",
                      cloudName: "d1aoqjbds"
                    }}
                  >
                    {({ open }) => (
                      <button
                        type="button"
                        onClick={() => open()}
                        className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Change Photo
                      </button>
                    )}
                  </CldUploadWidget>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <Controller
                name="username"
                control={profileControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    id="username"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      profileErrors.username ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
              {profileErrors.username && (
                <p className="mt-1 text-xs text-red-500">{profileErrors.username.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Controller
                name="email"
                control={profileControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="email"
                    id="email"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      profileErrors.email ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
              {profileErrors.email && (
                <p className="mt-1 text-xs text-red-500">{profileErrors.email.message}</p>
              )}
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        
        {/* Change Password Form */}
        {isChangingPassword && (
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <Controller
                name="currentPassword"
                control={passwordControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="password"
                    id="currentPassword"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.currentPassword.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <Controller
                name="newPassword"
                control={passwordControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="password"
                    id="newPassword"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <Controller
                name="confirmPassword"
                control={passwordControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="password"
                    id="confirmPassword"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {submitting ? "Changing..." : "Change Password"}
              </button>
              <button
                type="button"
                onClick={() => setIsChangingPassword(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 