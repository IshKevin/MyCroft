// ============================================================================
// CORE DATA MODELS FOR MYCROFT 2.0
// ============================================================================

export interface Activity {
  id: string;
  date: string;
  time: string;
  activity: string;
  category: string;
  mood: string;
  tags: string[];
  projectId?: string;
  duration?: number; // in minutes
  timeTracked?: TimeSession;
  githubData?: GitHubActivityData;
  energy?: EnergyLevel;
  focusScore?: number; // 1-10
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  goals: ProjectGoal[];
  milestones: Milestone[];
  repositories?: string[];
  totalTime: number;
  totalActivities: number;
  completionPercentage: number;
}

export interface TimeSession {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  type: SessionType;
  projectId?: string;
  activityId?: string;
  isActive: boolean;
  breaks: Break[];
  focusScore: number;
  interruptions: number;
}

export interface Break {
  startTime: string;
  endTime: string;
  duration: number;
  type: BreakType;
}



export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockedAt?: string;
  progress: number; // 0-100
  requirements: AchievementRequirement[];
  xpReward: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  level: number;
  xp: number;
  totalActivities: number;
  totalTime: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  preferences: UserPreferences;
  stats: UserStats;
  joinedAt: string;
}



export interface GitHubActivityData {
  commitHash?: string;
  pullRequestNumber?: number;
  issueNumber?: number;
  repository: string;
  branch?: string;
  linesAdded?: number;
  linesDeleted?: number;
  filesChanged?: number;
  commitMessage?: string;
}

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type ProjectStatus = 'active' | 'completed' | 'paused' | 'archived';
export type SessionType = 'pomodoro' | 'short-focus' | 'deep-work' | 'extended-focus' | 'custom' | 'regular' | 'break';
export type BreakType = 'short' | 'long' | 'lunch' | 'meeting';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type AchievementCategory = 'productivity' | 'consistency' | 'learning' | 'milestone';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type NotificationType = 'achievement' | 'reminder' | 'goal' | 'milestone';

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

export interface ProjectGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string; // 'activities', 'hours', 'commits', etc.
  deadline?: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  completedAt?: string;
  progress: number; // 0-100
  tasks: MilestoneTask[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MilestoneTask {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface AchievementRequirement {
  type: 'activity_count' | 'streak' | 'time' | 'project_completion' | 'collaboration';
  value: number;
  timeframe?: string; // 'daily', 'weekly', 'monthly', 'all-time'
}

export interface UserPreferences {
  theme: 'auto' | 'light' | 'dark' | 'neon';
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
}

export interface NotificationSettings {
  enabled: boolean;
  achievements: boolean;
  reminders: boolean;
  goalProgress: boolean;
  pomodoroAlerts: boolean;
}

export interface DashboardSettings {
  widgets: DashboardWidget[];
  layout: 'grid' | 'list';
  refreshInterval: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings: Record<string, any>;
  isVisible: boolean;
}

export type WidgetType =
  | 'activity-feed'
  | 'time-tracker'
  | 'goals-progress'
  | 'achievements'
  | 'productivity-chart'
  | 'focus-timer'
  | 'github-stats'
  | 'mood-tracker'
  | 'project-overview';

export interface UserStats {
  totalActivities: number;
  totalTime: number; // in minutes
  averageSessionLength: number;
  mostProductiveHour: number;
  mostProductiveDay: string;
  focusScore: number;
  collaborationScore: number;
  consistencyScore: number;
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
}

export interface WeeklyStats {
  weekStart: string;
  activities: number;
  time: number;
  focusScore: number;
  achievements: number;
}

export interface MonthlyStats {
  month: string;
  activities: number;
  time: number;
  projects: number;
  achievements: number;
  averageMood: number;
}



export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// WEBVIEW DATA INTERFACES
// ============================================================================

export interface WebviewTemplateData {
  activities: Activity[];
  projects: Project[];
  currentProject?: Project;
  user: UserProfile;
  dailyGoal: number;
  currentStreak: number;
  totalShips: number;
  longestStreak: number;
  todayCount: number;
  activeSession?: TimeSession;
  achievements: Achievement[];
  notifications: Notification[];
}