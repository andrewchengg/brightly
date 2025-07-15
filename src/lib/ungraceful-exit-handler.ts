/**
 * Ungraceful Exit Handler
 *
 * Handles cases where users exit without clicking the exit button:
 * - Browser tab close
 * - Navigation away
 * - Mobile app switching
 * - Network disconnection
 */

import React from "react";

interface UngracefulExitConfig {
  sessionId: string;
  onUngracefulExit: (sessionId: string) => void;
  heartbeatInterval?: number; // Default 30 seconds
  gracePeriod?: number; // Default 5 minutes before marking as abandoned
}

export class UngracefulExitHandler {
  private sessionId: string;
  private onUngracefulExit: (sessionId: string) => void;
  private heartbeatInterval: number;
  private gracePeriod: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isActive: boolean = true;

  constructor(config: UngracefulExitConfig) {
    this.sessionId = config.sessionId;
    this.onUngracefulExit = config.onUngracefulExit;
    this.heartbeatInterval = config.heartbeatInterval || 30000; // 30 seconds
    this.gracePeriod = config.gracePeriod || 300000; // 5 minutes

    this.setupEventListeners();
    this.startHeartbeat();
  }

  private setupEventListeners(): void {
    if (typeof window === "undefined") return;

    // 1. Page unload - most reliable for desktop
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // 2. Page hide - better for mobile and modern browsers
    window.addEventListener("pagehide", this.handlePageHide);

    // 3. Visibility change - for tab switching
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // 4. Focus events - additional detection
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("focus", this.handleWindowFocus);

    // 5. Network status - for connection issues
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    // 6. User activity tracking
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) => {
      document.addEventListener(event, this.updateActivity, { passive: true });
    });
  }

  private handleBeforeUnload = (): void => {
    // Only trigger for actual page unload, not navigation
    this.triggerUngracefulExit("page_unload");
  };

  private handlePageHide = (): void => {
    // Don't immediately abandon - this could be navigation within the app
    // Use a longer timeout to distinguish between navigation and actual exit
    setTimeout(() => {
      if (this.isActive && document.hidden) {
        this.triggerUngracefulExit("page_exit");
      }
    }, 300000); // Wait 5 minutes
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      // For within-app navigation, don't abandon the session
      // Only abandon if the user is away for a very long time (15+ minutes)
      setTimeout(() => {
        if (document.hidden && this.isActive) {
          this.triggerUngracefulExit("long_absence");
        }
      }, 900000); // Wait 15 minutes instead of 1 minute
    } else {
      this.updateActivity();
    }
  };

  private handleWindowBlur = (): void => {
    // Don't trigger immediately - just log
  };

  private handleWindowFocus = (): void => {
    this.updateActivity();
  };

  private handleOffline = (): void => {
    // Mark as potentially abandoned, but don't trigger immediately
  };

  private handleOnline = (): void => {
    this.updateActivity();
    // Send heartbeat to reconnect
    this.sendHeartbeat();
  };

  private updateActivity = (): void => {
    this.lastActivity = Date.now();
  };

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  private sendHeartbeat(): void {
    if (!this.isActive) return;

    const timeSinceActivity = Date.now() - this.lastActivity;

    // If no activity for grace period, mark as abandoned
    if (timeSinceActivity > this.gracePeriod) {
      this.triggerUngracefulExit("inactivity_timeout");
      return;
    }

    // Send heartbeat to server
    fetch(`/api/practice-sessions/${this.sessionId}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastActivity: new Date(this.lastActivity).toISOString(),
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.warn("⚠️ Heartbeat failed:", error);
      // Could indicate network issues - potential ungraceful exit
    });
  }

  private triggerUngracefulExit(reason: string): void {
    if (!this.isActive) return; // Already handled

    this.isActive = false;

    // Try to notify the callback
    try {
      this.onUngracefulExit(this.sessionId);
    } catch (error) {
      console.error("❌ Error in ungraceful exit callback:", error);
    }

    // Use sendBeacon for reliability (works even during page unload)
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        sessionId: this.sessionId,
        reason,
        timestamp: new Date().toISOString(),
      });

      navigator.sendBeacon(
        `/api/practice-sessions/${this.sessionId}/abandon`,
        data
      );
    }
  }

  public destroy(): void {
    this.isActive = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Remove all event listeners
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
      window.removeEventListener("pagehide", this.handlePageHide);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
      window.removeEventListener("blur", this.handleWindowBlur);
      window.removeEventListener("focus", this.handleWindowFocus);
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);

      const activityEvents = [
        "mousedown",
        "mousemove",
        "keydown",
        "scroll",
        "touchstart",
      ];
      activityEvents.forEach((event) => {
        document.removeEventListener(event, this.updateActivity);
      });
    }
  }

  public markAsCompleted(): void {
    this.destroy();
  }
}

/**
 * Hook for using ungraceful exit detection in React components
 */
export function useUngracefulExitDetection(
  sessionId: string | null,
  isSessionActive: boolean = true
): UngracefulExitHandler | null {
  const [handler, setHandler] = React.useState<UngracefulExitHandler | null>(
    null
  );

  React.useEffect(() => {
    if (!sessionId || !isSessionActive) {
      // Clean up existing handler
      if (handler) {
        handler.destroy();
        setHandler(null);
      }
      return;
    }

    const newHandler = new UngracefulExitHandler({
      sessionId,
      onUngracefulExit: (id) => {
        // Additional client-side handling can go here
      },
    });

    setHandler(newHandler);

    return () => {
      newHandler.destroy();
    };
  }, [sessionId, isSessionActive]);

  return handler;
}
