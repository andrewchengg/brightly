/**
 * Example: How to use Ungraceful Exit Detection in Practice Components
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUngracefulExitDetection } from "./ungraceful-exit-handler";

export function PracticeComponentExample() {
  const router = useRouter();
  const [currentPracticeSessionId, setCurrentPracticeSessionId] = useState<
    string | null
  >(null);
  const [sessionFinalized, setSessionFinalized] = useState(false);

  // ✅ NEW: Simple ungraceful exit detection
  const exitHandler = useUngracefulExitDetection(
    currentPracticeSessionId,
    !sessionFinalized // Only active if session not finalized
  );

  // ✅ NEW: Simple completion handler
  const handleCompleteSession = async () => {
    if (!currentPracticeSessionId) return;

    try {
      // Mark session as completed
      const response = await fetch(
        `/api/practice-sessions/${currentPracticeSessionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            endTime: new Date().toISOString(),
            score: 85,
            correctAnswers: 17,
            totalQuestions: 20,
          }),
        }
      );

      if (response.ok) {
        setSessionFinalized(true);
        // Stop ungraceful exit detection
        exitHandler?.markAsCompleted();

        console.log("✅ Session completed successfully");
      }
    } catch (error) {
      console.error("❌ Failed to complete session:", error);
    }
  };

  // ✅ NEW: Simple exit handler
  const handleExitConfirm = async () => {
    if (!currentPracticeSessionId) return;

    if (sessionFinalized) {
      // Session already completed, just navigate
      router.push("/student/practice");
    } else {
      // Session not completed - mark as abandoned
      try {
        await fetch(
          `/api/practice-sessions/${currentPracticeSessionId}/abandon`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "user_exit_button",
              timestamp: new Date().toISOString(),
            }),
          }
        );
      } catch (error) {
        console.warn("⚠️ Failed to mark session as abandoned:", error);
      }

      setSessionFinalized(true);
      exitHandler?.destroy();
      router.push("/student/practice");
    }
  };

  return (
    <div>
      <button onClick={handleCompleteSession}>Complete Session</button>
      <button onClick={handleExitConfirm}>Exit Practice</button>
    </div>
  );
}
