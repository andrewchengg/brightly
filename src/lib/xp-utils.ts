/**
 * XP and Level Calculation Utilities
 *
 * This module provides utility functions for calculating levels, XP progression,
 * and related metrics based on a logarithmic XP scaling system.
 * Early levels are easy to achieve, but later levels require exponentially more XP.
 */

// Base configuration for the logarithmic XP system
const XP_BASE = 100; // Starting XP requirement for level 2
const XP_MULTIPLIER = 1.5; // Exponential growth factor
const XP_OFFSET = 50; // Additional XP added per level for smoother progression

/**
 * Calculate the XP required to reach a specific level using logarithmic scaling
 * Formula: XP = XP_BASE * (XP_MULTIPLIER ^ (level - 1)) + XP_OFFSET * (level - 1)
 * @param level - Target level
 * @returns XP required to reach the level
 */
export const calculateLevelXP = (level: number): number => {
  if (level <= 1) return 0;
  
  // Early levels (1-3): Very easy
  if (level === 2) return 50;
  if (level === 3) return 120;
  if (level === 4) return 220;
  if (level === 5) return 350;
  
  // Use exponential formula for higher levels
  const exponentialPart = XP_BASE * Math.pow(XP_MULTIPLIER, level - 6);
  const linearPart = XP_OFFSET * (level - 1);
  
  return Math.floor(exponentialPart + linearPart + 350); // +350 is cumulative XP from levels 1-5
};

/**
 * Calculate the current level based on XP points using binary search for efficiency
 * @param xp - Current XP points
 * @returns Current level (starts at 1)
 */
export const calculateLevel = (xp: number): number => {
  if (xp < 0) return 1;
  
  // Handle early levels efficiently
  if (xp < 50) return 1;
  if (xp < 120) return 2;
  if (xp < 220) return 3;
  if (xp < 350) return 4;
  
  // Binary search for higher levels
  let low = 5;
  let high = 100; // Reasonable upper bound
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const xpRequired = calculateLevelXP(mid);
    const nextLevelXP = calculateLevelXP(mid + 1);
    
    if (xp >= xpRequired && xp < nextLevelXP) {
      return mid;
    } else if (xp < xpRequired) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  
  return low;
};

/**
 * Calculate the XP required to reach the next level from current level
 * @param level - Current level
 * @returns XP required to reach the next level
 */
export const calculateNextLevelXP = (level: number): number => {
  return calculateLevelXP(level + 1);
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
 * Get the XP gain required to advance from one level to the next
 * @param fromLevel - Starting level
 * @returns XP needed to advance one level
 */
export const getXPGainForLevel = (fromLevel: number): number => {
  const currentLevelXP = calculateLevelXP(fromLevel);
  const nextLevelXP = calculateLevelXP(fromLevel + 1);
  return nextLevelXP - currentLevelXP;
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
    xpGainForThisLevel: getXPGainForLevel(currentLevel),
  };
};
