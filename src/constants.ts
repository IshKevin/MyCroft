// ============================================================================
// MYCROFT 2.0 CONSTANTS
// ============================================================================

export const REPO_NAME = 'mycroft-activity-repo'; // Production repo
//export const REPO_NAME = 'mycroft-logbook'; // Development repo

export const DEFAULT_DAILY_GOAL = 5;
export const DEFAULT_POMODORO_LENGTH = 25; // minutes
export const DEFAULT_BREAK_LENGTH = 5; // minutes
export const DEFAULT_LONG_BREAK_LENGTH = 15; // minutes
export const DEFAULT_DEEP_WORK_LENGTH = 90; // minutes
export const DEFAULT_EXTENDED_FOCUS_LENGTH = 240; // minutes (4 hours)

// Predefined focus session options
export const FOCUS_SESSION_PRESETS = {
  POMODORO: { duration: 25, name: 'Pomodoro', icon: '🍅', description: '25 min focused work' },
  SHORT_FOCUS: { duration: 45, name: 'Short Focus', icon: '⚡', description: '45 min concentrated work' },
  DEEP_WORK: { duration: 90, name: 'Deep Work', icon: '🧠', description: '90 min intensive focus' },
  EXTENDED_FOCUS: { duration: 240, name: 'Extended Focus', icon: '🎯', description: '4 hour marathon session' },
  CUSTOM: { duration: 0, name: 'Custom', icon: '⚙️', description: 'Set your own duration' }
} as const;

// ============================================================================
// ACTIVITY CATEGORIES
// ============================================================================

export const CATEGORIES = [
  'Coding',
  'Documentation',
  'Bug Fix',
  'Feature',
  'Code Review',
  'Testing',
  'Debugging',
  'Refactoring',
  'Planning',
  'Learning',
  'Meeting',
  'Deployment',
  'Research',
  'Other'
] as const;

export const MOODS = [
  '🚀 Excited',
  '😊 Happy',
  '🤔 Focused',
  '😐 Neutral',
  '😴 Tired',
  '😤 Frustrated',
  '🔥 Motivated',
  '🧘 Calm',
  '⚡ Energetic'
] as const;

// ============================================================================
// PROJECT COLORS
// ============================================================================

export const PROJECT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
] as const;

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export const ACHIEVEMENTS = {
  FIRST_ACTIVITY: {
    id: 'first_activity',
    name: 'Getting Started',
    description: 'Log your first activity',
    icon: '🎯',
    category: 'milestone' as const,
    rarity: 'common' as const,
    xpReward: 10
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    category: 'consistency' as const,
    rarity: 'rare' as const,
    xpReward: 50
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    category: 'consistency' as const,
    rarity: 'epic' as const,
    xpReward: 200
  },
  POMODORO_MASTER: {
    id: 'pomodoro_master',
    name: 'Pomodoro Master',
    description: 'Complete 100 Pomodoro sessions',
    icon: '🍅',
    category: 'productivity' as const,
    rarity: 'rare' as const,
    xpReward: 100
  },
  CODE_REVIEWER: {
    id: 'code_reviewer',
    name: 'Code Reviewer',
    description: 'Complete 50 code reviews',
    icon: '👀',
    category: 'productivity' as const,
    rarity: 'rare' as const,
    xpReward: 75
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Code after midnight 10 times',
    icon: '🦉',
    category: 'productivity' as const,
    rarity: 'common' as const,
    xpReward: 25
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Code before 6 AM 10 times',
    icon: '🐦',
    category: 'productivity' as const,
    rarity: 'common' as const,
    xpReward: 25
  },
  DEEP_FOCUS: {
    id: 'deep_focus',
    name: 'Deep Focus',
    description: 'Complete a 2-hour deep work session',
    icon: '🧠',
    category: 'productivity' as const,
    rarity: 'epic' as const,
    xpReward: 150
  }
} as const;

// ============================================================================
// XP AND LEVELING
// ============================================================================

export const XP_PER_ACTIVITY = 5;
export const XP_PER_MINUTE = 0.5;
export const XP_BONUS_STREAK = 2; // bonus XP per day of streak
export const XP_BONUS_GOAL_COMPLETION = 20;

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450
];

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export const NOTIFICATION_TYPES = {
  ACHIEVEMENT_UNLOCKED: 'achievement',
  GOAL_COMPLETED: 'goal',
  STREAK_MILESTONE: 'streak',
  POMODORO_COMPLETE: 'timer',
  BREAK_REMINDER: 'reminder'
} as const;



// ============================================================================
// CHART COLORS AND THEMES
// ============================================================================

export const CHART_COLORS = {
  PRIMARY: '#007ACC',
  SECONDARY: '#4ECDC4',
  SUCCESS: '#28A745',
  WARNING: '#FFC107',
  DANGER: '#DC3545',
  INFO: '#17A2B8',
  GRADIENT: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
} as const;

// ============================================================================
// TIME TRACKING SETTINGS
// ============================================================================

export const TIME_TRACKING = {
  IDLE_THRESHOLD: 300, // 5 minutes in seconds
  AUTO_PAUSE_THRESHOLD: 600, // 10 minutes in seconds
  MIN_SESSION_LENGTH: 60, // 1 minute in seconds
  MAX_SESSION_LENGTH: 480 // 8 hours in minutes
} as const;