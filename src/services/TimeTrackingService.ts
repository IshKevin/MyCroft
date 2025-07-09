import * as vscode from 'vscode';
import { TimeSession, SessionType, Break, BreakType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_POMODORO_LENGTH, DEFAULT_BREAK_LENGTH, DEFAULT_DEEP_WORK_LENGTH, DEFAULT_EXTENDED_FOCUS_LENGTH, TIME_TRACKING } from '../constants';

/**
 * Time Tracking Service for MyCroft 2.0
 * Handles Pomodoro sessions, deep work tracking, and automatic time detection
 */
export class TimeTrackingService {
  private static instance: TimeTrackingService;
  private currentSession?: TimeSession;
  private sessionTimer?: NodeJS.Timeout;
  private idleTimer?: NodeJS.Timeout;
  private lastActivityTime: number = Date.now();
  private isAutoTrackingEnabled: boolean = true;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.isAutoTrackingEnabled = vscode.workspace.getConfiguration('mycroft').get('autoTimeTracking', true);
    this.setupActivityDetection();
  }

  public static getInstance(context: vscode.ExtensionContext): TimeTrackingService {
    if (!TimeTrackingService.instance) {
      TimeTrackingService.instance = new TimeTrackingService(context);
    }
    return TimeTrackingService.instance;
  }

  /**
   * Start a new time tracking session
   */
  public async startSession(type: SessionType, projectId?: string): Promise<TimeSession> {
    // End current session if exists
    if (this.currentSession) {
      await this.endSession();
    }

    const duration = this.getSessionDuration(type);
    
    this.currentSession = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      duration: duration,
      type,
      projectId,
      isActive: true,
      breaks: [],
      focusScore: 10, // Start with perfect focus
      interruptions: 0
    };

    // Start session timer
    this.startSessionTimer(duration);
    
    // Show notification
    this.showSessionStartNotification(type, duration);
    
    // Save session
    await this.saveSession(this.currentSession);
    
    return this.currentSession;
  }

  /**
   * End the current session
   */
  public async endSession(): Promise<TimeSession | undefined> {
    if (!this.currentSession) {
      return undefined;
    }

    const session = this.currentSession;
    session.endTime = new Date().toISOString();
    session.isActive = false;
    
    // Calculate actual duration
    const startTime = new Date(session.startTime).getTime();
    const endTime = new Date(session.endTime).getTime();
    session.duration = Math.round((endTime - startTime) / (1000 * 60)); // in minutes

    // Clear timers
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = undefined;
    }

    // Save final session
    await this.saveSession(session);
    
    // Show completion notification
    this.showSessionCompleteNotification(session);
    
    this.currentSession = undefined;
    return session;
  }

  /**
   * Start a break during current session
   */
  public async startBreak(type: BreakType): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to take a break from');
    }

    const breakSession: Break = {
      startTime: new Date().toISOString(),
      endTime: '', // Will be set when break ends
      duration: 0,
      type
    };

    this.currentSession.breaks.push(breakSession);
    
    // Pause session timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = undefined;
    }

    vscode.window.showInformationMessage(`Break started! Enjoy your ${type} break.`);
  }

  /**
   * End current break
   */
  public async endBreak(): Promise<void> {
    if (!this.currentSession || this.currentSession.breaks.length === 0) {
      return;
    }

    const currentBreak = this.currentSession.breaks[this.currentSession.breaks.length - 1];
    if (currentBreak.endTime) {
      return; // Break already ended
    }

    currentBreak.endTime = new Date().toISOString();
    const startTime = new Date(currentBreak.startTime).getTime();
    const endTime = new Date(currentBreak.endTime).getTime();
    currentBreak.duration = Math.round((endTime - startTime) / (1000 * 60));

    // Resume session timer
    const remainingTime = this.getRemainingSessionTime();
    if (remainingTime > 0) {
      this.startSessionTimer(remainingTime);
    }

    vscode.window.showInformationMessage('Break ended! Back to work!');
  }

  /**
   * Get current active session
   */
  public getCurrentSession(): TimeSession | undefined {
    return this.currentSession;
  }

  /**
   * Get session history
   */
  public async getSessionHistory(limit: number = 50): Promise<TimeSession[]> {
    const sessions = this.context.globalState.get<TimeSession[]>('timeSessions', []);
    return sessions.slice(0, limit);
  }

  /**
   * Get today's total time
   */
  public async getTodayTotalTime(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const sessions = await this.getSessionHistory();
    
    return sessions
      .filter(session => session.startTime.startsWith(today) && session.endTime)
      .reduce((total, session) => total + session.duration, 0);
  }

  /**
   * Get productivity statistics
   */
  public async getProductivityStats(): Promise<{
    totalSessions: number;
    totalTime: number;
    averageSessionLength: number;
    averageFocusScore: number;
    totalBreaks: number;
    mostProductiveHour: number;
  }> {
    const sessions = await this.getSessionHistory();
    const completedSessions = sessions.filter(s => s.endTime);
    
    if (completedSessions.length === 0) {
      return {
        totalSessions: 0,
        totalTime: 0,
        averageSessionLength: 0,
        averageFocusScore: 0,
        totalBreaks: 0,
        mostProductiveHour: 9
      };
    }

    const totalTime = completedSessions.reduce((sum, s) => sum + s.duration, 0);
    const totalBreaks = completedSessions.reduce((sum, s) => sum + s.breaks.length, 0);
    const averageFocusScore = completedSessions.reduce((sum, s) => sum + s.focusScore, 0) / completedSessions.length;
    
    // Find most productive hour
    const hourCounts: { [hour: number]: number } = {};
    completedSessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + session.duration;
    });
    
    const mostProductiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '9';

    return {
      totalSessions: completedSessions.length,
      totalTime,
      averageSessionLength: totalTime / completedSessions.length,
      averageFocusScore,
      totalBreaks,
      mostProductiveHour: parseInt(mostProductiveHour)
    };
  }

  /**
   * Start Pomodoro session
   */
  public async startPomodoro(projectId?: string): Promise<TimeSession> {
    return this.startSession('pomodoro', projectId);
  }

  /**
   * Start deep work session
   */
  public async startDeepWork(projectId?: string): Promise<TimeSession> {
    return this.startSession('deep-work', projectId);
  }

  /**
   * Start a short focus session (45 minutes)
   */
  public async startShortFocus(projectId?: string): Promise<TimeSession> {
    return this.startSession('short-focus', projectId);
  }

  /**
   * Start an extended focus session (4 hours)
   */
  public async startExtendedFocus(projectId?: string): Promise<TimeSession> {
    return this.startSession('extended-focus', projectId);
  }

  /**
   * Start a custom duration session
   */
  public async startCustomSession(duration: number, projectId?: string): Promise<TimeSession> {
    if (this.currentSession?.isActive) {
      throw new Error('A session is already active. End the current session first.');
    }

    const session: TimeSession = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      duration,
      type: 'custom',
      projectId,
      isActive: true,
      breaks: [],
      focusScore: 8,
      interruptions: 0
    };

    this.currentSession = session;
    await this.saveSession(session);
    this.startSessionTimer(session.duration);

    return session;
  }

  // Private methods
  private setupActivityDetection(): void {
    if (!this.isAutoTrackingEnabled) {
      return;
    }

    // Listen for text document changes
    vscode.workspace.onDidChangeTextDocument(() => {
      this.recordActivity();
    });

    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.recordActivity();
    });

    // Start idle detection
    this.startIdleDetection();
  }

  private recordActivity(): void {
    this.lastActivityTime = Date.now();
    
    // If we have an active session, update focus score based on activity
    if (this.currentSession && this.currentSession.isActive) {
      // Reset idle timer
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }
      this.startIdleDetection();
    }
  }

  private startIdleDetection(): void {
    this.idleTimer = setTimeout(() => {
      if (this.currentSession && this.currentSession.isActive) {
        // User has been idle, reduce focus score
        this.currentSession.focusScore = Math.max(1, this.currentSession.focusScore - 1);
        this.currentSession.interruptions++;
        
        // Show idle notification
        vscode.window.showWarningMessage(
          'You seem to be idle. Take a break or end your session?',
          'Take Break',
          'End Session',
          'Continue'
        ).then(choice => {
          if (choice === 'Take Break') {
            this.startBreak('short');
          } else if (choice === 'End Session') {
            this.endSession();
          }
        });
      }
    }, TIME_TRACKING.IDLE_THRESHOLD * 1000);
  }

  private startSessionTimer(durationMinutes: number): void {
    this.sessionTimer = setTimeout(() => {
      if (this.currentSession) {
        this.handleSessionComplete();
      }
    }, durationMinutes * 60 * 1000);
  }

  private async handleSessionComplete(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    const session = this.currentSession;
    
    // Determine next action based on session type
    if (session.type === 'pomodoro') {
      const breakType = session.breaks.length >= 3 ? 'long' : 'short';
      const choice = await vscode.window.showInformationMessage(
        `Pomodoro complete! Time for a ${breakType} break.`,
        'Start Break',
        'Continue Working',
        'End Session'
      );

      if (choice === 'Start Break') {
        await this.startBreak(breakType);
      } else if (choice === 'End Session') {
        await this.endSession();
      }
    } else {
      await vscode.window.showInformationMessage(
        `${session.type} session complete!`,
        'OK'
      );
      await this.endSession();
    }
  }

  private getSessionDuration(type: SessionType): number {
    const config = vscode.workspace.getConfiguration('mycroft');

    switch (type) {
      case 'pomodoro':
        return config.get('pomodoroLength', DEFAULT_POMODORO_LENGTH);
      case 'short-focus':
        return config.get('shortFocusLength', 45);
      case 'deep-work':
        return config.get('deepWorkLength', DEFAULT_DEEP_WORK_LENGTH);
      case 'extended-focus':
        return config.get('extendedFocusLength', DEFAULT_EXTENDED_FOCUS_LENGTH);
      case 'break':
        return config.get('breakLength', DEFAULT_BREAK_LENGTH);
      case 'custom':
        return 0; // Custom duration is set when creating the session
      default:
        return DEFAULT_POMODORO_LENGTH;
    }
  }

  private getRemainingSessionTime(): number {
    if (!this.currentSession) {
      return 0;
    }

    const startTime = new Date(this.currentSession.startTime).getTime();
    const now = Date.now();
    const elapsed = Math.round((now - startTime) / (1000 * 60)); // in minutes
    
    // Subtract break time
    const breakTime = this.currentSession.breaks.reduce((total, breakSession) => {
      if (breakSession.endTime) {
        return total + breakSession.duration;
      }
      return total;
    }, 0);

    return Math.max(0, this.currentSession.duration - elapsed + breakTime);
  }

  private async saveSession(session: TimeSession): Promise<void> {
    const sessions = this.context.globalState.get<TimeSession[]>('timeSessions', []);
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }

    // Keep only last 1000 sessions
    if (sessions.length > 1000) {
      sessions.splice(1000);
    }

    await this.context.globalState.update('timeSessions', sessions);
  }

  private showSessionStartNotification(type: SessionType, duration: number): void {
    const typeNames = {
      'pomodoro': 'Pomodoro',
      'short-focus': 'Short Focus',
      'deep-work': 'Deep Work',
      'extended-focus': 'Extended Focus',
      'custom': 'Custom',
      'regular': 'Regular',
      'break': 'Break'
    };

    vscode.window.showInformationMessage(
      `${typeNames[type]} session started! Duration: ${duration} minutes`,
      'End Session'
    ).then(choice => {
      if (choice === 'End Session') {
        this.endSession();
      }
    });
  }

  private showSessionCompleteNotification(session: TimeSession): void {
    const typeNames = {
      'pomodoro': 'Pomodoro',
      'short-focus': 'Short Focus',
      'deep-work': 'Deep Work',
      'extended-focus': 'Extended Focus',
      'custom': 'Custom',
      'regular': 'Regular',
      'break': 'Break'
    };

    vscode.window.showInformationMessage(
      `${typeNames[session.type]} session completed! Duration: ${session.duration} minutes, Focus Score: ${session.focusScore}/10`
    );
  }
}
