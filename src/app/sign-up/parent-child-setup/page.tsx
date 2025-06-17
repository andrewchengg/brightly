// src/app/sign-up/parent-child-setup/page.tsx
"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  parentSetupAndAddChildSchema,
  ParentSetupAndAddChildData,
} from "@/lib/formValidationSchemas";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "react-toastify"; // Import toast
import { Button } from "@/components/ui/button"; // Assuming you have this
import Link from "next/link";

// Helper functions
const generatePin = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateUsername = (
  name: string,
  existingUsernames: string[] = []
): string => {
  const baseName =
    name.replace(/[^\w]/gi, "").replace(/\s+/g, "_").toLowerCase() || "child";
  let attempt = 0;
  let newUsername = `${baseName}${Math.floor(1 + Math.random() * 9)}`;
  while (existingUsernames.includes(newUsername) && attempt < 100) {
    newUsername = `${baseName}${Math.floor(10 + Math.random() * 90)}`;
    attempt++;
  }
  if (attempt >= 100) {
    newUsername = `${baseName}${Date.now().toString().slice(-4)}`;
  }
  return newUsername;
};

// REMOVED generatePlaceholderChildEmail function

type FormData = Omit<ParentSetupAndAddChildData, "childSchoolLevel"> & {
  childSchoolLevel: string | number;
};

function ParentChildSetupContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<
    "forward" | "backward" | null
  >(null);

  const [parentAuthUser, setParentAuthUser] = useState<User | null>(null);
  const [isParentDataLoading, setIsParentDataLoading] = useState(true);

  const [generatedChildUsername, setGeneratedChildUsername] = useState<
    string | null
  >(null);
  const [generatedChildPin, setGeneratedChildPin] = useState<string | null>(
    null
  );
  const [showPin, setShowPin] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [childSetupCompleteThisSession, setChildSetupCompleteThisSession] =
    useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(parentSetupAndAddChildSchema),
    defaultValues: {
      parentFullName: "",
      parentEmail: "",
      parentUsername: "",
      childFullName: "",
      childUsername: "",
      childEmail: "", // childEmail is now required by schema
      childSchoolLevel: "",
      childSchoolName: "",
    },
    mode: "onChange", // Enable real-time validation
  });

  const childFullNameWatcher = watch("childFullName");

  useEffect(() => {
    const fetchParentDataAndSetForm = async () => {
      setIsParentDataLoading(true);
      setFormError(null);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setFormError("No active session. Please sign in as a parent first.");
        const qParentId = searchParams.get("parentId");
        const qParentEmail = searchParams.get("email");
        const qParentName = searchParams.get("name");
        if (qParentId && qParentEmail && qParentName) {
          setValue("parentFullName", qParentName);
          setValue("parentEmail", qParentEmail);
        } else {
          router.push("/sign-in?next=/sign-up/parent-child-setup");
        }
        setIsParentDataLoading(false);
        return;
      }

      const authUser = session.user;
      setParentAuthUser(authUser);

      const userRole = authUser.user_metadata?.role;
      if (userRole !== "parent") {
        setFormError("Access denied. This page is for parent setup only.");
        router.push(`/${userRole || "student"}`);
        setIsParentDataLoading(false);
        return;
      }

      const { data: parentDbData, error: parentDbError } = await supabase
        .from("Parent")
        .select("name, email, username")
        .eq("id", authUser.id)
        .single();

      if (parentDbError) {
        if (parentDbError.code !== "PGRST116") {
          setFormError(
            `Database error: ${parentDbError.message}. Using auth data instead.`
          );
        }
        // Use auth user data as fallback
        setValue(
          "parentFullName",
          authUser.user_metadata?.name || authUser.email?.split("@")[0] || ""
        );
        setValue("parentEmail", authUser.email || "");
        setValue(
          "parentUsername",
          authUser.user_metadata?.username ||
            authUser.email?.split("@")[0] ||
            ""
        );
      } else if (parentDbData) {
        setValue(
          "parentFullName",
          parentDbData.name || authUser.user_metadata?.name || ""
        );
        setValue("parentEmail", parentDbData.email || authUser.email || "");
        setValue(
          "parentUsername",
          parentDbData.username || authUser.user_metadata?.username || ""
        );
      } else {
        // No data found, use auth user data
        setValue(
          "parentFullName",
          authUser.user_metadata?.name || authUser.email?.split("@")[0] || ""
        );
        setValue("parentEmail", authUser.email || "");
        setValue(
          "parentUsername",
          authUser.user_metadata?.username ||
            authUser.email?.split("@")[0] ||
            ""
        );
      }

      setIsParentDataLoading(false);
    };
    fetchParentDataAndSetForm();
  }, [supabase, router, setValue, searchParams]);

  useEffect(() => {
    if (childFullNameWatcher && !control._formValues.childUsername) {
      setValue("childUsername", generateUsername(childFullNameWatcher), {
        shouldValidate: false,
      });
    }
  }, [childFullNameWatcher, setValue, control._formValues.childUsername]);

  // Clear fields when step changes
  useEffect(() => {
    switch (currentStep) {
      case 2:
        setValue("childEmail", "", { shouldValidate: false });
        break;
      case 3:
        setValue("childSchoolLevel", "", { shouldValidate: false });
        break;
      case 4:
        setValue("childSchoolName", "", { shouldValidate: false });
        break;
      case 5:
        setValue("childUsername", "", { shouldValidate: false });
        break;
    }
  }, [currentStep, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!parentAuthUser || !parentAuthUser.email) {
      setFormError("Parent session or email not found. Please log in again.");
      return;
    }

    // Ensure childEmail is provided due to schema change
    if (!data.childEmail || !data.childEmail.trim()) {
      setFormError("Child's email address is required.");
      return;
    }

    setIsLoading(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const parentId = parentAuthUser.id;

      const { data: parentDbData, error: parentDbError } = await supabase
        .from("Parent")
        .upsert({
          id: parentId,
          name: data.parentFullName,
          email: data.parentEmail,
          username: data.parentUsername,
          updatedAt: new Date().toISOString(),
        })
        .select();

      if (parentDbError) {
        setFormError(`Failed to save parent details: ${parentDbError.message}`);
        return;
      }

      const childPin = generatePin();
      const childUsername =
        data.childUsername || generateUsername(data.childFullName);
      const childAuthEmail = data.childEmail;

      const childAuthUserResponse = await fetch("/api/auth/create-child-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: childAuthEmail,
          password: childPin,
          username: childUsername,
          name: data.childFullName,
          parentId: parentId,
        }),
      });

      if (!childAuthUserResponse.ok) {
        const errorText = await childAuthUserResponse.text();
        const errorMessage = `Failed to create child auth user (${childAuthUserResponse.status}): ${errorText}`;
        setFormError(errorMessage);
        return;
      }

      const childAuthUserResponseText = await childAuthUserResponse.text();
      if (
        !childAuthUserResponseText ||
        childAuthUserResponseText.trim() === ""
      ) {
        const error = "Empty response from child user creation API.";
        setFormError(error);
        return;
      }

      const childAuthUserResult = JSON.parse(childAuthUserResponseText);
      const childAuthUser = childAuthUserResult.user;

      if (!childAuthUser || !childAuthUser.id) {
        setFormError("Failed to retrieve child user ID after creation.");
        return;
      }

      // Ensure schoolLevel is a proper number
      const schoolLevelNumber =
        typeof data.childSchoolLevel === "string"
          ? parseInt(data.childSchoolLevel, 10)
          : data.childSchoolLevel;

      // Validate required fields before insert
      const validationErrors = [];
      if (!childAuthUser.id) validationErrors.push("Child user ID is missing");
      if (!parentId) validationErrors.push("Parent ID is missing");
      if (!data.childFullName || data.childFullName.trim() === "")
        validationErrors.push("Child's full name is required");
      if (!childAuthEmail || childAuthEmail.trim() === "")
        validationErrors.push("Child's email is required");
      if (!childUsername || childUsername.trim() === "")
        validationErrors.push("Child's username is required");
      if (
        !schoolLevelNumber ||
        isNaN(schoolLevelNumber) ||
        schoolLevelNumber < 1 ||
        schoolLevelNumber > 6
      ) {
        validationErrors.push("Valid school level (1-6) is required");
      }

      if (validationErrors.length > 0) {
        setFormError(`Validation failed: ${validationErrors.join(", ")}`);
        return;
      }

      const currentTimestamp = new Date().toISOString();
      const studentData = {
        id: childAuthUser.id,
        parentId: parentId,
        name: data.childFullName,
        email: childAuthEmail,
        username: childUsername,
        schoolLevel: schoolLevelNumber,
        schoolName: data.childSchoolName || null,
        initialSetupComplete: false,
        currentStreak: 0,
        level: 1,
        longestStreak: 0,
        xpPoints: 0,
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      };

      const { error: studentInsertError, data: insertedStudent } =
        await supabase.from("Student").insert(studentData).select();

      if (studentInsertError) {
        setFormError(
          `Failed to save student details: ${studentInsertError.message}. Child auth account may need manual cleanup if issue persists.`
        );
        return;
      }

      setGeneratedChildUsername(childUsername);
      setGeneratedChildPin(childPin);
      setChildSetupCompleteThisSession(true);
      setSuccessMessage(
        "Child account created successfully! Please share the credentials below with your child."
      );
      reset({
        parentFullName: data.parentFullName,
        parentEmail: data.parentEmail,
        parentUsername: data.parentUsername,
        childFullName: "",
        childUsername: "",
        childEmail: "",
        childSchoolLevel: "",
        childSchoolName: "",
      });
    } catch (error: any) {
      setFormError(
        error.message || "An unexpected error occurred during child setup."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedChildUsername && generatedChildPin) {
      const textToCopy = `Child's Login Details:\nUsername: ${generatedChildUsername}\nTemporary PIN: ${generatedChildPin}\n\nInstruct your child to go to /student/complete-setup to complete their profile and set a new password.`;
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setCredentialsCopied(true);
          toast.success("Credentials copied to clipboard!");
          setTimeout(() => setCredentialsCopied(false), 2500);
        })
        .catch((err) => {
          toast.error("Failed to copy credentials.");
        });
    }
  };

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
        <p className="text-gray-700 mb-6">
          Please sign in as a parent to continue.
        </p>
        <Button
          onClick={() =>
            router.push("/sign-in?next=/sign-up/parent-child-setup")
          }
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  const handleNextStep = (nextStep: number) => {
    if (!isAnimating) {
      setIsAnimating(true);
      setAnimationDirection("forward");
      setSlideDirection("left");
      setTimeout(() => {
        setCurrentStep(nextStep);
        setSlideDirection(null);
        setTimeout(() => {
          setIsAnimating(false);
          setAnimationDirection(null);
        }, 100);
      }, 300); // Half the total animation time for slide-out
    }
  };

  const handlePreviousStep = (prevStep: number) => {
    if (!isAnimating) {
      setIsAnimating(true);
      setAnimationDirection("backward");
      setSlideDirection("right");
      setTimeout(() => {
        setCurrentStep(prevStep);
        setSlideDirection(null);
        setTimeout(() => {
          setIsAnimating(false);
          setAnimationDirection(null);
        }, 100);
      }, 300); // Half the total animation time for slide-out
    }
  };

  const handleCreateAnother = () => {
    setChildSetupCompleteThisSession(false);
    setGeneratedChildUsername(null);
    setGeneratedChildPin(null);
    setCurrentStep(1);
    setFormError(null);
    setSuccessMessage(null);
  };

  const renderSuccessState = () => {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Account Created Successfully!
          </h2>
          <p className="text-gray-600">
            Your child's account has been set up. Please share these temporary
            login details with them.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Temporary Login Details
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded border">
              <span className="text-sm font-medium text-gray-600">
                Username:
              </span>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {generatedChildUsername}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-white rounded border">
              <span className="text-sm font-medium text-gray-600">
                Temporary PIN:
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {showPin ? generatedChildPin : "••••••"}
                </span>
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCopyToClipboard}
            className="w-full"
            variant="outline"
          >
            {credentialsCopied ? "✓ Copied!" : "Copy Credentials"}
          </Button>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
          <ul className="text-sm text-blue-800 space-y-1 text-left">
            <li>1. Share the username and PIN with your child</li>
            <li>
              2. Direct them to visit{" "}
              <code className="bg-blue-100 px-1 rounded">
                /student/complete-setup
              </code>
            </li>
            <li>
              3. They'll use these credentials to log in and set up their
              permanent password
            </li>
          </ul>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={handleCreateAnother}
            variant="outline"
            className="flex-1"
          >
            Add Another Child
          </Button>
          <Button onClick={() => router.push("/parent")} className="flex-1">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4" key="step-1">
            <h2 className="text-2xl font-bold mb-4">Your Child's Full Name</h2>
            <Controller
              name="childFullName"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <input
                    {...field}
                    type="text"
                    placeholder="Enter your child's full name"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.childFullName && (
                    <p className="text-red-500 text-sm">
                      {errors.childFullName.message}
                    </p>
                  )}
                </div>
              )}
            />
            <Button
              onClick={() => handleNextStep(2)}
              className="w-full mt-4"
              disabled={!watch("childFullName")}
            >
              Next
            </Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4" key="step-2">
            <h2 className="text-2xl font-bold mb-4">Child's Email Address</h2>
            <Controller
              name="childEmail"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <input
                    {...field}
                    type="email"
                    placeholder="Enter your child's email address"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.childEmail && (
                    <p className="text-red-500 text-sm">
                      {errors.childEmail.message}
                    </p>
                  )}
                </div>
              )}
            />
            <div className="flex gap-4">
              <Button
                onClick={() => handlePreviousStep(1)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
              <Button
                onClick={() => handleNextStep(3)}
                className="w-full"
                disabled={!watch("childEmail")}
              >
                Next
              </Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4" key="step-3">
            <h2 className="text-2xl font-bold mb-4">Child's School Level</h2>
            <Controller
              name="childSchoolLevel"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <select
                    {...field}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? "" : parseInt(value, 10));
                    }}
                  >
                    <option value="">Select school level</option>
                    <option value="1">Primary 1</option>
                    <option value="2">Primary 2</option>
                    <option value="3">Primary 3</option>
                    <option value="4">Primary 4</option>
                    <option value="5">Primary 5</option>
                    <option value="6">Primary 6</option>
                  </select>
                  {errors.childSchoolLevel && (
                    <p className="text-red-500 text-sm">
                      {errors.childSchoolLevel.message}
                    </p>
                  )}
                </div>
              )}
            />
            <div className="flex gap-4">
              <Button
                onClick={() => handlePreviousStep(2)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
              <Button
                onClick={() => handleNextStep(4)}
                className="w-full"
                disabled={
                  !watch("childSchoolLevel") || watch("childSchoolLevel") === ""
                }
              >
                Next
              </Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4" key="step-4">
            <h2 className="text-2xl font-bold mb-4">
              Child's School Name (Optional)
            </h2>
            <Controller
              name="childSchoolName"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <input
                    {...field}
                    type="text"
                    placeholder="Enter your child's school name"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={field.value || ""}
                  />
                  {errors.childSchoolName && (
                    <p className="text-red-500 text-sm">
                      {errors.childSchoolName.message}
                    </p>
                  )}
                </div>
              )}
            />
            <div className="flex gap-4">
              <Button
                onClick={() => handlePreviousStep(3)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
              <Button onClick={() => handleNextStep(5)} className="w-full">
                Next
              </Button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4" key="step-5">
            <h2 className="text-2xl font-bold mb-4">Child's Username</h2>
            <Controller
              name="childUsername"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <input
                    {...field}
                    type="text"
                    placeholder="Enter your child's username"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={field.value || ""}
                  />
                  {errors.childUsername && (
                    <p className="text-red-500 text-sm">
                      {errors.childUsername.message}
                    </p>
                  )}
                </div>
              )}
            />
            <div className="flex gap-4">
              <Button
                onClick={() => handlePreviousStep(4)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit(onSubmit)}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Add these styles at the top of the file, after the imports
  const styles = `
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideLeft {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(-100%);
        opacity: 0;
      }
    }

    @keyframes slideRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes slideInLeft {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.5s ease-out;
    }

    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-out;
    }

    .animate-fade-in-up-delayed {
      animation: fadeInUp 0.5s ease-out 0.2s both;
    }

    .animate-slide-left {
      animation: slideLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .animate-slide-right {
      animation: slideRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .animate-slide-in-left {
      animation: slideInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .animate-slide-in-right {
      animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `;

  // Add this right after the styles constant
  if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    if (!document.head.querySelector("style[data-parent-child-setup]")) {
      styleSheet.setAttribute("data-parent-child-setup", "true");
      document.head.appendChild(styleSheet);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-gray-100 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                Brightly
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
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
                href="/sign-in"
                className="text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in-up">
          <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-8">
            {childSetupCompleteThisSession
              ? "Account Created!"
              : "Set Up Your Child's Account"}
          </h1>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative mb-4 animate-fade-in">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded relative mb-4 animate-fade-in">
              {successMessage}
            </div>
          )}
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 animate-fade-in-up-delayed">
            <div
              className={`${
                slideDirection === "left"
                  ? "animate-slide-left"
                  : slideDirection === "right"
                  ? "animate-slide-right"
                  : slideDirection === null &&
                    isAnimating &&
                    animationDirection === "forward"
                  ? "animate-slide-in-left"
                  : slideDirection === null &&
                    isAnimating &&
                    animationDirection === "backward"
                  ? "animate-slide-in-right"
                  : ""
              }`}
            >
              {childSetupCompleteThisSession
                ? renderSuccessState()
                : renderStep()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParentChildSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <ParentChildSetupContent />
    </Suspense>
  );
}
