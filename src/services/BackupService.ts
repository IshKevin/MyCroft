import * as vscode from 'vscode';
import { Activity, TimeSession, Project, UserProfile, Achievement } from '../types';

/**
 * Backup Service for MyCroft 2.0
 * Handles automatic backups and data restoration
 */
export class BackupService {
  private static instance: BackupService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService(context);
    }
    return BackupService.instance;
  }

  /**
   * Create automatic backup
   */
  public async createAutoBackup(): Promise<void> {
    const activities = this.context.globalState.get<Activity[]>('activities', []);
    const sessions = this.context.globalState.get<TimeSession[]>('timeSessions', []);
    const projects = this.context.globalState.get<Project[]>('projects', []);
    const userProfile = this.context.globalState.get<UserProfile>('userProfile');
    const achievements = this.context.globalState.get<Achievement[]>('achievements', []);

    const backup = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      data: {
        activities,
        sessions,
        projects,
        userProfile,
        achievements
      }
    };

    // Store in global state with timestamp
    const backupKey = `backup_${Date.now()}`;
    await this.context.globalState.update(backupKey, backup);

    // Keep only last 5 backups
    await this.cleanOldBackups();
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(backupKey: string): Promise<boolean> {
    try {
      const backup = this.context.globalState.get(backupKey);
      if (!backup || typeof backup !== 'object') {
        return false;
      }

      const backupData = backup as any;
      
      // Restore data
      await this.context.globalState.update('activities', backupData.data.activities || []);
      await this.context.globalState.update('timeSessions', backupData.data.sessions || []);
      await this.context.globalState.update('projects', backupData.data.projects || []);
      await this.context.globalState.update('userProfile', backupData.data.userProfile);
      await this.context.globalState.update('achievements', backupData.data.achievements || []);

      vscode.window.showInformationMessage('Data restored successfully from backup!');
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restore backup: ${error}`);
      return false;
    }
  }

  /**
   * List available backups
   */
  public async listBackups(): Promise<Array<{ key: string; timestamp: string; size: number }>> {
    const keys = this.context.globalState.keys();
    const backupKeys = keys.filter(key => key.startsWith('backup_'));
    
    const backups = [];
    for (const key of backupKeys) {
      const backup = this.context.globalState.get(key);
      if (backup && typeof backup === 'object') {
        const backupData = backup as any;
        backups.push({
          key,
          timestamp: backupData.timestamp,
          size: JSON.stringify(backup).length
        });
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clean old backups (keep only last 5)
   */
  private async cleanOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    if (backups.length > 5) {
      const toDelete = backups.slice(5);
      for (const backup of toDelete) {
        await this.context.globalState.update(backup.key, undefined);
      }
    }
  }

  /**
   * Export backup to file
   */
  public async exportBackup(): Promise<void> {
    const activities = this.context.globalState.get<Activity[]>('activities', []);
    const sessions = this.context.globalState.get<TimeSession[]>('timeSessions', []);
    const projects = this.context.globalState.get<Project[]>('projects', []);
    const userProfile = this.context.globalState.get<UserProfile>('userProfile');
    const achievements = this.context.globalState.get<Achievement[]>('achievements', []);

    const backup = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      data: {
        activities,
        sessions,
        projects,
        userProfile,
        achievements
      }
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`mycroft-backup-${new Date().toISOString().split('T')[0]}.json`),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(backup, null, 2)));
      vscode.window.showInformationMessage('Backup exported successfully!');
    }
  }

  /**
   * Import backup from file
   */
  public async importBackup(): Promise<void> {
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
      const backup = JSON.parse(fileContent.toString());
      
      if (!backup.data) {
        vscode.window.showErrorMessage('Invalid backup file format');
        return;
      }

      const choice = await vscode.window.showWarningMessage(
        'This will replace all current data. Are you sure?',
        'Yes, Import',
        'Cancel'
      );

      if (choice === 'Yes, Import') {
        // Create current backup before importing
        await this.createAutoBackup();
        
        // Import data
        await this.context.globalState.update('activities', backup.data.activities || []);
        await this.context.globalState.update('timeSessions', backup.data.sessions || []);
        await this.context.globalState.update('projects', backup.data.projects || []);
        await this.context.globalState.update('userProfile', backup.data.userProfile);
        await this.context.globalState.update('achievements', backup.data.achievements || []);

        vscode.window.showInformationMessage('Backup imported successfully!');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import backup: ${error}`);
    }
  }
}
