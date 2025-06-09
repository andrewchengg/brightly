/**
 * XP and Level Calculation Utilities
 *
 * This module provides utility functions for calculating levels, XP progression,
 * and related metrics based on a 1000 XP per level system.
 */

/**
 * Calculate the current level based on XP points
 * @param xp - Current XP points
 * @returns Current level (starts at 1)
 */
export const calculateLevel = (xp: number): number => {
  return Math.floor(xp / 1000) + 1;
};

/**
 * Calculate the XP required to reach a specific level
 * @param level - Target level
 * @returns XP required to reach the level
 */
export const calculateLevelXP = (level: number): number => {
  return (level - 1) * 1000;
};

/**
 * Calculate the XP required to reach the next level from current level
 * @param level - Current level
 * @returns XP required to reach the next level
 */
export const calculateNextLevelXP = (level: number): number => {
  return level * 1000;
};

/**
 * Calculate progress percentage to the next level
 * @param currentXP - Current XP points
 * @returns Progress percentage (0-100)
 */
export const calculateProgressToNextLevel = (currentXP: number): number => {
  const currentLevel = calculateLevel(currentXP);
  const currentLevelXP = calculateLevelXP(currentLevel);
  const nextLevelXP = calculateNextLevelXP(currentLevel);

  if (nextLevelXP === currentLevelXP) return 100; // Edge case for max level

  const progress =
    ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.max(0, Math.min(100, progress));
};

/**
 * Calculate XP needed to reach the next level
 * @param currentXP - Current XP points
 * @returns XP needed for next level
 */
export const calculateXPToNextLevel = (currentXP: number): number => {
  const currentLevel = calculateLevel(currentXP);
  const nextLevelXP = calculateNextLevelXP(currentLevel);
  return Math.max(0, nextLevelXP - currentXP);
};

/**
 * Check if a user has leveled up based on old and new XP
 * @param oldXP - Previous XP amount
 * @param newXP - New XP amount
 * @returns Object with levelUp status and new level if applicable
 */
export const checkLevelUp = (
  oldXP: number,
  newXP: number
): { leveledUp: boolean; newLevel?: number; oldLevel?: number } => {
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);

  if (newLevel > oldLevel) {
    return {
      leveledUp: true,
      newLevel,
      oldLevel,
    };
  }

  return {
    leveledUp: false,
  };
};

/**
 * Get level information for display purposes
 * @param currentXP - Current XP points
 * @returns Object with level information
 */
export const getLevelInfo = (currentXP: number) => {
  const currentLevel = calculateLevel(currentXP);
  const currentLevelXP = calculateLevelXP(currentLevel);
  const nextLevelXP = calculateNextLevelXP(currentLevel);
  const progressToNextLevel = calculateProgressToNextLevel(currentXP);
  const xpToNextLevel = calculateXPToNextLevel(currentXP);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForCurrentLevel = nextLevelXP - currentLevelXP;

  return {
    currentLevel,
    currentLevelXP,
    nextLevelXP,
    progressToNextLevel,
    xpToNextLevel,
    xpInCurrentLevel,
    xpNeededForCurrentLevel,
    totalXP: currentXP,
  };
};
