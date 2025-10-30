import * as vscode from 'vscode';
import { Achievement, Activity, UserProfile, TimeSession } from '../types';
import { ACHIEVEMENTS, XP_PER_ACTIVITY, XP_PER_MINUTE, XP_BONUS_STREAK, LEVEL_THRESHOLDS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Achievement Service for MyCroft 2.0
 * Handles gamification, achievements, XP, and leveling system
 */
export class AchievementService {
  private static instance: AchievementService;
  private readonly context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService(context);
    }
    return AchievementService.instance;
  }

  /**
   * Check for new achievements based on activity
   */
  public async checkAchievements(activities: Activity[], sessions: TimeSession[]): Promise<Achievement[]> {
    const userProfile = await this.getUserProfile();
    const newAchievements: Achievement[] = [];

    // Check each achievement
    for (const [key, achievementTemplate] of Object.entries(ACHIEVEMENTS)) {
      const existingAchievement = userProfile.achievements.find(a => a.id === achievementTemplate.id);
      
      if (!existingAchievement) {
        const achievement = await this.evaluateAchievement(achievementTemplate, activities, sessions, userProfile);
        if (achievement && achievement.progress >= 100) {
          achievement.unlockedAt = new Date().toISOString();
          newAchievements.push(achievement);
          
          // Award XP
          await this.awardXP(achievement.xpReward);
          
          // Show notification
          this.showAchievementNotification(achievement);
        }
      }
    }

    // Update user profile with new achievements
    if (newAchievements.length > 0) {
      userProfile.achievements.push(...newAchievements);
      await this.updateUserProfile(userProfile);
    }

    return newAchievements;
  }

  /**
   * Award XP to user
   */
  public async awardXP(amount: number): Promise<{ levelUp: boolean; newLevel: number }> {
    const userProfile = await this.getUserProfile();
    const oldLevel = userProfile.level;
    
    userProfile.xp += amount;
    userProfile.level = this.calculateLevel(userProfile.xp);
    
    await this.updateUserProfile(userProfile);
    
    const levelUp = userProfile.level > oldLevel;
    if (levelUp) {
      this.showLevelUpNotification(userProfile.level);
    }

    return { levelUp, newLevel: userProfile.level };
  }

  /**
   * Calculate XP for activity
   */
  public calculateActivityXP(activity: Activity, currentStreak: number): number {
    let xp = XP_PER_ACTIVITY;
    
    // Time bonus
    if (activity.duration) {
      xp += activity.duration * XP_PER_MINUTE;
    }
    
    // Streak bonus
    xp += currentStreak * XP_BONUS_STREAK;
    
    // Focus bonus
    if (activity.focusScore && activity.focusScore >= 8) {
      xp += 5; // Bonus for high focus
    }
    
    // Category bonuses
    const categoryBonuses: { [category: string]: number } = {
      'Code Review': 3,
      'Documentation': 2,
      'Testing': 2,
      'Learning': 1
    };
    
    xp += categoryBonuses[activity.category] || 0;
    
    return Math.round(xp);
  }

  /**
   * Get user profile
   */
  public async getUserProfile(): Promise<UserProfile> {
    const profile = this.context.globalState.get<UserProfile>('userProfile');
    
    if (!profile) {
      // Create default profile
      const defaultProfile: UserProfile = {
        id: uuidv4(),
        username: 'Developer',
        level: 1,
        xp: 0,
        totalActivities: 0,
        totalTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
        preferences: {
          theme: 'auto',
          notifications: {
            enabled: true,
            achievements: true,
            reminders: true,
            goalProgress: true,
            pomodoroAlerts: true
          },
          dashboard: {
            widgets: [],
            layout: 'grid',
            refreshInterval: 300
          }
        },
        stats: {
          totalActivities: 0,
          totalTime: 0,
          averageSessionLength: 0,
          mostProductiveHour: 9,
          mostProductiveDay: 'Monday',
          focusScore: 7,
          collaborationScore: 5,
          consistencyScore: 5,
          weeklyStats: [],
          monthlyStats: []
        },
        joinedAt: new Date().toISOString()
      };
      
      await this.updateUserProfile(defaultProfile);
      return defaultProfile;
    }
    
    return profile;
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(profile: UserProfile): Promise<void> {
    await this.context.globalState.update('userProfile', profile);
  }

  /**
   * Get achievement progress
   */
  public async getAchievementProgress(): Promise<Achievement[]> {
    const userProfile = await this.getUserProfile();
    const activities = this.context.globalState.get<Activity[]>('activities', []);
    const sessions = this.context.globalState.get<TimeSession[]>('timeSessions', []);
    
    const achievementProgress: Achievement[] = [];
    
    for (const [key, achievementTemplate] of Object.entries(ACHIEVEMENTS)) {
      const existingAchievement = userProfile.achievements.find(a => a.id === achievementTemplate.id);
      
      if (existingAchievement) {
        achievementProgress.push(existingAchievement);
      } else {
        const achievement = await this.evaluateAchievement(achievementTemplate, activities, sessions, userProfile);
        if (achievement) {
          achievementProgress.push(achievement);
        }
      }
    }
    
    return achievementProgress.sort((a, b) => b.progress - a.progress);
  }

  /**
   * Get leaderboard data (for team features)
   */
  public async getLeaderboardData(): Promise<{
    rank: number;
    totalUsers: number;
    xp: number;
    level: number;
  }> {
    const userProfile = await this.getUserProfile();
    
    // For now, return mock data since we don't have team features yet
    return {
      rank: 1,
      totalUsers: 1,
      xp: userProfile.xp,
      level: userProfile.level
    };
  }

  // Private methods
  private async evaluateAchievement(
    template: typeof ACHIEVEMENTS[keyof typeof ACHIEVEMENTS],
    activities: Activity[],
    sessions: TimeSession[],
    userProfile: UserProfile
  ): Promise<Achievement | null> {
    let progress = 0;
    
    switch (template.id) {
      case 'first_activity':
        progress = activities.length > 0 ? 100 : 0;
        break;
        
      case 'streak_7':
        progress = Math.min((userProfile.currentStreak / 7) * 100, 100);
        break;
        
      case 'streak_30':
        progress = Math.min((userProfile.currentStreak / 30) * 100, 100);
        break;
        
      case 'pomodoro_master':
        const pomodoroSessions = sessions.filter(s => s.type === 'pomodoro' && s.endTime);
        progress = Math.min((pomodoroSessions.length / 100) * 100, 100);
        break;
        
      case 'code_reviewer':
        const reviewActivities = activities.filter(a => a.category === 'Code Review');
        progress = Math.min((reviewActivities.length / 50) * 100, 100);
        break;
        
      case 'night_owl':
        const nightActivities = activities.filter(a => {
          const hour = new Date(`${a.date} ${a.time}`).getHours();
          return hour >= 0 && hour < 6;
        });
        progress = Math.min((nightActivities.length / 10) * 100, 100);
        break;
        
      case 'early_bird':
        const earlyActivities = activities.filter(a => {
          const hour = new Date(`${a.date} ${a.time}`).getHours();
          return hour >= 5 && hour < 8;
        });
        progress = Math.min((earlyActivities.length / 10) * 100, 100);
        break;
        
      case 'deep_focus':
        const deepWorkSessions = sessions.filter(s => 
          s.type === 'deep-work' && s.endTime && s.duration >= 120
        );
        progress = deepWorkSessions.length > 0 ? 100 : 0;
        break;
        
      default:
        return null;
    }
    
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      category: template.category,
      rarity: template.rarity,
      progress: Math.round(progress),
      requirements: [], // Could be expanded
      xpReward: template.xpReward,
      unlockedAt: progress >= 100 ? new Date().toISOString() : undefined
    };
  }

  private calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  private showAchievementNotification(achievement: Achievement): void {
    const rarityEmojis = {
      common: '🥉',
      rare: '🥈',
      epic: '🥇',
      legendary: '👑'
    };

    vscode.window.showInformationMessage(
      `${rarityEmojis[achievement.rarity]} Achievement Unlocked: ${achievement.name}!`,
      'View Achievements'
    ).then(choice => {
      if (choice === 'View Achievements') {
        vscode.commands.executeCommand('mycroft.viewAchievements');
      }
    });
  }

  private showLevelUpNotification(newLevel: number): void {
    vscode.window.showInformationMessage(
      `🎉 Level Up! You're now level ${newLevel}!`,
      'View Profile'
    ).then(choice => {
      if (choice === 'View Profile') {
        // Could open profile view
      }
    });
  }
}
