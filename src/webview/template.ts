import * as vscode from 'vscode';
import { Activity } from '../types';
import { CATEGORIES, MOODS } from '../constants';

interface WebviewTemplateData {
  activities: Activity[];
  dailyGoal: number;
  currentStreak: number;
  totalShips: number;
  longestStreak: number;
  todayCount: number;
}

const styles = {
  base: `
    body {
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.8;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      border-radius: 12px;
      background: linear-gradient(
        to bottom,
        var(--vscode-editor-background),
        var(--vscode-editor-background)
      );
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    }
  `,
  
  inputs: `
    .input-group {
      background: linear-gradient(
        to right bottom,
        var(--vscode-button-background),
        var(--vscode-button-hoverBackground)
      );
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 32px;
      display: grid;
      gap: 16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    textarea {
      min-height: 120px;
      border-radius: 12px;
      padding: 16px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 2px solid var(--vscode-input-border);
      font-size: 1.1em;
      transition: all 0.3s ease;
      resize: vertical;
    }
    select, input {
      height: 48px;
      border-radius: 12px;
      padding: 0 16px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 2px solid var(--vscode-input-border);
      font-size: 1em;
      transition: all 0.3s ease;
    }
    textarea:focus, select:focus, input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 3px var(--vscode-focusBorder);
    }
    label {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
  `,
  
  button: `
    button {
      background: linear-gradient(
        45deg,
        var(--vscode-button-background),
        var(--vscode-button-hoverBackground)
      );
      color: var(--vscode-button-foreground);
      border: none;
      height: 48px;
      font-size: 1.1em;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    }
    button:active {
      transform: translateY(0);
    }
  `,
  
  stats: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat {
      background: linear-gradient(
        135deg,
        var(--vscode-editor-background),
        var(--vscode-input-background)
      );
      padding: 24px;
      border-radius: 16px;
      text-align: center;
      transition: all 0.3s ease;
      border: 1px solid var(--vscode-widget-border);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
    .stat:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    .stat h2 {
      margin: 0;
      font-size: 36px;
      background: linear-gradient(
        45deg,
        var(--vscode-textLink-foreground),
        var(--vscode-textLink-activeForeground)
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }
    .stat p {
      margin: 8px 0 0;
      color: var(--vscode-descriptionForeground);
      font-size: 0.95em;
      font-weight: 500;
    }
  `,
  
  activities: `
    .activity-list {
      display: grid;
      gap: 16px;
    }
    .activity-item {
      padding: 20px;
      background: linear-gradient(
        to right,
        var(--vscode-editor-background),
        var(--vscode-input-background)
      );
      border: 1px solid var(--vscode-widget-border);
      border-radius: 16px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .activity-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(
        to bottom,
        var(--vscode-textLink-foreground),
        var(--vscode-textLink-activeForeground)
      );
      opacity: 0;
      transition: opacity 0.3s;
    }
    .activity-item:hover {
      transform: translateX(8px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .activity-item:hover::before {
      opacity: 1;
    }
    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .activity-date {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      font-weight: 500;
    }
    .activity-content {
      margin-bottom: 16px;
      line-height: 1.6;
      font-size: 1.1em;
    }
    .activity-meta {
      display: flex;
      gap: 16px;
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      flex-wrap: wrap;
      align-items: center;
    }
    .activity-mood {
      padding: 4px 12px;
      background: var(--vscode-badge-background);
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 500;
    }
  `,
  
  tags: `
    .tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tag {
      background: linear-gradient(
        45deg,
        var(--vscode-badge-background),
        var(--vscode-badge-background)
      );
      color: var(--vscode-badge-foreground);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }
    .tag:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `,
  
  progress: `
    .progress-container {
      background: var(--vscode-input-background);
      height: 6px;
      border-radius: 3px;
      margin-top: 12px;
      overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    .progress-bar {
      background: linear-gradient(
        90deg,
        var(--vscode-progressBar-background),
        var(--vscode-textLink-activeForeground)
      );
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
  
  chart: `
    .chart-container {
      margin: 32px 0;
      padding: 24px;
      background: linear-gradient(
        to bottom,
        var(--vscode-editor-background),
        var(--vscode-input-background)
      );
      border: 1px solid var(--vscode-widget-border);
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
      height: 300px;
    }
  `,
  
  sections: `
    .section-title {
      margin: 32px 0 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--vscode-widget-border);
      font-size: 1.3em;
      font-weight: 700;
      background: linear-gradient(
        45deg,
        var(--vscode-foreground),
        var(--vscode-textLink-foreground)
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
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
    <div class="stats">
      <div class="stat">
        <h2>${data.dailyGoal}</h2>
        <p>Daily Goal</p>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${Math.min(100, (data.todayCount / data.dailyGoal) * 100)}%"></div>
        </div>
      </div>
      <div class="stat">
        <h2>${data.currentStreak}</h2>
        <p>Day Streak</p>
      </div>
      <div class="stat">
        <h2>${data.totalShips}</h2>
        <p>Total Ships</p>
      </div>
      <div class="stat">
        <h2>${data.longestStreak}</h2>
        <p>Longest Streak</p>
      </div>
    </div>
  `;
}

function renderInputForm() {
  return `
    <div class="input-group">
      <label for="activityInput">What did you ship today?</label>
      <textarea 
        id="activityInput" 
        placeholder="Describe your activity (Ctrl/Cmd + Enter to submit)" 
        rows="3"
      ></textarea>
      
      <label for="categoryInput">Category</label>
      <select id="categoryInput">
        ${CATEGORIES.map(category => 
          `<option value="${category}">${category}</option>`
        ).join('')}
      </select>
      
      <label for="moodInput">Mood</label>
      <select id="moodInput">
        ${MOODS.map(mood => 
          `<option value="${mood}">${mood}</option>`
        ).join('')}
      </select>
      
      <label for="tagsInput">Tags</label>
      <input 
        id="tagsInput" 
        type="text" 
        placeholder="Add tags (comma separated, e.g., frontend, bugfix, feature)"
      >
      
      <button id="shipButton">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0L16 8L8 16L0 8L8 0ZM8 2.8L2.8 8L8 13.2L13.2 8L8 2.8Z"/>
        </svg>
        Ship It!
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
          ${activity.tags.map(tag => 
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
        
        ${renderInputForm()}
        
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
              tags
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
              borderColor: 'var(--vscode-textLink-foreground)',
              borderWidth: 2,
              fill: true,
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'var(--vscode-textLink-foreground)',
              pointHoverBackgroundColor: 'var(--vscode-textLink-activeForeground)'
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
                  color: 'var(--vscode-foreground)'
                },
                grid: {
                  color: 'var(--vscode-widget-border)',
                  drawBorder: false
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: 'var(--vscode-foreground)',
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
                backgroundColor: 'var(--vscode-editor-background)',
                titleColor: 'var(--vscode-foreground)',
                bodyColor: 'var(--vscode-foreground)',
                borderColor: 'var(--vscode-widget-border)',
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