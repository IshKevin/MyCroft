import * as vscode from 'vscode';
import { Activity, TimeSession, Project } from '../types';
import { ProjectService } from '../services/ProjectService';
import { TimeTrackingService } from '../services/TimeTrackingService';
import { AchievementService } from '../services/AchievementService';

/**
 * Analytics Provider for MyCroft 2.0
 * Provides comprehensive analytics dashboard with charts and insights
 */
export class AnalyticsProvider implements vscode.WebviewViewProvider {
  private projectService: ProjectService;
  private timeTrackingService: TimeTrackingService;
  private achievementService: AchievementService;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.projectService = ProjectService.getInstance(context);
    this.timeTrackingService = TimeTrackingService.getInstance(context);
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
        case 'refreshAnalytics':
          webviewView.webview.html = await this.getWebviewContent(webviewView.webview);
          break;
        case 'exportReport':
          await this.exportAnalyticsReport();
          break;
      }
    });
  }

  private async getWebviewContent(webview: vscode.Webview): Promise<string> {
    const activities = this.context.globalState.get<Activity[]>('activities', []);
    const sessions = await this.timeTrackingService.getSessionHistory();
    const projects = await this.projectService.getProjects();
    const userProfile = await this.achievementService.getUserProfile();
    const productivityStats = await this.timeTrackingService.getProductivityStats();

    // Calculate analytics data
    const analyticsData = this.calculateAnalytics(activities, sessions, projects);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analytics Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
        <style>
          ${this.getStyles()}
        </style>
      </head>
      <body>
        <div class="analytics-container">
          <div class="header">
            <h2>📊 Analytics Dashboard</h2>
            <button id="refreshBtn" class="btn-secondary">🔄 Refresh</button>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${analyticsData.totalActivities}</div>
              <div class="stat-label">Total Activities</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${Math.round(analyticsData.totalTime / 60)}h</div>
              <div class="stat-label">Total Time</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${userProfile.level}</div>
              <div class="stat-label">Level</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${userProfile.currentStreak}</div>
              <div class="stat-label">Current Streak</div>
            </div>
          </div>

          <div class="chart-section">
            <h3>Activity Trends</h3>
            <canvas id="activityChart" width="400" height="200"></canvas>
          </div>

          <div class="chart-section">
            <h3>Time Distribution</h3>
            <canvas id="timeChart" width="400" height="200"></canvas>
          </div>

          <div class="chart-section">
            <h3>Category Breakdown</h3>
            <canvas id="categoryChart" width="400" height="200"></canvas>
          </div>

          <div class="insights-section">
            <h3>📈 Key Insights</h3>
            <div class="insights-list">
              ${this.generateInsights(analyticsData, productivityStats)}
            </div>
          </div>

          <div class="actions">
            <button id="exportBtn" class="btn-primary">📄 Export Report</button>
          </div>
        </div>

        <script>
          ${this.getChartScript(analyticsData)}
        </script>
      </body>
      </html>
    `;
  }

  private calculateAnalytics(activities: Activity[], sessions: TimeSession[], projects: Project[]) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter recent activities
    const recentActivities = activities.filter(a => new Date(a.date) >= thirtyDaysAgo);
    
    // Daily activity counts for the last 30 days
    const dailyActivities: { [date: string]: number } = {};
    const dailyTime: { [date: string]: number } = {};
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyActivities[dateStr] = 0;
      dailyTime[dateStr] = 0;
    }

    recentActivities.forEach(activity => {
      dailyActivities[activity.date] = (dailyActivities[activity.date] || 0) + 1;
      dailyTime[activity.date] = (dailyTime[activity.date] || 0) + (activity.duration || 0);
    });

    // Category breakdown
    const categoryBreakdown: { [category: string]: number } = {};
    recentActivities.forEach(activity => {
      categoryBreakdown[activity.category] = (categoryBreakdown[activity.category] || 0) + 1;
    });

    // Time distribution by hour
    const hourlyDistribution: { [hour: number]: number } = {};
    recentActivities.forEach(activity => {
      const hour = new Date(`${activity.date} ${activity.time}`).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    return {
      totalActivities: activities.length,
      totalTime: activities.reduce((sum, a) => sum + (a.duration || 0), 0),
      recentActivities: recentActivities.length,
      dailyActivities,
      dailyTime,
      categoryBreakdown,
      hourlyDistribution,
      averageDaily: recentActivities.length / 30,
      mostProductiveHour: Object.entries(hourlyDistribution).sort(([,a], [,b]) => b - a)[0]?.[0] || '9'
    };
  }

  private generateInsights(analyticsData: any, productivityStats: any): string {
    const insights: string[] = [];

    if (analyticsData.averageDaily < 3) {
      insights.push('📈 Consider logging more activities daily for better tracking');
    }

    if (productivityStats.averageFocusScore < 7) {
      insights.push('🎯 Your focus score could be improved with fewer distractions');
    }

    const mostProductiveHour = parseInt(analyticsData.mostProductiveHour);
    if (mostProductiveHour) {
      insights.push(`⏰ You're most productive at ${mostProductiveHour}:00 - schedule important tasks then`);
    }

    if (Object.keys(analyticsData.categoryBreakdown).length > 5) {
      insights.push('🎨 Great variety in your work categories!');
    }

    return insights.map(insight => `<div class="insight-item">${insight}</div>`).join('');
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

      .analytics-container {
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

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }

      .stat-card {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: var(--vscode-textLink-foreground);
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
      }

      .chart-section {
        margin-bottom: 32px;
      }

      .chart-section h3 {
        margin-bottom: 16px;
        color: var(--vscode-foreground);
      }

      .insights-section {
        margin-bottom: 24px;
      }

      .insights-list {
        background: var(--vscode-editor-inactiveSelectionBackground);
        border-radius: 8px;
        padding: 16px;
      }

      .insight-item {
        margin-bottom: 8px;
        padding: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        border-left: 3px solid var(--vscode-textLink-foreground);
      }

      .actions {
        text-align: center;
      }

      .btn-primary, .btn-secondary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 4px;
      }

      .btn-secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
      }

      .btn-primary:hover, .btn-secondary:hover {
        opacity: 0.9;
      }

      canvas {
        max-width: 100%;
        height: auto !important;
      }
    `;
  }

  private getChartScript(analyticsData: any): string {
    return `
      const vscode = acquireVsCodeApi();

      // Activity trend chart
      const activityCtx = document.getElementById('activityChart').getContext('2d');
      new Chart(activityCtx, {
        type: 'line',
        data: {
          labels: Object.keys(${JSON.stringify(analyticsData.dailyActivities)}).reverse(),
          datasets: [{
            label: 'Activities',
            data: Object.values(${JSON.stringify(analyticsData.dailyActivities)}).reverse(),
            borderColor: '#007ACC',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // Time distribution chart
      const timeCtx = document.getElementById('timeChart').getContext('2d');
      new Chart(timeCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(${JSON.stringify(analyticsData.dailyTime)}).reverse(),
          datasets: [{
            label: 'Time (minutes)',
            data: Object.values(${JSON.stringify(analyticsData.dailyTime)}).reverse(),
            backgroundColor: '#4ECDC4'
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // Category breakdown chart
      const categoryCtx = document.getElementById('categoryChart').getContext('2d');
      new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(${JSON.stringify(analyticsData.categoryBreakdown)}),
          datasets: [{
            data: Object.values(${JSON.stringify(analyticsData.categoryBreakdown)}),
            backgroundColor: [
              '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
              '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
            ]
          }]
        },
        options: {
          responsive: true
        }
      });

      // Event listeners
      document.getElementById('refreshBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'refreshAnalytics' });
      });

      document.getElementById('exportBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'exportReport' });
      });
    `;
  }

  private async exportAnalyticsReport(): Promise<void> {
    const activities = this.context.globalState.get<Activity[]>('activities', []);
    const sessions = await this.timeTrackingService.getSessionHistory();
    const projects = await this.projectService.getProjects();
    const analyticsData = this.calculateAnalytics(activities, sessions, projects);

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalActivities: analyticsData.totalActivities,
        totalTime: analyticsData.totalTime,
        averageDaily: analyticsData.averageDaily,
        mostProductiveHour: analyticsData.mostProductiveHour
      },
      dailyBreakdown: analyticsData.dailyActivities,
      categoryBreakdown: analyticsData.categoryBreakdown,
      activities: activities.slice(0, 100) // Last 100 activities
    };

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('mycroft-analytics-report.json'),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(report, null, 2)));
      vscode.window.showInformationMessage('Analytics report exported successfully!');
    }
  }
}
