import * as vscode from 'vscode';
import { WebviewTemplateData, Activity } from '../types';
import { CATEGORIES, MOODS } from '../constants';

const styles = {
  base: `
    :root {
      --bg-primary: var(--vscode-editor-background);
      --bg-secondary: var(--vscode-input-background);
      --text-primary: var(--vscode-foreground);
      --text-muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-textLink-foreground);
      --border: var(--vscode-widget-border);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 10px;
    }
  `,
  
  container: `
    .container {
      max-width: 700px;
      margin: 0 auto;
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `,
  
  quickStats: `
    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-bottom: 15px;
    }

    .stat-card {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }

    .stat-card h2 {
      font-size: 1.2em;
      color: var(--accent);
      margin-bottom: 5px;
    }

    .stat-card p {
      font-size: 0.9em;
      color: var(--text-muted);
    }

    .progress-container {
      background: var(--bg-secondary);
      height: 4px;
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;
    }

    .progress-bar {
      background: var(--accent);
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s ease;
    }
  `,
  
  activityForm: `
    .activity-form {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
    }

    .form-group {
      margin-bottom: 10px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-size: 0.9em;
      color: var(--text-muted);
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    #shipButton {
      width: 100%;
      padding: 10px;
      background: linear-gradient(45deg, var(--vscode-button-background), var(--vscode-button-hoverBackground));
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    #shipButton:hover {
      opacity: 0.9;
    }
  `,
  
  activityList: `
    .activity-list {
      margin-top: 15px;
    }

    .activity-item {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .activity-date {
      color: var(--text-muted);
      font-size: 0.8em;
    }

    .activity-content {
      margin-bottom: 8px;
      font-size: 1em;
    }

    .activity-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .activity-mood {
      background: var(--accent);
      color: white;
      font-size: 0.7em;
      padding: 3px 6px;
      border-radius: 12px;
    }

    .tags {
      display: flex;
      gap: 5px;
    }

    .tag {
      background: var(--bg-secondary);
      color: var(--text-muted);
      font-size: 0.7em;
      padding: 3px 6px;
      border-radius: 12px;
    }
  `,
  
  chart: `
    .chart-container {
      margin: 15px 0;
      padding: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      height: 250px;
    }
  `,
  
  sectionTitle: `
    .section-title {
      margin: 15px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
      font-size: 1.1em;
      color: var(--accent);
    }
  `,

  sessionIndicator: `
    .active-session-info {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--vscode-textLink-foreground);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 15px;
    }

    .session-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      color: var(--vscode-textLink-foreground);
    }

    .session-icon {
      font-size: 1.2em;
    }

    .session-duration {
      margin-left: auto;
      font-weight: bold;
      background: var(--vscode-textLink-foreground);
      color: var(--vscode-editor-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.8em;
    }
  `
};

function getActivityChart(data: WebviewTemplateData) {
  const last30Days = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailyStats = last30Days.map(date => ({
    date,
    count: data.activities.filter(a => a.date === date).length
  }));

  return {
    labels: dailyStats.map(stat => stat.date),
    data: dailyStats.map(stat => stat.count)
  };
}

function renderStats(data: WebviewTemplateData) {
  return `
    <div class="quick-stats">
      <div class="stat-card">
        <h2>${data.dailyGoal}</h2>
        <p>Daily Goal</p>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${Math.min(100, (data.todayCount / data.dailyGoal) * 100)}%"></div>
        </div>
      </div>
      <div class="stat-card">
        <h2>${data.currentStreak}</h2>
        <p>Day Streak</p>
      </div>
      <div class="stat-card">
        <h2>${data.totalShips}</h2>
        <p>Total Ships</p>
      </div>
      <div class="stat-card">
        <h2>${data.longestStreak}</h2>
        <p>Longest Streak</p>
      </div>
    </div>
  `;
}

function renderInputForm(data: WebviewTemplateData) {
  return `
    <div class="activity-form">
      <div class="form-group">
        <label for="activityInput">What did you ship today?</label>
        <textarea
          id="activityInput"
          placeholder="Describe your activity (Ctrl/Cmd + Enter to submit)"
          rows="3"
        ></textarea>
      </div>

      ${data.projects && data.projects.length > 0 ? `
        <div class="form-group">
          <label for="projectInput">Project (Optional)</label>
          <select id="projectInput">
            <option value="">No specific project</option>
            ${data.projects.filter(p => p.status === 'active').map(project =>
              `<option value="${project.id}" ${data.currentProject?.id === project.id ? 'selected' : ''}>
                ${project.name}
              </option>`
            ).join('')}
          </select>
        </div>
      ` : ''}

      <div class="form-group">
        <label for="categoryInput">Category</label>
        <select id="categoryInput">
          ${CATEGORIES.map(category =>
            `<option value="${category}">${category}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-group">
        <label for="moodInput">Mood</label>
        <select id="moodInput">
          ${MOODS.map(mood =>
            `<option value="${mood}">${mood}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-group">
        <label for="tagsInput">Tags</label>
        <input
          id="tagsInput"
          type="text"
          placeholder="Add tags (comma separated, e.g., frontend, bugfix, feature)"
        >
      </div>

      ${data.activeSession ? `
        <div class="active-session-info">
          <div class="session-indicator">
            <span class="session-icon">⏱️</span>
            <span>Active ${data.activeSession.type} session</span>
            <span class="session-duration">${data.activeSession.duration}min</span>
          </div>
        </div>
      ` : ''}

      <button id="shipButton">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L16 8L8 16L0 8L8 0ZM8 2.8L2.8 8L8 13.2L13.2 8L8 2.8Z"/>
        </svg>
        Ship It! ${data.user ? `(+${Math.round(5 + (data.currentStreak * 0.5))} XP)` : ''}
      </button>
    </div>
  `;
}

function renderActivityList(activities: Activity[]) {
  if (activities.length === 0) {
    return `
      <div class="activity-item" style="text-align: center;">
        <p>No activities logged yet. Start shipping to see your progress!</p>
      </div>
    `;
  }

  return activities.map(activity => `
    <div class="activity-item">
      <div class="activity-header">
        <div class="activity-date">${activity.date} at ${activity.time}</div>
        <div class="activity-mood">${activity.mood}</div>
      </div>
      <div class="activity-content">${activity.activity}</div>
      <div class="activity-meta">
        <span>📁 ${activity.category}</span>
        <div class="tags">
          ${activity.tags.map((tag: string) =>
            `<span class="tag">${tag}</span>`
          ).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

export async function getWebviewContent(webview: vscode.Webview, data: WebviewTemplateData): Promise<string> {
  const chartData = getActivityChart(data);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Activity Logger</title>
      <style>
        ${Object.values(styles).join('\n')}
      </style>
    </head>
    <body>
      <div class="container">
        ${renderStats(data)}
        
        ${renderInputForm(data)}
        
        <h3 class="section-title">Activity Trends</h3>
        <div class="chart-container">
          <canvas id="activityChart"></canvas>
        </div>
        
        <h3 class="section-title">Recent Activities</h3>
        <div class="activity-list">
          ${renderActivityList(data.activities)}
        </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        const vscode = acquireVsCodeApi();
        
        // Setup keyboard shortcuts
        document.getElementById('activityInput').addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            document.getElementById('shipButton').click();
          }
        });
        
        // Handle form submission
        document.getElementById('shipButton').addEventListener('click', () => {
          const text = document.getElementById('activityInput').value.trim();
          const category = document.getElementById('categoryInput').value;
          const mood = document.getElementById('moodInput').value;
          const projectSelect = document.getElementById('projectInput');
          const projectId = projectSelect ? projectSelect.value : undefined;
          const tags = document.getElementById('tagsInput').value
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);

          if (text) {
            vscode.postMessage({
              command: 'shipActivity',
              text,
              category,
              mood,
              tags,
              projectId
            });

            // Clear form
            document.getElementById('activityInput').value = '';
            document.getElementById('tagsInput').value = '';
          }
        });
        
        // Initialize activity chart
        const ctx = document.getElementById('activityChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(chartData.labels)},
            datasets: [{
              label: 'Activities',
              data: ${JSON.stringify(chartData.data)},
              borderColor: 'var(--accent)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'var(--accent)',
              pointHoverBackgroundColor: 'var(--accent)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  color: 'var(--text-primary)'
                },
                grid: {
                  color: 'var(--border)',
                  drawBorder: false
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: 'var(--text-primary)',
                  maxRotation: 45,
                  minRotation: 45
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: 'var(--bg-primary)',
                titleColor: 'var(--text-primary)',
                bodyColor: 'var(--text-primary)',
                borderColor: 'var(--border)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                  title: (tooltipItems) => {
                    return 'Date: ' + tooltipItems[0].label;
                  },
                  label: (context) => {
                    return 'Activities: ' + context.raw;
                  }
                }
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;
}