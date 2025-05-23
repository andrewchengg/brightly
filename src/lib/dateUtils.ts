// src/lib/dateUtils.ts
export function getCurrentChallengeWeekStartDate(): Date {
    const now = new Date();
    
    // Get current UTC day (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
    const currentDayUTC = now.getUTCDay();
    const currentHourUTC = now.getUTCHours();
  
    // Calculate the date of the current week's Monday in UTC
    const daysToSubtractForMonday = (currentDayUTC === 0) ? 6 : (currentDayUTC - 1);
    
    const currentWeekMonday = new Date(now); // Start with current date/time
    // Set to the beginning of the current UTC day
    currentWeekMonday.setUTCHours(0, 0, 0, 0); 
    // Go back to Monday of this week
    currentWeekMonday.setUTCDate(currentWeekMonday.getUTCDate() - daysToSubtractForMonday); 
    // Set time to 8 PM UTC
    currentWeekMonday.setUTCHours(20, 0, 0, 0); 
  
    // If "now" is before this week's Monday 8 PM UTC challenge start time,
    // then the current challenge week actually started the *previous* Monday.
    if (now < currentWeekMonday) {
      // Go back 7 days to get the start of the *actual* current challenge week
      currentWeekMonday.setUTCDate(currentWeekMonday.getUTCDate() - 7);
    }
    
    return currentWeekMonday;
  }