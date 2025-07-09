/**
 * Simplified Session Management v2
 *
 * This approach removes complex client-side cleanup logic and relies on:
 * 1. Server-side cleanup for orphaned sessions
 * 2. Clear session state boundaries
 * 3. Minimal client-side intervention
 */

import { useEffect } from "react";

export enum SessionState {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ABANDONED = "ABANDONED", // For server-side cleanup
}

export interface SessionLifecycle {
  sessionId: string;
  state: SessionState;
  lastActivity: Date;
  localStorageKey?: string;
}

/**
 * Mark session as completed (no deletion!)
 */
export async function markSessionCompleted(
  sessionId: string
): Promise<boolean> {
  try {
    const response = await fetch(`/api/practice-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETED",
        endTime: new Date().toISOString(),
      }),
    });

    console.log(`✅ Session ${sessionId} marked as COMPLETED`);
    return response.ok;
  } catch (error) {
    console.error(
      `❌ Failed to mark session ${sessionId} as completed:`,
      error
    );
    return false;
  }
}

/**
 * Clean up localStorage only (let server handle DB cleanup)
 */
export function cleanupLocalStorage(localStorageKey: string): void {
  try {
    localStorage.removeItem(localStorageKey);
    console.log(`🧹 Cleaned up localStorage: ${localStorageKey}`);
  } catch (error) {
    console.error(`❌ Failed to cleanup localStorage:`, error);
  }
}

/**
 * Update session activity (heartbeat)
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    // Simple heartbeat - just update lastActivity
    await fetch(`/api/practice-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastActivity: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Fail silently - heartbeat is not critical
    console.warn(`⚠️ Failed to update session activity:`, error);
  }
}

/**
 * Graceful session exit (for user-initiated exits)
 */
export async function gracefulSessionExit(
  sessionId: string,
  localStorageKey?: string
): Promise<void> {
  try {
    console.log(
      `🔍 DEBUG: gracefulSessionExit called for session ${sessionId}`
    );

    // First check the current session status to avoid overriding completed sessions
    const statusResponse = await fetch(`/api/practice-sessions/${sessionId}`);
    if (statusResponse.ok) {
      const sessionData = await statusResponse.json();
      console.log(`🔍 DEBUG: Current session status is ${sessionData.status}`);

      // Don't mark as abandoned if already completed OR has completion data
      if (
        sessionData.status === "COMPLETED" ||
        (sessionData.endTime &&
          sessionData.totalMarksEarned !== null &&
          sessionData.correctAnswers !== null)
      ) {
        console.log(
          `✅ Session ${sessionId} already completed (status: ${
            sessionData.status
          }, hasCompletionData: ${!!(
            sessionData.endTime && sessionData.totalMarksEarned !== null
          )}) - skipping abandon`
        );
        if (localStorageKey) {
          cleanupLocalStorage(localStorageKey);
        }
        return;
      }
    } else {
      console.warn(
        `⚠️ DEBUG: Failed to fetch session status: ${statusResponse.status} ${statusResponse.statusText}`
      );
    }

    console.log(`🚪 DEBUG: Marking session ${sessionId} as ABANDONED`);
    // Mark as abandoned (server will clean up later)
    await fetch(`/api/practice-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ABANDONED",
        endTime: new Date().toISOString(),
      }),
    });

    // Clean up localStorage
    if (localStorageKey) {
      cleanupLocalStorage(localStorageKey);
    }

    console.log(`🚪 Session ${sessionId} gracefully exited`);
  } catch (error) {
    console.error(`❌ Failed graceful exit for session ${sessionId}:`, error);
    // Still clean up localStorage even if API fails
    if (localStorageKey) {
      cleanupLocalStorage(localStorageKey);
    }
  }
}

/**
 * Session heartbeat hook for active sessions
 */
export function useSessionHeartbeat(
  sessionId: string | null,
  intervalMs: number = 30000 // 30 seconds
): void {
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;

    const interval = setInterval(() => {
      updateSessionActivity(sessionId);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [sessionId, intervalMs]);
}

/**
 * Simple session completion (the main fix)
 */
export async function completeSession(
  sessionId: string,
  localStorageKey?: string,
  sessionData?: {
    score?: number;
    correctAnswers?: number;
    totalQuestions?: number;
    xpEarned?: number;
  }
): Promise<boolean> {
  try {
    // Mark as completed with session data
    const response = await fetch(`/api/practice-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETED",
        endTime: new Date().toISOString(),
        ...sessionData,
      }),
    });

    if (response.ok) {
      console.log(`✅ Session ${sessionId} completed successfully`);

      // Clean up localStorage
      if (localStorageKey) {
        cleanupLocalStorage(localStorageKey);
      }

      return true;
    }

    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error(`❌ Failed to complete session ${sessionId}:`, error);
    return false;
  }
}
