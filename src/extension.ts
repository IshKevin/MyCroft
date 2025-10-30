import * as vscode from 'vscode';
import { ActivityLoggerProvider } from './providers/ActivityLoggerProvider';
import { AnalyticsProvider } from './providers/AnalyticsProvider';
import { TimerProvider } from './providers/TimerProvider';
import { ProjectsProvider } from './providers/ProjectsProvider';
import { AchievementsProvider } from './providers/AchievementsProvider';
import { checkAndInitializeRepository, initializeRepository } from './github/repository';
import { TimeTrackingService } from './services/TimeTrackingService';
import { ProjectService } from './services/ProjectService';
import { AchievementService } from './services/AchievementService';
import { NotificationService } from './services/NotificationService';
import { AnalyticsService } from './services/AnalyticsService';
import { DataExportService } from './services/DataExportService';
import { SettingsService } from './services/SettingsService';
import { BackupService } from './services/BackupService';
import { StatusBarService } from './services/StatusBarService';
import { Activity } from './types';
import { DEFAULT_DAILY_GOAL } from './constants';
import { v4 as uuidv4 } from 'uuid';

export async function activate(context: vscode.ExtensionContext) {
  // Initialize services
  const timeTrackingService = TimeTrackingService.getInstance(context);
  const projectService = ProjectService.getInstance(context);
  const achievementService = AchievementService.getInstance(context);
  const notificationService = NotificationService.getInstance(context);
  const analyticsService = AnalyticsService.getInstance(context);
  const dataExportService = DataExportService.getInstance(context);
  const settingsService = SettingsService.getInstance(context);
  const backupService = BackupService.getInstance(context);
  const statusBarService = StatusBarService.getInstance(context);

  // Initialize providers
  const activityProvider = new ActivityLoggerProvider(context);
  const analyticsProvider = new AnalyticsProvider(context);
  const timerProvider = new TimerProvider(context);
  const projectsProvider = new ProjectsProvider(context);
  const achievementsProvider = new AchievementsProvider(context);

  // Register commands
  const commands = [
    // Existing commands
    vscode.commands.registerCommand('mycroft.initRepo', async () => {
      await initializeRepository();
    }),

    vscode.commands.registerCommand('mycroft.setGoal', async () => {
      const goal = await vscode.window.showInputBox({
        prompt: 'Set your daily goal for the number of activities',
        placeHolder: `e.g., ${DEFAULT_DAILY_GOAL}`,
      });
      if (goal) {
        context.globalState.update('dailyGoal', parseInt(goal, 10));
        vscode.window.showInformationMessage(`Daily goal set to ${goal} activities!`);
      }
    }),

    // New v2.0 commands
    vscode.commands.registerCommand('mycroft.startPomodoro', async () => {
      const projects = await projectService.getActiveProjects();
      let projectId: string | undefined;

      if (projects.length > 0) {
        const projectItems = projects.map(p => ({ label: p.name, description: p.description, id: p.id }));
        projectItems.unshift({ label: 'No Project', description: 'Work without a specific project', id: undefined as any });

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project for this Pomodoro session'
        });

        if (selected) {
          projectId = selected.id;
        }
      }

      const session = await timeTrackingService.startPomodoro(projectId);
      vscode.window.showInformationMessage(`Pomodoro session started! Focus for ${session.duration} minutes.`);
    }),

    vscode.commands.registerCommand('mycroft.startDeepWork', async () => {
      const projects = await projectService.getActiveProjects();
      let projectId: string | undefined;

      if (projects.length > 0) {
        const projectItems = projects.map(p => ({ label: p.name, description: p.description, id: p.id }));
        projectItems.unshift({ label: 'No Project', description: 'Work without a specific project', id: undefined as any });

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project for this deep work session'
        });

        if (selected) {
          projectId = selected.id;
        }
      }

      const session = await timeTrackingService.startDeepWork(projectId);
      vscode.window.showInformationMessage(`Deep work session started! Focus for ${session.duration} minutes.`);
    }),

    vscode.commands.registerCommand('mycroft.startShortFocus', async () => {
      const projects = await projectService.getActiveProjects();
      let projectId: string | undefined;

      if (projects.length > 0) {
        const projectItems = projects.map(p => ({ label: p.name, description: p.description, id: p.id }));
        projectItems.unshift({ label: 'No Project', description: 'Work without a specific project', id: undefined as any });

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project for this short focus session'
        });

        if (selected) {
          projectId = selected.id;
        }
      }

      const session = await timeTrackingService.startShortFocus(projectId);
      vscode.window.showInformationMessage(`Short focus session started! Focus for ${session.duration} minutes.`);
    }),

    vscode.commands.registerCommand('mycroft.startExtendedFocus', async () => {
      const projects = await projectService.getActiveProjects();
      let projectId: string | undefined;

      if (projects.length > 0) {
        const projectItems = projects.map(p => ({ label: p.name, description: p.description, id: p.id }));
        projectItems.unshift({ label: 'No Project', description: 'Work without a specific project', id: undefined as any });

        const selected = await vscode.window.showQuickPick(projectItems, {
          placeHolder: 'Select a project for this extended focus session'
        });

        if (selected) {
          projectId = selected.id;
        }
      }

      const session = await timeTrackingService.startExtendedFocus(projectId);
      const hours = Math.round(session.duration / 60);
      vscode.window.showInformationMessage(`Extended focus session started! Focus for ${session.duration} minutes (${hours} hours).`);
    }),

    vscode.commands.registerCommand('mycroft.startCustomSession', async () => {
      const durationInput = await vscode.window.showInputBox({
        prompt: 'Enter custom session duration in minutes',
        placeHolder: 'e.g., 60 for 1 hour, 120 for 2 hours',
        validateInput: (value) => {
          const num = parseInt(value);
          if (isNaN(num) || num <= 0 || num > 480) {
            return 'Please enter a valid number between 1 and 480 minutes (8 hours)';
          }
          return null;
        }
      });

      if (durationInput) {
        const duration = parseInt(durationInput);

        const projects = await projectService.getActiveProjects();
        let projectId: string | undefined;

        if (projects.length > 0) {
          const projectItems = projects.map(p => ({ label: p.name, description: p.description, id: p.id }));
          projectItems.unshift({ label: 'No Project', description: 'Work without a specific project', id: undefined as any });

          const selected = await vscode.window.showQuickPick(projectItems, {
            placeHolder: 'Select a project for this custom session'
          });

          if (selected) {
            projectId = selected.id;
          }
        }

        try {
          const session = await timeTrackingService.startCustomSession(duration, projectId);
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          vscode.window.showInformationMessage(`Custom session started! Focus for ${timeStr}.`);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to start custom session: ${error}`);
        }
      }
    }),

    vscode.commands.registerCommand('mycroft.openDashboard', async () => {
      // This will be handled by the analytics provider
      vscode.window.showInformationMessage('Analytics dashboard opened!');
    }),

    vscode.commands.registerCommand('mycroft.exportData', async () => {
      const choice = await vscode.window.showQuickPick([
        { label: '📦 Complete Export', description: 'Export all data including analytics', value: 'complete' },
        { label: '📊 Activities CSV', description: 'Export activities as CSV file', value: 'activities-csv' },
        { label: '⏱️ Sessions CSV', description: 'Export time sessions as CSV file', value: 'sessions-csv' },
        { label: '📈 Productivity Report', description: 'Generate detailed Markdown report', value: 'report' },
        { label: '🏆 Achievements', description: 'Export achievements and progress', value: 'achievements' }
      ], {
        placeHolder: 'Choose export format'
      });

      if (!choice) return;

      const activities = context.globalState.get('activities', []);
      const projects = await projectService.getProjects();
      const sessions = await timeTrackingService.getSessionHistory();
      const userProfile = await achievementService.getUserProfile();
      const achievements = await achievementService.getAchievementProgress();

      switch (choice.value) {
        case 'complete':
          await dataExportService.exportComprehensiveData(activities, sessions, projects, userProfile, achievements);
          break;
        case 'activities-csv':
          await dataExportService.exportActivitiesCSV(activities);
          break;
        case 'sessions-csv':
          await dataExportService.exportSessionsCSV(sessions);
          break;
        case 'report':
          await dataExportService.exportProductivityReport(activities, sessions, projects, userProfile);
          break;
        case 'achievements':
          await dataExportService.exportAchievements(achievements, userProfile);
          break;
      }
    }),

    vscode.commands.registerCommand('mycroft.syncData', async () => {
      // Placeholder for cloud sync functionality
      vscode.window.showInformationMessage('Data sync feature coming soon!');
    }),

    vscode.commands.registerCommand('mycroft.openSettings', async () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'mycroft');
    }),

    vscode.commands.registerCommand('mycroft.viewAchievements', async () => {
      const achievements = await achievementService.getAchievementProgress();
      const unlockedCount = achievements.filter(a => a.unlockedAt).length;
      vscode.window.showInformationMessage(`You have unlocked ${unlockedCount} out of ${achievements.length} achievements!`);
    }),

    vscode.commands.registerCommand('mycroft.createProject', async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'My Awesome Project'
      });

      if (!name) return;

      const description = await vscode.window.showInputBox({
        prompt: 'Enter project description (optional)',
        placeHolder: 'A brief description of your project'
      });

      await projectService.createProject(name, description || '');
    }),

    // Enhanced settings command
    vscode.commands.registerCommand('mycroft.manageSettings', async () => {
      const choice = await vscode.window.showQuickPick([
        { label: '⚙️ Open Settings', description: 'Open VS Code settings for MyCroft', value: 'open' },
        { label: '📤 Export Settings', description: 'Backup your settings to a file', value: 'export' },
        { label: '📥 Import Settings', description: 'Restore settings from backup', value: 'import' },
        { label: '🔄 Reset to Defaults', description: 'Reset all settings to default values', value: 'reset' }
      ], {
        placeHolder: 'Choose settings action'
      });

      if (!choice) return;

      switch (choice.value) {
        case 'open':
          vscode.commands.executeCommand('workbench.action.openSettings', 'mycroft');
          break;
        case 'export':
          await settingsService.exportSettings();
          break;
        case 'import':
          await settingsService.importSettings();
          break;
        case 'reset': {
          const confirm = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all settings to defaults?',
            'Yes, Reset',
            'Cancel'
          );
          if (confirm === 'Yes, Reset') {
            await settingsService.resetToDefaults();
          }
          break;
        }
      }
    }),

    // Analytics command
    vscode.commands.registerCommand('mycroft.generateAnalytics', async () => {
      const activities = context.globalState.get('activities', []);
      const sessions = await timeTrackingService.getSessionHistory();
      const projects = await projectService.getProjects();

      if (activities.length === 0) {
        vscode.window.showInformationMessage('No activities to analyze yet. Start logging activities to see analytics!');
        return;
      }

      const report = await analyticsService.generateProductivityReport(activities, sessions, projects);
      const streakAnalytics = analyticsService.analyzeStreakPatterns(activities);

      const message = `📊 Analytics Summary:
• Total Activities: ${report.summary.totalActivities}
• Average Focus: ${report.summary.averageFocus.toFixed(1)}/10
• Current Streak: ${streakAnalytics.currentStreak} days
• Most Productive: ${report.summary.mostProductiveDay} at ${report.summary.mostProductiveHour}:00
• Productivity Trend: ${report.trends.productivityTrend}`;

      const choice = await vscode.window.showInformationMessage(
        message,
        'View Full Report',
        'Export Report'
      );

      if (choice === 'View Full Report') {
        // Open analytics panel
        vscode.commands.executeCommand('mycroft.openDashboard');
      } else if (choice === 'Export Report') {
        const userProfile = await achievementService.getUserProfile();
        await dataExportService.exportProductivityReport(activities, sessions, projects, userProfile);
      }
    }),

    // Backup and restore commands
    vscode.commands.registerCommand('mycroft.createBackup', async () => {
      await backupService.createAutoBackup();
      vscode.window.showInformationMessage('Backup created successfully!');
    }),

    vscode.commands.registerCommand('mycroft.restoreBackup', async () => {
      const backups = await backupService.listBackups();
      if (backups.length === 0) {
        vscode.window.showInformationMessage('No backups available');
        return;
      }

      const backupItems = backups.map(backup => ({
        label: `📅 ${new Date(backup.timestamp).toLocaleString()}`,
        description: `Size: ${Math.round(backup.size / 1024)}KB`,
        backup
      }));

      const choice = await vscode.window.showQuickPick(backupItems, {
        placeHolder: 'Select backup to restore'
      });

      if (choice) {
        const confirm = await vscode.window.showWarningMessage(
          'This will replace all current data. Are you sure?',
          'Yes, Restore',
          'Cancel'
        );

        if (confirm === 'Yes, Restore') {
          await backupService.restoreFromBackup(choice.backup.key);
        }
      }
    }),

    vscode.commands.registerCommand('mycroft.exportBackup', async () => {
      await backupService.exportBackup();
    }),

    vscode.commands.registerCommand('mycroft.importBackup', async () => {
      await backupService.importBackup();
    }),

    // Status bar commands
    vscode.commands.registerCommand('mycroft.toggleTimer', async () => {
      await statusBarService.showTimerQuickActions();
    }),

    vscode.commands.registerCommand('mycroft.viewStreakDetails', async () => {
      const activities = context.globalState.get('activities', []);
      const streakAnalytics = analyticsService.analyzeStreakPatterns(activities);

      const message = `🔥 Streak Details:
• Current Streak: ${streakAnalytics.currentStreak} days
• Longest Streak: ${streakAnalytics.longestStreak} days
• Average Streak: ${streakAnalytics.averageStreak} days
• Total Active Days: ${streakAnalytics.totalActiveDays}`;

      vscode.window.showInformationMessage(message, 'View Analytics').then(choice => {
        if (choice === 'View Analytics') {
          vscode.commands.executeCommand('mycroft.generateAnalytics');
        }
      });
    }),

    vscode.commands.registerCommand('mycroft.viewProfile', async () => {
      const userProfile = await achievementService.getUserProfile();
      const achievements = await achievementService.getAchievementProgress();
      const unlockedCount = achievements.filter(a => a.unlockedAt).length;

      const message = `⭐ Your Profile:
• Level: ${userProfile.level}
• XP: ${userProfile.xp.toLocaleString()}
• Achievements: ${unlockedCount}/${achievements.length}
• Current Streak: ${userProfile.currentStreak} days
• Total Activities: ${userProfile.totalActivities}`;

      vscode.window.showInformationMessage(message, 'View Achievements').then(choice => {
        if (choice === 'View Achievements') {
          vscode.commands.executeCommand('mycroft.viewAchievements');
        }
      });
    }),

    vscode.commands.registerCommand('mycroft.quickLogActivity', async (activityText?: string) => {
      if (!activityText) {
        activityText = await vscode.window.showInputBox({
          prompt: 'What did you accomplish?',
          placeHolder: 'e.g., Fixed authentication bug'
        });
      }

      if (activityText) {
        // Quick log with default values
        const activity = {
          id: uuidv4(),
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          activity: activityText,
          category: 'Coding',
          mood: '😊 Happy',
          tags: [],
          focusScore: 8,
          energy: 'medium' as const
        };

        const activities = context.globalState.get<Activity[]>('activities', []);
        activities.unshift(activity);
        await context.globalState.update('activities', activities);

        // Award XP
        const currentStreak = statusBarService['calculateCurrentStreak'](activities);
        const xp = achievementService.calculateActivityXP(activity, currentStreak);
        await achievementService.awardXP(xp);

        vscode.window.showInformationMessage(`✅ Activity logged! (+${xp} XP)`);

        // Update status bar
        await statusBarService.updateAll();
      }
    })
  ];

  // Initialize repository
  await checkAndInitializeRepository();

  // Initialize status bar
  await statusBarService.updateAll();

  // Set up periodic status bar updates (every 30 seconds)
  const statusBarInterval = setInterval(async () => {
    await statusBarService.updateAll();
  }, 30000);

  // Create auto-backup every hour
  const backupInterval = setInterval(async () => {
    await backupService.createAutoBackup();
  }, 60 * 60 * 1000); // 1 hour

  // Register all providers and commands
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mycroftView', activityProvider),
    vscode.window.registerWebviewViewProvider('mycroftAnalytics', analyticsProvider),
    vscode.window.registerWebviewViewProvider('mycroftTimer', timerProvider),
    vscode.window.registerWebviewViewProvider('mycroftProjects', projectsProvider),
    vscode.window.registerWebviewViewProvider('mycroftAchievements', achievementsProvider),
    statusBarService,
    { dispose: () => clearInterval(statusBarInterval) },
    { dispose: () => clearInterval(backupInterval) },
    ...commands
  );
}

export function deactivate() {
  // Extension cleanup will be handled automatically
}