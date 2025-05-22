// src/app/sign-up/parent-child-setup/page.tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { parentSetupAndAddChildSchema, ParentSetupAndAddChildData } from "@/lib/formValidationSchemas"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

// Helper functions (generatePin, generateUsername) remain the same
const generatePin = (): string => Math.floor(100000 + Math.random() * 900000).toString();
const generateUsername = (name: string): string => {
  const safeName = name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
  const randomDigit = Math.floor(1 + Math.random() * 9);
  return `${safeName}${randomDigit}`;
};

type FormData = Omit<ParentSetupAndAddChildData, 'childSchoolLevel'> & {
  childSchoolLevel: string | number;
}

export default function ParentChildSetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams() // To potentially get initial prefill data

  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [parentAuthUser, setParentAuthUser] = useState<User | null>(null);
  const [isParentDataLoading, setIsParentDataLoading] = useState(true);

  const [generatedChildUsername, setGeneratedChildUsername] = useState<string | null>(null);
  const [generatedChildPin, setGeneratedChildPin] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [childSetupCompleteThisSession, setChildSetupCompleteThisSession] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue, 
  } = useForm<FormData>({
    resolver: zodResolver(parentSetupAndAddChildSchema),
    defaultValues: { // Initial defaults, will be overridden by useEffect
      parentFullName: "", parentEmail: "", parentUsername: "",
      childFullName: "", childUsername: "", childEmail: "",
      childSchoolLevel: "", childSchoolName: "",
    },
  });

  useEffect(() => {
    const fetchParentDataAndSetForm = async () => {
      setIsParentDataLoading(true);
      setFormError(null);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setFormError("No active session. Please sign in as a parent first.");
        // Keep query params logic as a fallback if direct navigation happens with them
        const qParentId = searchParams.get("parentId");
        const qParentEmail = searchParams.get("email");
        const qParentName = searchParams.get("name");
        if (qParentId && qParentEmail && qParentName) {
             setValue("parentFullName", qParentName);
             setValue("parentEmail", qParentEmail);
             // Username to be set on this form.
             console.warn("parent-child-setup: Using query params, parent should log in ideally.");
        } else {
            router.push("/sign-in?next=/sign-up/parent-child-setup");
        }
        setIsParentDataLoading(false);
        return;
      }
      
      const authUser = session.user;
      setParentAuthUser(authUser);

      const userRole = authUser.user_metadata?.role;
      if (userRole !== 'parent') {
        setFormError("Access denied. This page is for parent setup only.");
        router.push(`/${userRole || 'student'}`); // Redirect to their actual dashboard
        setIsParentDataLoading(false);
        return;
      }
      
      // Parent is authenticated. Fetch their DB profile.
      const { data: parentDbData, error: parentDbError } = await supabase
        .from('Parent')
        .select('name, email, username') 
        .eq('id', authUser.id)
        .single();

      if (parentDbError && parentDbError.code !== 'PGRST116') { 
        setFormError("Could not load your parent profile from the database. " + parentDbError.message);
        // Prefill with auth data if DB fetch fails but user is authenticated
        setValue("parentFullName", authUser.user_metadata?.name || authUser.email?.split('@')[0] || "");
        setValue("parentEmail", authUser.email || "");
        setValue("parentUsername", authUser.user_metadata?.username || authUser.email?.split('@')[0] || "");
      } else if (parentDbData) {
        setValue("parentFullName", parentDbData.name || authUser.user_metadata?.name || "");
        setValue("parentEmail", parentDbData.email || authUser.email || "");
        setValue("parentUsername", parentDbData.username || authUser.user_metadata?.username || "");
      } else {
        // No DB record yet, prefill from Auth metadata (common for new OAuth parents)
        setValue("parentFullName", authUser.user_metadata?.name || authUser.email?.split('@')[0] || "");
        setValue("parentEmail", authUser.email || "");
        setValue("parentUsername", authUser.user_metadata?.username || authUser.email?.split('@')[0] || "");
      }
      
      setIsParentDataLoading(false);
    };

    fetchParentDataAndSetForm();
  }, [supabase, router, setValue, searchParams]);

  const onSubmit = async (data: FormData) => {
    if (!parentAuthUser) {
      setFormError("Parent session not found. Please log in again.");
      setIsLoading(false); // Ensure loading is stopped
      return;
    }
    
    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);
    const parentId = parentAuthUser.id;

    try {
      // Step 1: Upsert Parent details (especially username if they set it here)
      const { error: parentUpsertError } = await supabase
        .from("Parent")
        .upsert({
          id: parentId, 
          name: data.parentFullName, // Should be pre-filled and potentially read-only
          username: data.parentUsername, // This is what parent is setting/confirming
          email: data.parentEmail, // Should be pre-filled
          address: null, // Or add to form if needed
          updatedAt: new Date().toISOString(),
          // createdAt will be set on first insert by DB default or previous step
        }, { onConflict: 'id' });

      if (parentUpsertError) {
        console.error("Error upserting parent details during child setup:", parentUpsertError);
        setFormError(`Failed to save parent details: ${parentUpsertError.message}`);
        setIsLoading(false);
        return;
      }
      
      // Update parent's auth metadata if username changed
      if (data.parentUsername && data.parentUsername !== parentAuthUser.user_metadata?.username) {
          const { error: authMetaUpdateError } = await supabase.auth.updateUser({
              data: { ...parentAuthUser.user_metadata, username: data.parentUsername }
          });
          if (authMetaUpdateError) {
              console.warn("Could not update parent auth metadata username:", authMetaUpdateError.message);
              // Non-critical, proceed
          }
      }


      // Step 2: Generate child's username and PIN
      const childUsername = data.childUsername?.trim() ? data.childUsername.trim() : generateUsername(data.childFullName);
      const childPin = generatePin();
      
      // Step 3: Call API to create child Supabase Auth user
      const createChildUserResponse = await fetch("/api/auth/create-child-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: childUsername,
          password: childPin, 
          email: data.childEmail || parentAuthUser.email, 
          metadata: {
            role: "student", // Child's role
            name: data.childFullName,
            parentIdForReference: parentId,
            parent_email_for_reference: parentAuthUser.email // Could be useful
          },
        }),
      });

      const childAuthUserResponseText = await createChildUserResponse.text();
      if (!createChildUserResponse.ok) {
        let errorMessage = `Failed to create child auth account (status ${createChildUserResponse.status}).`;
        try {
            const errorJson = JSON.parse(childAuthUserResponseText);
            errorMessage += ` ${errorJson.error?.message || errorJson.message || JSON.stringify(errorJson.error) || childAuthUserResponseText}`;
        } catch (e) { errorMessage += ` Response: ${childAuthUserResponseText}`; }
        console.error(errorMessage); setFormError(errorMessage); setIsLoading(false); return;
      }

      const childAuthUserResult = JSON.parse(childAuthUserResponseText);
      const childAuthUser = childAuthUserResult.user;

      if (!childAuthUser || !childAuthUser.id) {
        setFormError("Failed to retrieve child user ID after creation.");
        setIsLoading(false); return;
      }

      // Step 4: Create Student record in Prisma DB
      const { error: studentInsertError } = await supabase.from("Student").insert({
        id: childAuthUser.id, 
        parentId: parentId,
        name: data.childFullName,
        email: data.childEmail || parentAuthUser.email, // Use child's email or fallback
        username: childUsername, 
        schoolLevel: typeof data.childSchoolLevel === 'string' ? parseInt(data.childSchoolLevel) : data.childSchoolLevel,
        schoolName: data.childSchoolName || null,
        initialSetupComplete: false, 
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        // Ensure other required fields for Student have defaults or are handled
        currentStreak: 0,
        level: 1,
        longestStreak: 0,
        xpPoints: 0,
      });

      if (studentInsertError) {
        console.error("Error creating student DB record:", studentInsertError);
        setFormError(`Failed to save student details: ${studentInsertError.message}. Child auth account was created; contact support if issue persists.`);
        setIsLoading(false); return;
      }

      setGeneratedChildUsername(childUsername);
      setGeneratedChildPin(childPin);
      setChildSetupCompleteThisSession(true);
      setSuccessMessage("Child account created successfully! Please share the credentials below with your child.");
      reset({ 
        parentFullName: data.parentFullName, parentEmail: data.parentEmail, parentUsername: data.parentUsername,
        childFullName: "", childUsername: "", childEmail: "", childSchoolLevel: "", childSchoolName: "",
      });

    } catch (error: any) { 
      console.error("Full error in parent-child setup onSubmit:", error);
      setFormError(error.message || "An unexpected error occurred during child setup.");
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleCopyToClipboard = () => { /* ... same ... */ };

  if (isParentDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700">Loading your details...</p>
      </div>
    );
  }

  if (!parentAuthUser && !isParentDataLoading) { // Should be caught by useEffect redirect
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        {/* ... error display and link to sign-in ... */}
         <p>Please sign in to continue.</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Parent & Child Setup
        </h1>
        <p className="text-center text-gray-600">
          Confirm your (parent) details and add your child's information below.
        </p>

        {!childSetupCompleteThisSession ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Parent Details Section - now prefilled and username potentially editable */}
            <div className="p-4 border rounded-md bg-slate-50">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Your (Parent) Details</h2>
              <div>
                <label htmlFor="parentFullName" className="block text-sm font-medium text-gray-700">Your Full Name</label>
                <Controller name="parentFullName" control={control}
                  render={({ field }) => <input {...field} type="text" id="parentFullName" readOnly /* Or make editable if desired */
                    className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm" />}
                />
              </div>
              <div className="mt-4">
                <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700">Your Email</label>
                <Controller name="parentEmail" control={control}
                  render={({ field }) => <input {...field} type="email" id="parentEmail" readOnly /* Or make editable if desired */
                    className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm" />}
                />
              </div>
              <div className="mt-4">
                <label htmlFor="parentUsername" className="block text-sm font-medium text-gray-700">Confirm/Set Your Username</label>
                <Controller name="parentUsername" control={control}
                  render={({ field }) => <input {...field} type="text" id="parentUsername" placeholder="e.g., SuperMom23"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.parentUsername ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.parentUsername && <p className="mt-1 text-xs text-red-500">{errors.parentUsername.message}</p>}
                 <p className="mt-1 text-xs text-gray-500">This will be your login username.</p>
              </div>
            </div>

            {/* Child Details Section (remains the same) */}
            <div className="p-4 border rounded-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Child's Details</h2>
              {/* ... child fields ... */}
               <div>
                <label htmlFor="childFullName" className="block text-sm font-medium text-gray-700">Child's Full Name</label>
                <Controller name="childFullName" control={control}
                  render={({ field }) => <input {...field} type="text" id="childFullName" placeholder="e.g., Alex Junior"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.childFullName ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.childFullName && <p className="mt-1 text-xs text-red-500">{errors.childFullName.message}</p>}
              </div>

              <div className="mt-4">
                <label htmlFor="childEmail" className="block text-sm font-medium text-gray-700">Child's Email (Optional)</label>
                <Controller name="childEmail" control={control}
                  render={({ field }) => <input {...field} type="email" id="childEmail" placeholder="e.g., child@example.com or use parent's"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.childEmail ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.childEmail && <p className="mt-1 text-xs text-red-500">{errors.childEmail.message}</p>}
              </div>

              <div className="mt-4">
                <label htmlFor="childSchoolLevel" className="block text-sm font-medium text-gray-700">Child's School Level</label>
                <Controller name="childSchoolLevel" control={control}
                  render={({ field }) => (
                    <select {...field} id="childSchoolLevel" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
                      className={`mt-1 block w-full px-3 py-2 border ${errors.childSchoolLevel ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}>
                      <option value="">Select A Level</option>
                      {[1, 2, 3, 4, 5, 6].map((level) => (<option key={level} value={level}>Primary {level}</option>))}
                    </select>
                  )}
                />
                {errors.childSchoolLevel && <p className="mt-1 text-xs text-red-500">{errors.childSchoolLevel.message}</p>}
              </div>

              <div className="mt-4">
                <label htmlFor="childSchoolName" className="block text-sm font-medium text-gray-700">Child's School Name (Optional)</label>
                <Controller name="childSchoolName" control={control}
                  render={({ field }) => <input {...field} type="text" id="childSchoolName" placeholder="e.g., Sunnyvale Primary"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="childUsername" className="block text-sm font-medium text-gray-700">Child's Username (Optional)</label>
                <Controller name="childUsername" control={control}
                  render={({ field }) => <input {...field} type="text" id="childUsername" placeholder="Leave blank to auto-generate"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.childUsername ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.childUsername && <p className="mt-1 text-xs text-red-500">{errors.childUsername.message}</p>}
              </div>
            </div>

            {formError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{formError}</p>}
           
            <div>
              <button type="submit" disabled={isLoading || isParentDataLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                {isLoading ? "Processing..." : "Save Parent Info & Create Child Account"}
              </button>
            </div>
          </form>
        ) : (
          // Credentials Display Section (remains the same)
          <div className="p-6 border rounded-md bg-green-50">
             <h2 className="text-2xl font-semibold mb-4 text-green-700">Child Account Created!</h2>
            {successMessage && <p className="mb-4 text-sm text-green-600">{successMessage}</p>}
            <p className="mb-4 text-gray-700">
              Please share these temporary login details with your child. They will set their own password during their first login.
            </p>
             <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex"><div className="flex-shrink-0"><svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg></div>
                <div className="ml-3"><p className="text-sm text-yellow-700"><strong>Important:</strong> Save these credentials. Your child will need them to log in and complete their setup.</p></div>
              </div>
            </div>
            <div className="space-y-3 text-gray-700">
              <div><strong>Username:</strong> {generatedChildUsername}</div>
              <div className="flex items-center">
                <strong>PIN:</strong>
                <span className="ml-2 font-mono">{showPin ? generatedChildPin : "******"}</span>
                <button type="button" onClick={() => setShowPin(!showPin)} className="ml-3 text-indigo-600 hover:text-indigo-800 text-xl" title={showPin ? "Hide PIN" : "Show PIN"}>{showPin ? "👁️" : "👁️‍🗨️"}</button>
              </div>
            </div>
            <button type="button" onClick={handleCopyToClipboard}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <span className="mr-2">📋</span> {credentialsCopied ? "Copied!" : "Copy Credentials"}
            </button>
            <p className="mt-3 text-xs text-gray-500">Instruct your child to go to <span className="font-medium">/student/complete-setup</span> and use these credentials.</p>
            <button onClick={() => { router.push("/parent"); router.refresh(); }}
              className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Go to Parent Dashboard
            </button>
            <button onClick={() => setChildSetupCompleteThisSession(false)}
              className="mt-2 w-full px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">
              Add Another Child
            </button>
          </div>
        )}
      </div>
    </div>
  );
}