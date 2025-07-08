import { createClient } from "@/lib/supabase/client";

export type SubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED";

export interface SubscriptionAccess {
  hasAccess: boolean;
  status: SubscriptionStatus | null;
  daysRemaining?: number;
  isTrialPeriod: boolean;
  needsPayment: boolean;
  trialEnded: boolean;
}

/**
 * Check if a parent has access to a specific subject for their students
 * Client-side version
 */
export async function checkSubjectAccess(
  parentId: string,
  subjectId: number
): Promise<SubscriptionAccess> {
  // DEVELOPMENT MODE: Always allow access
  console.log(
    `[DEV MODE] checkSubjectAccess bypassed for parent ${parentId}, subject ${subjectId}`
  );
  return {
    hasAccess: true,
    status: "ACTIVE",
    daysRemaining: 999,
    isTrialPeriod: false,
    needsPayment: false,
    trialEnded: false,
  };

  /* ORIGINAL IMPLEMENTATION - COMMENTED OUT FOR DEVELOPMENT
  const supabase = createClient();

  try {
    // Get the parent's subscription for this subject
    const { data: subscription, error } = await supabase
      .from("SubjectSubscription")
      .select(
        `
        status,
        startDate,
        endDate,
        subjectPlan:SubjectPlan!inner(*)
      `
      )
      .eq("parentId", parentId)
      .eq("subjectPlanId", subjectId)
      .single();

    if (error || !subscription) {
      // No subscription found - needs to start trial or subscribe
      return {
        hasAccess: false,
        status: null,
        isTrialPeriod: false,
        needsPayment: true,
        trialEnded: false,
      };
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const startDate = new Date(subscription.startDate);
    const daysRemaining = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isTrialPeriod = subscription.status === "TRIAL";
    const hasAccess =
      subscription.status === "ACTIVE" ||
      (subscription.status === "TRIAL" && now <= endDate);

    const trialEnded = subscription.status === "TRIAL" && now > endDate;
    const needsPayment =
      subscription.status === "EXPIRED" ||
      subscription.status === "CANCELLED" ||
      trialEnded;

    return {
      hasAccess,
      status: subscription.status as SubscriptionStatus,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      isTrialPeriod,
      needsPayment,
      trialEnded,
    };
  } catch (error) {
    console.error("Error checking subject access:", error);
    return {
      hasAccess: false,
      status: null,
      isTrialPeriod: false,
      needsPayment: true,
      trialEnded: false,
    };
  }
  */
}

/**
 * Check if a student has access to practice a specific subject
 * Uses parent's subscription status
 */
export async function checkStudentSubjectAccess(
  studentId: string,
  subjectId: number
): Promise<SubscriptionAccess> {
  // DEVELOPMENT MODE: Always allow access
  console.log(
    `[DEV MODE] checkStudentSubjectAccess bypassed for student ${studentId}, subject ${subjectId}`
  );
  return {
    hasAccess: true,
    status: "ACTIVE",
    daysRemaining: 999,
    isTrialPeriod: false,
    needsPayment: false,
    trialEnded: false,
  };

  /* ORIGINAL IMPLEMENTATION - COMMENTED OUT FOR DEVELOPMENT
  const supabase = createClient();

  try {
    // Get student's parent
    const { data: student, error: studentError } = await supabase
      .from("Student")
      .select("parentId")
      .eq("id", studentId)
      .single();

    if (studentError || !student?.parentId) {
      return {
        hasAccess: false,
        status: null,
        isTrialPeriod: false,
        needsPayment: true,
        trialEnded: false,
      };
    }

    return await checkSubjectAccess(student.parentId, subjectId);
  } catch (error) {
    console.error("Error checking student subject access:", error);
    return {
      hasAccess: false,
      status: null,
      isTrialPeriod: false,
      needsPayment: true,
      trialEnded: false,
    };
  }
  */
}

/**
 * Create a 3-day trial subscription when parent first accesses a subject
 */
export async function createTrialSubscription(
  parentId: string,
  subjectPlanId: number
): Promise<{ success: boolean; error?: string }> {
  // DEVELOPMENT MODE: Always return success without creating subscription
  console.log(
    `[DEV MODE] createTrialSubscription bypassed for parent ${parentId}, subject plan ${subjectPlanId}`
  );
  return { success: true };

  /* ORIGINAL IMPLEMENTATION - COMMENTED OUT FOR DEVELOPMENT
  const supabase = createClient();

  try {
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

    const { error } = await supabase.from("SubjectSubscription").insert({
      parentId,
      subjectPlanId,
      studentIds: [], // Will be populated when students are assigned
      status: "TRIAL",
      startDate: now.toISOString(),
      endDate: trialEndDate.toISOString(),
    });

    if (error) {
      console.error("Error creating trial subscription:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating trial subscription:", error);
    return { success: false, error: "Failed to create trial subscription" };
  }
  */
}
