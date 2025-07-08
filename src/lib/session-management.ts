/**
 * Session Management Utilities
 * Provides basic session utilities for practice components
 */

export interface SessionCleanupOptions {
  sessionId?: string;
  studentId?: string;
  localStorageKey?: string;
}

/**
 * Clean up localStorage only (no session abandonment)
 */
export async function cleanupLocalStorage(
  options: SessionCleanupOptions
): Promise<boolean> {
  const { localStorageKey } = options;

  console.log("🧹 DEBUG: cleanupLocalStorage called with:", options);

  let success = false;

  // Clean up localStorage only
  if (localStorageKey) {
    try {
      console.log(`🧹 DEBUG: Removing localStorage key: ${localStorageKey}`);
      localStorage.removeItem(localStorageKey);
      console.log(
        `✅ DEBUG: Successfully cleared localStorage: ${localStorageKey}`
      );
      success = true;
    } catch (error) {
      console.warn(`❌ DEBUG: Failed to clear localStorage:`, error);
    }
  } else {
    console.warn("⚠️ DEBUG: No localStorage key provided for cleanup");
  }

  console.log("🧹 DEBUG: cleanupLocalStorage result:", success);
  return success;
}

/**
 * Properly cleanup a practice session when exiting
 * This includes both localStorage cleanup and session deletion/abandonment
 */
export async function cleanupPracticeSession(
  options: SessionCleanupOptions
): Promise<boolean> {
  const { sessionId, localStorageKey } = options;

  console.log("🧹 DEBUG: cleanupPracticeSession called with:", options);

  let localStorageCleared = false;
  let sessionDeleted = false;

  // First clean up localStorage
  if (localStorageKey) {
    console.log(
      `🧹 DEBUG: Attempting to clear localStorage: ${localStorageKey}`
    );
    try {
      localStorage.removeItem(localStorageKey);
      console.log(
        `✅ DEBUG: Successfully cleared localStorage: ${localStorageKey}`
      );
      localStorageCleared = true;
    } catch (error) {
      console.warn(`❌ DEBUG: Failed to clear localStorage:`, error);
    }
  } else {
    console.warn("⚠️ DEBUG: No localStorage key provided for cleanup");
  }

  // Then delete the session from database (fire and forget)
  if (sessionId) {
    console.log(`🗑️ DEBUG: Attempting to delete session: ${sessionId}`);
    try {
      const response = await fetch(`/api/practice-sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log(
          `✅ DEBUG: Successfully deleted practice session: ${sessionId}`
        );
        sessionDeleted = true;
      } else {
        console.warn(
          `❌ DEBUG: Failed to delete session - Status: ${response.status} ${response.statusText}`
        );
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(`❌ DEBUG: Delete session error response:`, errorText);
      }
    } catch (error) {
      console.warn(
        `❌ DEBUG: Failed to delete practice session ${sessionId}:`,
        error
      );
      // Don't throw error since user is exiting anyway
    }
  } else {
    console.warn("⚠️ DEBUG: No session ID provided for deletion");
  }

  const overallSuccess = localStorageCleared || sessionDeleted;

  console.log("🧹 DEBUG: cleanupPracticeSession results:", {
    localStorageCleared,
    sessionDeleted,
    overallSuccess,
  });

  return overallSuccess;
}

/**
 * Check if a session has been inactive for a long time
 */
export function isSessionStale(
  startTime: Date,
  timeoutHours: number = 24
): boolean {
  const now = new Date();
  const hoursSinceStart =
    (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  return hoursSinceStart > timeoutHours;
}
