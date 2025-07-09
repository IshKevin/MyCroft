import * as vscode from 'vscode';
import { TimeSession, Activity, UserProfile } from '../types';

/**
 * Status Bar Service for MyCroft 2.0
 * Manages status bar items for quick access and information display
 */
export class StatusBarService {
  private static instance: StatusBarService;
  private context: vscode.ExtensionContext;
  private timerStatusBarItem: vscode.StatusBarItem;
  private streakStatusBarItem: vscode.StatusBarItem;
  private levelStatusBarItem: vscode.StatusBarItem;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // Create status bar items
    this.timerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.streakStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.levelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    
    this.setupStatusBarItems();
  }

  public static getInstance(context: vscode.ExtensionContext): StatusBarService {
    if (!StatusBarService.instance) {
      StatusBarService.instance = new StatusBarService(context);
    }
    return StatusBarService.instance;
  }

  private setupStatusBarItems(): void {
    // Timer status bar item
    this.timerStatusBarItem.command = 'mycroft.toggleTimer';
    this.timerStatusBarItem.tooltip = 'MyCroft Timer - Click to start/stop';
    
    // Streak status bar item
    this.streakStatusBarItem.command = 'mycroft.viewStreakDetails';
    this.streakStatusBarItem.tooltip = 'Current coding streak';
    
    // Level status bar item
    this.levelStatusBarItem.command = 'mycroft.viewProfile';
    this.levelStatusBarItem.tooltip = 'Your MyCroft level and XP';
    
    // Show all items
    this.timerStatusBarItem.show();
    this.streakStatusBarItem.show();
    this.levelStatusBarItem.show();
  }

  /**
   * Update timer status bar with current session
   */
  public updateTimerStatus(session?: TimeSession): void {
    if (session && session.isActive) {
      const elapsed = this.calculateElapsedTime(session);
      const remaining = Math.max(0, session.duration - elapsed);
      
      const sessionIcons = {
        'pomodoro': '🍅',
        'short-focus': '⚡',
        'deep-work': '🧠',
        'extended-focus': '🎯',
        'custom': '⚙️',
        'regular': '⏱️',
        'break': '☕'
      };
      
      const icon = sessionIcons[session.type] || '⏱️';
      const timeStr = this.formatTime(remaining);
      
      this.timerStatusBarItem.text = `${icon} ${timeStr}`;
      this.timerStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.timerStatusBarItem.text = '⏱️ Start Timer';
      this.timerStatusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Update streak status bar
   */
  public updateStreakStatus(currentStreak: number, longestStreak: number): void {
    const streakIcon = currentStreak > 0 ? '🔥' : '💤';
    this.streakStatusBarItem.text = `${streakIcon} ${currentStreak}`;
    
    if (currentStreak >= 7) {
      this.streakStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else {
      this.streakStatusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Update level status bar
   */
  public updateLevelStatus(level: number, xp: number, nextLevelXP: number): void {
    const progress = nextLevelXP > 0 ? Math.round((xp / nextLevelXP) * 100) : 100;
    this.levelStatusBarItem.text = `⭐ Lv.${level} (${progress}%)`;
    
    if (level >= 10) {
      this.levelStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else {
      this.levelStatusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Show quick activity log input
   */
  public async showQuickActivityInput(): Promise<void> {
    const activity = await vscode.window.showInputBox({
      prompt: 'Quick log: What did you just accomplish?',
      placeHolder: 'e.g., Fixed authentication bug, Added user validation'
    });

    if (activity) {
      // Post message to activity logger
      vscode.commands.executeCommand('mycroft.quickLogActivity', activity);
    }
  }

  /**
   * Show timer quick actions
   */
  public async showTimerQuickActions(): Promise<void> {
    const actions = [
      { label: '🍅 Start Pomodoro (25min)', command: 'mycroft.startPomodoro' },
      { label: '⚡ Start Short Focus (45min)', command: 'mycroft.startShortFocus' },
      { label: '🧠 Start Deep Work (90min)', command: 'mycroft.startDeepWork' },
      { label: '🎯 Start Extended Focus (4hrs)', command: 'mycroft.startExtendedFocus' },
      { label: '⚙️ Custom Duration', command: 'mycroft.startCustomSession' },
      { label: '☕ Take Break', command: 'mycroft.startBreak' },
      { label: '⏹️ Stop Timer', command: 'mycroft.stopTimer' }
    ];

    const choice = await vscode.window.showQuickPick(actions, {
      placeHolder: 'Choose timer action'
    });

    if (choice) {
      vscode.commands.executeCommand(choice.command);
    }
  }

  /**
   * Show productivity summary
   */
  public async showProductivitySummary(): Promise<void> {
    const activities = this.context.globalState.get('activities', []);
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter((a: any) => a.date === today);
    
    const summary = `📊 Today's Summary:
• Activities: ${todayActivities.length}
• Goal Progress: ${todayActivities.length}/5
• Status: ${todayActivities.length >= 5 ? '✅ Goal Achieved!' : '🎯 Keep Going!'}`;

    vscode.window.showInformationMessage(summary, 'View Details', 'Log Activity').then(choice => {
      if (choice === 'View Details') {
        vscode.commands.executeCommand('mycroft.openDashboard');
      } else if (choice === 'Log Activity') {
        this.showQuickActivityInput();
      }
    });
  }

  /**
   * Update all status bar items
   */
  public async updateAll(): Promise<void> {
    try {
      // Get current data
      const activities = this.context.globalState.get<Activity[]>('activities', []);
      const userProfile = this.context.globalState.get<UserProfile>('userProfile');
      const sessions = this.context.globalState.get<TimeSession[]>('timeSessions', []);
      
      // Calculate current streak
      const currentStreak = this.calculateCurrentStreak(activities);
      const longestStreak = userProfile?.longestStreak || 0;
      
      // Find active session
      const activeSession = sessions.find((s: any) => s.isActive);
      
      // Update status bars
      this.updateTimerStatus(activeSession);
      this.updateStreakStatus(currentStreak, longestStreak);
      
      if (userProfile) {
        this.updateLevelStatus(userProfile.level, userProfile.xp, this.getNextLevelXP(userProfile.level));
      }
    } catch (error) {
      console.error('Failed to update status bar:', error);
    }
  }

  /**
   * Dispose status bar items
   */
  public dispose(): void {
    this.timerStatusBarItem.dispose();
    this.streakStatusBarItem.dispose();
    this.levelStatusBarItem.dispose();
  }

  // Private helper methods
  private calculateElapsedTime(session: TimeSession): number {
    const startTime = new Date(session.startTime).getTime();
    const now = Date.now();
    return Math.round((now - startTime) / (1000 * 60)); // in minutes
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    return `${mins}m`;
  }

  private calculateCurrentStreak(activities: any[]): number {
    if (activities.length === 0) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const dailyActivity: { [date: string]: number } = {};
    
    activities.forEach((activity: any) => {
      dailyActivity[activity.date] = (dailyActivity[activity.date] || 0) + 1;
    });

    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (dailyActivity[dateStr]) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  private getNextLevelXP(currentLevel: number): number {
    // Simple XP calculation: level * 1000
    return (currentLevel + 1) * 1000;
  }
}
