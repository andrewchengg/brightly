// Quest refresh utilities for updating quest progress in real-time

/**
 * Triggers a quest refresh event that the QuestContext will listen for
 * Call this after practice sessions are completed to update quest progress immediately
 */
export function triggerQuestRefresh() {
  console.log("🎯 Triggering quest refresh after practice session completion");

  const event = new CustomEvent("practiceSessionCompleted");
  window.dispatchEvent(event);
}

/**
 * Triggers quest refresh after a short delay (useful for ensuring backend updates are complete)
 */
export function triggerQuestRefreshDelayed(delayMs: number = 1000) {
  setTimeout(() => {
    triggerQuestRefresh();
  }, delayMs);
}
