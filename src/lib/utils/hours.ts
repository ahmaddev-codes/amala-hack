/**
 * Utility functions for handling opening hours and determining if a location is open
 */

export interface DayHours {
  open: string; // Format: "HH:MM"
  close: string; // Format: "HH:MM"
  isOpen: boolean;
}

export interface WeeklyHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

/**
 * Get the current day of the week as a lowercase string
 */
export function getCurrentDay(): keyof WeeklyHours {
  const days: (keyof WeeklyHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  return days[new Date().getDay()];
}

/**
 * Convert time string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current time in minutes since midnight
 */
export function getCurrentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Check if a location is currently open based on its hours
 */
export function isLocationOpen(hours: WeeklyHours): boolean {
  const currentDay = getCurrentDay();
  const todayHours = hours[currentDay];
  
  // If the location is marked as closed for today
  if (!todayHours.isOpen) {
    return false;
  }
  
  const currentTime = getCurrentTimeInMinutes();
  const openTime = timeToMinutes(todayHours.open);
  const closeTime = timeToMinutes(todayHours.close);
  
  // Handle overnight hours (e.g., open until 2 AM next day)
  if (closeTime < openTime) {
    // Location is open overnight
    return currentTime >= openTime || currentTime <= closeTime;
  } else {
    // Normal hours within the same day
    return currentTime >= openTime && currentTime <= closeTime;
  }
}

/**
 * Get a human-readable status for the location
 */
export function getLocationStatus(hours: WeeklyHours): {
  isOpen: boolean;
  status: string;
  nextChange?: string;
} {
  const isOpen = isLocationOpen(hours);
  const currentDay = getCurrentDay();
  const todayHours = hours[currentDay];
  
  if (!todayHours.isOpen) {
    return {
      isOpen: false,
      status: 'Closed today',
    };
  }
  
  const currentTime = getCurrentTimeInMinutes();
  const openTime = timeToMinutes(todayHours.open);
  const closeTime = timeToMinutes(todayHours.close);
  
  if (isOpen) {
    // Location is currently open
    if (closeTime < openTime) {
      // Overnight hours
      if (currentTime >= openTime) {
        // Still open from today, closes tomorrow
        return {
          isOpen: true,
          status: `Open until ${todayHours.close} tomorrow`,
          nextChange: todayHours.close,
        };
      } else {
        // Open from yesterday, closes today
        return {
          isOpen: true,
          status: `Open until ${todayHours.close}`,
          nextChange: todayHours.close,
        };
      }
    } else {
      // Normal hours
      return {
        isOpen: true,
        status: `Open until ${todayHours.close}`,
        nextChange: todayHours.close,
      };
    }
  } else {
    // Location is currently closed
    if (currentTime < openTime) {
      // Closed, opens later today
      return {
        isOpen: false,
        status: `Opens at ${todayHours.open}`,
        nextChange: todayHours.open,
      };
    } else {
      // Closed for the day, find next opening
      const tomorrow = getNextDay(currentDay);
      const tomorrowHours = hours[tomorrow];
      
      if (tomorrowHours.isOpen) {
        return {
          isOpen: false,
          status: `Opens ${tomorrow} at ${tomorrowHours.open}`,
          nextChange: tomorrowHours.open,
        };
      } else {
        return {
          isOpen: false,
          status: 'Closed',
        };
      }
    }
  }
}

/**
 * Get the next day of the week
 */
function getNextDay(currentDay: keyof WeeklyHours): keyof WeeklyHours {
  const days: (keyof WeeklyHours)[] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  const currentIndex = days.indexOf(currentDay);
  const nextIndex = (currentIndex + 1) % 7;
  return days[nextIndex];
}

/**
 * Format hours for display
 */
export function formatHoursForDisplay(hours: WeeklyHours): string[] {
  const days: (keyof WeeklyHours)[] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];
  
  return days.map(day => {
    const dayHours = hours[day];
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    
    if (!dayHours.isOpen) {
      return `${dayName}: Closed`;
    }
    
    return `${dayName}: ${dayHours.open} - ${dayHours.close}`;
  });
}

/**
 * Create default hours (closed all days)
 */
export function createDefaultHours(): WeeklyHours {
  const defaultDay: DayHours = {
    open: "09:00",
    close: "21:00",
    isOpen: false
  };
  
  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay },
    sunday: { ...defaultDay },
  };
}
