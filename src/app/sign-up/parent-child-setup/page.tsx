"use client"
import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { parentSetupAndAddChildSchema, ParentSetupAndAddChildData } from "@/lib/formValidationSchemas"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client" // For fetching current user if needed, not for admin tasks
import { v4 as uuidv4 } from 'uuid';

// Simple 6-digit PIN generator
const generatePin = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function ParentChildSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Parent details from query params
  const parentId = searchParams.get("parentId")
  const parentEmail = searchParams.get("email")
  const parentName = searchParams.get("name")

  // State for generated child credentials
  const [generatedChildPlaceholderEmail, setGeneratedChildPlaceholderEmail] = useState<string | null>(null);
  const [generatedChildPin, setGeneratedChildPin] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [childSetupComplete, setChildSetupComplete] = useState(false);


  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ParentSetupAndAddChildData>({
    resolver: zodResolver(parentSetupAndAddChildSchema),
    defaultValues: {
      parentFullName: parentName || "",
      parentEmail: parentEmail || "",
      parentUsername: "",
      childFullName: "",
      childSchoolLevel: undefined, // Or a default like 1
      childSchoolName: "",
    },
  })

  useEffect(() => {
    // Pre-fill parent details if they change in query params (e.g. OAuth flow)
    reset({
      parentFullName: parentName || "",
      parentEmail: parentEmail || "",
      parentUsername: "",
      childFullName: "",
      childSchoolLevel: undefined,
      childSchoolName: "",
    })
  }, [parentName, parentEmail, reset])

  if (!parentId || !parentEmail || !parentName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600">Missing Information</h1>
          <p className="text-gray-700">
            Parent details are missing. Please ensure you have signed up correctly.
          </p>
          <button
            onClick={() => router.push("/sign-up")}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Sign Up
          </button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: ParentSetupAndAddChildData) => {
    setIsLoading(true)
    setFormError(null)
    setSuccessMessage(null)
    setGeneratedChildPlaceholderEmail(null);
    setGeneratedChildPin(null);
    setChildSetupComplete(false);

    try {
      // 1. Upsert Parent record
      const { error: parentError } = await supabase
        .from("Parent")
        .upsert(
          {
            id: parentId, // Supabase Auth User ID
            name: data.parentFullName,
            username: data.parentUsername,
            email: data.parentEmail,
            address: null, // Or collect if you add it to the form
          },
          { onConflict: "id" }
        )

      if (parentError) {
        console.error("Error upserting parent:", parentError)
        setFormError(`Failed to save parent details: ${parentError.message}`)
        setIsLoading(false)
        return
      }
      console.log("Parent details saved/updated for ID:", parentId)

      // 2. Generate child's placeholder email and PIN
      const childPlaceholderEmail = `studentemail.${uuidv4().substring(0,8)}@edcel.app`;
      const childPin = generatePin();
      
      // 3. Call API to create child Supabase Auth user
      const createChildUserResponse = await fetch("/api/auth/create-child-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: childPlaceholderEmail,
          password: childPin, // Use the generated PIN
          metadata: {
            role: "student",
            name: data.childFullName,
            parentIdForReference: parentId, // For easy linking if needed, not a formal FK
          },
        }),
      });

      const childAuthUserResponseText = await createChildUserResponse.text();
      console.log("Create child user API raw response:", childAuthUserResponseText);

      if (!createChildUserResponse.ok) {
        let errorMessage = `Failed to create child account (status ${createChildUserResponse.status}).`;
        try {
            const errorJson = JSON.parse(childAuthUserResponseText);
            errorMessage += ` ${errorJson.error || errorJson.message || 'Unknown API error'}`;
        } catch (e) {
            errorMessage += ` Response: ${childAuthUserResponseText}`;
        }
        console.error(errorMessage);
        setFormError(errorMessage);
        setIsLoading(false);
        return;
      }

      let childAuthUserResult;
      try {
        childAuthUserResult = JSON.parse(childAuthUserResponseText);
      } catch (e) {
        console.error("Failed to parse create child user API response:", e);
        setFormError("Failed to process child account creation response.");
        setIsLoading(false);
        return;
      }
      
      const childAuthUser = childAuthUserResult.user;

      if (!childAuthUser || !childAuthUser.id) {
        console.error("Child user creation API response missing user or user.id:", childAuthUserResult)
        setFormError("Failed to get child user ID after creation.")
        setIsLoading(false)
        return
      }
      console.log("Child Auth user created successfully:", childAuthUser.id)

      // 4. Create Student record in Prisma DB
      const tempChildUsername = `temp_child_${childAuthUser.id.substring(0, 6)}`;
      const { error: studentError } = await supabase.from("Student").insert({
        id: childAuthUser.id, // Supabase Auth ID of the student
        parentId: parentId,
        name: data.childFullName,
        email: childPlaceholderEmail, // Placeholder email
        username: tempChildUsername, // Temporary username
        schoolLevel: data.childSchoolLevel,
        schoolName: data.childSchoolName || null,
        initialSetupComplete: false, // Child needs to complete setup
      })

      if (studentError) {
        console.error("Error creating student record:", studentError)
        // Potentially attempt to delete the auth user if student creation fails? Complex.
        setFormError(`Failed to save student details: ${studentError.message}`)
        setIsLoading(false)
        return
      }
      console.log("Student record created for child ID:", childAuthUser.id)

      // 5. Display credentials to parent
      setGeneratedChildPlaceholderEmail(childPlaceholderEmail);
      setGeneratedChildPin(childPin);
      setChildSetupComplete(true); // To show credentials and dashboard button
      setSuccessMessage("Child account placeholder created successfully! Please share the credentials below with your child.");
      reset({ // Clear child fields, keep parent fields for potential next child? Or clear all.
        parentFullName: data.parentFullName,
        parentEmail: data.parentEmail,
        parentUsername: data.parentUsername,
        childFullName: "",
        childSchoolLevel: undefined,
        childSchoolName: "",
      });

    } catch (error: any) {
      console.error("Error in parent-child setup process:", error)
      setFormError(error.message || "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyToClipboard = () => {
    if (generatedChildPlaceholderEmail && generatedChildPin) {
      navigator.clipboard.writeText(
        `Child Login Details:\nEmail: ${generatedChildPlaceholderEmail}\nPIN: ${generatedChildPin}`
      ).then(() => {
        setCredentialsCopied(true);
        setTimeout(() => setCredentialsCopied(false), 2000); // Hide message after 2s
      }).catch(err => {
        console.error("Failed to copy credentials:", err);
        setFormError("Failed to copy credentials to clipboard.");
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Parent & Child Setup
        </h1>
        <p className="text-center text-gray-600">
          Confirm your details and add your child&apos;s information.
        </p>

        {!childSetupComplete ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Parent Details Section */}
            <div className="p-4 border rounded-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Your (Parent) Details</h2>
              <div>
                <label
                  htmlFor="parentFullName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Your Full Name (Read-only)
                </label>
                <Controller
                  name="parentFullName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="parentFullName"
                      readOnly
                      className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  )}
                />
              </div>
              <div className="mt-4">
                <label
                  htmlFor="parentEmail"
                  className="block text-sm font-medium text-gray-700"
                >
                  Your Email (Read-only)
                </label>
                <Controller
                  name="parentEmail"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="email"
                      id="parentEmail"
                      readOnly
                      className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  )}
                />
              </div>
              <div className="mt-4">
                <label
                  htmlFor="parentUsername"
                  className="block text-sm font-medium text-gray-700"
                >
                  Choose a Username
                </label>
                <Controller
                  name="parentUsername"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="parentUsername"
                      placeholder="e.g., SuperMom23"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        errors.parentUsername ? "border-red-500" : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {errors.parentUsername && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.parentUsername.message}
                  </p>
                )}
              </div>
            </div>

            {/* Child Details Section */}
            <div className="p-4 border rounded-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Child&apos;s Details</h2>
              <div>
                <label
                  htmlFor="childFullName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Child&apos;s Full Name
                </label>
                <Controller
                  name="childFullName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="childFullName"
                      placeholder="e.g., Alex Junior"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        errors.childFullName ? "border-red-500" : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    />
                  )}
                />
                {errors.childFullName && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.childFullName.message}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="childSchoolLevel"
                  className="block text-sm font-medium text-gray-700"
                >
                  Child&apos;s School Level
                </label>
                <Controller
                  name="childSchoolLevel"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      id="childSchoolLevel"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className={`mt-1 block w-full px-3 py-2 border ${
                        errors.childSchoolLevel ? "border-red-500" : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                    >
                      <option value="" disabled>
                        Select level
                      </option>
                      {[1, 2, 3, 4, 5, 6].map((level) => (
                        <option key={level} value={level}>
                          Primary {level}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.childSchoolLevel && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.childSchoolLevel.message}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label
                  htmlFor="childSchoolName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Child&apos;s School Name (Optional)
                </label>
                <Controller
                  name="childSchoolName"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      id="childSchoolName"
                      placeholder="e.g., Sunnyvale Primary"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  )}
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">
                {formError}
              </p>
            )}
           
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {isLoading ? "Processing..." : "Save & Create Child Account"}
              </button>
            </div>
          </form>
        ) : (
          // Credentials Display Section
          <div className="p-6 border rounded-md bg-green-50">
            <h2 className="text-2xl font-semibold mb-4 text-green-700">Child Account Created!</h2>
            {successMessage && (
                <p className="mb-4 text-sm text-green-600">{successMessage}</p>
            )}
            <p className="mb-4 text-gray-700">
              Please share the following temporary login details with your child. They will use these to log in for the first time and set up their own password.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Security Notice:</strong> Please save these credentials in a secure place. These are temporary login details that will grant access to your child's educational account.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-gray-700">
              <div>
                <strong>Placeholder Email:</strong> {generatedChildPlaceholderEmail}
              </div>
              <div className="flex items-center">
                <strong>PIN:</strong>
                <span className="ml-2 font-mono">
                  {showPin ? generatedChildPin : "******"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="ml-3 text-indigo-600 hover:text-indigo-800 text-xl"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? "👁️" : "👁️‍🗨️"} {/* Simple icons, can be replaced with SVGs */}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="mr-2">📋</span> {/* Simple icon */}
              {credentialsCopied ? "Copied!" : "Copy Credentials"}
            </button>
             <p className="mt-3 text-xs text-gray-500">
              Instruct your child to go to the student setup page and use these credentials.
            </p>
            <button
              onClick={() => {
                router.push("/parent"); // Or your parent dashboard route
                router.refresh(); 
              }}
              className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Parent Dashboard
            </button>
            <button
                onClick={() => setChildSetupComplete(false)} // Allow adding another child
                className="mt-2 w-full px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Add Another Child
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 