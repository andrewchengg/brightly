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
 * Graceful session exit (for user-initiated exits only)
 * Note: This should only be called for explicit user actions like clicking "Exit" button
 * For normal navigation, sessions should remain IN_PROGRESS for resumption
 */
export async function gracefulSessionExit(
  sessionId: string,
  localStorageKey?: string,
  forceAbandon: boolean = false
): Promise<void> {
  try {
    // First check the current session status to avoid overriding completed sessions
    const statusResponse = await fetch(`/api/practice-sessions/${sessionId}`);
    if (statusResponse.ok) {
      const sessionData = await statusResponse.json();

      // Don't mark as abandoned if already completed OR has completion data
      if (
        sessionData.status === "COMPLETED" ||
        (sessionData.endTime &&
          sessionData.totalMarksEarned !== null &&
          sessionData.correctAnswers !== null)
      ) {
        if (localStorageKey) {
          cleanupLocalStorage(localStorageKey);
        }
        return;
      }
    }

    // Only mark as ABANDONED if explicitly forced (e.g., user clicked "Exit" button)
    // For normal navigation, let sessions remain IN_PROGRESS for resumption
    if (forceAbandon) {
      await fetch(`/api/practice-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ABANDONED",
          endTime: new Date().toISOString(),
        }),
      });
    } else {
      // Don't change the session status - let user resume it later
      // Just update the last activity time
      await fetch(`/api/practice-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastActivity: new Date().toISOString(),
        }),
      });
    }

    // Clean up localStorage
    if (localStorageKey) {
      cleanupLocalStorage(localStorageKey);
    }
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
