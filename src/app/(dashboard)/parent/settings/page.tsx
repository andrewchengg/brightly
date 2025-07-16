"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FaUser, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaCog, 
  FaBell, 
  FaShieldAlt, 
  FaLock, 
  FaTrash, 
  FaEye, 
  FaEyeSlash,
  FaCheck,
  FaExclamationTriangle,
  FaSpinner,
  FaPhone,
  FaGlobe,
  FaPalette,
  FaDownload,
  FaSignOutAlt,
  FaChevronRight,
  FaToggleOn,
  FaToggleOff
} from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

// Form schemas
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  weeklyReports: z.boolean(),
  achievementAlerts: z.boolean(),
  homeworkReminders: z.boolean(),
  examReminders: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

export default function ParentSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile form
  const { 
    control: profileControl, 
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      address: "",
      phone: "",
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

  // Notification form
  const { 
    control: notificationControl, 
    handleSubmit: handleNotificationSubmit,
    reset: resetNotificationForm,
    formState: { errors: notificationErrors }
  } = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      weeklyReports: true,
      achievementAlerts: true,
      homeworkReminders: true,
      examReminders: true,
    },
  });

  useEffect(() => {
    async function fetchParentData() {
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
            name: parentData.name || "",
            email: parentData.email || "",
            address: parentData.address || "",
            phone: parentData.phone || "",
          });
        } else {
          setError("Parent profile not found.");
        }
      } catch (err: any) {
        console.error("Error fetching parent data:", err);
        setError(err.message || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchParentData();
  }, [router, supabase, resetProfileForm]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    
    try {
      // Update parent record in database
      const updateData = {
        name: data.name,
        email: data.email,
        address: data.address || null,
        phone: data.phone || null,
      };
      
      const { error: updateError } = await supabase
        .from("Parent")
        .update(updateData)
        .eq("id", parent.id);
      
      if (updateError) {
        throw updateError;
      }
      
      // Update local state
      setParent({
        ...parent,
        ...updateData,
      });
      
      setSuccessMessage("Profile updated successfully!");
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      toast.error("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });
      
      if (updateError) {
        throw updateError;
      }
      
      setIsChangingPassword(false);
      resetPasswordForm();
      toast.success("Password updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
      toast.error("Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  const onNotificationSubmit = async (data: NotificationFormData) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Update notification preferences in database
      const { error: updateError } = await supabase
        .from("Parent")
        .update({
          notificationPreferences: data
        })
        .eq("id", parent.id);
      
      if (updateError) {
        throw updateError;
      }
      
      toast.success("Notification preferences updated!");
    } catch (err: any) {
      setError(err.message || "Failed to update notification preferences");
      toast.error("Failed to update notification preferences");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    resetProfileForm({
      name: parent?.name || "",
      email: parent?.email || "",
      address: parent?.address || "",
      phone: parent?.phone || "",
    });
    setIsEditingProfile(false);
    setError(null);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        // Delete parent record
        const { error: deleteError } = await supabase
          .from("Parent")
          .delete()
          .eq("id", parent.id);
        
        if (deleteError) throw deleteError;
        
        // Delete user account
        const { error: userDeleteError } = await supabase.auth.admin.deleteUser(parent.id);
        
        if (userDeleteError) throw userDeleteError;
        
        toast.success("Account deleted successfully");
        router.push("/sign-in");
      } catch (error: any) {
        console.error("Error deleting account:", error);
        toast.error("Failed to delete account");
      }
    }
  };

  const settingsSections = [
    {
      id: "profile",
      title: "Profile Information",
      icon: FaUser,
      description: "Manage your personal information",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      id: "security",
      title: "Security & Password",
      icon: FaLock,
      description: "Update your password and security settings",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: FaBell,
      description: "Configure your notification preferences",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      id: "privacy",
      title: "Privacy",
      icon: FaShieldAlt,
      description: "Control your privacy settings",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      id: "account",
      title: "Account Management",
      icon: FaCog,
      description: "Manage your account settings",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error && !parent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button
            onClick={() => router.push("/parent")}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-purple-800 rounded-2xl p-8 text-white shadow-xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
              <p className="text-purple-100 text-lg">
                Manage your personal information, security, and preferences
              </p>
            </div>
            <div className="hidden lg:block">
              <FaCog className="w-24 h-24 text-purple-300 opacity-50" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center px-4 py-3 text-left transition-colors ${
                          activeSection === section.id
                            ? `${section.bgColor} ${section.color} border-r-2 border-purple-600`
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className={`mr-3 h-5 w-5 ${activeSection === section.id ? section.color : "text-gray-400"}`} />
                        <div>
                          <div className="font-medium">{section.title}</div>
                          <div className="text-sm text-gray-500">{section.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <FaCheck className="text-green-400 mr-3" />
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-red-400 mr-3" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Profile Section */}
            {activeSection === "profile" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <FaUser className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>Profile Information</CardTitle>
                        <p className="text-sm text-gray-600">Update your personal details</p>
                      </div>
                    </div>
                    {!isEditingProfile && (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingProfile(true)}
                        className="flex items-center space-x-2"
                      >
                        <FaEdit className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Name Field */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          <FaUser className="inline mr-2 text-gray-400" />
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
                              disabled={!isEditingProfile}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                                profileErrors.name ? 'border-red-300' : 'border-gray-300'
                              } ${!isEditingProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                              placeholder="Enter your full name"
                            />
                          )}
                        />
                        {profileErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{profileErrors.name.message}</p>
                        )}
                      </div>

                      {/* Email Field */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          <FaEnvelope className="inline mr-2 text-gray-400" />
                          Email Address
                        </label>
                        <Controller
                          name="email"
                          control={profileControl}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="email"
                              id="email"
                              disabled={!isEditingProfile}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                                profileErrors.email ? 'border-red-300' : 'border-gray-300'
                              } ${!isEditingProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                              placeholder="Enter your email address"
                            />
                          )}
                        />
                        {profileErrors.email && (
                          <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
                        )}
                      </div>

                      {/* Phone Field */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          <FaPhone className="inline mr-2 text-gray-400" />
                          Phone Number (Optional)
                        </label>
                        <Controller
                          name="phone"
                          control={profileControl}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="tel"
                              id="phone"
                              disabled={!isEditingProfile}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 ${
                                !isEditingProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'
                              }`}
                              placeholder="Enter your phone number"
                            />
                          )}
                        />
                      </div>

                      {/* Address Field */}
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                          <FaMapMarkerAlt className="inline mr-2 text-gray-400" />
                          Address (Optional)
                        </label>
                        <Controller
                          name="address"
                          control={profileControl}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              id="address"
                              disabled={!isEditingProfile}
                              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 ${
                                !isEditingProfile ? 'bg-gray-50 text-gray-500' : 'bg-white'
                              }`}
                              placeholder="Enter your address"
                            />
                          )}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isEditingProfile && (
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          className="flex items-center space-x-2"
                        >
                          <FaTimes className="h-4 w-4" />
                          <span>Cancel</span>
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center space-x-2"
                        >
                          {submitting ? (
                            <FaSpinner className="h-4 w-4 animate-spin" />
                          ) : (
                            <FaSave className="h-4 w-4" />
                          )}
                          <span>{submitting ? "Saving..." : "Save Changes"}</span>
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Security Section */}
            {activeSection === "security" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-3 rounded-full">
                      <FaLock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Security & Password</CardTitle>
                      <p className="text-sm text-gray-600">Update your password and security settings</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isChangingPassword ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Password</h3>
                        <p className="text-gray-600 mb-4">Keep your account secure by using a strong password.</p>
                        <Button
                          onClick={() => setIsChangingPassword(true)}
                          className="flex items-center space-x-2"
                        >
                          <FaEdit className="h-4 w-4" />
                          <span>Change Password</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        {/* Current Password */}
                        <div>
                          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <Controller
                              name="currentPassword"
                              control={passwordControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type={showCurrentPassword ? "text" : "password"}
                                  id="currentPassword"
                                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                                    passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-300'
                                  }`}
                                  placeholder="Enter your current password"
                                />
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showCurrentPassword ? (
                                <FaEyeSlash className="h-4 w-4 text-gray-400" />
                              ) : (
                                <FaEye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.currentPassword && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                          )}
                        </div>

                        {/* New Password */}
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <Controller
                              name="newPassword"
                              control={passwordControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type={showNewPassword ? "text" : "password"}
                                  id="newPassword"
                                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                                    passwordErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                                  }`}
                                  placeholder="Enter your new password"
                                />
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showNewPassword ? (
                                <FaEyeSlash className="h-4 w-4 text-gray-400" />
                              ) : (
                                <FaEye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.newPassword && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <Controller
                              name="confirmPassword"
                              control={passwordControl}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  id="confirmPassword"
                                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                                    passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                                  }`}
                                  placeholder="Confirm your new password"
                                />
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              {showConfirmPassword ? (
                                <FaEyeSlash className="h-4 w-4 text-gray-400" />
                              ) : (
                                <FaEye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                          {passwordErrors.confirmPassword && (
                            <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsChangingPassword(false);
                            resetPasswordForm();
                          }}
                          className="flex items-center space-x-2"
                        >
                          <FaTimes className="h-4 w-4" />
                          <span>Cancel</span>
                        </Button>
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center space-x-2"
                        >
                          {submitting ? (
                            <FaSpinner className="h-4 w-4 animate-spin" />
                          ) : (
                            <FaLock className="h-4 w-4" />
                          )}
                          <span>{submitting ? "Updating..." : "Update Password"}</span>
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <FaBell className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>Notification Preferences</CardTitle>
                      <p className="text-sm text-gray-600">Configure how you receive notifications</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleNotificationSubmit(onNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                          <p className="text-sm text-gray-500">Receive notifications via email</p>
                        </div>
                        <Controller
                          name="emailNotifications"
                          control={notificationControl}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className="flex items-center"
                            >
                              {field.value ? (
                                <FaToggleOn className="text-2xl text-purple-600" />
                              ) : (
                                <FaToggleOff className="text-2xl text-gray-400" />
                              )}
                            </button>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                          <p className="text-sm text-gray-500">Receive notifications in your browser</p>
                        </div>
                        <Controller
                          name="pushNotifications"
                          control={notificationControl}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className="flex items-center"
                            >
                              {field.value ? (
                                <FaToggleOn className="text-2xl text-purple-600" />
                              ) : (
                                <FaToggleOff className="text-2xl text-gray-400" />
                              )}
                            </button>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Weekly Reports</h3>
                          <p className="text-sm text-gray-500">Receive weekly progress reports</p>
                        </div>
                        <Controller
                          name="weeklyReports"
                          control={notificationControl}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className="flex items-center"
                            >
                              {field.value ? (
                                <FaToggleOn className="text-2xl text-purple-600" />
                              ) : (
                                <FaToggleOff className="text-2xl text-gray-400" />
                              )}
                            </button>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Achievement Alerts</h3>
                          <p className="text-sm text-gray-500">Get notified when your child achieves milestones</p>
                        </div>
                        <Controller
                          name="achievementAlerts"
                          control={notificationControl}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className="flex items-center"
                            >
                              {field.value ? (
                                <FaToggleOn className="text-2xl text-purple-600" />
                              ) : (
                                <FaToggleOff className="text-2xl text-gray-400" />
                              )}
                            </button>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Homework Reminders</h3>
                          <p className="text-sm text-gray-500">Reminders for assigned homework</p>
                        </div>
                        <Controller
                          name="homeworkReminders"
                          control={notificationControl}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className="flex items-center"
                            >
                              {field.value ? (
                                <FaToggleOn className="text-2xl text-purple-600" />
                              ) : (
                                <FaToggleOff className="text-2xl text-gray-400" />
                              )}
                            </button>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Exam Reminders</h3>
                          <p className="text-sm text-gray-500">Reminders for upcoming exams</p>
                        </div>
                        <Controller
                          name="examReminders"
                          control={notificationControl}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => field.onChange(!field.value)}
                              className="flex items-center"
                            >
                              {field.value ? (
                                <FaToggleOn className="text-2xl text-purple-600" />
                              ) : (
                                <FaToggleOff className="text-2xl text-gray-400" />
                              )}
                            </button>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center space-x-2"
                      >
                        {submitting ? (
                          <FaSpinner className="h-4 w-4 animate-spin" />
                        ) : (
                          <FaSave className="h-4 w-4" />
                        )}
                        <span>{submitting ? "Saving..." : "Save Preferences"}</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Privacy Section */}
            {activeSection === "privacy" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-3 rounded-full">
                      <FaShieldAlt className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle>Privacy Settings</CardTitle>
                      <p className="text-sm text-gray-600">Control your privacy and data settings</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Data Export</h3>
                      <p className="text-gray-600 mb-4">Download a copy of your data including your profile and children's information.</p>
                      <Button variant="outline" className="flex items-center space-x-2">
                        <FaDownload className="h-4 w-4" />
                        <span>Export Data</span>
                      </Button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Privacy Policy</h3>
                      <p className="text-gray-600 mb-4">Read our privacy policy to understand how we handle your data.</p>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push("/privacy-policy")}
                        className="flex items-center space-x-2"
                      >
                        <FaGlobe className="h-4 w-4" />
                        <span>View Privacy Policy</span>
                      </Button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Terms of Service</h3>
                      <p className="text-gray-600 mb-4">Review our terms of service and user agreement.</p>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push("/terms-of-service")}
                        className="flex items-center space-x-2"
                      >
                        <FaGlobe className="h-4 w-4" />
                        <span>View Terms of Service</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Account Management Section */}
            {activeSection === "account" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <FaCog className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle>Account Management</CardTitle>
                      <p className="text-sm text-gray-600">Manage your account settings and preferences</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Sign Out</h3>
                      <p className="text-gray-600 mb-4">Sign out of your account on this device.</p>
                      <Button 
                        variant="outline" 
                        onClick={handleSignOut}
                        className="flex items-center space-x-2"
                      >
                        <FaSignOutAlt className="h-4 w-4" />
                        <span>Sign Out</span>
                      </Button>
                    </div>

                    <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                      <h3 className="text-lg font-medium text-red-900 mb-2">Danger Zone</h3>
                      <p className="text-red-700 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        className="flex items-center space-x-2"
                      >
                        <FaTrash className="h-4 w-4" />
                        <span>Delete Account</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 