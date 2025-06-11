// src/app/sign-up/parent-child-setup/page.tsx
"use client"
import { useState, useEffect, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { parentSetupAndAddChildSchema, ParentSetupAndAddChildData } from "@/lib/formValidationSchemas"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { toast } from "react-toastify"; // Import toast
import { Button } from "@/components/ui/button"; // Assuming you have this

// Helper functions
const generatePin = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const generateUsername = (name: string, existingUsernames: string[] = []): string => {
  const baseName = name.replace(/[^\w]/gi, '').replace(/\s+/g, '_').toLowerCase() || 'child';
  let attempt = 0;
  let newUsername = `${baseName}${Math.floor(1 + Math.random() * 9)}`;
  while (existingUsernames.includes(newUsername) && attempt < 100) {
    newUsername = `${baseName}${Math.floor(10 + Math.random() * 90)}`;
    attempt++;
  }
  if (attempt >= 100) {
      newUsername = `${baseName}${Date.now().toString().slice(-4)}`
  }
  return newUsername;
};

// REMOVED generatePlaceholderChildEmail function

type FormData = Omit<ParentSetupAndAddChildData, 'childSchoolLevel'> & {
  childSchoolLevel: string | number;
}

export default function ParentChildSetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams() 

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
    watch 
  } = useForm<FormData>({
    resolver: zodResolver(parentSetupAndAddChildSchema),
    defaultValues: { 
      parentFullName: "", parentEmail: "", parentUsername: "",
      childFullName: "", childUsername: "", childEmail: "", // childEmail is now required by schema
      childSchoolLevel: "", childSchoolName: "",
    },
  });

  const childFullNameWatcher = watch("childFullName");

  useEffect(() => {
    // ... (existing useEffect logic to fetch parent data - no changes here) ...
    const fetchParentDataAndSetForm = async () => {
      setIsParentDataLoading(true);
      setFormError(null);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setFormError("No active session. Please sign in as a parent first.");
        const qParentId = searchParams.get("parentId");
        const qParentEmail = searchParams.get("email");
        const qParentName = searchParams.get("name");
        if (qParentId && qParentEmail && qParentName) {
             setValue("parentFullName", qParentName);
             setValue("parentEmail", qParentEmail);
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
        router.push(`/${userRole || 'student'}`); 
        setIsParentDataLoading(false);
        return;
      }
      
      const { data: parentDbData, error: parentDbError } = await supabase
        .from('Parent')
        .select('name, email, username') 
        .eq('id', authUser.id)
        .single();

      if (parentDbError && parentDbError.code !== 'PGRST116') { 
        setFormError("Could not load your parent profile from the database. " + parentDbError.message);
        setValue("parentFullName", authUser.user_metadata?.name || authUser.email?.split('@')[0] || "");
        setValue("parentEmail", authUser.email || "");
        setValue("parentUsername", authUser.user_metadata?.username || authUser.email?.split('@')[0] || "");
      } else if (parentDbData) {
        setValue("parentFullName", parentDbData.name || authUser.user_metadata?.name || "");
        setValue("parentEmail", parentDbData.email || authUser.email || "");
        setValue("parentUsername", parentDbData.username || authUser.user_metadata?.username || "");
      } else {
        setValue("parentFullName", authUser.user_metadata?.name || authUser.email?.split('@')[0] || "");
        setValue("parentEmail", authUser.email || "");
        setValue("parentUsername", authUser.user_metadata?.username || authUser.email?.split('@')[0] || "");
      }
      
      setIsParentDataLoading(false);
    };
    fetchParentDataAndSetForm();
  }, [supabase, router, setValue, searchParams]);

  useEffect(() => {
    if (childFullNameWatcher && !control._formValues.childUsername) {
        setValue("childUsername", generateUsername(childFullNameWatcher), { shouldValidate: false });
    }
  }, [childFullNameWatcher, setValue, control._formValues.childUsername]);


  const onSubmit = async (data: FormData) => {
    if (!parentAuthUser || !parentAuthUser.email) {
      setFormError("Parent session or email not found. Please log in again.");
      setIsLoading(false);
      return;
    }
    
    // Ensure childEmail is provided due to schema change
    if (!data.childEmail || !data.childEmail.trim()) {
        setFormError("Child's email address is required.");
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);
    const parentId = parentAuthUser.id;

    try {
      // Step 1: Upsert Parent details
      // ... (parent upsert logic remains the same) ...
      const { error: parentUpsertError } = await supabase
        .from("Parent")
        .upsert({
          id: parentId, 
          name: data.parentFullName,
          username: data.parentUsername,
          email: data.parentEmail, 
          address: null, 
          updatedAt: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (parentUpsertError) {
        console.error("Error upserting parent details:", parentUpsertError);
        setFormError(`Failed to save parent details: ${parentUpsertError.message}`);
        setIsLoading(false);
        return;
      }
      
      if (data.parentUsername && data.parentUsername !== parentAuthUser.user_metadata?.username) {
          const { error: authMetaUpdateError } = await supabase.auth.updateUser({
              data: { ...parentAuthUser.user_metadata, username: data.parentUsername, name: data.parentFullName }
          });
          if (authMetaUpdateError) {
              console.warn("Could not update parent auth metadata:", authMetaUpdateError.message);
          }
      }

      // Step 2: Generate child's username and PIN
      const childUsername = data.childUsername?.trim() ? data.childUsername.trim() : generateUsername(data.childFullName);
      const childPin = generatePin();
      
      // Child's email is now directly from the form data and is required by schema
      const childAuthEmail = data.childEmail.trim(); 
      
      // Step 3: Call API to create child Supabase Auth user
      const createChildUserResponse = await fetch("/api/auth/create-child-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: childUsername,
          password: childPin, 
          email: childAuthEmail, // Use the provided child's email
          metadata: {
            role: "student",
            name: data.childFullName,
            parentIdForReference: parentId,
            parent_email_for_reference: parentAuthUser.email 
          },
        }),
      });

      // ... (rest of the onSubmit logic remains the same for handling response and creating Student DB record) ...
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

      const { error: studentInsertError } = await supabase.from("Student").insert({
        id: childAuthUser.id, 
        parentId: parentId,
        name: data.childFullName,
        email: childAuthEmail, 
        username: childUsername, 
        schoolLevel: typeof data.childSchoolLevel === 'string' ? parseInt(data.childSchoolLevel) : data.childSchoolLevel,
        schoolName: data.childSchoolName || null,
        initialSetupComplete: false, 
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        currentStreak: 0, level: 1, longestStreak: 0, xpPoints: 0,
      });

      if (studentInsertError) {
        console.error("Error creating student DB record:", studentInsertError);
        setFormError(`Failed to save student details: ${studentInsertError.message}. Child auth account may need manual cleanup if issue persists.`);
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

  const handleCopyToClipboard = () => {
    if (generatedChildUsername && generatedChildPin) {
      const textToCopy = `Child's Login Details:\nUsername: ${generatedChildUsername}\nTemporary PIN: ${generatedChildPin}\n\nInstruct your child to go to /student/complete-setup to complete their profile and set a new password.`;
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCredentialsCopied(true);
          toast.success("Credentials copied to clipboard!");
          setTimeout(() => setCredentialsCopied(false), 2500);
        })
        .catch(err => {
          toast.error("Failed to copy credentials.");
          console.error('Failed to copy credentials: ', err);
        });
    }
  };
  
  // ... (loading and error states JSX remain the same) ...
  if (isParentDataLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700">Loading your details...</p>
      </div>
    );
  }

  if (!parentAuthUser && !isParentDataLoading) { 
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
         <p className="text-xl text-red-600 mb-4">Session Error</p>
         <p className="text-gray-700 mb-6">Please sign in as a parent to continue.</p>
         <Button onClick={() => router.push('/sign-in?next=/sign-up/parent-child-setup')} className="bg-indigo-600 hover:bg-indigo-700">
            Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Parent & Child Setup
        </h1>
        
        {formError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{formError}</p>}

        {!childSetupCompleteThisSession ? (
          <>
          <p className="text-center text-gray-600 text-sm">
            Confirm your (parent) details and add your child's information below.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Parent Details Section - same as before */}
            <div className="p-4 border rounded-md bg-slate-50">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Your (Parent) Details</h2>
              <div>
                <label htmlFor="parentFullName" className="block text-sm font-medium text-gray-700">Your Full Name</label>
                <Controller name="parentFullName" control={control}
                  render={({ field }) => <input {...field} type="text" id="parentFullName" 
                    className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm" 
                    readOnly={!!parentAuthUser?.user_metadata?.name} 
                    />} 
                />
                 {errors.parentFullName && <p className="mt-1 text-xs text-red-500">{errors.parentFullName.message}</p>}
              </div>
              <div className="mt-4">
                <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700">Your Email</label>
                <Controller name="parentEmail" control={control}
                  render={({ field }) => <input {...field} type="email" id="parentEmail" readOnly
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

            {/* Child Details Section - Updated Child Email Field */}
            <div className="p-4 border rounded-md">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Child's Details</h2>
               <div>
                <label htmlFor="childFullName" className="block text-sm font-medium text-gray-700">Child's Full Name</label>
                <Controller name="childFullName" control={control}
                  render={({ field }) => <input {...field} type="text" id="childFullName" placeholder="e.g., Alex Junior"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.childFullName ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.childFullName && <p className="mt-1 text-xs text-red-500">{errors.childFullName.message}</p>}
              </div>

              <div className="mt-4">
                <label htmlFor="childEmail" className="block text-sm font-medium text-gray-700">Child's Email Address <span className="text-red-500">*</span></label>
                <Controller name="childEmail" control={control}
                  render={({ field }) => <input {...field} type="email" id="childEmail" placeholder="e.g., child.name@example.com"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.childEmail ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.childEmail && <p className="mt-1 text-xs text-red-500">{errors.childEmail.message}</p>}
                <p className="mt-1 text-xs text-gray-500">A unique email is required for your child's account.</p>
              </div>

              <div className="mt-4">
                <label htmlFor="childSchoolLevel" className="block text-sm font-medium text-gray-700">Child's School Level <span className="text-red-500">*</span></label>
                <Controller name="childSchoolLevel" control={control}
                  render={({ field }) => (
                    <select {...field} id="childSchoolLevel" 
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : "")}
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
                  render={({ field }) => <input {...field} type="text" id="childUsername" placeholder="Auto-generated if blank"
                    className={`mt-1 block w-full px-3 py-2 border ${errors.childUsername ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`} />}
                />
                {errors.childUsername && <p className="mt-1 text-xs text-red-500">{errors.childUsername.message}</p>}
              </div>
            </div>
           
            <div>
              <Button type="submit" disabled={isLoading || isParentDataLoading} className="w-full py-3">
                {isLoading ? "Processing..." : "Save Parent Info & Create Child Account"}
              </Button>
            </div>
          </form>
          </>
        ) : (
          // Credentials Display Section - same as before
          <div className="p-6 border rounded-md bg-green-50">
             <h2 className="text-2xl font-semibold mb-4 text-green-700 text-center">Child Account Created!</h2>
            {successMessage && <p className="mb-4 text-sm text-green-600 text-center">{successMessage}</p>}
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4 rounded-md">
              <div className="flex"><div className="flex-shrink-0"><svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg></div>
                <div className="ml-3"><p className="text-sm text-yellow-800"><strong>Important:</strong> Share these temporary login details with your child. They will set their own password during their first login at <span className="font-semibold">/student/complete-setup</span>.</p></div>
              </div>
            </div>

            <div className="space-y-3 text-gray-700 bg-white p-4 rounded-md shadow">
              <div><strong>Username:</strong> <span className="font-mono text-indigo-700">{generatedChildUsername}</span></div>
              <div className="flex items-center">
                <strong>Temporary PIN:</strong>
                <span className={`ml-2 font-mono text-indigo-700 ${!showPin && "blur-sm select-none"}`}>{generatedChildPin}</span>
                <button type="button" onClick={() => setShowPin(!showPin)} className="ml-3 text-gray-500 hover:text-gray-700 text-xl" title={showPin ? "Hide PIN" : "Show PIN"}>{showPin ? "👁️" : "🔒"}</button>
              </div>
            </div>
            <Button type="button" onClick={handleCopyToClipboard} className="mt-6 w-full">
              <span className="mr-2">📋</span> {credentialsCopied ? "Copied!" : "Copy Credentials"}
            </Button>
            
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Button onClick={() => router.push("/parent")} className="w-full sm:w-auto">
                    Go to Parent Dashboard
                </Button>
                <Button onClick={() => setChildSetupCompleteThisSession(false)} variant="outline" className="w-full sm:w-auto">
                    Add Another Child
                </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
