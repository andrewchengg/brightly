"use client";

import React from "react";
import SubscriptionGate from "@/components/SubscriptionGate";

/**
 * Higher-order component to wrap any feature with subscription access control
 */
export function withSubscription<P extends object>(
  Component: React.ComponentType<P>,
  subjectId: number,
  subjectName: string,
  showTrialInfo = true
) {
  return function WrappedComponent(props: P) {
    return (
      <SubscriptionGate
        subjectId={subjectId}
        subjectName={subjectName}
        showTrialInfo={showTrialInfo}
      >
        <Component {...props} />
      </SubscriptionGate>
    );
  };
}

/**
 * Hook to check subscription access and provide status information
 */
export {
  checkStudentSubjectAccess,
  checkSubjectAccess,
} from "./subscription-access";
