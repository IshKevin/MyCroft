import * as vscode from 'vscode';
import { Achievement, UserProfile } from '../types';
import { AchievementService } from '../services/AchievementService';
import { LEVEL_THRESHOLDS } from '../constants';

/**
 * Achievements Provider for MyCroft 2.0
 * Displays achievements, XP, level, and gamification elements
 */
export class AchievementsProvider implements vscode.WebviewViewProvider {
  private achievementService: AchievementService;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.achievementService = AchievementService.getInstance(context);
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = await this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refreshAchievements':
          webviewView.webview.html = await this.getWebviewContent(webviewView.webview);
          break;
        case 'shareAchievement':
          await this.shareAchievement(message.achievementId);
          break;
      }
    });
  }

  private async getWebviewContent(webview: vscode.Webview): Promise<string> {
    const userProfile = await this.achievementService.getUserProfile();
    const achievements = await this.achievementService.getAchievementProgress();
    const leaderboardData = await this.achievementService.getLeaderboardData();

    const unlockedAchievements = achievements.filter(a => a.unlockedAt);
    const inProgressAchievements = achievements.filter(a => !a.unlockedAt && a.progress > 0);
    const lockedAchievements = achievements.filter(a => !a.unlockedAt && a.progress === 0);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Achievements</title>
        <style>
          ${this.getStyles()}
        </style>
      </head>
      <body>
        <div class="achievements-container">
          <div class="header">
            <h2>🏆 Achievements</h2>
            <button id="refreshBtn" class="btn-secondary">🔄</button>
          </div>

          ${this.renderUserProfile(userProfile, leaderboardData)}

          <div class="achievements-sections">
            ${unlockedAchievements.length > 0 ? this.renderAchievementSection('Unlocked', unlockedAchievements, 'unlocked') : ''}
            ${inProgressAchievements.length > 0 ? this.renderAchievementSection('In Progress', inProgressAchievements, 'progress') : ''}
            ${lockedAchievements.length > 0 ? this.renderAchievementSection('Locked', lockedAchievements, 'locked') : ''}
          </div>
        </div>

        <script>
          ${this.getScript()}
        </script>
      </body>
      </html>
    `;
  }

  private renderUserProfile(userProfile: UserProfile, leaderboardData: any): string {
    const currentLevelXP = LEVEL_THRESHOLDS[userProfile.level - 1] || 0;
    const nextLevelXP = LEVEL_THRESHOLDS[userProfile.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const progressToNextLevel = nextLevelXP > currentLevelXP ? 
      ((userProfile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;

    return `
      <div class="profile-section">
        <div class="profile-header">
          <div class="profile-avatar">
            <div class="avatar-placeholder">👤</div>
            <div class="level-badge">Lv.${userProfile.level}</div>
          </div>
          <div class="profile-info">
            <h3 class="username">${userProfile.username}</h3>
            <div class="profile-stats">
              <div class="stat-item">
                <span class="stat-value">${userProfile.xp}</span>
                <span class="stat-label">XP</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${userProfile.achievements.filter(a => a.unlockedAt).length}</span>
                <span class="stat-label">Achievements</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${userProfile.currentStreak}</span>
                <span class="stat-label">Streak</span>
              </div>
            </div>
          </div>
        </div>

        <div class="xp-progress">
          <div class="xp-info">
            <span class="current-xp">${userProfile.xp} XP</span>
            <span class="next-level">Next: ${nextLevelXP} XP</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressToNextLevel}%"></div>
          </div>
        </div>

        ${leaderboardData.totalUsers > 1 ? `
          <div class="leaderboard-info">
            <div class="rank-info">
              Rank #${leaderboardData.rank} of ${leaderboardData.totalUsers}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderAchievementSection(title: string, achievements: Achievement[], type: string): string {
    return `
      <div class="achievement-section">
        <h3 class="section-title">${title} (${achievements.length})</h3>
        <div class="achievements-grid">
          ${achievements.map(achievement => this.renderAchievement(achievement, type)).join('')}
        </div>
      </div>
    `;
  }

  private renderAchievement(achievement: Achievement, type: string): string {
    const rarityColors = {
      common: '#6c757d',
      rare: '#007bff',
      epic: '#6f42c1',
      legendary: '#fd7e14'
    };

    const rarityLabels = {
      common: 'Common',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary'
    };

    return `
      <div class="achievement-card ${type}" data-achievement-id="${achievement.id}">
        <div class="achievement-icon" style="background-color: ${rarityColors[achievement.rarity]}20; border-color: ${rarityColors[achievement.rarity]}">
          <span class="icon">${achievement.icon}</span>
          ${type === 'unlocked' ? '<div class="unlock-indicator">✓</div>' : ''}
        </div>
        
        <div class="achievement-info">
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-description">${achievement.description}</div>
          
          <div class="achievement-meta">
            <span class="rarity" style="color: ${rarityColors[achievement.rarity]}">
              ${rarityLabels[achievement.rarity]}
            </span>
            <span class="xp-reward">+${achievement.xpReward} XP</span>
          </div>

          ${type !== 'unlocked' ? `
            <div class="progress-section">
              <div class="progress-bar small">
                <div class="progress-fill" style="width: ${achievement.progress}%"></div>
              </div>
              <div class="progress-text">${achievement.progress}%</div>
            </div>
          ` : `
            <div class="unlock-date">
              Unlocked: ${new Date(achievement.unlockedAt!).toLocaleDateString()}
            </div>
          `}

          ${type === 'unlocked' ? `
            <button class="share-btn" onclick="shareAchievement('${achievement.id}')">
              📤 Share
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private getStyles(): string {
    return `
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
        margin: 0;
        padding: 16px;
      }

      .achievements-container {
        max-width: 100%;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .header h2 {
        margin: 0;
        color: var(--vscode-foreground);
      }

      .profile-section {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
      }

      .profile-header {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }

      .profile-avatar {
        position: relative;
        margin-right: 16px;
      }

      .avatar-placeholder {
        width: 60px;
        height: 60px;
        background: var(--vscode-button-background);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .level-badge {
        position: absolute;
        bottom: -4px;
        right: -4px;
        background: var(--vscode-textLink-foreground);
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        border: 2px solid var(--vscode-editor-background);
      }

      .username {
        margin: 0 0 8px 0;
        color: var(--vscode-foreground);
      }

      .profile-stats {
        display: flex;
        gap: 16px;
      }

      .stat-item {
        text-align: center;
      }

      .stat-value {
        display: block;
        font-size: 18px;
        font-weight: bold;
        color: var(--vscode-textLink-foreground);
        margin-bottom: 2px;
      }

      .stat-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
      }

      .xp-progress {
        margin-bottom: 16px;
      }

      .xp-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-bar.small {
        height: 4px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4ECDC4, #007ACC);
        transition: width 0.3s ease;
      }

      .leaderboard-info {
        text-align: center;
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .achievement-section {
        margin-bottom: 32px;
      }

      .section-title {
        margin-bottom: 16px;
        color: var(--vscode-foreground);
        font-size: 16px;
      }

      .achievements-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .achievement-card {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .achievement-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .achievement-card.locked {
        opacity: 0.6;
      }

      .achievement-card.unlocked {
        border-color: var(--vscode-textLink-foreground);
        background: var(--vscode-editor-background);
      }

      .achievement-icon {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 2px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .achievement-icon .icon {
        font-size: 24px;
      }

      .unlock-indicator {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        background: #28a745;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
      }

      .achievement-info {
        flex: 1;
        min-width: 0;
      }

      .achievement-name {
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--vscode-foreground);
      }

      .achievement-description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .achievement-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 11px;
      }

      .rarity {
        font-weight: bold;
        text-transform: uppercase;
      }

      .xp-reward {
        color: var(--vscode-textLink-foreground);
        font-weight: bold;
      }

      .progress-section {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .progress-section .progress-bar {
        flex: 1;
      }

      .progress-text {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        min-width: 30px;
        text-align: right;
      }

      .unlock-date {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
      }

      .share-btn {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }

      .share-btn:hover {
        opacity: 0.9;
      }

      .btn-secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .btn-secondary:hover {
        opacity: 0.9;
      }
    `;
  }

  private getScript(): string {
    return `
      const vscode = acquireVsCodeApi();

      function shareAchievement(achievementId) {
        vscode.postMessage({
          command: 'shareAchievement',
          achievementId
        });
      }

      document.getElementById('refreshBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'refreshAchievements' });
      });
    `;
  }

  private async shareAchievement(achievementId: string): Promise<void> {
    const achievements = await this.achievementService.getAchievementProgress();
    const achievement = achievements.find(a => a.id === achievementId);
    
    if (!achievement || !achievement.unlockedAt) {
      vscode.window.showErrorMessage('Achievement not found or not unlocked');
      return;
    }

    const shareText = `🏆 I just unlocked the "${achievement.name}" achievement in MyCroft! ${achievement.description}`;
    
    const choice = await vscode.window.showInformationMessage(
      'Share achievement:',
      'Copy to Clipboard',
      'Cancel'
    );

    if (choice === 'Copy to Clipboard') {
      await vscode.env.clipboard.writeText(shareText);
      vscode.window.showInformationMessage('Achievement copied to clipboard!');
    }
  }
}
