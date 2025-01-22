import * as vscode from 'vscode';

let Octokit: any;
const REPO_NAME = 'mycroft-logbook';

interface Activity {
  date: string;
  time: string;
  activity: string;
  category: string;
  mood: string;
  tags: string[];
}

export async function activate(context: vscode.ExtensionContext) {
  const { Octokit: OctokitClass } = await import('@octokit/rest');
  Octokit = OctokitClass;

  const provider = new ActivityLoggerProvider(context);

  let initCommand = vscode.commands.registerCommand('mycroft.initRepo', async () => {
    await initializeRepository();
  });

  let setGoalCommand = vscode.commands.registerCommand('mycroft.setGoal', async () => {
    const goal = await vscode.window.showInputBox({
      prompt: 'Set your daily goal for the number of activities',
      placeHolder: 'e.g., 3',
    });
    if (goal) {
      context.globalState.update('dailyGoal', parseInt(goal, 10));
      vscode.window.showInformationMessage(`Daily goal set to ${goal} activities!`);
    }
  });

  await checkAndInitializeRepository();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mycroftView', provider),
    initCommand,
    setGoalCommand
  );
}

async function getGitHubToken(): Promise<string | undefined> {
  try {
    const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
    return session.accessToken;
  } catch (e) {
    return vscode.workspace.getConfiguration('mycroft').get('githubToken');
  }
}

async function checkAndInitializeRepository() {
  const token = await getGitHubToken();

  if (!token) {
    vscode.window.showInformationMessage('Please sign in to GitHub to use MyCroft Logger');
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const user = await octokit.users.getAuthenticated();

    try {
      await octokit.repos.get({
        owner: user.data.login,
        repo: REPO_NAME,
      });
    } catch (e) {
      await initializeRepository();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to check repository: ${errorMessage}`);
  }
}

async function initializeRepository() {
  const token = await getGitHubToken();

  if (!token) {
    vscode.window.showErrorMessage('GitHub authentication is required. Please sign in to GitHub.');
    return;
  }

  try {
    const octokit = new Octokit({ auth: token });
    const user = await octokit.users.getAuthenticated();

    try {
      await octokit.repos.createForAuthenticatedUser({
        name: REPO_NAME,
        private: true,
        auto_init: true,
        description: 'My coding activity log tracked by MyCroft VS Code extension',
      });
      vscode.window.showInformationMessage('Created new MyCroft logbook repository!');
    } catch (e) {
      // Repository might already exist
    }

    const readme = `# MyCroft Logbook

A daily log of my coding activities, automatically tracked by the MyCroft VS Code extension.

## Stats Summary
- Total Activities: 0
- Current Streak: 0 days
- Longest Streak: 0 days

## Recent Activities

| Date       | Time     | Activity | Category | Mood | Tags |
|------------|----------|----------|----------|------|------|
`;

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
        message: 'Initialize MyCroft logbook',
        content: Buffer.from(readme).toString('base64'),
      });
    } catch (e) {
      // README might already exist
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to initialize repository: ${errorMessage}`);
  }
}

class ActivityLoggerProvider implements vscode.WebviewViewProvider {
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
    webviewView.webview.html = await this.getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'shipActivity') {
        await this.shipActivity(message.text, message.category, message.mood, message.tags);
        await this.loadActivities();
        webviewView.webview.html = await this.getWebviewContent(webviewView.webview);
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

      // Get current README content
      const { data: readmeFile } = await octokit.repos.getContent({
        owner: user.data.login,
        repo: REPO_NAME,
        path: 'README.md',
      });

      if (!('content' in readmeFile)) {
        throw new Error('README.md not found');
      }

      const readmeContent = Buffer.from(readmeFile.content, 'base64').toString();

      // Ensure the table header and separator are present
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

      // Update streak and milestones
      const lastActivityDate = this.context.globalState.get<string>('lastActivityDate');
      const currentStreak = this.context.globalState.get<number>('currentStreak') || 0;
      const totalShips = this.context.globalState.get<number>('totalShips') || 0;

      const today = new Date().toISOString().split('T')[0];
      if (lastActivityDate === today) {
        // Already logged today
      } else if (lastActivityDate === this.getYesterday()) {
        this.context.globalState.update('currentStreak', currentStreak + 1);
      } else {
        this.context.globalState.update('currentStreak', 1);
      }

      this.context.globalState.update('lastActivityDate', today);
      this.context.globalState.update('totalShips', totalShips + 1);

      // Check for milestones
      if (this.context.globalState.get<number>('currentStreak') === 7) {
        vscode.window.showInformationMessage('🎉 7-day shipping streak! Keep it up!');
      }
      if (this.context.globalState.get<number>('totalShips') === 100) {
        vscode.window.showInformationMessage('🚀 100 ships logged! Amazing work!');
      }

      vscode.window.showInformationMessage('Activity logged successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to log activity: ${errorMessage}`);
    }
  }

  private getYesterday(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  private async getWebviewContent(webview: vscode.Webview) {
    const dailyGoal = this.context.globalState.get<number>('dailyGoal') || 3;
    const currentStreak = this.calculateStreak();
    const totalShips = this.activities.length;
    const longestStreak = this.calculateLongestStreak();

    // Calculate daily stats for the chart
    const last30Days = [...Array(30)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyStats = last30Days.map(date => ({
      date,
      count: this.activities.filter(a => a.date === date).length
    }));

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Activity Logger</title>
        <style>
          body {
            padding: 15px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
          }
          .input-group {
            background: var(--vscode-editor-background);
            padding: 15px;
            border-radius: 6px;
            border: 1px solid var(--vscode-widget-border);
            margin-bottom: 20px;
          }
          textarea, select, input {
            width: 100%;
            margin-bottom: 10px;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
          }
          button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 4px;
            font-weight: 500;
            width: 100%;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat {
            background: var(--vscode-editor-background);
            padding: 15px;
            border-radius: 6px;
            border: 1px solid var(--vscode-widget-border);
            text-align: center;
          }
          .stat h2 {
            margin: 0;
            font-size: 28px;
            color: var(--vscode-textLink-foreground);
          }
          .stat p {
            margin: 5px 0 0;
            color: var(--vscode-descriptionForeground);
          }
          .chart-container {
            margin: 20px 0;
            padding: 15px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
          }
          .activity-list {
            margin-top: 20px;
          }
          .activity-item {
            padding: 12px;
            margin-bottom: 10px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
          }
          .activity-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .activity-date {
            color: var(--vscode-descriptionForeground);
          }
          .activity-content {
            margin-bottom: 8px;
          }
          .activity-meta {
            display: flex;
            gap: 10px;
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            flex-wrap: wrap;
          }
          .tags {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
          }
          .section-title {
            margin: 20px 0 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-widget-border);
          }
          .progress-container {
            background: var(--vscode-input-background);
            height: 4px;
            border-radius: 2px;
            margin-top: 10px;
          }
          .progress-bar {
            background: var(--vscode-progressBar-background);
            height: 100%;
            border-radius: 2px;
            transition: width 0.3s ease;
          }
          .no-activities {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="stats">
            <div class="stat">
              <h2>${dailyGoal}</h2>
              <p>Daily Goal</p>
              <div class="progress-container">
                <div class="progress-bar" style="width: ${Math.min(100, (this.getTodayActivityCount() / dailyGoal) * 100)}%"></div>
              </div>
            </div>
            <div class="stat">
              <h2>${currentStreak}</h2>
              <p>Day Streak</p>
            </div>
            <div class="stat">
              <h2>${totalShips}</h2>
              <p>Total Ships</p>
            </div>
            <div class="stat">
              <h2>${longestStreak}</h2>
              <p>Longest Streak</p>
            </div>
          </div>

          <div class="input-group">
            <textarea id="activityInput" placeholder="What did you ship today?" rows="3"></textarea>
            <select id="categoryInput">
              <option value="Coding">Coding</option>
              <option value="Documentation">Documentation</option>
              <option value="Bug Fix">Bug Fix</option>
              <option value="Feature">Feature</option>
              <option value="Review">Review</option>
              <option value="Other">Other</option>
            </select>
            <select id="moodInput">
              <option value="🚀 Excited">🚀 Excited</option>
              <option value="😊 Happy">😊 Happy</option>
              <option value="😐 Neutral">😐 Neutral</option>
              <option value="😫 Tired">😫 Tired</option>
              <option value="😤 Frustrated">😤 Frustrated</option>
            </select>
            <input id="tagsInput" type="text" placeholder="Add tags (comma separated)">
            <button id="shipButton">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0L16 8L8 16L0 8L8 0ZM8 2.8L2.8 8L8 13.2L13.2 8L8 2.8Z"/>
              </svg>
              Ship It!
            </button>
          </div>

          <h3 class="section-title">Activity Trends</h3>
          <div class="chart-container">
            <canvas id="activityChart"></canvas>
          </div>

          <h3 class="section-title">Recent Activities</h3>
          <div class="activity-list">
            ${this.activities.length === 0 ? `
              <div class="no-activities">
                No activities logged yet. Start shipping to see your progress!
              </div>
            ` : this.activities.map(activity => `
              <div class="activity-item">
                <div class="activity-header">
                  <div class="activity-date">${activity.date} at ${activity.time}</div>
                  <div class="activity-mood">${activity.mood}</div>
                </div>
                <div class="activity-content">${activity.activity}</div>
                <div class="activity-meta">
                  <span>Category: ${activity.category}</span>
                  <div class="tags">
                    ${activity.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          const vscode = acquireVsCodeApi();

          document.getElementById('activityInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              document.getElementById('shipButton').click();
            }
          });

          document.getElementById('shipButton').addEventListener('click', () => {
            const text = document.getElementById('activityInput').value;
            const category = document.getElementById('categoryInput').value;
            const mood = document.getElementById('moodInput').value;
            const tags = document.getElementById('tagsInput').value.split(',').map(tag => tag.trim());

            if (text) {
              vscode.postMessage({
                command: 'shipActivity',
                text: text,
                category: category,
                mood: mood,
                tags: tags
              });
              document.getElementById('activityInput').value = '';
            }
          });

          const ctx = document.getElementById('activityChart').getContext('2d');
          const activityChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(dailyStats.map(stat => stat.date))},
              datasets: [{
                label: 'Activities',
                data: ${JSON.stringify(dailyStats.map(stat => stat.count))},
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                }
              }
            }
          });
        </script>
      </body>
      </html>
    `;
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

export function deactivate() {}