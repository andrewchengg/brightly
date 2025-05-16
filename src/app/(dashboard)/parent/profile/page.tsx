"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CldUploadWidget } from "next-cloudinary";
import { useCloudinaryUpload } from "@/lib/hooks/useCloudinaryUpload";

// Form schema for profile edit
const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
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

type ChildInfo = {
  id: string;
  name: string;
  username: string;
  email: string;
  schoolLevel: number;
  schoolName: string | null;
  initialSetupComplete: boolean;
};

export default function ParentProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [parent, setParent] = useState<any>(null);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, error: uploadError, uploadImage } = useCloudinaryUpload();

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
      name: "",
      address: "",
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
    async function fetchProfileData() {
      setLoading(true);
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) {
          setError("You must be logged in to view this page");
          router.push("/sign-in");
          return;
        }
        
        // Get parent profile
        const { data: parentData, error: parentError } = await supabase
          .from("Parent")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (parentError && parentError.code !== "PGRST116") {
          throw parentError;
        }
        
        if (parentData) {
          setParent(parentData);
          
          // Update form default values
          resetProfileForm({
            username: parentData.username || "",
            email: parentData.email || "",
            name: parentData.name || "",
            address: parentData.address || "",
          });
          
          // Set avatar URL if exists
          if (parentData.img) {
            setAvatarUrl(parentData.img);
          }
          
          // Get children
          const { data: childrenData, error: childrenError } = await supabase
            .from("Student")
            .select("*")
            .eq("parentId", user.id);
          
          if (childrenError) throw childrenError;
          
          setChildren(childrenData || []);
          
          // Initialize show credentials state
          const initialShowState: Record<string, boolean> = {};
          const initialCopiedState: Record<string, boolean> = {};
          (childrenData || []).forEach((child: ChildInfo) => {
            initialShowState[child.id] = false;
            initialCopiedState[child.id] = false;
          });
          
          setShowCredentials(initialShowState);
          setCopied(initialCopiedState);
        } else {
          setError("Parent profile not found. Please set up your profile.");
        }
      } catch (err: any) {
        console.error("Error fetching profile data:", err);
        setError(err.message || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfileData();
  }, [router, supabase, resetProfileForm]);
  
  const toggleCredentials = (childId: string) => {
    setShowCredentials(prev => ({
      ...prev, 
      [childId]: !prev[childId]
    }));
  };
  
  const copyCredentials = (child: ChildInfo) => {
    const text = `Login Details:
Email: ${child.email}
Username: ${child.username}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(prev => ({ ...prev, [child.id]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [child.id]: false }));
      }, 2000);
    }).catch(err => {
      console.error("Could not copy text: ", err);
    });
  };
  
  const addAnotherChild = () => {
    router.push("/sign-up/parent-child-setup");
  };

  const handleUploadSuccess = (result: any) => {
    console.log('Cloudinary upload success:', result);
    if (result.info && result.info.secure_url) {
      setAvatarUrl(result.info.secure_url);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const secureUrl = await uploadImage(file);
      if (secureUrl) {
        setAvatarUrl(secureUrl);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    
    try {
      // First get current user to preserve existing metadata
      const { data: { user: currentAuthUser }, error: getUserError } = await supabase.auth.getUser();
      
      if (getUserError) {
        // Continue with profile update even if we can't get current user
      }
      
      // Update parent record in database first
      const updateData: any = {
        username: data.username,
        email: data.email,
        name: data.name,
        address: data.address,
      };
      
      // Add avatar URL if uploaded
      if (avatarUrl) {
        updateData.img = avatarUrl;
      }
      
      // Update parent record
      const { error: profileUpdateError } = await supabase
        .from("Parent")
        .update(updateData)
        .eq("id", parent.id);
      
      if (profileUpdateError) {
        throw profileUpdateError;
      }
      
      // Update auth user with all relevant fields
      try {
        if (!currentAuthUser?.id) {
          throw new Error("User ID not found");
        }
        
        // Call our admin API to update the user in Supabase Auth
        const response = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentAuthUser.id,
            email: data.email,
            username: data.username,
            name: data.name,
            role: 'parent'
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          // Fall back to regular updateUser if the admin API fails
          const { error: regularUpdateError } = await supabase.auth.updateUser({
            email: data.email,
            data: {
              username: data.username,
              name: data.name,
              role: 'parent',
            }
          });
        }
      } catch (authErr) {
        // Continue with the flow even if auth update fails
      }
      
      // Update parent state
      setParent({
        ...parent,
        ...updateData,
      });
      
      setSuccessMessage("Profile updated successfully");
      setIsEditing(false);
    } catch (err: any) {
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
        email: parent.email,
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
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <p className="text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error && !parent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/sign-in")}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 gap-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Parent Profile</h1>
        
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
        
        {parent && !isEditing && !isChangingPassword && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {parent.img ? (
                  <img 
                    src={parent.img} 
                    alt={parent.name} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-gray-400">
                    {parent.name?.charAt(0) || '?'}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{parent.name}</h2>
                <p className="text-sm text-gray-500">{parent.address || "No address provided"}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium">{parent.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{parent.email}</p>
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
                      {parent.name?.charAt(0) || '?'}
                    </span>
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
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Change Photo"}
                  </button>
                </div>
              </div>
              {uploadError && (
                <p className="mt-1 text-xs text-red-500">{uploadError}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Controller
                name="name"
                control={profileControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    id="name"
                    className={`mt-1 block w-full px-3 py-2 border ${
                      profileErrors.name ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
              {profileErrors.name && (
                <p className="mt-1 text-xs text-red-500">{profileErrors.name.message}</p>
              )}
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
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <Controller
                name="address"
                control={profileControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    id="address"
                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  />
                )}
              />
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
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">My Children</h2>
          <button
            onClick={addAnotherChild}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Add Another Child
          </button>
        </div>
        
        {children.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-md">
            <p className="text-gray-500">No children added yet.</p>
            <button
              onClick={addAnotherChild}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Child
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {children.map((child) => (
              <div key={child.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{child.name}</h3>
                    <p className="text-sm text-gray-600">
                      School Level: Primary {child.schoolLevel}
                      {child.schoolName && ` • ${child.schoolName}`}
                    </p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-gray-200">
                    {child.initialSetupComplete 
                      ? <span className="text-green-700">Setup Complete</span>
                      : <span className="text-orange-700">Setup Pending</span>
                    }
                  </div>
                </div>
                
                {!child.initialSetupComplete && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm mb-2 font-medium text-blue-800">
                      Share login details with {child.name}:
                    </p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Email:</span> {child.email}
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium mr-1">Login Credentials:</span>
                        <button
                          onClick={() => toggleCredentials(child.id)}
                          className="ml-2 text-indigo-600 hover:text-indigo-800"
                          title={showCredentials[child.id] ? "Hide Details" : "Show Details"}
                        >
                          {showCredentials[child.id] ? "👁️" : "👁️‍🗨️"}
                        </button>
                        <button
                          onClick={() => copyCredentials(child)}
                          className="ml-2 text-indigo-600 hover:text-indigo-800"
                          title="Copy Details"
                        >
                          📋
                        </button>
                        {copied[child.id] && (
                          <span className="ml-2 text-xs text-green-600">Copied!</span>
                        )}
                      </div>
                      
                      {showCredentials[child.id] && (
                        <div className="pl-3 text-gray-700">
                          <p><span className="font-medium">Email:</span> {child.email}</p>
                          <p><span className="font-medium">Username:</span> {child.username}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            * Child will set their own password during first login
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-600 mt-1">
                        Direct {child.name} to log in at <span className="font-medium">/student/complete-setup</span>
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <Link 
                    href={`/parent/child/${child.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 