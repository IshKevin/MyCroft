import * as vscode from 'vscode';
let Octokit: any;
(async () => {
  Octokit = (await import('@octokit/rest')).Octokit;
})();
import { Activity } from '../types';
import { REPO_NAME, DEFAULT_DAILY_GOAL } from '../constants';
import { getGitHubToken } from '../github/auth';
import { checkAndInitializeRepository } from '../github/repository';
import { getWebviewContent } from '../webview/template';
import { ProjectService } from '../services/ProjectService';
import { AchievementService } from '../services/AchievementService';
import { TimeTrackingService } from '../services/TimeTrackingService';
import { v4 as uuidv4 } from 'uuid';

export class ActivityLoggerProvider implements vscode.WebviewViewProvider {
  private activities: Activity[] = [];
  private readonly projectService: ProjectService;
  private readonly achievementService: AchievementService;
  private readonly timeTrackingService: TimeTrackingService;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.projectService = ProjectService.getInstance(context);
    this.achievementService = AchievementService.getInstance(context);
    this.timeTrackingService = TimeTrackingService.getInstance(context);
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    await this.loadActivities();
    const projects = await this.projectService.getProjects();
    const userProfile = await this.achievementService.getUserProfile();
    const currentSession = this.timeTrackingService.getCurrentSession();
    const achievements = await this.achievementService.getAchievementProgress();

    webviewView.webview.html = await getWebviewContent(webviewView.webview, {
      activities: this.activities,
      projects,
      currentProject: projects.find(p => p.id === this.context.globalState.get('currentProjectId')),
      user: userProfile,
      dailyGoal: this.context.globalState.get<number>('dailyGoal') || DEFAULT_DAILY_GOAL,
      currentStreak: this.calculateStreak(),
      totalShips: this.activities.length,
      longestStreak: this.calculateLongestStreak(),
      todayCount: this.getTodayActivityCount(),
      activeSession: currentSession,
      achievements: achievements.filter(a => a.unlockedAt).slice(0, 3), // Show recent achievements
      notifications: [] // TODO: Implement notifications
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'shipActivity') {
        await this.shipActivity(message.text, message.category, message.mood, message.tags, message.projectId);
        await this.refreshWebview(webviewView);
      }
    });
  }

  private async loadActivities() {
    const token = await getGitHubToken();
    if (!token) return;

    try {
      const octokit = new Octokit({ auth: token });
      const user = await octokit.users.getAuthenticated();

      const { data: readmeFile } = await octokit.repos.getContent({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
      });

      if (!('content' in readmeFile)) return;

      const content = Buffer.from(readmeFile.content, 'base64').toString();
      const lines = content.split('\n');
      const activities: Activity[] = [];

      let foundTable = false;
      for (const line of lines) {
        if (line.startsWith('| Date')) {
          foundTable = true;
          continue;
        }
        if (foundTable && line.startsWith('|')) {
          const [, date, time, activity, category, mood, tags] = line.split('|').map(s => s.trim());
          activities.push({
            id: uuidv4(),
            date,
            time,
            activity,
            category,
            mood,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          });
        }
      }

      this.activities = activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }

  private async shipActivity(activityText: string, category: string, mood: string, tags: string[], projectId?: string) {
    const token = await getGitHubToken();

    if (!token) {
      vscode.window.showErrorMessage('Please sign in to GitHub to log your activity.');
      return;
    }

    try {
      const octokit = new Octokit({ auth: token });
      const user = await octokit.users.getAuthenticated();

      await checkAndInitializeRepository();

      // Use simple rule-based categorization
      const finalCategory = this.categorizeActivity(activityText, category);

      // Create enhanced activity object
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString();
      const currentSession = this.timeTrackingService.getCurrentSession();

      const newActivity: Activity = {
        id: uuidv4(),
        date,
        time,
        activity: activityText,
        category: finalCategory,
        mood,
        tags,
        projectId,
        duration: currentSession?.duration || 0,
        timeTracked: currentSession,
        focusScore: currentSession?.focusScore || 7,
        energy: this.determineEnergyLevel(mood)
      };

      // Calculate XP and award it
      const currentStreak = this.calculateStreak();
      const xpEarned = this.achievementService.calculateActivityXP(newActivity, currentStreak);
      await this.achievementService.awardXP(xpEarned);

      // Check for new achievements
      const sessions = await this.timeTrackingService.getSessionHistory();
      await this.achievementService.checkAchievements([...this.activities, newActivity], sessions);

      const logEntry = `| ${date} | ${time} | ${activityText} | ${finalCategory} | ${mood} | ${tags.join(', ')} |\n`;

      const { data: readmeFile } = await octokit.repos.getContent({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
      });

      if (!('content' in readmeFile)) {
        throw new Error('README.md not found');
      }

      const readmeContent = Buffer.from(readmeFile.content, 'base64').toString();

      const tableHeader = `## Recent Activities\n\n| Date       | Time     | Activity | Category | Mood | Tags |\n|------------|----------|----------|----------|------|------|\n`;
      const updatedReadme = readmeContent.includes(tableHeader)
        ? readmeContent.replace(tableHeader, `${tableHeader}${logEntry}`)
        : `${readmeContent}\n${tableHeader}${logEntry}`;

      await octokit.repos.createOrUpdateFileContents({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
        message: `Add activity: ${date}`,
        content: Buffer.from(updatedReadme).toString('base64'),
        sha: readmeFile.sha,
      });

      this.updateStreakAndMilestones(date);

      vscode.window.showInformationMessage('Activity logged successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to log activity: ${errorMessage}`);
    }
  }

  private updateStreakAndMilestones(today: string) {
    const lastActivityDate = this.context.globalState.get<string>('lastActivityDate');
    const currentStreak = this.context.globalState.get<number>('currentStreak') || 0;
    const totalShips = this.context.globalState.get<number>('totalShips') || 0;

    if (lastActivityDate === today) {
      // Already logged today
    } else if (lastActivityDate === this.getYesterday()) {
      this.context.globalState.update('currentStreak', currentStreak + 1);
    } else {
      this.context.globalState.update('currentStreak', 1);
    }

    this.context.globalState.update('lastActivityDate', today);
    this.context.globalState.update('totalShips', totalShips + 1);

    if (this.context.globalState.get<number>('currentStreak') === 7) {
      vscode.window.showInformationMessage('🎉 7-day shipping streak! Keep it up!');
    }
    if (this.context.globalState.get<number>('totalShips') === 100) {
      vscode.window.showInformationMessage('🚀 100 ships logged! Amazing work!');
    }
  }

  private getYesterday(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  private calculateStreak(): number {
    const activitiesByDate = this.activities.reduce((acc, activity) => {
      acc[activity.date] = true;
      return acc;
    }, {} as Record<string, boolean>);

    let streak = 0;
    let currentDate = new Date().toISOString().split('T')[0];

    while (activitiesByDate[currentDate]) {
      streak++;
      const date = new Date(currentDate);
      date.setDate(date.getDate() - 1);
      currentDate = date.toISOString().split('T')[0];
    }

    return streak;
  }

  private calculateLongestStreak(): number {
    const activitiesByDate = this.activities.reduce((acc, activity) => {
      acc[activity.date] = true;
      return acc;
    }, {} as Record<string, boolean>);

    let longestStreak = 0;
    let currentStreak = 0;
    let currentDate = new Date().toISOString().split('T')[0];

    while (activitiesByDate[currentDate]) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      const date = new Date(currentDate);
      date.setDate(date.getDate() - 1);
      currentDate = date.toISOString().split('T')[0];
    }

    return longestStreak;
  }

  private getTodayActivityCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.activities.filter(activity => activity.date === today).length;
  }

  private async refreshWebview(webviewView: vscode.WebviewView): Promise<void> {
    await this.loadActivities();
    const projects = await this.projectService.getProjects();
    const userProfile = await this.achievementService.getUserProfile();
    const currentSession = this.timeTrackingService.getCurrentSession();
    const achievements = await this.achievementService.getAchievementProgress();

    webviewView.webview.html = await getWebviewContent(webviewView.webview, {
      activities: this.activities,
      projects,
      currentProject: projects.find(p => p.id === this.context.globalState.get('currentProjectId')),
      user: userProfile,
      dailyGoal: this.context.globalState.get<number>('dailyGoal') || DEFAULT_DAILY_GOAL,
      currentStreak: this.calculateStreak(),
      totalShips: this.activities.length,
      longestStreak: this.calculateLongestStreak(),
      todayCount: this.getTodayActivityCount(),
      activeSession: currentSession,
      achievements: achievements.filter(a => a.unlockedAt).slice(0, 3),
      notifications: []
    });
  }

  private determineEnergyLevel(mood: string): 'high' | 'medium' | 'low' {
    const highEnergyMoods = ['🚀 Excited', '🔥 Motivated', '⚡ Energetic'];
    const lowEnergyMoods = ['😴 Tired', '😤 Frustrated'];

    if (highEnergyMoods.includes(mood)) {
      return 'high';
    } else if (lowEnergyMoods.includes(mood)) {
      return 'low';
    }
    return 'medium';
  }

  private categorizeActivity(description: string, currentCategory: string): string {
    if (currentCategory !== 'Other') {
      return currentCategory;
    }

    // Simple rule-based categorization
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('bug') || lowerDesc.includes('fix') || lowerDesc.includes('error')) {
      return 'Bug Fix';
    }
    if (lowerDesc.includes('test') || lowerDesc.includes('spec')) {
      return 'Testing';
    }
    if (lowerDesc.includes('review') || lowerDesc.includes('pr') || lowerDesc.includes('pull request')) {
      return 'Code Review';
    }
    if (lowerDesc.includes('doc') || lowerDesc.includes('readme') || lowerDesc.includes('comment')) {
      return 'Documentation';
    }
    if (lowerDesc.includes('refactor') || lowerDesc.includes('cleanup') || lowerDesc.includes('optimize')) {
      return 'Refactoring';
    }
    if (lowerDesc.includes('feature') || lowerDesc.includes('implement') || lowerDesc.includes('add')) {
      return 'Feature';
    }
    if (lowerDesc.includes('learn') || lowerDesc.includes('study') || lowerDesc.includes('research')) {
      return 'Learning';
    }
    if (lowerDesc.includes('deploy') || lowerDesc.includes('release') || lowerDesc.includes('build')) {
      return 'Deployment';
    }
    if (lowerDesc.includes('meet') || lowerDesc.includes('discuss') || lowerDesc.includes('standup')) {
      return 'Meeting';
    }
    if (lowerDesc.includes('plan') || lowerDesc.includes('design') || lowerDesc.includes('architect')) {
      return 'Planning';
    }

    return 'Coding';
  }
}