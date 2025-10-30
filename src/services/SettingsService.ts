import * as vscode from 'vscode';
import { UserPreferences } from '../types';

/**
 * Settings Service for MyCroft 2.0
 * Manages all extension settings and user preferences
 */
export class SettingsService {
  private static instance: SettingsService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService(context);
    }
    return SettingsService.instance;
  }

  /**
   * Get all MyCroft settings
   */
  public getSettings(): MycroftSettings {
    const config = vscode.workspace.getConfiguration('mycroft');
    
    return {
      githubToken: config.get<string>('githubToken', ''),
      repositoryName: config.get<string>('repositoryName', ''),
      autoTimeTracking: config.get<boolean>('autoTimeTracking', true),
      pomodoroLength: config.get<number>('pomodoroLength', 25),
      breakLength: config.get<number>('breakLength', 5),
      deepWorkLength: config.get<number>('deepWorkLength', 90),
      theme: config.get<'auto' | 'light' | 'dark' | 'neon'>('theme', 'auto'),
      enableNotifications: config.get<boolean>('enableNotifications', true),
      enableGamification: config.get<boolean>('enableGamification', true),
      dailyGoal: this.context.globalState.get<number>('dailyGoal', 5)
    };
  }

  /**
   * Update a specific setting
   */
  public async updateSetting<K extends keyof MycroftSettings>(
    key: K,
    value: MycroftSettings[K]
  ): Promise<void> {
    if (key === 'dailyGoal') {
      await this.context.globalState.update('dailyGoal', value);
    } else {
      const config = vscode.workspace.getConfiguration('mycroft');
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  /**
   * Get user preferences from global state
   */
  public async getUserPreferences(): Promise<UserPreferences> {
    const preferences = this.context.globalState.get<UserPreferences>('userPreferences');
    
    if (!preferences) {
      const defaultPreferences: UserPreferences = {
        theme: 'auto',
        notifications: {
          enabled: true,
          achievements: true,
          reminders: true,
          goalProgress: true,
          pomodoroAlerts: true
        },
        dashboard: {
          widgets: [
            {
              id: 'activity-feed',
              type: 'activity-feed',
              position: { x: 0, y: 0 },
              size: { width: 2, height: 2 },
              settings: {},
              isVisible: true
            },
            {
              id: 'time-tracker',
              type: 'time-tracker',
              position: { x: 2, y: 0 },
              size: { width: 1, height: 1 },
              settings: {},
              isVisible: true
            },
            {
              id: 'goals-progress',
              type: 'goals-progress',
              position: { x: 0, y: 2 },
              size: { width: 1, height: 1 },
              settings: {},
              isVisible: true
            },
            {
              id: 'achievements',
              type: 'achievements',
              position: { x: 1, y: 2 },
              size: { width: 1, height: 1 },
              settings: {},
              isVisible: true
            }
          ],
          layout: 'grid',
          refreshInterval: 300
        }
      };
      
      await this.updateUserPreferences(defaultPreferences);
      return defaultPreferences;
    }
    
    return preferences;
  }

  /**
   * Update user preferences
   */
  public async updateUserPreferences(preferences: UserPreferences): Promise<void> {
    await this.context.globalState.update('userPreferences', preferences);
  }

  /**
   * Reset all settings to defaults
   */
  public async resetToDefaults(): Promise<void> {
    const config = vscode.workspace.getConfiguration('mycroft');
    
    // Reset VS Code settings
    await config.update('autoTimeTracking', true, vscode.ConfigurationTarget.Global);
    await config.update('pomodoroLength', 25, vscode.ConfigurationTarget.Global);
    await config.update('breakLength', 5, vscode.ConfigurationTarget.Global);
    await config.update('deepWorkLength', 90, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'auto', vscode.ConfigurationTarget.Global);
    await config.update('enableNotifications', true, vscode.ConfigurationTarget.Global);
    await config.update('enableGamification', true, vscode.ConfigurationTarget.Global);
    
    // Reset global state settings
    await this.context.globalState.update('dailyGoal', 5);
    
    // Reset user preferences
    await this.context.globalState.update('userPreferences', undefined);
    
    vscode.window.showInformationMessage('Settings reset to defaults successfully!');
  }

  /**
   * Export settings for backup
   */
  public async exportSettings(): Promise<void> {
    const settings = this.getSettings();
    const preferences = await this.getUserPreferences();
    
    const exportData = {
      settings,
      preferences,
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('mycroft-settings-backup.json'),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
      vscode.window.showInformationMessage('Settings exported successfully!');
    }
  }

  /**
   * Import settings from backup
   */
  public async importSettings(): Promise<void> {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { 'JSON': ['json'] }
    });

    if (!uri || uri.length === 0) {
      return;
    }

    try {
      const fileContent = await vscode.workspace.fs.readFile(uri[0]);
      const importData = JSON.parse(fileContent.toString());
      
      if (!importData.settings || !importData.preferences) {
        vscode.window.showErrorMessage('Invalid settings file format');
        return;
      }

      // Import VS Code settings
      const config = vscode.workspace.getConfiguration('mycroft');
      const settings = importData.settings;
      
      await config.update('autoTimeTracking', settings.autoTimeTracking, vscode.ConfigurationTarget.Global);
      await config.update('pomodoroLength', settings.pomodoroLength, vscode.ConfigurationTarget.Global);
      await config.update('breakLength', settings.breakLength, vscode.ConfigurationTarget.Global);
      await config.update('deepWorkLength', settings.deepWorkLength, vscode.ConfigurationTarget.Global);
      await config.update('theme', settings.theme, vscode.ConfigurationTarget.Global);
      await config.update('enableNotifications', settings.enableNotifications, vscode.ConfigurationTarget.Global);
      await config.update('enableGamification', settings.enableGamification, vscode.ConfigurationTarget.Global);
      
      // Import global state settings
      await this.context.globalState.update('dailyGoal', settings.dailyGoal);
      
      // Import user preferences
      await this.updateUserPreferences(importData.preferences);
      
      vscode.window.showInformationMessage('Settings imported successfully!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import settings: ${error}`);
    }
  }

  /**
   * Validate GitHub settings
   */
  public validateGitHubSettings(): { isValid: boolean; missingFields: string[] } {
    const settings = this.getSettings();
    const missingFields: string[] = [];
    
    if (!settings.githubToken) {
      missingFields.push('GitHub Token');
    }
    
    if (!settings.repositoryName) {
      missingFields.push('Repository Name');
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Get notification settings
   */
  public async getNotificationSettings() {
    const preferences = await this.getUserPreferences();
    return preferences.notifications;
  }

  /**
   * Update notification settings
   */
  public async updateNotificationSettings(notifications: UserPreferences['notifications']): Promise<void> {
    const preferences = await this.getUserPreferences();
    preferences.notifications = notifications;
    await this.updateUserPreferences(preferences);
  }

  /**
   * Get dashboard settings
   */
  public async getDashboardSettings() {
    const preferences = await this.getUserPreferences();
    return preferences.dashboard;
  }

  /**
   * Update dashboard settings
   */
  public async updateDashboardSettings(dashboard: UserPreferences['dashboard']): Promise<void> {
    const preferences = await this.getUserPreferences();
    preferences.dashboard = dashboard;
    await this.updateUserPreferences(preferences);
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: 'autoTimeTracking' | 'notifications' | 'gamification'): boolean {
    const settings = this.getSettings();
    
    switch (feature) {
      case 'autoTimeTracking':
        return settings.autoTimeTracking;
      case 'notifications':
        return settings.enableNotifications;
      case 'gamification':
        return settings.enableGamification;
      default:
        return false;
    }
  }

  /**
   * Get timer settings
   */
  public getTimerSettings(): {
    pomodoroLength: number;
    breakLength: number;
    deepWorkLength: number;
  } {
    const settings = this.getSettings();
    return {
      pomodoroLength: settings.pomodoroLength,
      breakLength: settings.breakLength,
      deepWorkLength: settings.deepWorkLength
    };
  }

  /**
   * Update timer settings
   */
  public async updateTimerSettings(timerSettings: {
    pomodoroLength?: number;
    breakLength?: number;
    deepWorkLength?: number;
  }): Promise<void> {
    const config = vscode.workspace.getConfiguration('mycroft');
    
    if (timerSettings.pomodoroLength !== undefined) {
      await config.update('pomodoroLength', timerSettings.pomodoroLength, vscode.ConfigurationTarget.Global);
    }
    
    if (timerSettings.breakLength !== undefined) {
      await config.update('breakLength', timerSettings.breakLength, vscode.ConfigurationTarget.Global);
    }
    
    if (timerSettings.deepWorkLength !== undefined) {
      await config.update('deepWorkLength', timerSettings.deepWorkLength, vscode.ConfigurationTarget.Global);
    }
  }

  /**
   * Listen for configuration changes
   */
  public onConfigurationChanged(callback: (event: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('mycroft')) {
        callback(event);
      }
    });
  }
}

// Type definitions
interface MycroftSettings {
  githubToken: string;
  repositoryName: string;
  autoTimeTracking: boolean;
  pomodoroLength: number;
  breakLength: number;
  deepWorkLength: number;
  theme: 'auto' | 'light' | 'dark' | 'neon';
  enableNotifications: boolean;
  enableGamification: boolean;
  dailyGoal: number;
}
