"use client";

import React from "react";

interface SubscriptionGateProps {
  subjectId: number;
  subjectName: string;
  children: React.ReactNode;
  showTrialInfo?: boolean;
}

export function SubscriptionGate({
  subjectId,
  subjectName,
  children,
  showTrialInfo = true,
}: SubscriptionGateProps) {
  // DEVELOPMENT MODE: Always allow access, bypass all subscription checks
  console.log(
    `[DEV MODE] SubscriptionGate bypassed for subject ${subjectName} (ID: ${subjectId})`
  );

  return <>{children}</>;
}

export default SubscriptionGate;
