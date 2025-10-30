import * as vscode from 'vscode';
import { Notification, NotificationType, Achievement, UserProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Notification Service for MyCroft 2.0
 * Handles all user notifications including achievements, reminders, and goal progress
 */
export class NotificationService {
  private static instance: NotificationService;
  private context: vscode.ExtensionContext;
  private notifications: Notification[] = [];

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadNotifications();
  }

  public static getInstance(context: vscode.ExtensionContext): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(context);
    }
    return NotificationService.instance;
  }

  /**
   * Show achievement unlock notification
   */
  public async showAchievementNotification(achievement: Achievement): Promise<void> {
    const rarityEmojis = {
      common: '🥉',
      rare: '🥈',
      epic: '🥇',
      legendary: '👑'
    };

    const notification: Notification = {
      id: uuidv4(),
      type: 'achievement',
      title: `${rarityEmojis[achievement.rarity]} Achievement Unlocked!`,
      message: `${achievement.name}: ${achievement.description}`,
      data: { achievementId: achievement.id, xpReward: achievement.xpReward },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await this.addNotification(notification);

    // Show VS Code notification
    const choice = await vscode.window.showInformationMessage(
      `${notification.title} ${achievement.name} (+${achievement.xpReward} XP)`,
      'View Achievements',
      'Dismiss'
    );

    if (choice === 'View Achievements') {
      vscode.commands.executeCommand('mycroft.viewAchievements');
    }
  }

  /**
   * Show goal completion notification
   */
  public async showGoalCompletionNotification(goalTitle: string, projectName?: string): Promise<void> {
    const notification: Notification = {
      id: uuidv4(),
      type: 'goal',
      title: '🎯 Goal Completed!',
      message: `${goalTitle}${projectName ? ` in ${projectName}` : ''}`,
      data: { goalTitle, projectName },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await this.addNotification(notification);

    vscode.window.showInformationMessage(
      `🎯 Goal completed: ${goalTitle}`,
      'View Projects'
    ).then(choice => {
      if (choice === 'View Projects') {
        // Focus on projects panel
      }
    });
  }

  /**
   * Show milestone completion notification
   */
  public async showMilestoneNotification(milestoneTitle: string, projectName: string): Promise<void> {
    const notification: Notification = {
      id: uuidv4(),
      type: 'milestone',
      title: '🎯 Milestone Reached!',
      message: `${milestoneTitle} in ${projectName}`,
      data: { milestoneTitle, projectName },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await this.addNotification(notification);

    vscode.window.showInformationMessage(
      `🎯 Milestone completed: ${milestoneTitle}`,
      'View Project'
    );
  }

  /**
   * Show streak milestone notification
   */
  public async showStreakMilestoneNotification(streakCount: number): Promise<void> {
    const streakEmojis = {
      7: '🔥',
      14: '🔥🔥',
      30: '🔥🔥🔥',
      50: '🔥🔥🔥🔥',
      100: '🔥🔥🔥🔥🔥'
    };

    const emoji = streakEmojis[streakCount as keyof typeof streakEmojis] || '🔥';

    const notification: Notification = {
      id: uuidv4(),
      type: 'achievement',
      title: `${emoji} Streak Milestone!`,
      message: `${streakCount} days of consistent coding!`,
      data: { streakCount },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await this.addNotification(notification);

    vscode.window.showInformationMessage(
      `${emoji} Amazing! ${streakCount}-day coding streak!`,
      'Keep Going!'
    );
  }

  /**
   * Show daily goal reminder
   */
  public async showDailyGoalReminder(currentCount: number, goalCount: number): Promise<void> {
    if (currentCount >= goalCount) {
      return; // Goal already achieved
    }

    const remaining = goalCount - currentCount;
    const notification: Notification = {
      id: uuidv4(),
      type: 'reminder',
      title: '📅 Daily Goal Reminder',
      message: `${remaining} more activities to reach your daily goal!`,
      data: { currentCount, goalCount, remaining },
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
    };

    await this.addNotification(notification);

    // Only show VS Code notification if it's late in the day
    const hour = new Date().getHours();
    if (hour >= 17) { // After 5 PM
      vscode.window.showInformationMessage(
        `📅 ${remaining} more activities to reach your daily goal!`,
        'Log Activity'
      ).then(choice => {
        if (choice === 'Log Activity') {
          // Focus on activity logger
        }
      });
    }
  }

  /**
   * Show level up notification
   */
  public async showLevelUpNotification(newLevel: number, userProfile: UserProfile): Promise<void> {
    const notification: Notification = {
      id: uuidv4(),
      type: 'achievement',
      title: '🎉 Level Up!',
      message: `Congratulations! You've reached level ${newLevel}!`,
      data: { newLevel, totalXP: userProfile.xp },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await this.addNotification(notification);

    vscode.window.showInformationMessage(
      `🎉 Level Up! You're now level ${newLevel}!`,
      'View Profile'
    );
  }

  /**
   * Show Pomodoro completion notification
   */
  public async showPomodoroCompleteNotification(sessionCount: number): Promise<void> {
    const notification: Notification = {
      id: uuidv4(),
      type: 'reminder',
      title: '🍅 Pomodoro Complete!',
      message: `Great focus! Time for a well-deserved break.`,
      data: { sessionCount },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await this.addNotification(notification);

    const choice = await vscode.window.showInformationMessage(
      '🍅 Pomodoro complete! Time for a break.',
      'Start Break',
      'Continue Working'
    );

    if (choice === 'Start Break') {
      // This would trigger break timer
      vscode.commands.executeCommand('mycroft.startBreak');
    }
  }

  /**
   * Get all notifications
   */
  public async getNotifications(limit: number = 50): Promise<Notification[]> {
    // Filter out expired notifications
    const now = new Date().toISOString();
    const validNotifications = this.notifications.filter(n => 
      !n.expiresAt || n.expiresAt > now
    );

    // Save filtered notifications
    if (validNotifications.length !== this.notifications.length) {
      this.notifications = validNotifications;
      await this.saveNotifications();
    }

    return this.notifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      await this.saveNotifications();
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.isRead = true);
    await this.saveNotifications();
  }

  /**
   * Clear old notifications
   */
  public async clearOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    this.notifications = this.notifications.filter(n => n.createdAt > cutoffDate);
    await this.saveNotifications();
  }

  /**
   * Get unread notification count
   */
  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  // Private methods
  private async addNotification(notification: Notification): Promise<void> {
    this.notifications.unshift(notification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    await this.saveNotifications();
  }

  private async loadNotifications(): Promise<void> {
    this.notifications = this.context.globalState.get<Notification[]>('notifications', []);
  }

  private async saveNotifications(): Promise<void> {
    await this.context.globalState.update('notifications', this.notifications);
  }
}
