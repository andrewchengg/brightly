"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaCog } from "react-icons/fa";

// Form schema for settings
const settingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function ParentSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [parent, setParent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Settings form
  const { 
    control, 
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      email: "",
      address: "",
      phone: "",
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
          reset({
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
  }, [router, supabase, reset]);

  const onSubmit = async (data: SettingsFormData) => {
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
      
      setSuccessMessage("Settings updated successfully!");
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    reset({
      name: parent?.name || "",
      email: parent?.email || "",
      address: parent?.address || "",
      phone: parent?.phone || "",
    });
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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
          <button
            onClick={() => router.push("/parent")}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 p-3 rounded-full">
                <FaCog className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-sm text-gray-600">Manage your personal information and preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  <FaEdit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <div className="text-green-400 mr-3">✓</div>
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <div className="text-red-400 mr-3">⚠</div>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  <FaUser className="inline mr-2 text-gray-400" />
                  Full Name
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="name"
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      } ${!isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                      placeholder="Enter your full name"
                    />
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
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
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      id="email"
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      } ${!isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'}`}
                      placeholder="Enter your email address"
                    />
                  )}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Address Field */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  <FaMapMarkerAlt className="inline mr-2 text-gray-400" />
                  Address (Optional)
                </label>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="address"
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                      }`}
                      placeholder="Enter your address"
                    />
                  )}
                />
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  📱 Phone Number (Optional)
                </label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="tel"
                      id="phone"
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 border-gray-300 ${
                        !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                      }`}
                      placeholder="Enter your phone number"
                    />
                  )}
                />
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FaTimes className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    <FaSave className="h-4 w-4" />
                    <span>{submitting ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Additional Settings Sections */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">Manage email and push notifications</p>
              </div>
              <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                Configure
              </button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Privacy</h3>
                <p className="text-sm text-gray-500">Control your privacy settings</p>
              </div>
              <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                Manage
              </button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Password</h3>
                <p className="text-sm text-gray-500">Change your account password</p>
              </div>
              <button 
                onClick={() => router.push("/parent/profile")}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 