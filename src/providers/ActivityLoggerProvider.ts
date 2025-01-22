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

export class ActivityLoggerProvider implements vscode.WebviewViewProvider {
  private activities: Activity[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    await this.loadActivities();
    webviewView.webview.html = await getWebviewContent(webviewView.webview, {
      activities: this.activities,
      dailyGoal: this.context.globalState.get<number>('dailyGoal') || DEFAULT_DAILY_GOAL,
      currentStreak: this.calculateStreak(),
      totalShips: this.activities.length,
      longestStreak: this.calculateLongestStreak(),
      todayCount: this.getTodayActivityCount()
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'shipActivity') {
        await this.shipActivity(message.text, message.category, message.mood, message.tags);
        await this.loadActivities();
        webviewView.webview.html = await getWebviewContent(webviewView.webview, {
          activities: this.activities,
          dailyGoal: this.context.globalState.get<number>('dailyGoal') || DEFAULT_DAILY_GOAL,
          currentStreak: this.calculateStreak(),
          totalShips: this.activities.length,
          longestStreak: this.calculateLongestStreak(),
          todayCount: this.getTodayActivityCount()
        });
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

  private async shipActivity(activity: string, category: string, mood: string, tags: string[]) {
    const token = await getGitHubToken();

    if (!token) {
      vscode.window.showErrorMessage('Please sign in to GitHub to log your activity.');
      return;
    }

    try {
      const octokit = new Octokit({ auth: token });
      const user = await octokit.users.getAuthenticated();

      await checkAndInitializeRepository();

      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString();
      const logEntry = `| ${date} | ${time} | ${activity} | ${category} | ${mood} | ${tags.join(', ')} |\n`;

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
}